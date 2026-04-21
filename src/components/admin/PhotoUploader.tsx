import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { Upload, X, Star, Loader2 } from 'lucide-react'
import { uploadExhaustPhoto, deleteExhaustPhoto } from '../../lib/storage'

interface PhotoUploaderProps {
  schemaId: string
  coverUrl: string | null
  galleryUrls: string[]
  onChange: (next: { coverUrl: string | null; galleryUrls: string[] }) => void
  disabled?: boolean
}

/**
 * Drag & drop + click-to-upload de fotos para un esquema.
 * Gestiona una foto principal (cover) y una galería de fotos secundarias.
 */
export default function PhotoUploader({
  schemaId,
  coverUrl,
  galleryUrls,
  onChange,
  disabled = false,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || disabled) return
    setError(null)
    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`El archivo "${file.name}" no es una imagen`)
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`"${file.name}" supera el límite de 10 MB`)
        }
        const url = await uploadExhaustPhoto(file, schemaId)
        uploaded.push(url)
      }
      // Si no había cover, la primera subida la convierte en cover
      const newCover = coverUrl ?? uploaded[0] ?? null
      const newGallery = coverUrl
        ? [...galleryUrls, ...uploaded]
        : [...galleryUrls, ...uploaded.slice(1)]
      onChange({ coverUrl: newCover, galleryUrls: newGallery })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido al subir fotos'
      setError(msg)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function onSelectFiles(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files)
  }

  async function removePhoto(url: string) {
    if (disabled) return
    const confirmed = window.confirm('¿Eliminar esta foto permanentemente?')
    if (!confirmed) return
    try {
      await deleteExhaustPhoto(url)
    } catch (e) {
      // No bloqueamos la UI si la eliminación del storage falla (el registro ya se actualiza)
      console.error('No se pudo borrar la foto del bucket:', e)
    }
    const newCover = coverUrl === url ? (galleryUrls[0] ?? null) : coverUrl
    const newGallery = galleryUrls.filter((u) => u !== url)
    // Si al eliminar el cover promocionamos la primera de galería, la sacamos de ahí también
    if (coverUrl === url && galleryUrls[0]) {
      newGallery.shift()
    }
    onChange({ coverUrl: newCover, galleryUrls: newGallery })
  }

  function promoteToCover(url: string) {
    if (disabled) return
    if (coverUrl === url) return
    const oldCover = coverUrl
    const newGallery = galleryUrls.filter((u) => u !== url)
    if (oldCover) newGallery.unshift(oldCover)
    onChange({ coverUrl: url, galleryUrls: newGallery })
  }

  const allPhotos: string[] = [
    ...(coverUrl ? [coverUrl] : []),
    ...galleryUrls,
  ]

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onSelectFiles}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#0071E3' : '#D2D2D7'}`,
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          backgroundColor: dragging ? '#EBF5FF' : '#FAFAFA',
          transition: 'all 0.15s ease',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {uploading ? (
          <>
            <Loader2
              size={20}
              style={{ color: '#0071E3', animation: 'spin 1s linear infinite' }}
            />
            <p style={{ fontSize: 13, color: '#1D1D1F', marginTop: 8 }}>
              Subiendo fotos...
            </p>
          </>
        ) : (
          <>
            <Upload size={20} style={{ color: '#86868B' }} />
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#1D1D1F',
                margin: '8px 0 2px',
              }}
            >
              Arrastra fotos aquí o haz clic para subir
            </p>
            <p style={{ fontSize: 11, color: '#86868B', margin: 0 }}>
              PNG / JPG · máximo 10 MB cada una · la primera será la portada
            </p>
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: '#D70015',
            backgroundColor: '#FFE5E7',
            padding: '8px 12px',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {allPhotos.length > 0 && (
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 8,
          }}
        >
          {allPhotos.map((url) => {
            const isCover = url === coverUrl
            return (
              <div
                key={url}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: isCover ? '2px solid #0071E3' : '1px solid #E5E5EA',
                  backgroundColor: '#F5F5F7',
                }}
              >
                <img
                  src={url}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  loading="lazy"
                />
                {isCover && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      backgroundColor: '#0071E3',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Star size={10} />
                    Portada
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    display: 'flex',
                    gap: 4,
                  }}
                >
                  {!isCover && (
                    <button
                      type="button"
                      title="Hacer portada"
                      onClick={(e) => {
                        e.stopPropagation()
                        promoteToCover(url)
                      }}
                      disabled={disabled}
                      style={iconBtn('rgba(255,255,255,0.92)')}
                    >
                      <Star size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Eliminar"
                    onClick={(e) => {
                      e.stopPropagation()
                      removePhoto(url)
                    }}
                    disabled={disabled}
                    style={iconBtn('rgba(255,255,255,0.92)', '#D70015')}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

function iconBtn(bg: string, color = '#1D1D1F'): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 6,
    backgroundColor: bg,
    color,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  }
}
