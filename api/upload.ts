import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { verifyToken } from '@clerk/backend'

/** Prefijos válidos dentro del bucket exhaustmarket-media (equivalentes a los buckets Supabase) */
const ALLOWED_PREFIXES = new Set(['exhaust-photos', 'content-media', 'tutorial-files'])

/**
 * Presign PUT a R2. Self-contained (sin _lib: importar de _lib rompe en Vercel).
 * Body: { bucket, prefix, filename, contentType }
 */
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

    const { bucket, prefix, filename, contentType } = (await req.json()) as {
      bucket: string; prefix: string; filename: string; contentType: string
    }
    if (!ALLOWED_PREFIXES.has(bucket)) return json({ error: 'bad bucket' }, 400)
    if (!/^[a-z0-9\-_/]+$/i.test(prefix)) return json({ error: 'bad prefix' }, 400)

    const ext = filename.split('.').pop() ?? 'jpg'
    const safeExt = sanitize(ext).slice(0, 5) || 'jpg'
    const safeName = sanitize(filename.slice(0, 40))
    const key = `${bucket}/${prefix}/${randomId()}-${safeName}.${safeExt}`

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    })
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000',
    })
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 })
    const publicUrl = `${PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`

    return json({ uploadUrl, publicUrl })
  } catch (e) {
    console.error('upload endpoint error', e)
    return json({ error: (e as Error).message }, 500)
  }
}

function sanitize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
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
