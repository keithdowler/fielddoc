ALTER TABLE documents ADD COLUMN IF NOT EXISTS media_asset_id uuid REFERENCES media_assets(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS size_bytes integer;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sha256 text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count integer;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type text;

CREATE INDEX IF NOT EXISTS idx_documents_media ON documents (media_asset_id);
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON documents (sha256);
CREATE INDEX IF NOT EXISTS idx_documents_project_updated
  ON documents (project_id, deleted_at, updated_at);
