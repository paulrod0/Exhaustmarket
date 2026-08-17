import { Pool } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'

const READABLE = new Set([
  'vehicles', 'engines', 'exhaust_diagrams', 'exhaust_parts',
  'exhaust_aftermarket_products', 'compatibilities',
  'aftermarket_brands', 'subscription_tiers',
])
const WRITABLE = new Set([
  'vehicles', 'engines', 'exhaust_parts', 'exhaust_aftermarket_products',
])

/**
 * Endpoint combinado para CSV. GET ?op=export&table=… descarga, POST ?op=import&table=…
 * importa.
 */
export async function GET(req: Request): Promise<Response> {
  return handleExport(req)
}

export async function POST(req: Request): Promise<Response> {
  return handleImport(req)
}

async function handleExport(req: Request): Promise<Response> {
  try {
    const auth = await getAdminAuth(req)
    if (!auth.isAdmin) return text('forbidden', 403)

    const url = new URL(req.url)
    const table = url.searchParams.get('table') ?? ''
    const format = (url.searchParams.get('format') ?? 'csv').toLowerCase()
    const statusFilter = url.searchParams.get('status')
    if (!READABLE.has(table)) return text(`unknown table: ${table}`, 400)

    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const where = statusFilter ? ` WHERE status = $1` : ''
    const args = statusFilter ? [statusFilter] : []
    const result = await pool.query(`SELECT * FROM public.${table}${where}`, args)
    const rows = result.rows as Record<string, unknown>[]

    if (format === 'json') {
      return new Response(JSON.stringify(rows, null, 2), {
        headers: {
          'content-type': 'application/json',
          'content-disposition': `attachment; filename="${table}-${stamp()}.json"`,
        },
      })
    }
    if (rows.length === 0) {
      return new Response('(empty)', {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="${table}-${stamp()}.csv"`,
        },
      })
    }
    const cols = Object.keys(rows[0])
    const lines: string[] = [cols.map(csvCell).join(',')]
    for (const r of rows) lines.push(cols.map((c) => csvCell(r[c])).join(','))
    return new Response(lines.join('\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${table}-${stamp()}.csv"`,
      },
    })
  } catch (e) {
    return text((e as Error).message, 500)
  }
}

async function handleImport(req: Request): Promise<Response> {
  try {
    const auth = await getAdminAuth(req)
    if (!auth.isAdmin) return json({ error: 'forbidden' }, 403)

    const url = new URL(req.url)
    const table = url.searchParams.get('table') ?? ''
    const conflict = url.searchParams.get('conflict')
    if (!WRITABLE.has(table)) return json({ error: `unknown table: ${table}` }, 400)

    const csv = await req.text()
    if (!csv.trim()) return json({ error: 'empty body' }, 400)
    const rows = parseCsv(csv)
    if (rows.length < 2) return json({ error: 'CSV needs header + at least 1 row' }, 400)

    const headers = rows[0].map((h) => h.trim()).filter(Boolean)
    if (headers.length === 0) return json({ error: 'no headers' }, 400)

    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const inserted: number[] = []
    const errors: { row: number; error: string }[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row.every((c) => !c.trim())) continue
      const data: Record<string, unknown> = {}
      headers.forEach((h, idx) => {
        const v = row[idx] ?? ''
        data[h] = v.trim() === '' ? null : parseValue(v)
      })
      data['created_by'] = auth.userId
      try {
        const cols = Object.keys(data)
        const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(',')
        const values = cols.map((c) => data[c])
        let sql = `INSERT INTO public.${table} (${cols.map(quote).join(',')}) VALUES (${placeholders})`
        if (conflict) {
          const updateCols = cols.filter((c) => c !== conflict && c !== 'created_by')
          if (updateCols.length > 0) {
            sql += ` ON CONFLICT (${quote(conflict)}) DO UPDATE SET ${updateCols.map((c) => `${quote(c)} = EXCLUDED.${quote(c)}`).join(',')}`
          } else {
            sql += ` ON CONFLICT (${quote(conflict)}) DO NOTHING`
          }
        }
        await pool.query(sql, values)
        inserted.push(i)
      } catch (e) {
        errors.push({ row: i, error: (e as Error).message })
      }
    }
    return json({ ok: true, inserted: inserted.length, errors })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
}

function parseCsv(text: string): string[][] {
  const out: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      cell += c; i++; continue
    }
    if (c === '"') { inQuotes = true; i++; continue }
    if (c === ',') { row.push(cell); cell = ''; i++; continue }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); out.push(row); row = []; cell = ''; i++; continue
    }
    cell += c; i++
  }
  if (cell || row.length > 0) { row.push(cell); out.push(row) }
  return out
}

function parseValue(raw: string): unknown {
  const s = raw.trim()
  if (s === '') return null
  if (s === 'true') return true
  if (s === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(s)) { const n = Number(s); if (Number.isFinite(n)) return n }
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
    try { return JSON.parse(s) } catch { /* fall */ }
  }
  return s
}

function quote(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`bad identifier: ${name}`)
  return `"${name}"`
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

function stamp(): string { return new Date().toISOString().slice(0, 10) }
function text(s: string, status = 200): Response { return new Response(s, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } }) }
function json(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }) }

async function getAdminAuth(req: Request): Promise<{ userId: string | null; isAdmin: boolean }> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return { userId: null, isAdmin: false }
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return { userId: null, isAdmin: false }
  try {
    const payload = (await verifyToken(header.slice(7), { secretKey: secret })) as { sub: string }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const r = await pool.query(`SELECT id, is_admin FROM public.user_profiles WHERE clerk_user_id = $1 LIMIT 1`, [payload.sub])
    return { userId: payload.sub, isAdmin: Boolean(r.rows[0]?.is_admin) }
  } catch {
    return { userId: null, isAdmin: false }
  }
}
