import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { sendLeadNotification } from './email.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { registerWorkspaceRoutes } from './workspaceRoutes.js';
import './config/env.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(currentDir, '../uploads');
mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadsDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname);
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
    if (allowed[path.extname(file.originalname).toLowerCase()] !== file.mimetype) {
      return callback(new Error('Only JPG, PNG, WebP, or GIF images are allowed.'));
    }
    return callback(null, true);
  },
});

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required.' });
  }
  return next();
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/login', async (req, res, next) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error('JWT_SECRET is not configured.'));
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash, role FROM Users WHERE email = ? LIMIT 1',
      [email.trim()],
    );
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
    );

    return res.json({ token });
  } catch (error) {
    return next(error);
  }
});

registerWorkspaceRoutes(app, { upload, uploadsDir, authMiddleware, requireAdmin });

app.post('/api/leads', async (req, res, next) => {
  const { client_name, client_email, phone, service_type } = req.body ?? {};

  if (
    typeof client_name !== 'string' || !client_name.trim() ||
    typeof client_email !== 'string' || !client_email.trim() ||
    !Object.hasOwn(req.body ?? {}, 'phone') ||
    (phone !== null && typeof phone !== 'string') ||
    typeof service_type !== 'string' || !service_type.trim()
  ) {
    return res.status(400).json({
      error: 'client_name, client_email, phone, and service_type are required.',
    });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO Leads (client_name, client_email, phone, service_type) VALUES (?, ?, ?, ?)',
      [client_name.trim(), client_email.trim(), phone?.trim() || null, service_type.trim()],
    );

    let emailSent = false;
    try {
      const delivery = await sendLeadNotification({
        client_name: client_name.trim(),
        client_email: client_email.trim(),
        phone: phone?.trim() || null,
        service_type: service_type.trim(),
      });
      emailSent = delivery.accepted?.includes(process.env.ADMIN_EMAIL) ?? false;
      console.info('Lead notification SMTP result:', {
        leadId: result.insertId,
        messageId: delivery.messageId,
        accepted: delivery.accepted,
        rejected: delivery.rejected,
      });
    } catch (error) {
      console.error(`Failed to send lead notification email for lead ${result.insertId}:`, error);
    }

    return res.status(201).json({ id: result.insertId, email_sent: emailSent });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError || error.message === 'Only JPG, PNG, WebP, or GIF images are allowed.') {
    return res.status(400).json({ error: error.message });
  }

  console.error('API request failed:', error);
  return res.status(500).json({ error: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
