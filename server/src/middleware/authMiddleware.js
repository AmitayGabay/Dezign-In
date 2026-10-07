import jwt from 'jsonwebtoken';
import './config/env.js';

export function authMiddleware(req, res, next) {
  if (!process.env.JWT_SECRET) {
    return next(new Error('JWT_SECRET is not configured.'));
  }

  const authorization = req.get('Authorization');
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Authorization token is required.' });
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET);
    if (!payload || typeof payload !== 'object') {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
