import { Pool, types } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'

// Postgres devuelve numeric/int8 como string. Los convertimos a numero para
// que el frontend pueda hacer .toFixed() etc. sin crashear.
types.setTypeParser(1700, (v: string) => (v == null ? null : Number(v))) // numeric
types.setTypeParser(20, (v: string) => (v == null ? null : Number(v))) // int8 / bigint

type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert'
type Filter = [string, string, unknown]

interface Body {
  op: Op
  table: string
  columns?: string
  filters?: Filter[]
  order?: { column: string; ascending?: boolean }[]
  limit?: number
  single?: boolean
  maybeSingle?: boolean
  data?: Record<string, unknown> | Record<string, unknown>[]
  onConflict?: string
}

interface AuthContext {
  userId: string
  email: string | null
  profileId: string | null
  isAdmin: boolean
  userType: string | null
}

// ─── Gating por rol (suscripciones) ───
// Fabricante = premium | manufacturer (ambos nombres existen en subscription_tiers).
const OEM_ROLES = new Set(['professional', 'premium', 'manufacturer'])
const WORKSHOP_ROLES = new Set(['workshop', 'professional', 'premium', 'manufacturer'])
type RedactCtx = { userType: string | null; isAdmin: boolean }
const canOEM = (c: RedactCtx) => c.isAdmin || (!!c.userType && OEM_ROLES.has(c.userType))
const canWS = (c: RedactCtx) => c.isAdmin || (!!c.userType && WORKSHOP_ROLES.has(c.userType))

function redactSchema(row: Record<string, unknown>, c: RedactCtx): Record<string, unknown> {
  const oem = canOEM(c), ws = canWS(c)
  if (oem && ws) return row
  const out: Record<string, unknown> = { ...row }
  if (!ws) {
    out.despiece = []
    out.cost_breakdown = {}
    out.reference_photos = []
    out.total_estimated_cost = null
    out.total_estimated_hours = null
    out.total_materials_count = null
    out.related_video_url = null // sección E = Taller+
  }
  const comps = row.components
  if (comps && typeof comps === 'object') {
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(comps as Record<string, Record<string, unknown>>)) {
      const cc = { ...v }
      if (!oem) delete cc.oem_ref
      if (!ws) { delete cc.material_cost; delete cc.total_cost; delete cc.fabrication_hours }
      clean[k] = cc
    }
    out.components = clean
  }
  return out
}
function redactPart(row: Record<string, unknown>, c: RedactCtx): Record<string, unknown> {
  if (canOEM(c)) return row
  return { ...row, oem_ref: null }
}
function redactDiagram(row: Record<string, unknown>, c: RedactCtx): Record<string, unknown> {
  if (canWS(c)) return row
  return { ...row, total_estimated_cost: null }
}
const REDACTORS: Record<string, (r: Record<string, unknown>, c: RedactCtx) => Record<string, unknown>> = {
  exhaust_schemas: redactSchema,
  exhaust_parts: redactPart,
  exhaust_diagrams: redactDiagram,
}

interface Rule {
  read: 'public' | 'authed' | 'admin'
  write: 'public' | 'authed' | 'admin'
  ownerColumn?: string
}

const RULES: Record<string, Rule> = {
  aftermarket_brands: { read: 'public', write: 'admin' },
  exhaust_schemas: { read: 'public', write: 'admin' },
  schema_brand_suggestions: { read: 'public', write: 'admin' },
  schema_article_links: { read: 'public', write: 'admin' },
  articles: { read: 'public', write: 'admin' },
  manuals: { read: 'public', write: 'admin' },
  subscription_tiers: { read: 'public', write: 'admin' },
  catalog_sources: { read: 'public', write: 'admin' },
  user_profiles: { read: 'authed', write: 'authed', ownerColumn: 'id' },
  user_subscriptions: { read: 'authed', write: 'admin' },
  transactions: { read: 'authed', write: 'authed' },
  quote_requests: { read: 'authed', write: 'authed', ownerColumn: 'user_id' },
  quotes: { read: 'authed', write: 'authed' },
  invoices: { read: 'authed', write: 'authed' },
  professional_products: { read: 'public', write: 'authed', ownerColumn: 'professional_id' },
  workshop_services: { read: 'public', write: 'authed', ownerColumn: 'workshop_id' },
  design_3d: { read: 'authed', write: 'authed', ownerColumn: 'uploaded_by' },
  supplier_api_keys: { read: 'authed', write: 'authed', ownerColumn: 'user_id' },
  supplier_sync_logs: { read: 'authed', write: 'authed', ownerColumn: 'user_id' },
  user_documents: { read: 'authed', write: 'authed', ownerColumn: 'user_id' },
  // === v2: catálogo relacional según dossier cliente ===
  vehicles: { read: 'public', write: 'admin' },
  engines: { read: 'public', write: 'admin' },
  exhaust_diagrams: { read: 'public', write: 'admin' },
  exhaust_architectures: { read: 'public', write: 'admin' },
  exhaust_parts: { read: 'public', write: 'admin' },
  compatibilities: { read: 'public', write: 'admin' },
  exhaust_aftermarket_products: { read: 'public', write: 'admin' },
  sources: { read: 'public', write: 'admin' },
  qa_reviews: { read: 'admin', write: 'admin' },
  // === v3 marketplace ===
  marketplace_orders: { read: 'authed', write: 'authed' },
  marketplace_order_items: { read: 'authed', write: 'authed' },
  marketplace_messages: { read: 'authed', write: 'authed' },
  wallets: { read: 'authed', write: 'admin', ownerColumn: 'user_id' },
  wallet_transactions: { read: 'authed', write: 'admin', ownerColumn: 'user_id' },
}

