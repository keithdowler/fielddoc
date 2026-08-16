ALTER TABLE organizations
  ADD COLUMN external_auth_id text;

CREATE UNIQUE INDEX uniq_organizations_external_auth_id
  ON organizations (external_auth_id);
