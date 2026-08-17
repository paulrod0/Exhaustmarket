import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadTutorialFile } from '../lib/storage'
import { useAuthStore } from '../stores/authStore'
import { Box, Lock, Eye, EyeOff, Plus, Upload, Download } from 'lucide-react'

interface DesignFile { url: string; name: string; size: number }

interface Design3D {
  id: string
  uploaded_by: string
  title: string
  description: string | null
  file_url: string
  files: DesignFile[] | null
  thumbnail_url: string | null
  file_size: number | null
  is_public: boolean
  created_at: string
}

export default function Design3DPage() {
  const { profile } = useAuthStore()
  const [designs, setDesigns] = useState<Design3D[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadForm, setShowUploadForm] = useState(false)

  const canUpload = profile?.is_admin || profile?.user_type === 'professional' || profile?.user_type === 'premium'
  const hasAccess = canUpload

  useEffect(() => {
    if (hasAccess) {
      fetchDesigns()
    }
  }, [profile, hasAccess])

  const fetchDesigns = async () => {
    setLoading(true)
    try {
      // El admin ve TODOS los diseños (para revisar los que suben los colaboradores);
      // el resto ve los suyos + los públicos.
      let query = supabase.from('design_3d').select('*')
      if (!profile?.is_admin) query = query.or(`uploaded_by.eq.${profile?.id},is_public.eq.true`)
      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setDesigns(data || [])
    } catch (error) {
      console.error('Error fetching designs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center" style={{ maxWidth: '480px', padding: '0 24px' }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              backgroundColor: '#F5F5F7',
              margin: '0 auto 24px',
            }}
          >
            <Lock size={32} style={{ color: '#86868B' }} />
          </div>
          <h1 className="text-headline" style={{ color: '#1D1D1F', marginBottom: '12px' }}>
            Acceso Restringido
          </h1>
          <p
            className="text-body-large"
            style={{ color: '#6E6E73', marginBottom: '32px', lineHeight: '1.5' }}
          >
            El acceso a los disenos 3D esta disponible solo para usuarios con plan Profesional o Premium.
          </p>
          <a href="/subscriptions" className="btn-text" style={{ fontSize: '21px' }}>
            Ver Suscripciones
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="content-width" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: '48px' }}>
        <div>
          <h1 className="text-headline" style={{ color: '#1D1D1F', marginBottom: '8px' }}>
            Disenos 3D
          </h1>
          <p className="text-body-large" style={{ color: '#6E6E73' }}>
            Visualiza y gestiona tus modelos tridimensionales
          </p>
        </div>
        {canUpload && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="btn-pill btn-primary"
            style={{ gap: '8px', display: 'inline-flex', alignItems: 'center' }}
          >
            <Plus size={20} />
            Subir Diseno
          </button>
        )}
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <UploadForm
          onClose={() => setShowUploadForm(false)}
          onSuccess={() => {
            setShowUploadForm(false)
            fetchDesigns()
          }}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: '80px 0' }}>
          <div className="flex items-center gap-3" style={{ color: '#86868B' }}>
            <div
              className="w-5 h-5 rounded-full animate-spin"
              style={{ border: '2px solid #D2D2D7', borderTopColor: '#0071E3' }}
            />
            <span>Cargando disenos...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.length === 0 ? (
            <div className="col-span-full text-center" style={{ padding: '80px 32px' }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '18px',
                  backgroundColor: '#F5F5F7',
                  margin: '0 auto 20px',
                }}
              >
                <Box size={28} style={{ color: '#86868B' }} />
              </div>
              <p style={{ color: '#86868B', fontSize: '17px' }}>
                No hay disenos disponibles todavia
              </p>
            </div>
          ) : (
            designs.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                isOwner={design.uploaded_by === profile?.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function DesignCard({ design, isOwner }: { design: Design3D; isOwner: boolean }) {
  return (
    <div className="card-apple" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Thumbnail / Preview Area */}
      <div
        className="flex items-center justify-center relative"
        style={{
          height: '200px',
          backgroundColor: '#F5F5F7',
        }}
      >
        <Box size={40} style={{ color: '#C7C7CC' }} />
        {isOwner && (
          <span
            className="badge"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              ...(design.is_public
                ? { background: 'rgba(52, 199, 89, 0.1)', color: '#34C759' }
                : { background: '#E5E5EA', color: '#6E6E73' }),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {design.is_public ? <Eye size={12} /> : <EyeOff size={12} />}
            {design.is_public ? 'Publico' : 'Privado'}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>
          {design.title}
        </h3>
        {design.description && (
          <p
            className="line-clamp-2"
            style={{ fontSize: '14px', lineHeight: '1.5', color: '#6E6E73', marginBottom: '6px' }}
          >
            {design.description}
          </p>
        )}
        {design.file_size && (
          <p style={{ fontSize: '13px', color: '#86868B', marginBottom: '12px' }}>
            Tamaño total: {(design.file_size / 1024 / 1024).toFixed(1)} MB
          </p>
        )}

        {/* Archivos descargables */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(design.files && design.files.length > 0
            ? design.files
            : design.file_url ? [{ url: design.file_url, name: 'Descargar', size: design.file_size ?? 0 }] : []
          ).map((f, i) => (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pill btn-primary btn-sm"
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
            >
              <Download size={14} /> {f.name}{f.size ? ` · ${(f.size / 1024 / 1024).toFixed(0)} MB` : ''}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function UploadForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { profile } = useAuthStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const MAX_MB = 2048

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) { setError('No hay perfil cargado'); return }
    if (files.length === 0) { setError('Selecciona al menos un archivo (STL, STP, STEP u OBJ)'); return }
    const tooBig = files.find((f) => f.size > MAX_MB * 1024 * 1024)
    if (tooBig) { setError(`"${tooBig.name}" supera ${MAX_MB} MB`); return }

    setLoading(true)
    setError('')

    try {
      const uploaded: { url: string; name: string; size: number }[] = []
      for (let i = 0; i < files.length; i++) {
        setProgress(`Subiendo ${i + 1}/${files.length}: ${files[i].name}…`)
        const url = await uploadTutorialFile(files[i], 'designs-3d')
        uploaded.push({ url, name: files[i].name, size: files[i].size })
      }
      const totalSize = files.reduce((s, f) => s + f.size, 0)

      const { error: insertError } = await supabase
        .from('design_3d')
        .insert({
          uploaded_by: profile.id,
          title,
          description: description || null,
          file_url: uploaded[0].url,
          files: JSON.stringify(uploaded),
          is_public: isPublic,
          file_size: totalSize,
        } as any)

      if (insertError) throw insertError

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir diseño')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="card-apple" style={{ padding: '32px', marginBottom: '32px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1D1D1F', marginBottom: '24px' }}>
        Subir Diseno 3D
      </h2>

      {error && (
        <div
          style={{
            background: 'rgba(255, 59, 48, 0.08)',
            border: '1px solid rgba(255, 59, 48, 0.15)',
            color: '#FF3B30',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '14px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '20px' }}>
        <div>
          <label
            style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1D1D1F', marginBottom: '8px' }}
          >
            Titulo
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Nombre del diseno"
            className="input-apple"
          />
        </div>

        <div>
          <label
            style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1D1D1F', marginBottom: '8px' }}
          >
            Descripcion
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe el diseno..."
            rows={3}
            className="input-apple"
            style={{ resize: 'none' }}
          />
        </div>

        <div>
          <label
            style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1D1D1F', marginBottom: '8px' }}
          >
            Archivos 3D (puedes subir varios: p.ej. lado izquierdo y derecho)
          </label>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
              border: '2px dashed #D2D2D7', borderRadius: 12, cursor: 'pointer',
              fontSize: 14, color: '#6E6E73',
            }}
          >
            <Upload size={16} />
            {`Seleccionar STL, STP, STEP u OBJ · varios permitidos · hasta ${(MAX_MB / 1024).toFixed(0)} GB c/u`}
            <input
              type="file"
              multiple
              accept=".stl,.stp,.step,.obj,model/stl,model/step,model/obj,application/octet-stream"
              style={{ display: 'none' }}
              onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
            />
          </label>
          {files.length > 0 && (
            <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map((f, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1D1D1F', background: '#F5F5F7', borderRadius: 8, padding: '8px 12px' }}>
                  <span>{f.name}</span>
                  <span style={{ color: '#86868B' }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#0071E3' }}
          />
          <label htmlFor="isPublic" style={{ fontSize: '15px', color: '#1D1D1F', cursor: 'pointer' }}>
            Hacer publico (visible para todos los usuarios con acceso)
          </label>
        </div>

        <div className="flex gap-3" style={{ paddingTop: '4px' }}>
          <button
            type="submit"
            disabled={loading}
            className="btn-pill btn-primary"
            style={{ flex: 1, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? (progress || 'Subiendo…') : 'Subir Diseño'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-pill btn-secondary"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
