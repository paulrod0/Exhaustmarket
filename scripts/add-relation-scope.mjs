// scripts/add-relation-scope.mjs
// Solicitud nº3 — F3 (P2): relaciones N:N contenido ↔ motorización con alcance.
//   scope = 'schema'  → solo esa motorización (lo de siempre)
//   scope = 'modelo'  → todas las motorizaciones del mismo modelo (misma marca + modelo)
// Idempotente.   node scripts/add-relation-scope.mjs
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

for (const t of ['schema_article_links', 'schema_manual_links', 'schema_3d_links']) {
  await q(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'schema'`)
  const has = (await q(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [`${t}_scope_chk`])).rows.length
  if (!has) await q(`ALTER TABLE public.${t} ADD CONSTRAINT ${t}_scope_chk CHECK (scope IN ('schema','modelo'))`)
  const r = (await q(`SELECT scope, count(*)::int n FROM public.${t} GROUP BY 1`)).rows
  console.log(t, JSON.stringify(r))
}
// Para resolver "todas las motorizaciones del modelo" rápido.
await q(`CREATE INDEX IF NOT EXISTS ix_exhaust_schemas_brand_model ON public.exhaust_schemas (lower(brand), lower(model))`)
await pool.end()