const ALLOWED_FILTER_OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is', 'contains', 'overlaps'])

function ident(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`bad identifier: ${name}`)
  return `"${name}"`
}

function buildWhere(filters: Filter[], values: unknown[]): string {
  if (!filters?.length) return ''
  const parts = filters.map(([col, op, val]) => {
    if (!ALLOWED_FILTER_OPS.has(op)) throw new Error(`bad op ${op}`)
    const id = ident(col)
    if (op === 'is') return val === null ? `${id} IS NULL` : `${id} IS NOT NULL`
    if (op === 'in') {
      const arr = Array.isArray(val) ? val : [val]
      if (!arr.length) return 'FALSE'
      const ph = arr.map((v) => { values.push(v); return `$${values.length}` })
      return `${id} IN (${ph.join(',')})`
    }
    values.push(val)
    const map: Record<string, string> = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'LIKE', ilike: 'ILIKE', contains: '@>', overlaps: '&&' }
    return `${id} ${map[op]} $${values.length}`
  })
  return ` WHERE ${parts.join(' AND ')}`
}

function buildOrder(order: Body['order']): string {
  if (!order?.length) return ''
  return ' ORDER BY ' + order.map((o) => `${ident(o.column)} ${o.ascending === false ? 'DESC' : 'ASC'}`).join(',')
}

function buildSelect(columns?: string): string {
  if (!columns || columns === '*') return '*'
  const flat = columns.split(',').map((c) => c.trim()).filter((c) => c && !c.includes('('))
  // Si incluye '*' (p.ej. selects anidados tipo "*, articles(*)" no soportados),
  // devolvemos todas las columnas en vez de lanzar "bad identifier: *".
  if (!flat.length || flat.includes('*')) return '*'
  return flat.map(ident).join(',')
}

async function getAuth(req: Request, pool: Pool): Promise<AuthContext | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return null
  try {
    const payload = (await verifyToken(header.slice(7), { secretKey: secret })) as { sub: string; email?: string }
    const result = await pool.query(
      `SELECT id, is_admin, user_type FROM public.user_profiles WHERE clerk_user_id = $1 OR (clerk_user_id IS NULL AND email = $2) LIMIT 1`,
      [payload.sub, payload.email ?? ''],
    )
    return {
      userId: payload.sub,
      email: payload.email ?? null,
      profileId: result.rows[0]?.id ?? null,
      isAdmin: Boolean(result.rows[0]?.is_admin),
      userType: (result.rows[0]?.user_type as string) ?? null,
    }
  } catch {
    return null
  }
}

function canRead(table: string, auth: AuthContext | null): boolean {
  const r = RULES[table]
  if (!r) return false
  if (r.read === 'public') return true
  if (!auth) return false
  return r.read === 'admin' ? auth.isAdmin : true
}

function canWrite(table: string, auth: AuthContext | null, row?: Record<string, unknown>): boolean {
  const r = RULES[table]
  if (!r) return false
  if (!auth) return false
  if (r.write === 'admin') return auth.isAdmin
  if (r.write === 'public') return true
  if (auth.isAdmin) return true
  if (r.ownerColumn && row) return row[r.ownerColumn] === auth.profileId
  return true
}

