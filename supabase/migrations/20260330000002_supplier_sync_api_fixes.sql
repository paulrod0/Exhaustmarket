-- supabase/migrations/20260330000002_supplier_sync_api_fixes.sql
-- Fixes for supplier_sync_api migration: INSERT policy + indexes

-- INSERT policy for supplier_sync_logs
-- (Edge Functions use service_role which bypasses RLS, but authenticated
--  users also need INSERT for future direct access)
CREATE POLICY "Users insert own sync logs"
  ON supplier_sync_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_supplier_sync_logs_user_id
  ON supplier_sync_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_supplier_sync_logs_api_key_id
  ON supplier_sync_logs (api_key_id)
  WHERE api_key_id IS NOT NULL;
