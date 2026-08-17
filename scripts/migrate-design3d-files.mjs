import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) { try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ } }
const url = env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m)[1].trim().replace(/^["']|["']$/g, '')
const sql = neon(url)

await sql`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS files jsonb NOT NULL DEFAULT '[]'::jsonb`

await sql`
  UPDATE public.design_3d
  SET files = jsonb_build_array(jsonb_build_object('url', file_url, 'name', title, 'size', COALESCE(file_size, 0)))
  WHERE (files IS NULL OR files = '[]'::jsonb) AND file_url IS NOT NULL`

const rows = await sql`SELECT title, jsonb_array_length(files) AS nfiles FROM design_3d`
console.log('columna files añadida ✓')
console.log('filas:', JSON.stringify(rows))
