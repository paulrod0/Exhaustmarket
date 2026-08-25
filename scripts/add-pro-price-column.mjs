// scripts/add-pro-price-column.mjs
// Añade professional_products.pro_price (numeric, nullable) para el "precio profesional"
// (descuentos pro del dossier). Idempotente. Lee DATABASE_URL de .env.new / .env.
//   node scripts/add-pro-price-column.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const url = (env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) throw new Error('DATABASE_URL no encontrada en .env.new / .env')

const sql = neon(url)
await sql`ALTER TABLE public.professional_products ADD COLUMN IF NOT EXISTS pro_price numeric(10,2)`
const c = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='professional_products' AND column_name='pro_price'`
console.log('professional_products.pro_price:', c.length ? `OK (${c[0].data_type})` : 'NO')
