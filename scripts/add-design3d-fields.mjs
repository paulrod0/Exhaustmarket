// scripts/add-design3d-fields.mjs
// Diseños 3D (cambio 2 del 10-sep): tipo de pieza cerrado + verificación por admin.
//   - part_type: selector cerrado (colector, downpipe, catalizador, fap_dpf, flexible,
//     tubo_intermedio, silencioso, valvulas, colas, otros).
//   - status: pending | approved | rejected. Los 3D ya existentes se marcan 'approved'
//     para no ocultarlos. Un 3D público de otro usuario solo se ve tras aprobación.
//   - reviewed_by / reviewed_at: auditoría de la verificación.
// (La imagen por diseño usa la columna thumbnail_url que YA existe.)
// Idempotente.  Uso:  node scripts/add-design3d-fields.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const url = (env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) throw new Error('DATABASE_URL no encontrada en .env.new / .env')
const sql = neon(url)

await sql`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS part_type text`
await sql`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'`
await sql`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS reviewed_by uuid`
await sql`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS reviewed_at timestamptz`
// No ocultar lo ya publicado: lo existente queda aprobado.
await sql`UPDATE public.design_3d SET status = 'approved' WHERE status = 'pending' AND created_at < now()`

const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='design_3d' AND column_name IN ('part_type','status','reviewed_by','reviewed_at') ORDER BY 1`
const counts = await sql`SELECT status, count(*)::int AS n FROM public.design_3d GROUP BY status ORDER BY 1`
console.log('design_3d nuevas columnas:', cols.map((c) => c.column_name).join(', '))
console.log('design_3d por status:', counts.map((c) => `${c.status}=${c.n}`).join(', '))
