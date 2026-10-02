// scripts/add-api-webhooks.mjs
// Solicitud nº3 — F2 (API de datos) + F3 (webhooks salientes).
//  - api_keys: una clave por integración (Bearer), lectura o lectura+escritura, revocable. Solo se
//    guarda el HASH (sha256) + un prefijo visible; la clave en claro se muestra UNA vez al crearla.
//  - api_call_log: registro de cada llamada (clave, fecha, endpoint, nº de registros, resultado).
//  - webhooks + webhook_deliveries: avisos HTTP firmados (HMAC) con reintentos y registro de entregas.
// Idempotente.   node scripts/add-api-webhooks.mjs
import { readFileSync } from 'node:fs'
import { Pool } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const url = (env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) throw new Error('DATABASE_URL no encontrada')
const pool = new Pool({ connectionString: url })
const q = (s, p) => pool.query(s, p)

await q(`CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                       -- nombre de la integración (va al origen: api:<name>)
  key_prefix text NOT NULL,                 -- primeros caracteres, para reconocerla en el admin
  key_hash text NOT NULL UNIQUE,            -- sha256(clave) en hex; la clave en claro NO se guarda
  scope text NOT NULL DEFAULT 'read',       -- read | read_write
  created_by text,
  created_by_profile uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_used_at timestamptz,
  CONSTRAINT api_keys_scope_chk CHECK (scope IN ('read','read_write')),
  CONSTRAINT api_keys_name_chk CHECK (name ~ '^[a-z0-9][a-z0-9_-]{1,40}$')
)`)
await q(`CREATE UNIQUE INDEX IF NOT EXISTS ux_api_keys_name_active ON public.api_keys (name) WHERE revoked_at IS NULL`)

await q(`CREATE TABLE IF NOT EXISTS public.api_call_log (
  id bigserial PRIMARY KEY,
  key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  method text NOT NULL,
  path text NOT NULL,
  entity text,
  records int NOT NULL DEFAULT 0,
  status int NOT NULL,
  error text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
)`)
await q(`CREATE INDEX IF NOT EXISTS ix_api_call_log_key ON public.api_call_log (key_id, created_at DESC)`)
await q(`CREATE INDEX IF NOT EXISTS ix_api_call_log_created ON public.api_call_log (created_at DESC)`)

await q(`CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,                     -- para firmar (HMAC-SHA256); se muestra una vez al crearlo
  events text[] NOT NULL DEFAULT '{}',      -- vacío = todos
  active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_delivery_at timestamptz,
  last_status int,
  CONSTRAINT webhooks_url_chk CHECK (url ~ '^https?://')
)`)
await q(`CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',   -- pending | delivered | failed
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_response_code int,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
)`)
await q(`CREATE INDEX IF NOT EXISTS ix_webhook_deliveries_due ON public.webhook_deliveries (next_attempt_at) WHERE status = 'pending'`)
await q(`CREATE INDEX IF NOT EXISTS ix_webhook_deliveries_hook ON public.webhook_deliveries (webhook_id, created_at DESC)`)

for (const t of ['api_keys', 'api_call_log', 'webhooks', 'webhook_deliveries']) {
  const n = (await q(`SELECT count(*)::int n FROM information_schema.columns WHERE table_name = $1`, [t])).rows[0].n
  console.log(`${t}: ${n} columnas`)
}
await pool.end()
