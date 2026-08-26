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
 * Ruta pública: /api/img/<key>  (vercel.json reescribe a /api/img?key=<key>, porque
 * los catch-all [...key] de Vercel no capturan bien varios segmentos en este proyecto).
 * key = "<prefix>/<...>" con prefix ∈ ALLOWED_PREFIXES. Las keys llevan id aleatorio
 * (inadivinables); el gating por suscripción vive en los REDACTORS de /api/db (qué URLs
 * se emiten), no en los bytes — igual que hoy con el dominio público r2.dev.
 * Self-contained (sin _lib: romperia en Vercel).
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

const WATERMARKABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

// Tile de marca de agua PRE-RENDERIZADO a PNG (300x300, "exhaustmarket.com" en diagonal,
// opacity ~0.16). Se pre-renderiza (no se dibuja el texto en runtime) porque el contenedor
// de Vercel no trae fuentes -> el texto de un SVG saldría como cajas. Con el PNG no hay
// dependencia de fuentes en el servidor.
const WM_TILE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAACXBIWXMAAAsTAAALEwEAmpwYAAAJr0lEQVR4nO3da28ayRIA0PUrceJkY8fvtx0byP//g301qBoVzcCyzmCu1udIaJVhYPGXUndNVfVffwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwHaWUw1LKaSnlx7Z/C8BSpZSrUsrv9Lrb9m8CWFBK+V5KmZRSfpZSPpdSbiNo/dz2bwPogtTfpZTLCFJdgDpL7+2WUl5KKeNSyv52fynwYZVSdkop9832r3t9b+77Ftevt/drgY8cqA5jRTWKgLSftn+XPZ+pge1wO78a+JBKKeexxXsupRw3gax3+xf5rC639biVHw18TLGaGseK6Wjd7V/kubr3/n7XHwx8DKWUvVLK13YrFzVWXfC5WHf7F9/12AY5gD8S27ur2MbVZPpLDTbN9m+v+aztH/A+ohThKYJRt5I6iv+OIxAdpZqrLpBd9XyH7R/wbkn1Lth8ba4fRsB67YJaXHuIez/3bP/u2usAg4qnf7+WvHeaK9cjiHX/fnj3Hwp8HJGH6rZ1J6WUL+n6y4qAtRdbw8ee3sG5glGAQUSgGjUV6rcRxGoB6Kcln+3yW69NEOuCltYbYFiRRK8Baj9eXcA5aWqpbpZ8vluBeQIIbF6skF7+4Z6HvikL0Y7TXTfnCnibthbqH+5dunpK9xzESup3FHtepCC2UMYAsLYIJms1FkfSvPepXpd87xLu8fSv5qZGtRBUYh34I5GDmlWW1xqpFfffL0uqR8Cy5QM2J1WW1xXR0RpJ9/sV7+n3AzYjtclMG5LXWGXd1dlVXSlDWqlNi0brNYDBRaB5iiB0tma/4GPc/xqfnUSiXTsNsDkRgHYicHVJ9YM1PtPdfxz1WHdRsrByZQawtnhydxEroVEEmi89OaibFUFKRTqwWTFn6jUC1VVKsM+NcUmtNbNA1uSonrbyBwAfRwSbl7xCiiD0Gvmnz6noc9IXmCJX9fhvCk0BpqJAs/eJXL6exricNHmrs5QsP+qZaXUdr9onKFAB/15qMv655L2HnrKF7+nw0jqi+CyC125dfaUE/KzU4Z3/POC/ZNmxWHF9nHv20grrLpUj3NSngZHfGufgFwn6H8oUgEH0zUVP7THfmntrM/JTT0L9a7tlBBhceyxWjCGetDVRUTM1balp817phJveoXsAbxb5puO6ZWual++XDchLLTWPkcf6nsoYFnJhAH8szZZ6bpqXf6SzABcOHY1A13deoLEvwHAimX6Rpnaep6d6e2nuVC1HGKecVZvP2u87kRlgMLFq6gLRqOe9k9qMnILSRQpiXeCykgLeRypPGPckznublyNwXUbg6raDGpSB4UQy/KG2yOStWzrHb2Gq56rmZTOqgEFFUrw+yXtOJQv5ePf9WEW99AWh9Pm5WiuAQUWAGuUkeaqfukzXauL9tOc7PsV3mKsObEaqUD9urtdG5DxRYSdGEc+15aTP2P4B79JmM11dNce+16D10NP8fL3VHw78d8WW7SqS6bMDH2IO1UmdmpBKGOqEhZrPmm314lqXy/LkDxhWmoowiUT6dIJCc89OBLNRM764rrJGacpCF9gEK2B48QTvvg7CixEvc3mrlGSfK/KMz91HsJsl4AGGTKTXbdt1rI5mExFi+/falC2ctQErtorTBLupn8CbrNqORRFnHT/8KzUbzz3Vi4bl2VTPVM0+igr1x/gebTXA20TD8VNPi8xRjG55ilVVPRn5esVI43oQ6acUxGY5Lk3KwB9JK6NpAEqB6S4dn7XXs/0b9QzX+9KXgAcYRFO8eVHzUFG2UCck7K3a/jXv1QT813f9Q4CPIQ3OGzf1URfLZqS32790fT9ablSpA8OKlVRtQp7NVG8G6s2e/qX3bP+AzUtbvp0UmOZmqvfUU52v2P6ZqAAMK4LUXTMH/bBna/h387nnCGYHPds/ZQrAsGL2+TiCz0nkmZ6XbAHn+vrSeX+3W/sDgI8j8lALZ/mtmKl+1lyvExecoAwMq6mdOujp9duL0S7n8frUzFSfRPC6i/xW9x1yVcDGtn/HKQiN4nUbAel38xql47a+pBqs2WgYgMH1VaPHaqpWrr9G4PoZwe20HVUcvYDHfZNAAd5sySEOC9XosdJaaHSOp30LeSuAQUU1+tOS95ZVo7flCbWcQUId2Jw0wfO4572FavR0ivJ5bAmfln0e4I/E073dJfmqhaF4qRzhKBWP1iBVx754+gcMJ2ZT1ad7k6ZEoearLlecovwr57rMUQcG1xyT9RD5pjoULx/uUCd6zuWh4mnfZNnUBYDBxITPcXOKcp1V9ZwamGu+qm1evoqA1zUqy1MBG81XLQzKSwc8zK2aIjjVvNRxWpkZpge8ORe11tYstdScp+3hbKZ6SrbvpwT8fVO9Pjd5AWAtTZ/ewZJTlK9zdXkEuJ1YbT3EZ6dBKFWo3zT/ny/xMvUTeLv01O42tcxMIk/1mp7otRM+7+Oe2fau6/FLq6nZaGOAweTaqAhSN6nn77wtUUgJ9Xbky2UEsl/xHVZUwLAiNzVJ89LbMwHnShRiFdYGsR9xT1e2IFABw4k81M9aO5VWUgt9gOnU5PuUTK+HRDykPJgyBWB4EaxmDcappWaypKWmPg38lhLz9xG4uu2fU5SBzUhn/O2ueSDpfjp+y5YP2IwoQTjNbTKxKhqvOwKmKVuw9QM23vs3rZFK27nnnvuXHkga39VVrFthAZsTgagGrlpn9bjk3ps8AgZgI2Im+lm8Fnr2UhV7XXE91+r1nnzV3AgYgCHzVLVvb9wMxNvt2dpNJymk8oSXOEarFox2Wz+n0wDDi+AzSmUHu2kldbvkkIfTlJfKgWtuxjrAJvoBf/Tkrepq67CnEDRPCd2JraFjtIDNSfOoDlKrTU2cP7ZFnSnA2fIB7yvVR32L4FUnLdSxL58jl3XYFIh6Cgi8r1Q7VUsWzpoK9uPmpJqTuMcTQOD9paOyFiZ6puT7Qo8gwLZWWZPmSeFOrKZ6+wMBtiae8tUjtEbpCWHX6Gz7B/x/iUr283hKeN6eCwgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGza/wDTsQvS1/nwAwAAAABJRU5ErkJggg=='

