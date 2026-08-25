// scripts/add-location-columns.mjs
// Añade address/latitude/longitude a user_profiles (mapa de talleres). Idempotente.
//   node scripts/add-location-columns.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
let env = ''
for (const f of ['../.env.new', '../.env']) { try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ } }
const url = (env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) throw new Error('DATABASE_URL no encontrada en .env.new / .env')
const sql = neon(url)
await sql`ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address text`
await sql`ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS latitude numeric`
await sql`ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS longitude numeric`
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' AND column_name IN ('address','latitude','longitude') ORDER BY 1`
console.log('user_profiles location cols:', cols.map((c) => c.column_name).join(', '))
