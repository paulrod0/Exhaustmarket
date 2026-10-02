// scripts/add-schema-3d-links.mjs
// Daniel (14-sep) + Solicitud nº3 P2.4: relacionar archivos 3D (design_3d) con un esquema concreto,
// desde el editor. Muchos-a-muchos, misma forma que schema_manual_links. Idempotente.
//   node scripts/add-schema-3d-links.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const url = (env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) throw new Error('DATABASE_URL no encontrada')
const sql = neon(url)

await sql`
  CREATE TABLE IF NOT EXISTS public.schema_3d_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id uuid NOT NULL REFERENCES public.exhaust_schemas(id) ON DELETE CASCADE,
    design_3d_id uuid NOT NULL REFERENCES public.design_3d(id) ON DELETE CASCADE,
    display_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (schema_id, design_3d_id)
  )
`
await sql`CREATE INDEX IF NOT EXISTS idx_schema_3d_links_schema ON public.schema_3d_links (schema_id)`
await sql`CREATE INDEX IF NOT EXISTS idx_schema_3d_links_design ON public.schema_3d_links (design_3d_id)`

const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='schema_3d_links' ORDER BY ordinal_position`
console.log('schema_3d_links cols:', cols.map((c) => c.column_name).join(', '))