function ownerFilter(table: string, auth: AuthContext | null): { column: string; value: string } | null {
  const r = RULES[table]
  if (!r || !r.ownerColumn || !auth || auth.isAdmin) return null
  if (r.read === 'public') return null
  return { column: r.ownerColumn, value: auth.profileId ?? '__no_profile__' }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export async function POST(req: Request): Promise<Response> {
  let pool: Pool | null = null
  try {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) return json({ data: null, error: { message: 'DATABASE_URL not set' } }, 500)
    pool = new Pool({ connectionString: dbUrl })

    const auth = await getAuth(req, pool)
    const body = (await req.json()) as Body
    if (!RULES[body.table]) return json({ data: null, error: { message: `unknown table ${body.table}` } }, 404)

    if (body.op === 'select') {
      if (!canRead(body.table, auth)) return json({ data: null, error: { message: 'forbidden' } }, 403)
      const filters: Filter[] = [...(body.filters ?? [])]
      const oFilter = ownerFilter(body.table, auth)
      if (oFilter) filters.push([oFilter.column, 'eq', oFilter.value])
      const values: unknown[] = []
      const where = buildWhere(filters, values)
      const order = buildOrder(body.order)
      const limit = body.limit ? ` LIMIT ${Number(body.limit)}` : ''
      const single = body.single || body.maybeSingle
      const q = `SELECT ${buildSelect(body.columns)} FROM ${ident(body.table)}${where}${order}${single ? ' LIMIT 2' : limit}`
      const rawRows = (await pool.query(q, values)).rows as Record<string, unknown>[]
      // Gating por rol (suscripciones): recorta campos sensibles según el tier del token.
      const redactor: ((r: Record<string, unknown>, c: RedactCtx) => Record<string, unknown>) | undefined = REDACTORS[body.table]
      const ctx: RedactCtx = { userType: auth?.userType ?? null, isAdmin: Boolean(auth?.isAdmin) }
      const rows = redactor && !ctx.isAdmin ? rawRows.map((r) => redactor(r, ctx)) : rawRows
      if (body.single) {
        if (rows.length === 0) return json({ data: null, error: { message: 'no rows' } }, 404)
        if (rows.length > 1) return json({ data: null, error: { message: 'multiple rows' } }, 406)
        return json({ data: rows[0], error: null })
      }
      if (body.maybeSingle) return json({ data: rows[0] ?? null, error: null })
      return json({ data: rows, error: null })
    }

    if (!canWrite(body.table, auth)) return json({ data: null, error: { message: 'forbidden' } }, 403)

    if (body.op === 'insert' || body.op === 'upsert') {
      const rows = Array.isArray(body.data) ? body.data : [body.data]
      if (!rows.length) return json({ data: [], error: null })
      const cols = Object.keys(rows[0] ?? {})
      if (!cols.length) return json({ data: null, error: { message: 'no columns' } }, 400)
      for (const r of rows) {
        if (!canWrite(body.table, auth, r as Record<string, unknown>)) {
          return json({ data: null, error: { message: 'forbidden' } }, 403)
        }
      }
      const values: unknown[] = []
      const valuesSql = rows.map((r) => {
        const ph = cols.map((c) => { values.push((r as Record<string, unknown>)[c]); return `$${values.length}` })
        return `(${ph.join(',')})`
      })
      let q = `INSERT INTO ${ident(body.table)} (${cols.map(ident).join(',')}) VALUES ${valuesSql.join(',')}`
      if (body.op === 'upsert' && body.onConflict) {
        const conflictCols = body.onConflict.split(',').map((c) => c.trim())
        const updates = cols.filter((c) => !conflictCols.includes(c)).map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`)
        q += ` ON CONFLICT (${conflictCols.map(ident).join(',')}) DO ${updates.length ? `UPDATE SET ${updates.join(',')}` : 'NOTHING'}`
      }
      q += ' RETURNING *'
      const result = (await pool.query(q, values)).rows as Record<string, unknown>[]
      return json({ data: (body.single || body.maybeSingle) ? (result[0] ?? null) : result, error: null })
    }

    if (body.op === 'update') {
      if (!body.data || Array.isArray(body.data)) return json({ data: null, error: { message: 'data must be object' } }, 400)
      const cols = Object.keys(body.data)
      if (!cols.length) return json({ data: null, error: { message: 'no columns' } }, 400)
      const values: unknown[] = []
      const sets = cols.map((c) => { values.push((body.data as Record<string, unknown>)[c]); return `${ident(c)} = $${values.length}` })
      const filters: Filter[] = [...(body.filters ?? [])]
      const oFilter = ownerFilter(body.table, auth)
      if (oFilter) filters.push([oFilter.column, 'eq', oFilter.value])
      const where = buildWhere(filters, values)
      const q = `UPDATE ${ident(body.table)} SET ${sets.join(',')}${where} RETURNING *`
      const result = (await pool.query(q, values)).rows as Record<string, unknown>[]
      return json({ data: (body.single || body.maybeSingle) ? (result[0] ?? null) : result, error: null })
    }

    if (body.op === 'delete') {
      const filters: Filter[] = [...(body.filters ?? [])]
      const oFilter = ownerFilter(body.table, auth)
      if (oFilter) filters.push([oFilter.column, 'eq', oFilter.value])
      if (!filters.length) return json({ data: null, error: { message: 'delete requires filters' } }, 400)
      const values: unknown[] = []
      const where = buildWhere(filters, values)
      const q = `DELETE FROM ${ident(body.table)}${where} RETURNING *`
      const result = (await pool.query(q, values)).rows as Record<string, unknown>[]
      return json({ data: (body.single || body.maybeSingle) ? (result[0] ?? null) : result, error: null })
    }

    return json({ data: null, error: { message: `unknown op ${body.op}` } }, 400)
  } catch (e) {
    console.error('db endpoint error', e)
    return json({ data: null, error: { message: (e as Error).message } }, 500)
  }
}
