import { useRef, useState, type ChangeEvent } from 'react'
import { Upload, X, Loader2, FileText, RefreshCw, ExternalLink } from 'lucide-react'
import {
  uploadExhaustPhoto, deleteExhaustPhoto,
  uploadContentMedia, deleteContentMedia,
  uploadTutorialFile, deleteTutorialFile,
} from '../../lib/storage'
import { compressImage } from '../../lib/imageCompress'

export type FileBucket = 'exhaust-photos' | 'content-media' | 'tutorial-files'

interface Props {
  label?: string
  value: string | null
  onChange: (url: string | null, meta?: { size: number; name: string; type: string }) => void
  kind?: 'image' | 'file'
  bucket: FileBucket
  prefix: string
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
  /** Avisa al formulario padre para que bloquee "Guardar" mientras hay una subida en curso. */
  onBusyChange?: (busy: boolean) => void
}

const UPLOADERS: Record<FileBucket, (f: File, p: string) => Promise<string>> = {
  'exhaust-photos': uploadExhaustPhoto,
  'content-media': uploadContentMedia,
  'tutorial-files': uploadTutorialFile,
}
const DELETERS: Record<FileBucket, (u: string) => Promise<void>> = {
  'exhaust-photos': deleteExhaustPhoto,
  'content-media': deleteContentMedia,
  'tutorial-files': deleteTutorialFile,
}

function fileNameFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').pop() ?? 'archivo'
    // Los keys llevan un prefijo aleatorio: "8x0v...-guia-desmontaje.pdf.pdf" → limpiar.
    return decodeURIComponent(last).replace(/^[a-z0-9]{8,}-/, '').replace(/\.(\w+)\.\1$/, '.$1')
  } catch { return 'archivo' }
}

/** Valida tipo (según accept) y tamaño; devuelve mensaje de error o null. */
function validate(file: File, kind: 'image' | 'file', accept: string | undefined, maxMB: number): string | null {
  if (file.size === 0) return 'El archivo está vacío (0 bytes).'
  if (file.size > maxMB * 1024 * 1024) return `Supera el límite de ${maxMB} MB.`
  if (kind === 'image') {
    if (!file.type.startsWith('image/')) return 'Debe ser una imagen.'
    return null
  }
  if (accept) {
    const exts = accept.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.startsWith('.'))
    const mimes = accept.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.includes('/'))
    const name = file.name.toLowerCase()
    const okExt = exts.length === 0 || exts.some((e) => name.endsWith(e))
    const okMime = mimes.length === 0 || (file.type && mimes.includes(file.type.toLowerCase()))
    if (!okExt && !okMime) return `Tipo no permitido. Se acepta: ${accept}`
  }
  return null
}

/**
 * Campo reutilizable de gestión de un archivo: subir, ver, REEMPLAZAR y BORRAR, con
 * validación de tipo/tamaño, aviso de subida en curso (onBusyChange) y borrado del
 * objeto viejo en R2 al reemplazar. Se usa en Manuales, Diseños 3D y donde haga falta.
 */
export default function FileManagerField({
  label, value, onChange, kind = 'file', bucket, prefix,
  accept, maxSizeMB = 50, disabled = false, onBusyChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false) // guarda de reentrada síncrona (evita doble-subida)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setBusyState(b: boolean) {
    busyRef.current = b
    setBusy(b)
    onBusyChange?.(b)
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = '' // permite re-elegir el mismo archivo
    if (!file || busyRef.current || disabled) return
    setError(null)
    const err = validate(file, kind, accept, maxSizeMB)
    if (err) { setError(err); return }
    setBusyState(true)
    const prev = value
    try {
      const toUpload = kind === 'image' ? await compressImage(file) : file
      const url = await UPLOADERS[bucket](toUpload, prefix)
      onChange(url, { size: toUpload.size, name: file.name, type: file.type })
      // Reemplazo: borra el objeto viejo en R2 (best-effort, no bloquea la UI).
      if (prev && prev !== url) DELETERS[bucket](prev).catch(() => { /* huérfano tolerable */ })
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Error al subir el archivo.')
    } finally {
      setBusyState(false)
    }
  }

  function handleRemove() {
    if (busyRef.current || disabled || !value) return
    const prev = value
    onChange(null)
    DELETERS[bucket](prev).catch(() => { /* huérfano tolerable */ })
  }

  const isImg = kind === 'image'

  return (
    <div>
      {label && <span style={labelStyle}>{label}</span>}
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} style={{ display: 'none' }} disabled={disabled || busy} />

      {value ? (
        <div style={rowStyle}>
          {isImg ? (
            <img src={value} alt="" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 6, border: '1px solid #E5E5EA', flexShrink: 0 }} />
          ) : (
            <FileText size={20} style={{ color: '#0071E3', flexShrink: 0 }} />
          )}
          <a href={value} target="_blank" rel="noreferrer" style={fileLinkStyle} title={value}>
            {isImg ? 'Imagen actual' : fileNameFromUrl(value)}
            <ExternalLink size={11} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
          </a>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || busy} style={btnStyle} title="Reemplazar">
            {busy ? <Loader2 size={13} style={spin} /> : <RefreshCw size={13} />} Reemplazar
          </button>
          <button type="button" onClick={handleRemove} disabled={disabled || busy} style={{ ...btnStyle, color: '#FF3B30', borderColor: '#FFD5D2' }} title="Quitar">
            <X size={13} /> Quitar
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || busy} style={dropStyle}>
          {busy ? <Loader2 size={15} style={spin} /> : <Upload size={15} />}
          {busy ? 'Subiendo…' : (isImg ? 'Subir imagen' : 'Subir archivo')}
        </button>
      )}

      {accept && !value && (
        <div style={{ fontSize: 11, color: '#86868B', marginTop: 4 }}>
          {isImg ? 'Imagen' : accept} · máx. {maxSizeMB} MB
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 6 }}>{error}</div>}
      <style>{`@keyframes fmspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const spin: React.CSSProperties = { animation: 'fmspin 1s linear infinite' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#3A3A3C', marginBottom: 5 }
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: '#FAFAFC', border: '1px solid #E5E5EA', borderRadius: 8, padding: '8px 10px', flexWrap: 'wrap' }
const fileLinkStyle: React.CSSProperties = { fontSize: 13, color: '#1D1D1F', textDecoration: 'none', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const btnStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid #E5E5EA', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#3A3A3C', cursor: 'pointer' }
const dropStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F5F5F7', border: '1px dashed #C7C7CC', borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 600, color: '#0071E3', cursor: 'pointer', width: '100%', justifyContent: 'center' }
