import { pool } from '../src/db.js';

try {
  const [columns] = await pool.query("SHOW COLUMNS FROM Leads LIKE 'status'");
  if (columns.length === 0) {
    await pool.query("ALTER TABLE Leads ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'New'");
  }
  const [handledColumns] = await pool.query("SHOW COLUMNS FROM Leads LIKE 'handled_at'");
  if (handledColumns.length === 0) {
    await pool.query('ALTER TABLE Leads ADD COLUMN handled_at DATETIME NULL');
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS ReviewInvitations (
    lead_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    emailed_at DATETIME NULL,
    used_at DATETIME NULL,
    CONSTRAINT fk_review_invitations_lead FOREIGN KEY (lead_id) REFERENCES Leads(id) ON DELETE CASCADE
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS Reviews (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    lead_id BIGINT UNSIGNED NOT NULL UNIQUE,
    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reviews_lead FOREIGN KEY (lead_id) REFERENCES Leads(id) ON DELETE CASCADE,
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
  )`);
  console.info('Review schema is ready.');
} catch (error) {
  console.error('Review schema migration failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
