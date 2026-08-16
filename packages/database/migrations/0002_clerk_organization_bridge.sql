ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS external_auth_id text;

UPDATE organizations
SET external_auth_id = 'legacy-' || id::text
WHERE external_auth_id IS NULL;

ALTER TABLE organizations
  ALTER COLUMN external_auth_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_organizations_external_auth_id
  ON organizations (external_auth_id);
