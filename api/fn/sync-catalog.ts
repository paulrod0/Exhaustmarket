import { neon } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'

/** Sincronización manual de un catalog_source (esqueleto). Self-contained (sin _lib). */
export async function POST(req: Request): Promise<Response> {
  try {
    if (!process.env.DATABASE_URL) return json({ error: 'DATABASE_URL not set' }, 500)
    const sql = neon(process.env.DATABASE_URL)
    const auth = await verifyAuth(req, sql)
    if (!auth?.profileId) return json({ error: 'unauthorized' }, 401)

    const { catalog_source_id } = (await req.json()) as { catalog_source_id: string }
    if (!catalog_source_id) return json({ error: 'catalog_source_id required' }, 400)

    const sources = (await sql`
      SELECT * FROM public.catalog_sources WHERE id = ${catalog_source_id} AND user_id = ${auth.profileId} LIMIT 1
    `) as Record<string, unknown>[]
    if (!sources[0]) return json({ error: 'catalog source not found' }, 404)

    await sql`
      INSERT INTO public.supplier_sync_logs (user_id, action, status, source_platform)
      VALUES (${auth.profileId}, 'manual_sync', 'pending', 'unknown')
    `
    return json({ ok: true, note: 'sync queued (skeleton)' })
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
