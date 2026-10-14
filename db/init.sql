CREATE TABLE IF NOT EXISTS Users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
  email_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  welcome_email_sent_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS Projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(2048),
  client_email VARCHAR(255),
  client_id BIGINT UNSIGNED NULL,
  lead_id BIGINT UNSIGNED NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at DATETIME NULL,
  review_requested_at DATETIME NULL,
  reviewed_at DATETIME NULL,
  status VARCHAR(50) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS Leads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  service_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'New',
  handled_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ReviewInvitations (
  lead_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  emailed_at DATETIME NULL,
  used_at DATETIME NULL,
  PRIMARY KEY (lead_id),
  UNIQUE KEY uq_review_invitations_token (token_hash),
  CONSTRAINT fk_review_invitations_lead FOREIGN KEY (lead_id) REFERENCES Leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id BIGINT UNSIGNED NULL,
  client_id BIGINT UNSIGNED NULL,
  project_id BIGINT UNSIGNED NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_lead (lead_id),
  UNIQUE KEY uq_reviews_project (project_id),
  CONSTRAINT fk_reviews_lead FOREIGN KEY (lead_id) REFERENCES Leads(id) ON DELETE SET NULL,
  CONSTRAINT fk_reviews_client FOREIGN KEY (client_id) REFERENCES Users(id) ON DELETE SET NULL,
  CONSTRAINT fk_reviews_project FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE SET NULL,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

ALTER TABLE Projects ADD CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES Users(id) ON DELETE SET NULL;
ALTER TABLE Projects ADD CONSTRAINT fk_projects_lead FOREIGN KEY (lead_id) REFERENCES Leads(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ProjectImages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  filename VARCHAR(255) NOT NULL,
  caption VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_images_filename (filename),
  CONSTRAINT fk_project_images_project FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ProjectUpdates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_updates_project FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
);
