import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) { try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ } }
const url = env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m)[1].trim().replace(/^["']|["']$/g, '')
const sql = neon(url)

// 1) Deduplicar internal_id (sufijo a la 2ª+ ocurrencia; no borra filas)
const fixed = await sql`
  WITH ranked AS (
    SELECT id, internal_id,
           row_number() OVER (PARTITION BY internal_id ORDER BY created_at, id) AS rn
    FROM vehicles
    WHERE internal_id IN (SELECT internal_id FROM vehicles GROUP BY internal_id HAVING count(*) > 1)
  )
  UPDATE vehicles v
  SET internal_id = v.internal_id || '-' || r.rn
  FROM ranked r
  WHERE v.id = r.id AND r.rn > 1
  RETURNING v.internal_id`
console.log('internal_id renombrados:', JSON.stringify(fixed.map((f) => f.internal_id)))

// 2) Añadir el UNIQUE constraint que necesita el importador CSV (ON CONFLICT internal_id)
await sql`ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_internal_id_unique UNIQUE (internal_id)`
console.log('constraint vehicles_internal_id_unique añadido ✓')

const dups = await sql`SELECT internal_id FROM vehicles GROUP BY internal_id HAVING count(*) > 1`
console.log('duplicados restantes:', dups.length)
