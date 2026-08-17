ALTER TABLE evidence_items
  ADD COLUMN is_important boolean NOT NULL DEFAULT false;

CREATE INDEX idx_evidence_project_important
  ON evidence_items (project_id, is_important, capture_timestamp);
