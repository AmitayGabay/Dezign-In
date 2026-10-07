import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { sendLeadNotification } from './email.js';
import './config/env.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

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

app.get('/api/projects', async (_req, res, next) => {
  try {
    const [projects] = await pool.query(
      'SELECT id, title, description, image_url, status FROM Projects ORDER BY id',
    );
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

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

    void sendLeadNotification({
      client_name: client_name.trim(),
      client_email: client_email.trim(),
      phone: phone?.trim() || null,
      service_type: service_type.trim(),
    }).catch((error) => {
      console.error('Failed to send lead notification email:', error);
    });

    return res.status(201).json({ id: result.insertId });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error('API request failed:', error);
  return res.status(500).json({ error: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
