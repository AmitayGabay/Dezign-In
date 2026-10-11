import { pool } from '../src/db.js';

async function addColumn(table, name, definition) {
  const [columns] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [name]);
  if (!columns.length) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    return true;
  }
  return false;
}

async function addForeignKey(table, name, definition) {
  const [rows] = await pool.query(
    'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?',
    [table, name],
  );
  if (!rows.length) await pool.query(`ALTER TABLE ${table} ADD CONSTRAINT ${name} ${definition}`);
}

try {
  await addColumn('Users', 'welcome_email_sent_at', 'DATETIME NULL');
  await addColumn('Projects', 'client_id', 'BIGINT UNSIGNED NULL');
  await addColumn('Projects', 'lead_id', 'BIGINT UNSIGNED NULL');
  const publicColumnAdded = await addColumn('Projects', 'is_public', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await addColumn('Projects', 'completed_at', 'DATETIME NULL');
  await addColumn('Projects', 'review_requested_at', 'DATETIME NULL');
  await addColumn('Reviews', 'client_id', 'BIGINT UNSIGNED NULL');
  await addColumn('Reviews', 'project_id', 'BIGINT UNSIGNED NULL');
  await pool.query('ALTER TABLE Reviews MODIFY COLUMN lead_id BIGINT UNSIGNED NULL');
  await addForeignKey('Projects', 'fk_projects_client', 'FOREIGN KEY (client_id) REFERENCES Users(id) ON DELETE SET NULL');
  await addForeignKey('Projects', 'fk_projects_lead', 'FOREIGN KEY (lead_id) REFERENCES Leads(id) ON DELETE SET NULL');
  await addForeignKey('Reviews', 'fk_reviews_client', 'FOREIGN KEY (client_id) REFERENCES Users(id) ON DELETE SET NULL');
  await addForeignKey('Reviews', 'fk_reviews_project', 'FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE SET NULL');
  await pool.query(`CREATE TABLE IF NOT EXISTS ProjectImages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    filename VARCHAR(255) NOT NULL UNIQUE,
    caption VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_images_project FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ProjectUpdates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_updates_project FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
  )`);
  await pool.query(`INSERT IGNORE INTO ProjectImages (project_id, filename)
    SELECT id, SUBSTRING(image_url, 10) FROM Projects
    WHERE image_url LIKE '/uploads/%' AND SUBSTRING(image_url, 10) NOT LIKE '%/%'`);
  await pool.query(`UPDATE Projects p JOIN Users u ON LOWER(p.client_email) = LOWER(u.email)
    SET p.client_id = u.id WHERE p.client_id IS NULL AND u.role = 'client'`);
  if (publicColumnAdded) {
    await pool.query('UPDATE Projects SET is_public = TRUE WHERE client_id IS NULL AND lead_id IS NULL');
  }
  console.info('Client workspace schema is ready.');
} catch (error) {
  console.error('Client workspace migration failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
