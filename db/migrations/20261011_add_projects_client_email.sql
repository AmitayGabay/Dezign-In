-- Apply once to databases created before Projects.client_email was added.
ALTER TABLE Projects ADD COLUMN client_email VARCHAR(255) NULL;
