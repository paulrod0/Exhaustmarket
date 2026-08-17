import { neon } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'

/** Gestiona API keys de proveedor. Self-contained (sin _lib). */
export async function POST(req: Request): Promise<Response> {
  try {
    if (!process.env.DATABASE_URL) return json({ error: 'DATABASE_URL not set' }, 500)
    const sql = neon(process.env.DATABASE_URL)
    const auth = await verifyAuth(req, sql)
    if (!auth?.profileId) return json({ error: 'unauthorized' }, 401)

    const body = (await req.json().catch(() => ({}))) as { action?: string; name?: string; id?: string }
    const action = body.action ?? 'list'

    if (action === 'list') {
      const keys = (await sql`
        SELECT id, name, key_prefix, is_active, last_used_at, created_at
        FROM public.supplier_api_keys WHERE user_id = ${auth.profileId} ORDER BY created_at DESC
      `) as Record<string, unknown>[]
      return json({ keys })
    }

    if (action === 'generate') {
      if (!body.name) return json({ error: 'name required' }, 400)
      const raw = `em_live_${randomHex(48)}`
      const prefix = raw.slice(0, 12) + '...'
      const hash = await sha256Hex(raw)
      const rows = (await sql`
        INSERT INTO public.supplier_api_keys (user_id, name, key_prefix, key_hash, is_active)
        VALUES (${auth.profileId}, ${body.name}, ${prefix}, ${hash}, true)
        RETURNING id, name, key_prefix, is_active, created_at
      `) as Record<string, unknown>[]
      return json({ ...(rows[0] ?? {}), full_key: raw })
    }

    if (action === 'delete') {
      if (!body.id) return json({ error: 'id required' }, 400)
      await sql`DELETE FROM public.supplier_api_keys WHERE id = ${body.id} AND user_id = ${auth.profileId}`
      return json({ ok: true })
    }

    return json({ error: `unknown action: ${action}` }, 400)
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

function randomHex(n: number): string {
  const bytes = new Uint8Array(n / 2)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
