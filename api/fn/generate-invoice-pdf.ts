import { neon } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'

/** Devuelve el JSON de una factura del usuario. Self-contained (sin _lib). */
export async function POST(req: Request): Promise<Response> {
  try {
    if (!process.env.DATABASE_URL) return json({ error: 'DATABASE_URL not set' }, 500)
    const sql = neon(process.env.DATABASE_URL)
    const auth = await verifyAuth(req, sql)
    if (!auth?.profileId) return json({ error: 'unauthorized' }, 401)

    const { invoice_id } = (await req.json()) as { invoice_id: string }
    if (!invoice_id) return json({ error: 'invoice_id required' }, 400)

    const rows = (await sql`
      SELECT * FROM public.invoices
      WHERE id = ${invoice_id} AND (seller_id = ${auth.profileId} OR buyer_id = ${auth.profileId})
      LIMIT 1
    `) as Record<string, unknown>[]
    if (!rows[0]) return json({ error: 'invoice not found' }, 404)

    return json({ invoice: rows[0] })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
}

async function verifyAuth(req: Request, sql: any): Promise<{ profileId: string | null } | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return null
  try {
    const payload = (await verifyToken(header.slice(7), { secretKey: secret })) as { sub: string }
    const rows = (await sql`SELECT id FROM public.user_profiles WHERE clerk_user_id = ${payload.sub} LIMIT 1`) as Array<{ id: string }>
    return { profileId: rows[0]?.id ?? null }
  } catch { return null }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
