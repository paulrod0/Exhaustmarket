// scripts/add-quote-visit-fase1.mjs
// Cambio 5/9 — Módulo de visita de diagnóstico, FASE 1 (ampliar formulario del cliente +
// multi-taller + 4 acciones del taller, SIN pagos). Todo aditivo/retrocompatible.
//   node scripts/add-quote-visit-fase1.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const url = (env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) throw new Error('DATABASE_URL no encontrada')
const sql = neon(url)

// quote_requests: multi-taller (request_group_id agrupa las N solicitudes de un mismo envío) +
// campos ampliados del formulario del cliente (5.1 del PDF).
await sql`ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS request_group_id uuid`
await sql`ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb`
await sql`ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS exhaust_zone text`
await sql`ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS work_type text`
await sql`ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS location text`
await sql`ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS budget_preference text`
await sql`CREATE INDEX IF NOT EXISTS idx_quote_requests_group ON public.quote_requests (request_group_id)`

// quotes: tipo de respuesta del taller (4 acciones). 'direct' = presupuesto directo (con precio),
// 'need_info' = pedir más info, 'visit_request' = solicitar visita (el detalle/cobro es Fase 2).
await sql`ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS response_type text NOT NULL DEFAULT 'direct'`
// El precio pasa a ser opcional (need_info/visit_request no llevan precio todavía).
await sql`ALTER TABLE public.quotes ALTER COLUMN price DROP NOT NULL`

const qr = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='quote_requests' AND column_name IN ('request_group_id','media_urls','exhaust_zone','work_type','location','budget_preference') ORDER BY 1`
const q = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='quotes' AND column_name='response_type'`
console.log('quote_requests nuevas:', qr.map((c) => c.column_name).join(', '))
console.log('quotes.response_type:', q.length ? 'OK' : 'FALTA')
