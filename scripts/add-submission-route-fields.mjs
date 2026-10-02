// scripts/add-submission-route-fields.mjs
// Cambio 5: formulario colaboradores Ruta A/B multi-fase. El payload completo sigue en el blob
// jsonb `data` (retrocompatible); solo añadimos columnas de indexación/moderación y el enlace 3D.
// Idempotente.  node scripts/add-submission-route-fields.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const url = (env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) throw new Error('DATABASE_URL no encontrada')
const sql = neon(url)

await sql`ALTER TABLE public.schema_submissions ADD COLUMN IF NOT EXISTS route text`            // A | B-F1 | B-F2 | B-F3
await sql`ALTER TABLE public.schema_submissions ADD COLUMN IF NOT EXISTS case_code text`         // enlaza F1→F2→F3
await sql`ALTER TABLE public.schema_submissions ADD COLUMN IF NOT EXISTS scan_3d_url text`       // enlace de descarga del escaneo 3D suministrado
await sql`ALTER TABLE public.schema_submissions ADD COLUMN IF NOT EXISTS scan_3d_format text`    // STL/STEP/OBJ…
await sql`ALTER TABLE public.schema_submissions ADD COLUMN IF NOT EXISTS scan_3d_status text NOT NULL DEFAULT 'none'` // none|offered|published
await sql`ALTER TABLE public.schema_submissions ADD COLUMN IF NOT EXISTS published_design_3d_id uuid`

const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='schema_submissions' AND column_name IN ('route','case_code','scan_3d_url','scan_3d_format','scan_3d_status','published_design_3d_id') ORDER BY 1`
console.log('schema_submissions nuevas cols:', cols.map((c) => c.column_name).join(', '))
