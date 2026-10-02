// scripts/add-schema-manual-links.mjs
// Cambio 4 (10-sep): relacionar MANUALES a cada esquema (muchos-a-muchos), igual que las guías.
// Clona la forma de schema_article_links. Idempotente.
//   node scripts/add-schema-manual-links.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const url = (env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) throw new Error('DATABASE_URL no encontrada en .env.new / .env')
const sql = neon(url)

await sql`
  CREATE TABLE IF NOT EXISTS public.schema_manual_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id uuid NOT NULL REFERENCES public.exhaust_schemas(id) ON DELETE CASCADE,
    manual_id uuid NOT NULL REFERENCES public.manuals(id) ON DELETE CASCADE,
    display_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (schema_id, manual_id)
  )
`
await sql`CREATE INDEX IF NOT EXISTS idx_schema_manual_links_schema ON public.schema_manual_links (schema_id)`
await sql`CREATE INDEX IF NOT EXISTS idx_schema_manual_links_manual ON public.schema_manual_links (manual_id)`

const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='schema_manual_links' ORDER BY ordinal_position`
console.log('schema_manual_links cols:', cols.map((c) => c.column_name).join(', '))
