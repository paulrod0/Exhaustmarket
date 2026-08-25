import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) { try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ } }
const url = env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m)[1].trim().replace(/^["']|["']$/g, '')
const sql = neon(url)

await sql`ALTER TABLE public.exhaust_schemas ADD COLUMN IF NOT EXISTS emissions text`
const c = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'exhaust_schemas' AND column_name = 'emissions'`
console.log('columna exhaust_schemas.emissions:', c.length ? 'OK ✓' : 'NO')
