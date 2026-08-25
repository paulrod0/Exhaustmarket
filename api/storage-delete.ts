import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { verifyToken } from '@clerk/backend'

/** Borra un objeto de R2. Self-contained (sin _lib: importar de _lib rompe en Vercel). */
export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireAuth(req)
    if (!auth) return json({ error: 'unauthorized' }, 401)

    const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
    const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
    const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
    const BUCKET = process.env.R2_BUCKET ?? 'exhaustmarket-media'
    const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL
    if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !PUBLIC_BASE_URL) {
      return json({ error: 'Missing R2 env vars' }, 500)
    }

    const { publicUrl } = (await req.json()) as { publicUrl: string }
    // Deriva el key del pathname (funciona con el host viejo r2.dev, el dominio
    // propio nuevo, o cualquier host futuro; el key bucket/prefix/... es el mismo).
    let key: string
    try { key = new URL(publicUrl).pathname.replace(/^\/+/, '') } catch { return json({ error: 'bad url' }, 400) }
    if (!key) return json({ error: 'no key' }, 400)

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    })
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    return json({ ok: true })
  } catch (e) {
    console.error('storage-delete endpoint error', e)
    return json({ error: (e as Error).message }, 500)
  }
}

async function requireAuth(req: Request): Promise<{ userId: string } | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return null
  try {
    const payload = (await verifyToken(header.slice(7), { secretKey: secret })) as { sub: string }
    return { userId: payload.sub }
  } catch {
    return null
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
