import { useRef, useState, type ChangeEvent } from 'react'
import { Upload, X, Loader2, FileText, Box as BoxIcon, File } from 'lucide-react'
import { uploadTutorialFile, deleteTutorialFile, detectAttachmentType } from '../../lib/storage'

interface Props {
  value: string | null
  onChange: (url: string | null, type: string | null) => void
  prefix: string
  label?: string
  /** Extensiones aceptadas en el input. */
  accept?: string
}

/**
 * Picker genérico de archivo no-imagen: PDF, GLB, STL, OBJ, etc.
 * Sube al bucket tutorial-files. Útil para tutoriales y modelos 3D.
 */
export default function FilePicker({
  value,
  onChange,
  prefix,
  label,
  accept = '.pdf,.glb,.gltf,.stl,.obj,application/pdf,model/gltf-binary',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (file.size > 50 * 1024 * 1024) {
      setError('Máximo 50 MB')
      return
    }
    setUploading(true)
    try {
      const url = await uploadTutorialFile(file, prefix)
      if (value) {
        try {
          await deleteTutorialFile(value)
        } catch {
          // no bloqueamos
        }
      }
      const type = detectAttachmentType(file.name, file.type)
      onChange(url, type)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (!value) return
    if (!window.confirm('¿Eliminar este archivo?')) return
    try {
      await deleteTutorialFile(value)
    } catch (err) {
      console.error(err)
    }
    onChange(null, null)
  }

  const ext = value ? value.split('.').pop()?.toLowerCase() ?? '' : ''
  const type = detectAttachmentType(value)
  const Icon = type === 'pdf' ? FileText : type === '3d-model' ? BoxIcon : File

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
        accept={accept}
        onChange={handleFile}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {value ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            backgroundColor: '#F5F5F7',
            borderRadius: 10,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={18} style={{ color: '#0071E3' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>
              Archivo subido {ext ? `(.${ext})` : ''}
            </div>
            <a
              href={value}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                fontSize: 11,
                color: '#0071E3',
                textDecoration: 'none',
              }}
            >
              Ver / descargar →
            </a>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #E5E5EA',
              backgroundColor: 'white',
              color: '#1D1D1F',
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? 'Subiendo…' : 'Cambiar'}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'white',
              color: '#D70015',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '2px dashed #D2D2D7',
            borderRadius: 10,
            backgroundColor: '#FAFAFA',
            color: '#86868B',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 13,
          }}
        >
          {uploading ? (
            <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Upload size={15} />
          )}
          {uploading ? 'Subiendo…' : 'Subir archivo (PDF, GLB, STL, OBJ… máx. 50 MB)'}
        </button>
      )}

      {error && <div style={{ fontSize: 12, color: '#D70015', marginTop: 6 }}>{error}</div>}

      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
