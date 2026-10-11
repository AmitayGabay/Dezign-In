import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import { pool } from './db.js';
import { sendClientWelcome, sendProjectReviewRequest } from './email.js';

const statuses = ['Planning', 'In Progress', 'Completed'];
const validId = (value) => /^[1-9]\d*$/.test(String(value));
const loginUrl = () => `${(process.env.CLIENT_BASE_URL || 'http://localhost:5173').replace(/\/$/, '')}/client`;
const accepted = (delivery, email) => delivery.accepted?.some((address) => address.toLowerCase() === email.toLowerCase()) ?? false;

export function registerWorkspaceRoutes(app, { upload, uploadsDir, authMiddleware, requireAdmin }) {
  const requireClient = (req, res, next) => req.user?.role === 'client'
    ? next() : res.status(403).json({ error: 'Client access is required.' });

  async function removeFiles(files) {
    await Promise.all((files || []).map((file) => unlink(file.path).catch(() => {})));
  }

  async function loadProjects(where = '1=1', params = []) {
    const [projects] = await pool.execute(
      `SELECT p.id, p.title, p.description, p.image_url, p.status, p.client_id, p.lead_id,
              p.is_public, p.completed_at, p.review_requested_at, u.name AS client_name,
              u.email AS client_email, u.welcome_email_sent_at
       FROM Projects p LEFT JOIN Users u ON u.id = p.client_id WHERE ${where} ORDER BY p.id DESC`, params,
    );
    if (!projects.length) return [];
    const ids = projects.map((project) => project.id);
    const placeholders = ids.map(() => '?').join(',');
    const [images] = await pool.query(
      `SELECT id, project_id, filename, caption FROM ProjectImages WHERE project_id IN (${placeholders}) ORDER BY id`, ids,
    );
    const [updates] = await pool.query(
      `SELECT id, project_id, body, created_at FROM ProjectUpdates WHERE project_id IN (${placeholders}) ORDER BY id DESC`, ids,
    );
    return projects.map((project) => ({
      ...project,
      images: images.filter((image) => image.project_id === project.id).map((image) => ({
        id: image.id, url: `/uploads/${image.filename}`, caption: image.caption,
      })),
      updates: updates.filter((update) => update.project_id === project.id),
    }));
  }

  async function sendWelcome(user, password) {
    try {
      const delivery = await sendClientWelcome({ name: user.name, email: user.email, password, loginUrl: loginUrl() });
      if (!accepted(delivery, user.email)) throw new Error('SMTP did not accept the recipient.');
      await pool.execute('UPDATE Users SET welcome_email_sent_at = UTC_TIMESTAMP() WHERE id = ?', [user.id]);
      return true;
    } catch (error) {
      console.error(`Failed to send welcome email to client ${user.id}:`, error);
      return false;
    }
  }

  async function sendCompletionReview(project) {
    if (!project.client_id || !project.client_email) return null;
    try {
      const delivery = await sendProjectReviewRequest({
        name: project.client_name, email: project.client_email,
        projectTitle: project.title, loginUrl: loginUrl(),
      });
      if (!accepted(delivery, project.client_email)) throw new Error('SMTP did not accept the recipient.');
      await pool.execute('UPDATE Projects SET review_requested_at = UTC_TIMESTAMP() WHERE id = ?', [project.id]);
      return true;
    } catch (error) {
      console.error(`Failed to send completion review request for project ${project.id}:`, error);
      return false;
    }
  }

  // Uploaded images from private client projects require a client or admin token.
  app.get('/uploads/:filename', async (req, res, next) => {
    const filename = req.params.filename;
    if (!/^[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp|gif)$/i.test(filename)) return res.sendStatus(404);
    try {
      const [rows] = await pool.execute(
        `SELECT p.client_id, p.is_public FROM Projects p
         LEFT JOIN ProjectImages i ON i.project_id = p.id
         WHERE i.filename = ? OR p.image_url = ? LIMIT 1`,
        [filename, `/uploads/${filename}`],
      );
      const project = rows[0];
      if (!project) return res.sendStatus(404);
      if (!project.is_public) {
        const match = req.get('Authorization')?.match(/^Bearer\s+(\S+)$/i);
        let user;
        try { user = jwt.verify(match?.[1] || '', process.env.JWT_SECRET); } catch { return res.sendStatus(401); }
        if (user.role !== 'admin' && !(user.role === 'client' && Number(user.id) === Number(project.client_id))) {
          return res.sendStatus(403);
        }
        res.set('Cache-Control', 'private, no-store');
      }
      return res.sendFile(path.join(uploadsDir, filename));
    } catch (error) { return next(error); }
  });

  app.get('/api/projects', async (_req, res, next) => {
    try {
      const projects = await loadProjects('p.is_public = TRUE');
      return res.json(projects.map(({ client_id, lead_id, client_name, client_email, welcome_email_sent_at, updates, ...publicProject }) => publicProject));
    } catch (error) { return next(error); }
  });

  app.get('/api/admin/projects', authMiddleware, requireAdmin, async (_req, res, next) => {
    try { return res.json(await loadProjects()); } catch (error) { return next(error); }
  });

  app.get('/api/client/projects', authMiddleware, requireClient, async (req, res, next) => {
    try { return res.json(await loadProjects('p.client_id = ?', [req.user.id])); } catch (error) { return next(error); }
  });

  app.post('/api/projects', authMiddleware, requireAdmin, upload.single('image'), async (req, res, next) => {
    const { title, description = '' } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim() || title.length > 255 || typeof description !== 'string' || description.length > 10000 || !req.file) {
      await removeFiles(req.file ? [req.file] : []);
      return res.status(400).json({ error: 'A title, description, and portfolio image are required.' });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        "INSERT INTO Projects (title, description, image_url, status, is_public, completed_at) VALUES (?, ?, ?, 'Completed', TRUE, UTC_TIMESTAMP())",
        [title.trim(), description.trim(), `/uploads/${req.file.filename}`],
      );
      await connection.execute('INSERT INTO ProjectImages (project_id, filename) VALUES (?, ?)', [result.insertId, req.file.filename]);
      await connection.commit();
      return res.status(201).json((await loadProjects('p.id = ?', [result.insertId]))[0]);
    } catch (error) {
      await connection.rollback();
      await removeFiles([req.file]);
      return next(error);
    } finally { connection.release(); }
  });

  app.post('/api/leads/:id/projects', authMiddleware, requireAdmin, async (req, res, next) => {
    const { title, description = '' } = req.body ?? {};
    if (!validId(req.params.id) || typeof title !== 'string' || !title.trim() || title.length > 255 ||
        typeof description !== 'string' || description.length > 10000) {
      return res.status(400).json({ error: 'A valid lead and project title are required.' });
    }
    const connection = await pool.getConnection();
    let user;
    let password;
    let projectId;
    try {
      await connection.beginTransaction();
      const [leads] = await connection.execute('SELECT id, client_name, client_email FROM Leads WHERE id = ? FOR UPDATE', [req.params.id]);
      const lead = leads[0];
      if (!lead) { await connection.rollback(); return res.status(404).json({ error: 'Lead not found.' }); }
      const email = lead.client_email.trim().toLowerCase();
      const [users] = await connection.execute('SELECT id, name, email, role FROM Users WHERE email = ? LIMIT 1', [email]);
      user = users[0];
      if (user?.role === 'admin') { await connection.rollback(); return res.status(409).json({ error: 'This email belongs to an admin account.' }); }
      if (!user) {
        password = randomBytes(18).toString('base64url');
        const passwordHash = await bcrypt.hash(password, 12);
        const [created] = await connection.execute(
          "INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, 'client')",
          [lead.client_name.trim(), email, passwordHash],
        );
        user = { id: created.insertId, name: lead.client_name.trim(), email };
      }
      const [project] = await connection.execute(
        "INSERT INTO Projects (title, description, client_email, client_id, lead_id, status, is_public) VALUES (?, ?, ?, ?, ?, 'Planning', FALSE)",
        [title.trim(), description.trim(), email, user.id, lead.id],
      );
      projectId = project.insertId;
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'The client account was created in another request. Please retry.' });
      return next(error);
    } finally { connection.release(); }
    const welcomeEmailSent = password ? await sendWelcome(user, password) : null;
    return res.status(201).json({ project: (await loadProjects('p.id = ?', [projectId]))[0], welcome_email_sent: welcomeEmailSent });
  });

  app.post('/api/clients/:id/welcome-retry', authMiddleware, requireAdmin, async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid client id.' });
    try {
      const [users] = await pool.execute('SELECT id, name, email, role, welcome_email_sent_at FROM Users WHERE id = ?', [req.params.id]);
      const user = users[0];
      if (!user || user.role !== 'client') return res.status(404).json({ error: 'Client not found.' });
      if (user.welcome_email_sent_at) return res.status(409).json({ error: 'Welcome credentials were already sent.' });
      const password = randomBytes(18).toString('base64url');
      await pool.execute('UPDATE Users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(password, 12), user.id]);
      return res.json({ email_sent: await sendWelcome(user, password) });
    } catch (error) { return next(error); }
  });

  app.patch('/api/projects/:id', authMiddleware, requireAdmin, async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid project id.' });
    const { title, description, is_public } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim() || title.length > 255 ||
        typeof description !== 'string' || description.length > 10000 || typeof is_public !== 'boolean') {
      return res.status(400).json({ error: 'Title, description, and publication choice are required.' });
    }
    try {
      const [result] = await pool.execute(
        'UPDATE Projects SET title = ?, description = ?, is_public = ? WHERE id = ?',
        [title.trim(), description.trim(), is_public, req.params.id],
      );
      if (!result.affectedRows) return res.status(404).json({ error: 'Project not found.' });
      return res.json((await loadProjects('p.id = ?', [req.params.id]))[0]);
    } catch (error) { return next(error); }
  });

  app.post('/api/projects/:id/updates', authMiddleware, requireAdmin, async (req, res, next) => {
    const { body } = req.body ?? {};
    if (!validId(req.params.id) || typeof body !== 'string' || !body.trim() || body.length > 10000) {
      return res.status(400).json({ error: 'A project id and update text up to 10000 characters are required.' });
    }
    try {
      const [projects] = await pool.execute('SELECT id FROM Projects WHERE id = ?', [req.params.id]);
      if (!projects.length) return res.status(404).json({ error: 'Project not found.' });
      const [result] = await pool.execute('INSERT INTO ProjectUpdates (project_id, body) VALUES (?, ?)', [req.params.id, body.trim()]);
      return res.status(201).json({ id: result.insertId, project_id: Number(req.params.id), body: body.trim() });
    } catch (error) { return next(error); }
  });

  app.post('/api/projects/:id/images', authMiddleware, requireAdmin, upload.array('images', 20), async (req, res, next) => {
    if (!validId(req.params.id) || !req.files?.length) {
      await removeFiles(req.files);
      return res.status(400).json({ error: 'Choose at least one image for a valid project.' });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [projects] = await connection.execute('SELECT id, image_url FROM Projects WHERE id = ? FOR UPDATE', [req.params.id]);
      if (!projects.length) {
        await connection.rollback();
        await removeFiles(req.files);
        return res.status(404).json({ error: 'Project not found.' });
      }
      for (const file of req.files) {
        await connection.execute('INSERT INTO ProjectImages (project_id, filename) VALUES (?, ?)', [req.params.id, file.filename]);
      }
      if (!projects[0].image_url) {
        await connection.execute('UPDATE Projects SET image_url = ? WHERE id = ?', [`/uploads/${req.files[0].filename}`, req.params.id]);
      }
      await connection.commit();
      return res.status(201).json((await loadProjects('p.id = ?', [req.params.id]))[0]);
    } catch (error) {
      await connection.rollback();
      await removeFiles(req.files);
      return next(error);
    } finally { connection.release(); }
  });

  app.delete('/api/projects/:id/images/:imageId', authMiddleware, requireAdmin, async (req, res, next) => {
    if (!validId(req.params.id) || !validId(req.params.imageId)) return res.status(400).json({ error: 'Invalid project or image id.' });
    try {
      const [images] = await pool.execute('SELECT id, filename FROM ProjectImages WHERE id = ? AND project_id = ?', [req.params.imageId, req.params.id]);
      if (!images.length) return res.status(404).json({ error: 'Image not found.' });
      const image = images[0];
      await pool.execute('DELETE FROM ProjectImages WHERE id = ?', [image.id]);
      const [project] = await pool.execute('SELECT image_url FROM Projects WHERE id = ?', [req.params.id]);
      if (project[0]?.image_url === `/uploads/${image.filename}`) {
        const [nextImage] = await pool.execute('SELECT filename FROM ProjectImages WHERE project_id = ? ORDER BY id LIMIT 1', [req.params.id]);
        await pool.execute('UPDATE Projects SET image_url = ? WHERE id = ?', [nextImage[0] ? `/uploads/${nextImage[0].filename}` : null, req.params.id]);
      }
      await unlink(path.join(uploadsDir, image.filename)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
      return res.json({ deleted: true });
    } catch (error) { return next(error); }
  });

  app.post('/api/projects/:id/upload', authMiddleware, requireAdmin, upload.single('image'), async (req, res, next) => {
    if (!validId(req.params.id) || !req.file) {
      await removeFiles(req.file ? [req.file] : []);
      return res.status(400).json({ error: 'Choose an image for a valid project.' });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute('UPDATE Projects SET image_url = ? WHERE id = ?', [`/uploads/${req.file.filename}`, req.params.id]);
      if (!result.affectedRows) {
        await connection.rollback();
        await removeFiles([req.file]);
        return res.status(404).json({ error: 'Project not found.' });
      }
      await connection.execute('INSERT INTO ProjectImages (project_id, filename) VALUES (?, ?)', [req.params.id, req.file.filename]);
      await connection.commit();
      return res.json((await loadProjects('p.id = ?', [req.params.id]))[0]);
    } catch (error) {
      await connection.rollback();
      await removeFiles([req.file]);
      return next(error);
    } finally { connection.release(); }
  });

  app.patch('/api/projects/:id/status', authMiddleware, requireAdmin, async (req, res, next) => {
    const { status } = req.body ?? {};
    if (!validId(req.params.id) || !statuses.includes(status)) return res.status(400).json({ error: 'A valid project id and status are required.' });
    try {
      const [projects] = await pool.execute(
        `SELECT p.id, p.title, p.status, p.client_id, u.name AS client_name, u.email AS client_email
         FROM Projects p LEFT JOIN Users u ON u.id = p.client_id WHERE p.id = ?`, [req.params.id],
      );
      const project = projects[0];
      if (!project) return res.status(404).json({ error: 'Project not found.' });
      await pool.execute(
        'UPDATE Projects SET status = ?, completed_at = IF(? = \'Completed\', UTC_TIMESTAMP(), NULL) WHERE id = ?',
        [status, status, project.id],
      );
      const emailSent = status === 'Completed' && project.status !== 'Completed' ? await sendCompletionReview(project) : null;
      return res.json({ project: (await loadProjects('p.id = ?', [project.id]))[0], email_sent: emailSent });
    } catch (error) { return next(error); }
  });

  app.post('/api/projects/:id/review-request', authMiddleware, requireAdmin, async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid project id.' });
    try {
      const [rows] = await pool.execute(
        `SELECT p.id, p.title, p.status, p.client_id, u.name AS client_name, u.email AS client_email
         FROM Projects p LEFT JOIN Users u ON u.id = p.client_id WHERE p.id = ?`, [req.params.id],
      );
      const project = rows[0];
      if (!project) return res.status(404).json({ error: 'Project not found.' });
      if (project.status !== 'Completed' || !project.client_id) return res.status(409).json({ error: 'A completed client project is required.' });
      return res.json({ email_sent: await sendCompletionReview(project) });
    } catch (error) { return next(error); }
  });

  app.get('/api/leads', authMiddleware, requireAdmin, async (_req, res, next) => {
    try {
      const [leads] = await pool.query(
        `SELECT l.id, l.client_name, l.client_email, l.phone, l.service_type, l.created_at,
                COUNT(p.id) AS project_count
         FROM Leads l LEFT JOIN Projects p ON p.lead_id = l.id GROUP BY l.id ORDER BY l.created_at DESC, l.id DESC`,
      );
      return res.json(leads);
    } catch (error) { return next(error); }
  });

  app.delete('/api/leads/:id', authMiddleware, requireAdmin, async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid lead id.' });
    try {
      const [result] = await pool.execute('DELETE FROM Leads WHERE id = ?', [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Lead not found.' });
      return res.json({ deleted: true });
    } catch (error) { return next(error); }
  });

  app.get('/api/reviews', async (_req, res, next) => {
    try {
      const [reviews] = await pool.query(
        `SELECT r.id, COALESCE(u.name, l.client_name, 'Client') AS client_name,
                r.rating, r.comment, r.created_at,
                CASE WHEN p.is_public = TRUE THEN p.title ELSE NULL END AS project_title
         FROM Reviews r LEFT JOIN Users u ON u.id = r.client_id
         LEFT JOIN Leads l ON l.id = r.lead_id
         LEFT JOIN Projects p ON p.id = r.project_id ORDER BY r.created_at DESC, r.id DESC`,
      );
      return res.json(reviews);
    } catch (error) { return next(error); }
  });

  app.get('/api/admin/reviews', authMiddleware, requireAdmin, async (_req, res, next) => {
    try {
      const [reviews] = await pool.query(
        `SELECT r.id, COALESCE(u.name, l.client_name, 'Client') AS client_name,
                r.rating, r.comment, r.created_at, p.title AS project_title
         FROM Reviews r LEFT JOIN Users u ON u.id = r.client_id
         LEFT JOIN Leads l ON l.id = r.lead_id
         LEFT JOIN Projects p ON p.id = r.project_id ORDER BY r.created_at DESC, r.id DESC`,
      );
      return res.json(reviews);
    } catch (error) { return next(error); }
  });

  app.post('/api/reviews', authMiddleware, requireClient, async (req, res, next) => {
    const { project_id, rating, comment } = req.body ?? {};
    if (!validId(project_id) || !Number.isInteger(rating) || rating < 1 || rating > 5 ||
        typeof comment !== 'string' || !comment.trim() || comment.length > 2000) {
      return res.status(400).json({ error: 'Choose a completed project, rating 1–5, and comment up to 2000 characters.' });
    }
    try {
      const [projects] = await pool.execute('SELECT id FROM Projects WHERE id = ? AND client_id = ? AND status = \'Completed\'', [project_id, req.user.id]);
      if (!projects.length) return res.status(403).json({ error: 'This completed project is not linked to your account.' });
      const [result] = await pool.execute('INSERT INTO Reviews (client_id, project_id, rating, comment) VALUES (?, ?, ?, ?)',
        [req.user.id, project_id, rating, comment.trim()]);
      return res.status(201).json({ id: result.insertId });
    } catch (error) { return next(error); }
  });

  app.delete('/api/reviews/:id', authMiddleware, requireAdmin, async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid review id.' });
    try {
      const [result] = await pool.execute('DELETE FROM Reviews WHERE id = ?', [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Review not found.' });
      return res.json({ deleted: true });
    } catch (error) { return next(error); }
  });

  app.get('/api/review-invitations/:token', (_req, res) => res.status(410).json({ error: 'Review links have moved to client login.' }));
  app.patch('/api/leads/:id/status', authMiddleware, requireAdmin, (_req, res) => res.status(410).json({ error: 'Open a project for this lead instead.' }));
  app.post('/api/leads/:id/review-invite', authMiddleware, requireAdmin, (_req, res) => res.status(410).json({ error: 'Review requests are sent after project completion.' }));
}
