import { useEffect, useState } from 'react'
import { Box, Download, ExternalLink } from 'lucide-react'

interface Props {
  url: string
  filename?: string
}

/**
 * Carga el web component <model-viewer> de Google dinámicamente cuando
 * es necesario mostrar un GLB/GLTF. Para STL/OBJ muestra un download + aviso.
 * <model-viewer> se carga desde jsDelivr on-demand; no hay dependencia npm.
 */
let modelViewerLoaded = false

function loadModelViewerScript(): Promise<void> {
  if (modelViewerLoaded) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-model-viewer]')
    if (existing) {
      modelViewerLoaded = true
      resolve()
      return
    }
    const s = document.createElement('script')
    s.type = 'module'
    s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js'
    s.setAttribute('data-model-viewer', '1')
    s.onload = () => {
      modelViewerLoaded = true
      resolve()
    }
    s.onerror = () => reject(new Error('No se pudo cargar el visor 3D'))
    document.head.appendChild(s)
  })
}

function extension(url: string): string {
  try {
    const path = new URL(url).pathname
    return (path.split('.').pop() ?? '').toLowerCase()
  } catch {
    return ''
  }
}

export default function ThreeDViewer({ url, filename }: Props) {
  const ext = extension(url)
  const supportsViewer = ext === 'glb' || ext === 'gltf'
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!supportsViewer) return
    let cancelled = false
    loadModelViewerScript()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [supportsViewer])

  if (supportsViewer) {
    return (
      <div
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: '#F5F5F7',
          marginBottom: 16,
        }}
      >
        {ready ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((<model-viewer
            src={url}
            camera-controls
            auto-rotate
            shadow-intensity="1"
            exposure="1"
            style={{ width: '100%', height: 420, display: 'block', backgroundColor: '#F5F5F7' } as any}
          />) as any)
        ) : (
          <div
            style={{
              width: '100%',
              height: 420,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#86868B',
              fontSize: 13,
            }}
          >
            Cargando visor 3D…
          </div>
        )}
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E5E5EA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#86868B',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Box size={13} />
            Modelo 3D interactivo · arrastra para rotar
          </span>
          <a
            href={url}
            download={filename ?? undefined}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              color: '#0071E3',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Download size={12} />
            Descargar
          </a>
        </div>
      </div>
    )
  }

  // STL, OBJ, PDF u otros: solo link de descarga
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      download={filename ?? undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 14,
        backgroundColor: '#F5F5F7',
        textDecoration: 'none',
        color: 'inherit',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Box size={20} style={{ color: '#0071E3' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F' }}>
          Archivo adjunto{ext ? ` (.${ext})` : ''}
        </div>
        <div style={{ fontSize: 12, color: '#86868B' }}>
          Haz clic para descargar o abrir.
        </div>
      </div>
      <ExternalLink size={16} style={{ color: '#86868B', flexShrink: 0 }} />
    </a>
  )
}
