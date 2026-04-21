import { useMemo } from 'react'

interface Props {
  url: string
}

/**
 * Convierte una URL de YouTube / Vimeo / .mp4 en un embed adecuado.
 * Si no reconoce el host, muestra un reproductor de video HTML nativo.
 */
function toEmbedUrl(url: string): { type: 'iframe' | 'video'; src: string } | null {
  try {
    const u = new URL(url)

    // YouTube
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` }
      if (u.pathname.startsWith('/embed/')) return { type: 'iframe', src: u.toString() }
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` }
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
  if (!embed) return null

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
