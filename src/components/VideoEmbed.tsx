import { useMemo } from 'react'

interface Props {
  url: string
}

/**
 * Convierte una URL de YouTube / Vimeo / .mp4 en un embed adecuado.
 * Si no reconoce el host, muestra un reproductor de video HTML nativo.
 */
/** Extrae el ID de vídeo de CUALQUIER formato de YouTube (watch, youtu.be, shorts, live, embed, con params). */
function youtubeId(u: URL): string | null {
  const v = u.searchParams.get('v')
  if (v) return v
  if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
  const m = u.pathname.match(/\/(embed|shorts|live|v)\/([^/?&#]+)/)
  if (m) return m[2]
  return null
}

function toEmbedUrl(url: string): { type: 'iframe' | 'video'; src: string } | null {
  try {
    const raw = url.trim()
    // Permite pegar URLs sin protocolo (youtube.com/... ó youtu.be/...)
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)

    // YouTube (cualquier subdominio y formato)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtube-nocookie.com') || u.hostname === 'youtu.be') {
      const id = youtubeId(u)
      // youtube-nocookie: mismo embed, permite framing y mejor privacidad.
      if (id) return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` }
      // Es YouTube pero no logramos el ID → NO embebemos la URL cruda (siempre da "rechazado la conexión").
      return null
    }

    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const segments = u.pathname.split('/').filter(Boolean)
      const id = segments[segments.length - 1]
      if (id && /^\d+$/.test(id)) {
        return { type: 'iframe', src: `https://player.vimeo.com/video/${id}` }
      }
    }

    // MP4 / WebM directo
    if (/\.(mp4|webm|mov)(\?|$)/i.test(u.pathname)) {
      return { type: 'video', src: u.toString() }
    }

    // Fallback: iframe genérico
    return { type: 'iframe', src: u.toString() }
  } catch {
    return null
  }
}

export default function VideoEmbed({ url }: Props) {
  const embed = useMemo(() => toEmbedUrl(url), [url])
  if (!embed) {
    // No se pudo embeber (YouTube con embed desactivado por el autor, formato raro…):
    // ofrecemos el enlace en vez de un iframe roto.
    return url ? (
      <div style={{ margin: '20px 0' }}>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ color: '#0071E3', fontSize: 14, textDecoration: 'none' }}>
          ▶ Ver vídeo →
        </a>
        <p style={{ fontSize: 12, color: '#86868B', marginTop: 4 }}>
          (No se pudo incrustar. Si es un vídeo tuyo de YouTube, revisa que "Permitir insertar" esté activado.)
        </p>
      </div>
    ) : null
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#000',
        margin: '20px 0',
      }}
    >
      {embed.type === 'iframe' ? (
        <iframe
          src={embed.src}
          title="Vídeo"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      ) : (
        <video
          src={embed.src}
          controls
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}
