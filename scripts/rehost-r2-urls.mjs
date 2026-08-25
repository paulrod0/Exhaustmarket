// scripts/rehost-r2-urls.mjs
// Reescribe el host viejo de R2 (pub-....r2.dev) por un dominio propio en TODAS
// las columnas text / varchar / text[] / jsonb / json de la BD, incluido dentro
// de arrays y de objetos jsonb. Idempotente. Dry-run por defecto.
//
// Uso:
//   NEW_HOST=img.exhaustmarket.com node scripts/rehost-r2-urls.mjs           # dry-run
//   NEW_HOST=img.exhaustmarket.com node scripts/rehost-r2-urls.mjs --apply   # aplica
//   OLD_HOST=pub-xxxx.r2.dev NEW_HOST=img.exhaustmarket.com node ... --apply  # override host viejo
//
// Lee DATABASE_URL de .env.new / .env (como el resto de scripts/*.mjs).

import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env', '../.vercel/.env.preview.local']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const get = (k) => (env.match(new RegExp('^\\s*' + k + '\\s*=\\s*(.+)$', 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')

const DB = get('DATABASE_URL')
if (!DB) throw new Error('DATABASE_URL no encontrada en .env.new / .env')

// host viejo: por defecto el conocido; se puede sobreescribir por env.
// Sólo el HOST (sin esquema ni barra): así se preserva https:// y el path.
const OLD_HOST = (process.env.OLD_HOST || 'pub-b2988bed71a047d682612b1c34a547b0.r2.dev').trim()
const NEW_HOST = (process.env.NEW_HOST || '').trim()
const APPLY = process.argv.includes('--apply')

if (!NEW_HOST) throw new Error('Falta NEW_HOST (p.ej. NEW_HOST=img.exhaustmarket.com)')
if (/[/:]/.test(NEW_HOST) || /[/:]/.test(OLD_HOST)) throw new Error('OLD_HOST/NEW_HOST deben ser sólo host, sin esquema ni barra')

const sql = neon(DB)
// Ejecuta una query SQL literal (sin parámetros) a través del tagged-template.
const raw = (q) => { const t = [q]; t.raw = [q]; return sql(t) }
// Escapa comillas simples para incrustar literales en SQL.
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`

// Mapa udt_name -> tipo para castear de vuelta tras el replace textual.
const CAST = { text: 'text', varchar: 'varchar', bpchar: 'bpchar', _text: 'text[]', _varchar: 'varchar[]', jsonb: 'jsonb', json: 'json' }

console.log(`Rehost R2:  ${OLD_HOST}  ->  ${NEW_HOST}`)
console.log(APPLY ? '*** MODO APPLY (se escribirá en la BD) ***' : '(dry-run: sólo cuenta; usa --apply para escribir)\n')

// Descubre TODAS las columnas candidatas (auto-mantenible: no hay que listarlas a mano).
const cols = await sql`
  SELECT table_name, column_name, udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND udt_name IN ('text','varchar','bpchar','_text','_varchar','jsonb','json')
  ORDER BY table_name, column_name`

let totalCols = 0, totalRows = 0
for (const c of cols) {
  const { table_name: t, column_name: col, udt_name: udt } = c
  const cast = CAST[udt]
  if (!cast) continue
  const ref = `"${col}"`
  const like = `${ref}::text LIKE '%' || ${lit(OLD_HOST)} || '%'`

  const [{ n }] = await raw(`SELECT count(*)::int AS n FROM public."${t}" WHERE ${like}`)
  if (n === 0) continue
  totalCols++; totalRows += n
  console.log(`  ${t}.${col} (${udt}) -> ${n} fila(s)`)

  if (APPLY) {
    // replace SÓLO del host: preserva esquema/path y respeta URLs de otros hosts (p.ej. externas).
    const upd = `UPDATE public."${t}"
                 SET ${ref} = replace(${ref}::text, ${lit(OLD_HOST)}, ${lit(NEW_HOST)})::${cast}
                 WHERE ${like}`
    await raw(upd)
  }
}

console.log(`\n${APPLY ? 'APLICADO' : 'DRY-RUN'}: ${totalCols} columna(s), ${totalRows} fila(s) con el host viejo.`)
if (!APPLY && totalRows > 0) console.log('Repite con --apply para ejecutar el reemplazo.')
