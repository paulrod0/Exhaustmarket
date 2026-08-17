import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env', '../.vercel/.env.preview.local']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const m = env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m)
if (!m) throw new Error('DATABASE_URL no encontrada en .env*')
const url = m[1].trim().replace(/^["']|["']$/g, '')
const sql = neon(url)

await sql`ALTER TABLE public.exhaust_parts ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}'`
await sql`ALTER TABLE public.exhaust_parts ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`

const cols = await sql`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'exhaust_parts' AND column_name IN ('images', 'is_active')
  ORDER BY column_name`
console.log('OK migración exhaust_parts:')
for (const c of cols) console.log(' -', c.column_name, '·', c.data_type, '· default', c.column_default)
