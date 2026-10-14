-- Existing installations: inspect duplicate project reviews before applying this index.
-- SELECT project_id, COUNT(*) FROM Reviews WHERE project_id IS NOT NULL GROUP BY project_id HAVING COUNT(*) > 1;
ALTER TABLE Projects ADD COLUMN reviewed_at DATETIME NULL;
UPDATE Projects p JOIN Reviews r ON r.project_id = p.id SET p.reviewed_at = r.created_at;
ALTER TABLE Reviews ADD UNIQUE KEY uq_reviews_project (project_id);
