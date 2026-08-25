// scripts/rehost-r2-proxy.mjs
// Reescribe las URLs públicas viejas de R2 (https://pub-....r2.dev/<key>) para que
// apunten al PROXY de Vercel (<PROXY_BASE>/api/img/<key>), que lee de R2 por la API
// S3 (sin el rate-limit de r2.dev) y deja que el CDN de Vercel cachee.
//
// A diferencia de rehost-r2-urls.mjs (que sólo cambia el HOST), aquí insertamos el
// segmento "/api/img/" antes de la key, preservando la key intacta detrás.
// Idempotente (tras reescribir, el valor ya no contiene el host viejo). Dry-run por defecto.
//
// Uso:
//   PROXY_BASE=https://exhaustmarket.vercel.app node scripts/rehost-r2-proxy.mjs           # dry-run
//   PROXY_BASE=https://exhaustmarket.vercel.app node scripts/rehost-r2-proxy.mjs --apply   # aplica
//   OLD_HOST=pub-xxxx.r2.dev PROXY_BASE=https://mi.dominio node ... --apply                # override host viejo
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

const OLD_HOST = (process.env.OLD_HOST || 'pub-b2988bed71a047d682612b1c34a547b0.r2.dev').trim()
let PROXY_BASE = (process.env.PROXY_BASE || '').trim()
const APPLY = process.argv.includes('--apply')

if (/[/:]/.test(OLD_HOST)) throw new Error('OLD_HOST debe ser sólo host, sin esquema ni barra')
if (!PROXY_BASE) throw new Error('Falta PROXY_BASE (p.ej. PROXY_BASE=https://exhaustmarket.vercel.app)')
if (!/^https?:\/\//.test(PROXY_BASE)) throw new Error('PROXY_BASE debe incluir el esquema (https://...)')
PROXY_BASE = PROXY_BASE.replace(/\/+$/, '') // sin barra final

// Prefijo viejo completo (esquema+host+barra) y prefijo nuevo (base + /api/img/).
const OLD_PREFIX = `https://${OLD_HOST}/`
const NEW_PREFIX = `${PROXY_BASE}/api/img/`

const sql = neon(DB)
const raw = (q) => { const t = [q]; t.raw = [q]; return sql(t) }
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`

const CAST = { text: 'text', varchar: 'varchar', bpchar: 'bpchar', _text: 'text[]', _varchar: 'varchar[]', jsonb: 'jsonb', json: 'json' }

console.log(`Rehost R2 -> proxy Vercel:`)
console.log(`  ${OLD_PREFIX}<key>  ->  ${NEW_PREFIX}<key>`)
console.log(APPLY ? '*** MODO APPLY (se escribirá en la BD) ***\n' : '(dry-run: sólo cuenta; usa --apply para escribir)\n')

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
    // Sustituye el prefijo completo (esquema+host+barra) por el prefijo del proxy,
    // preservando la key. El roundtrip a text[]/jsonb es seguro: NEW_PREFIX no lleva
    // metacaracteres de array/JSON. Sólo toca URLs del host viejo (otras no se tocan).
    const upd = `UPDATE public."${t}"
                 SET ${ref} = replace(${ref}::text, ${lit(OLD_PREFIX)}, ${lit(NEW_PREFIX)})::${cast}
                 WHERE ${like}`
    await raw(upd)
  }
}

console.log(`\n${APPLY ? 'APLICADO' : 'DRY-RUN'}: ${totalCols} columna(s), ${totalRows} fila(s) con el host viejo.`)
if (!APPLY && totalRows > 0) console.log('Repite con --apply para ejecutar el reemplazo.')
