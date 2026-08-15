CREATE TYPE evidence_category AS ENUM (
  'BEFORE',
  'WORK',
  'AFTER',
  'DOCUMENT',
  'OTHER'
);

CREATE TYPE media_source_type AS ENUM (
  'CAMERA_PHOTO',
  'PHOTO_LIBRARY',
  'DOCUMENT_SCAN',
  'FILE_IMPORT'
);

CREATE TYPE media_type AS ENUM (
  'IMAGE',
  'VIDEO',
  'DOCUMENT',
  'OTHER'
);

CREATE TYPE sync_state AS ENUM (
  'LOCAL_ONLY',
  'PENDING',
  'SYNCED',
  'FAILED',
  'CONFLICT'
);

CREATE TYPE project_status AS ENUM (
  'draft',
  'active',
  'archived'
);

CREATE TYPE local_mutation_operation AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'ARCHIVE'
);

CREATE TYPE local_mutation_entity_type AS ENUM (
  'Project',
  'Customer',
  'Site',
  'EvidenceItem',
  'MediaAsset',
  'Annotation',
  'Document',
  'ReportDraft'
);

CREATE TYPE server_mutation_status AS ENUM (
  'accepted',
  'duplicate',
  'rejected',
  'conflict'
);

CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  external_auth_id text NOT NULL,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE UNIQUE INDEX uniq_users_external_auth_id
  ON users (external_auth_id);

CREATE TABLE organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX idx_organization_members_user
  ON organization_members (user_id);

CREATE TABLE customers (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  server_version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE INDEX idx_customers_organization
  ON customers (organization_id);

CREATE UNIQUE INDEX uniq_customers_org_id
  ON customers (organization_id, id);

CREATE TABLE sites (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  customer_id uuid REFERENCES customers(id),
  name text,
  address text,
  server_version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE INDEX idx_sites_organization
  ON sites (organization_id);

CREATE INDEX idx_sites_customer
  ON sites (customer_id);

CREATE TABLE projects (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  customer_id uuid REFERENCES customers(id),
  site_id uuid REFERENCES sites(id),
  name text NOT NULL,
  customer_company text,
  site_address text,
  work_order_reference text,
  scheduled_date text,
  notes text,
  status project_status NOT NULL DEFAULT 'active',
  server_version integer NOT NULL DEFAULT 1,
  archived_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE INDEX idx_projects_organization_updated
  ON projects (organization_id, updated_at);

CREATE INDEX idx_projects_customer
  ON projects (customer_id);

CREATE INDEX idx_projects_site
  ON projects (site_id);

CREATE TABLE evidence_items (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  category evidence_category NOT NULL,
  title text,
  caption text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  capture_timestamp timestamp with time zone NOT NULL,
  server_version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE INDEX idx_evidence_project_order
  ON evidence_items (project_id, capture_timestamp, sort_order);

CREATE INDEX idx_evidence_organization
  ON evidence_items (organization_id);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  evidence_item_id uuid NOT NULL REFERENCES evidence_items(id),
  storage_object_key text,
  media_type media_type NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  sha256 text NOT NULL,
  width integer,
  height integer,
  caption text,
  notes text,
  capture_timestamp timestamp with time zone NOT NULL,
  source_type media_source_type NOT NULL,
  original_asset_id text,
  derivative_type text,
  is_original boolean NOT NULL DEFAULT true,
  uploaded_at timestamp with time zone,
  server_version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT media_assets_sha256_hex CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT media_assets_size_nonnegative CHECK (size_bytes >= 0)
);

CREATE INDEX idx_media_assets_evidence
  ON media_assets (evidence_item_id);

CREATE INDEX idx_media_assets_organization
  ON media_assets (organization_id);

CREATE INDEX idx_media_assets_org_sha
  ON media_assets (organization_id, sha256);

CREATE TABLE annotations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  evidence_item_id uuid NOT NULL REFERENCES evidence_items(id),
  media_asset_id uuid REFERENCES media_assets(id),
  body text NOT NULL,
  server_version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE INDEX idx_annotations_evidence
  ON annotations (evidence_item_id);

CREATE INDEX idx_annotations_media
  ON annotations (media_asset_id);

CREATE TABLE documents (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  evidence_item_id uuid REFERENCES evidence_items(id),
  title text NOT NULL,
  notes text,
  server_version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE INDEX idx_documents_project
  ON documents (project_id);

CREATE INDEX idx_documents_evidence
  ON documents (evidence_item_id);

CREATE TABLE report_drafts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  title text NOT NULL,
  notes text,
  sections_json jsonb NOT NULL,
  status text NOT NULL,
  generated_pdf_object_key text,
  generated_at timestamp with time zone,
  server_version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE INDEX idx_report_drafts_project_updated
  ON report_drafts (project_id, updated_at);

CREATE INDEX idx_report_drafts_organization
  ON report_drafts (organization_id);

CREATE TABLE received_local_mutations (
  mutation_id text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  device_id text NOT NULL,
  entity_type local_mutation_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  operation local_mutation_operation NOT NULL,
  payload_ref text NOT NULL,
  payload_json jsonb NOT NULL,
  client_created_at timestamp with time zone NOT NULL,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  status server_mutation_status NOT NULL DEFAULT 'accepted',
  rejection_code text
);

CREATE INDEX idx_received_mutations_org_received
  ON received_local_mutations (organization_id, received_at);

CREATE INDEX idx_received_mutations_entity
  ON received_local_mutations (organization_id, entity_type, entity_id);

CREATE TABLE sync_conflicts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  mutation_id text NOT NULL REFERENCES received_local_mutations(mutation_id),
  entity_type local_mutation_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  client_payload_json jsonb NOT NULL,
  server_payload_json jsonb NOT NULL,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_conflicts_org
  ON sync_conflicts (organization_id, created_at);

CREATE INDEX idx_sync_conflicts_entity
  ON sync_conflicts (organization_id, entity_type, entity_id);