async function watermark(buf: Uint8Array, contentType: string): Promise<Uint8Array> {
  // Import dinámico: si el binario de sharp no carga, lanza y el caller sirve el original.
  const sharp = (await import('sharp')).default
  const tile = Buffer.from(WM_TILE_PNG, 'base64')
  let pipeline = sharp(buf, { failOn: 'none', animated: false }).rotate() // respeta EXIF orientation
    .composite([{ input: tile, tile: true, blend: 'over' }])
  if (contentType === 'image/png') pipeline = pipeline.png()
  else if (contentType === 'image/webp') pipeline = pipeline.webp({ quality: 82 })
  else if (contentType === 'image/avif') pipeline = pipeline.avif({ quality: 55 })
  else pipeline = pipeline.jpeg({ quality: 84 })
  return pipeline.toBuffer()
}

function res(body: BodyInit | null, status: number, headers: Record<string, string>): Response {
  return new Response(body, { status, headers })
}

/** Devuelve la key validada o null si es inválida. Lee ?key= (rewrite) o el pathname. */
function parseKey(url: string): string | null {
  const u = new URL(url)
  const raw = u.searchParams.get('key') ?? u.pathname.replace(/^\/api\/img\/?/, '')
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
    const body = obj.Body as {
      transformToWebStream?: () => ReadableStream
      transformToByteArray?: () => Promise<Uint8Array>
    } | undefined
    if (!body?.transformToWebStream) return res('empty', 502, { 'cache-control': 'no-store', 'content-type': 'text/plain' })

    const ctype = contentTypeFor(key, obj.ContentType)
    const headers: Record<string, string> = {
      'content-type': ctype,
      'cache-control': IMMUTABLE,
      'vercel-cdn-cache-control': IMMUTABLE,
    }

    // Imágenes: marca de agua al vuelo (buffer, cacheado por el CDN). Resto (PDF/3D/vídeo):
    // streaming passthrough sin marca.
    if (WATERMARKABLE.has(ctype) && body.transformToByteArray) {
      const raw = await body.transformToByteArray()
      try {
        const marked = await watermark(raw, ctype)
        headers['content-length'] = String(marked.length)
        return res(marked, 200, headers)
      } catch (e) {
        console.error('watermark failed, sirviendo original', key, (e as Error)?.message)
        headers['content-length'] = String(raw.length)
        return res(raw, 200, headers) // fallback: original sin marca, mejor que romper la imagen
      }
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
