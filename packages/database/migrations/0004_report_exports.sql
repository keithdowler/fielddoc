CREATE TABLE IF NOT EXISTS report_exports (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  report_draft_id uuid NOT NULL REFERENCES report_drafts(id),
  storage_object_key text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  size_bytes integer NOT NULL,
  sha256 text NOT NULL,
  generated_at timestamp with time zone NOT NULL,
  uploaded_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE INDEX idx_report_exports_org_created
  ON report_exports (organization_id, created_at);

CREATE INDEX idx_report_exports_draft_uploaded
  ON report_exports (report_draft_id, uploaded_at);

CREATE UNIQUE INDEX uniq_report_exports_draft_sha
  ON report_exports (report_draft_id, sha256);

CREATE TABLE IF NOT EXISTS report_share_links (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  report_export_id uuid NOT NULL REFERENCES report_exports(id),
  created_by_user_id uuid REFERENCES users(id),
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  last_accessed_at timestamp with time zone,
  access_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_report_share_links_token_hash
  ON report_share_links (token_hash);

CREATE INDEX idx_report_share_links_export
  ON report_share_links (report_export_id);

CREATE INDEX idx_report_share_links_org_created
  ON report_share_links (organization_id, created_at);
