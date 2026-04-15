import { useRef, useState, type ChangeEvent } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { uploadContentMedia, deleteContentMedia } from '../../lib/storage'

interface ImagePickerProps {
  value: string | null
  onChange: (url: string | null) => void
  /** Prefijo de carpeta en el bucket (p. ej. "brands" o "articles") */
  prefix: string
  aspect?: string
  label?: string
}

/**
 * Selector de UNA sola imagen para campos del tipo cover_url o logo_url.
 * Sube al bucket content-media.
 */
export default function ImagePicker({
  value,
  onChange,
  prefix,
  aspect = '16 / 9',
  label,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Máximo 10 MB')
      return
    }
    setUploading(true)
    try {
      const url = await uploadContentMedia(file, prefix)
      // Si había una anterior, borrarla del bucket
      if (value) {
        try {
          await deleteContentMedia(value)
        } catch {
          // no bloqueamos
        }
      }
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (!value) return
    if (!window.confirm('¿Eliminar esta imagen?')) return
    try {
      await deleteContentMedia(value)
    } catch (err) {
      console.error('No se pudo borrar la imagen del bucket:', err)
    }
    onChange(null)
  }

  return (
    <div>
      {label && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#86868B',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'block',
            marginBottom: 4,
          }}
        >
          {label}
        </span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {value ? (
        <div
          style={{
            position: 'relative',
            aspectRatio: aspect,
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid #E5E5EA',
            backgroundColor: '#F5F5F7',
          }}
        >
          <img
            src={value}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <button
            type="button"
            onClick={handleRemove}
            title="Eliminar imagen"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              border: 'none',
              borderRadius: 6,
              backgroundColor: 'rgba(255,255,255,0.92)',
              color: '#D70015',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            <X size={14} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              border: 'none',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 500,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? 'Subiendo…' : 'Cambiar'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%',
            aspectRatio: aspect,
            border: '2px dashed #D2D2D7',
            borderRadius: 10,
            backgroundColor: '#FAFAFA',
            color: '#86868B',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
          }}
        >
          {uploading ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Upload size={18} />
          )}
          {uploading ? 'Subiendo…' : 'Haz clic para subir imagen'}
        </button>
      )}

      {error && (
        <div style={{ fontSize: 12, color: '#D70015', marginTop: 6 }}>{error}</div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
