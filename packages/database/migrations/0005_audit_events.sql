CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),
  actor_user_id uuid REFERENCES users(id),
  actor_external_id text,
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_org_created
  ON audit_events (organization_id, created_at);

CREATE INDEX idx_audit_events_entity
  ON audit_events (entity_type, entity_id);

CREATE INDEX idx_audit_events_type_created
  ON audit_events (event_type, created_at);
