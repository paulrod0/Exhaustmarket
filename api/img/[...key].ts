import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

/**
 * Proxy de lectura de R2 servido por Vercel.
 *
 * Motivo: las imágenes/ficheros se guardaban con la URL pública de desarrollo de R2
 * (pub-*.r2.dev), que Cloudflare rate-limitea => fotos intermitentes bajo carga.
 * Esta función lee el objeto por la API S3 de R2 (sin rate-limit) y lo devuelve con
 * Cache-Control inmutable, de modo que el CDN de Vercel lo cachea tras el primer
 * acceso: una sola lectura de R2 por objeto y luego HIT en edge.
 *
 * Ruta: /api/img/<key>  donde key = "<prefix>/<...>" y prefix ∈ ALLOWED_PREFIXES.
 * Las keys llevan id aleatorio (inadivinables); el gating por suscripción vive en
 * los REDACTORS de /api/db (qué URLs se emiten), no en los bytes — igual que hoy con
 * el dominio público r2.dev. Self-contained (sin _lib: romperia en Vercel).
 */

const ALLOWED_PREFIXES = new Set(['exhaust-photos', 'content-media', 'tutorial-files'])

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp',
  pdf: 'application/pdf', glb: 'model/gltf-binary', gltf: 'model/gltf+json',
  stl: 'model/stl', obj: 'text/plain', zip: 'application/zip',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
}

const IMMUTABLE = 'public, max-age=31536000, immutable'

function res(body: BodyInit | null, status: number, headers: Record<string, string>): Response {
  return new Response(body, { status, headers })
}

/** Devuelve la key validada o null si es inválida. */
function parseKey(url: string): string | null {
  const raw = new URL(url).pathname.replace(/^\/api\/img\//, '')
  let key: string
  try {
    key = decodeURIComponent(raw)
  } catch {
    return null
  }
  if (!key) return null
  if (key.includes('..') || key.startsWith('/') || key.includes('\0') || key.includes('\\')) return null
  const prefix = key.split('/')[0]
  if (!ALLOWED_PREFIXES.has(prefix)) return null
  return key
}

function s3client(): S3Client | null {
  const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
  const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
  const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  })
}

function contentTypeFor(key: string, fromR2?: string): string {
  if (fromR2 && fromR2 !== 'application/octet-stream') return fromR2
  const ext = (key.split('.').pop() ?? '').toLowerCase()
  return MIME_BY_EXT[ext] ?? fromR2 ?? 'application/octet-stream'
}

function isNotFound(e: unknown): boolean {
  const err = e as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } }
  return err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404
}

async function serve(req: Request, isHead: boolean): Promise<Response> {
  const key = parseKey(req.url)
  if (!key) return res('bad request', 400, { 'cache-control': 'public, max-age=300', 'content-type': 'text/plain' })

  const s3 = s3client()
  const BUCKET = process.env.R2_BUCKET ?? 'exhaustmarket-media'
  if (!s3) return res('misconfigured', 500, { 'cache-control': 'no-store', 'content-type': 'text/plain' })

  try {
    if (isHead) {
      const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
      const headers: Record<string, string> = {
        'content-type': contentTypeFor(key, head.ContentType),
        'cache-control': IMMUTABLE,
        'vercel-cdn-cache-control': IMMUTABLE,
      }
      if (head.ContentLength != null) headers['content-length'] = String(head.ContentLength)
      if (head.ETag) headers['etag'] = head.ETag
      return res(null, 200, headers)
    }

    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const body = obj.Body as { transformToWebStream?: () => ReadableStream } | undefined
    if (!body?.transformToWebStream) return res('empty', 502, { 'cache-control': 'no-store', 'content-type': 'text/plain' })

    const headers: Record<string, string> = {
      'content-type': contentTypeFor(key, obj.ContentType),
      'cache-control': IMMUTABLE,
      'vercel-cdn-cache-control': IMMUTABLE,
    }
    if (obj.ContentLength != null) headers['content-length'] = String(obj.ContentLength)
    if (obj.ETag) headers['etag'] = obj.ETag
    return res(body.transformToWebStream(), 200, headers)
  } catch (e) {
    if (isNotFound(e)) {
      return res('not found', 404, { 'cache-control': 'public, max-age=60', 'content-type': 'text/plain' })
    }
    console.error('img proxy error', key, (e as Error)?.message)
    return res('error', 500, { 'cache-control': 'no-store', 'content-type': 'text/plain' })
  }
}

export async function GET(req: Request): Promise<Response> {
  return serve(req, false)
}

export async function HEAD(req: Request): Promise<Response> {
  return serve(req, true)
}
