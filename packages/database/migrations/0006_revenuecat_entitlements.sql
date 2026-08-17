DO $$ BEGIN
  CREATE TYPE subscription_entitlement_status AS ENUM ('active', 'inactive', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS revenuecat_webhook_events (
  id uuid PRIMARY KEY,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  app_user_id text NOT NULL,
  product_id text,
  entitlement_ids_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  payload_json jsonb NOT NULL,
  received_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_revenuecat_webhook_provider_event
  ON revenuecat_webhook_events (provider_event_id);

CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_app_user_received
  ON revenuecat_webhook_events (app_user_id, received_at);

CREATE TABLE IF NOT EXISTS subscription_entitlements (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES users(id),
  provider text NOT NULL DEFAULT 'revenuecat',
  provider_customer_id text NOT NULL,
  entitlement_id text NOT NULL,
  status subscription_entitlement_status NOT NULL,
  product_id text,
  store text,
  environment text,
  original_transaction_id text,
  purchased_at timestamp with time zone,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  last_event_at timestamp with time zone NOT NULL,
  payload_json jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_subscription_entitlements_provider_customer
  ON subscription_entitlements (provider, provider_customer_id, entitlement_id);

CREATE INDEX IF NOT EXISTS idx_subscription_entitlements_org_status
  ON subscription_entitlements (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_subscription_entitlements_user
  ON subscription_entitlements (user_id);
