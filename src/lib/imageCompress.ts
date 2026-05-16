/**
 * Comprime una imagen en el navegador antes de subir.
 * - Redimensiona a max 1920px en su lado largo (manteniendo aspect ratio)
 * - Convierte a WebP si el navegador lo soporta, si no a JPEG con quality 0.82
 * - Devuelve un nuevo File listo para subir, normalmente <500 KB para fotos
 *   típicas de móvil de 4-7 MB
 *
 * No requiere dependencias externas — usa Canvas API nativo.
 */

interface CompressOptions {
  maxDimension?: number  // Lado más largo (px). Default 1920.
  quality?: number       // 0-1. Default 0.82
  preferWebp?: boolean   // Default true
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1920,
  quality: 0.82,
  preferWebp: true,
}

let webpSupportCache: boolean | null = null

function detectWebpSupport(): boolean {
  if (webpSupportCache !== null) return webpSupportCache
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const data = canvas.toDataURL('image/webp')
    webpSupportCache = data.startsWith('data:image/webp')
  } catch {
    webpSupportCache = false
  }
  return webpSupportCache
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo cargar la imagen: ' + String(e)))
    }
    img.src = url
  })
}

/**
 * Comprime una imagen y devuelve un nuevo File.
 * Si la imagen ya pesa <500 KB y es menor que maxDimension, la devuelve sin tocar.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const opts = { ...DEFAULTS, ...options }

  // No tocar imágenes ya pequeñas
  if (file.size < 500 * 1024) return file

  // SVG no se comprime con canvas, devolver tal cual
  if (file.type === 'image/svg+xml') return file

  let img: HTMLImageElement
  try {
    img = await loadImage(file)
  } catch {
    // Si falla la carga (formato raro), devolver original
    return file
  }

  // Calcular nuevas dimensiones manteniendo aspect ratio
  const longSide = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = longSide > opts.maxDimension ? opts.maxDimension / longSide : 1
  const targetWidth = Math.round(img.naturalWidth * scale)
  const targetHeight = Math.round(img.naturalHeight * scale)

  // Pintar en canvas
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return file

  // Fondo blanco (por si la imagen es PNG con transparencia que se guarda en JPEG/WebP)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, targetWidth, targetHeight)
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  const useWebp = opts.preferWebp && detectWebpSupport()
  const mime = useWebp ? 'image/webp' : 'image/jpeg'

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, opts.quality)
  })
  if (!blob) return file

  // Si el resultado es más grande que el original (raro pero posible),
  // devolver el original.
  if (blob.size >= file.size) return file

  const extension = useWebp ? 'webp' : 'jpg'
  const baseName = file.name.replace(/\.[a-zA-Z0-9]+$/, '')
  const newName = `${baseName}.${extension}`

  return new File([blob], newName, { type: mime, lastModified: Date.now() })
}

/**
 * Comprime varias imágenes en paralelo (con un límite para no bloquear el navegador).
 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {},
): Promise<File[]> {
  const results: File[] = []
  // Procesa de a 3 para no saturar memoria
  for (let i = 0; i < files.length; i += 3) {
    const batch = files.slice(i, i + 3)
    const compressed = await Promise.all(batch.map((f) => compressImage(f, options)))
    results.push(...compressed)
  }
  return results
}
