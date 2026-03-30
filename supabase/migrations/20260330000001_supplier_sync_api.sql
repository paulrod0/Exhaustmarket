-- supabase/migrations/20260330000001_supplier_sync_api.sql

-- ─────────────────────────────────────────
-- supplier_api_keys
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,                        -- e.g. "WooCommerce Production"
  key_prefix    text NOT NULL,                        -- first 8 chars for display: "em_live_"
  key_hash      text NOT NULL UNIQUE,                 -- SHA-256 of full key
  is_active     boolean NOT NULL DEFAULT true,
  last_used_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE supplier_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own API keys"
  ON supplier_api_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- supplier_sync_logs
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_sync_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id        uuid REFERENCES supplier_api_keys(id) ON DELETE SET NULL,
  action            text NOT NULL CHECK (action IN ('full_sync','upsert','delete')),
  status            text NOT NULL CHECK (status IN ('success','error')),
  products_created  integer NOT NULL DEFAULT 0,
  products_updated  integer NOT NULL DEFAULT 0,
  products_deleted  integer NOT NULL DEFAULT 0,
  error_message     text,
  source_platform   text,                             -- e.g. 'woocommerce', 'shopify'
  started_at        timestamptz NOT NULL DEFAULT NOW(),
  completed_at      timestamptz
);

ALTER TABLE supplier_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sync logs"
  ON supplier_sync_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- Extend professional_products
-- ─────────────────────────────────────────
ALTER TABLE professional_products
  ADD COLUMN IF NOT EXISTS external_ref   text,       -- ID in the external system (e.g. WC post ID)
  ADD COLUMN IF NOT EXISTS source         text,       -- 'woocommerce' | 'shopify' | 'api' | null
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Unique constraint: one external_ref per supplier
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_external_ref
  ON professional_products (professional_id, external_ref)
  WHERE external_ref IS NOT NULL;
