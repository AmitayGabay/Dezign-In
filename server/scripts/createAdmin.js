import bcrypt from 'bcrypt';
import { pool } from '../src/db.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || 'Administrator';

if (!email || !password || password.length < 8) {
  console.error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters before running create-admin.');
  process.exitCode = 1;
} else {
  try {
    const [existing] = await pool.execute('SELECT id FROM Users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      console.error('An account with this email already exists. No changes were made.');
      process.exitCode = 1;
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.execute(
        'INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, passwordHash, 'admin'],
      );
      console.log(`Admin account created for ${email}.`);
    }
  } catch (error) {
    console.error('Could not create admin account:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
