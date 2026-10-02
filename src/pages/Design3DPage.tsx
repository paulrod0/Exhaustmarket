import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadTutorialFile, deleteTutorialFile } from '../lib/storage'
import { useAuthStore } from '../stores/authStore'
import { canSeeOem } from '../lib/contentTypes'
import FileManagerField from '../components/admin/FileManagerField'
import { Box, Lock, Eye, EyeOff, Plus, Upload, Download, Pencil, Trash2, Check, X, Clock } from 'lucide-react'

interface DesignFile { url: string; name: string; size: number }

interface Design3D {
  id: string
  uploaded_by: string
  title: string
  description: string | null
  file_url: string
  files: DesignFile[] | null
  thumbnail_url: string | null
  part_type: string | null
  status: 'pending' | 'approved' | 'rejected' | null
  processing_status?: string | null
  file_size: number | null
  is_public: boolean
  created_at: string
}

// Tipo de pieza: selector CERRADO y coherente con los tramos del escape (no texto libre).
const PART_TYPES: { value: string; label: string }[] = [
  { value: 'colector', label: 'Colector' },
  { value: 'downpipe', label: 'Downpipe' },
  { value: 'catalizador', label: 'Catalizador' },
  { value: 'fap_dpf', label: 'FAP / DPF' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'tubo_intermedio', label: 'Tubo intermedio' },
  { value: 'silencioso', label: 'Silencioso' },
  { value: 'valvulas', label: 'Válvulas' },
  { value: 'colas', label: 'Colas' },
  { value: 'otros', label: 'Otros' },
]
const partLabel = (v: string | null | undefined) => PART_TYPES.find((p) => p.value === v)?.label ?? (v || '—')

// Estado de procesado del archivo (independiente de la verificación del admin).
const PROCESSING: { value: string; label: string; hint: string; bg: string; fg: string }[] = [
  { value: 'escaneo_bruto', label: 'Escaneo en bruto', hint: 'Nube de puntos / malla sin limpiar, tal como sale del escáner', bg: '#FFF4E5', fg: '#B25E00' },
  { value: 'en_proceso', label: 'En procesado', hint: 'Se está limpiando / modelando', bg: '#E8F2FF', fg: '#0058B0' },
  { value: 'procesado', label: 'Procesado', hint: 'Modelo limpio, listo para usar', bg: '#E8F7EE', fg: '#1E8E3E' },
]
const processingMeta = (v: string | null | undefined) => PROCESSING.find((p) => p.value === v) ?? PROCESSING[2]

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pendiente de verificar', bg: '#FFF3CD', fg: '#8A6D00' },
  approved: { label: 'Verificado', bg: '#D1F7D1', fg: '#1A8C1A' },
  rejected: { label: 'Rechazado', bg: '#FEE2E2', fg: '#B91C1C' },
}

export default function Design3DPage() {
  const { profile } = useAuthStore()
  const [designs, setDesigns] = useState<Design3D[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Design3D | null>(null)

  const isAdmin = Boolean(profile?.is_admin)
  // Acceso 3D = Profesional+ (professional | premium | manufacturer), espejo de canOEM/read:'oem' del server.
  const canUpload = canSeeOem(profile?.user_type, profile?.is_admin)
  const hasAccess = canUpload

  useEffect(() => {
    if (hasAccess) fetchDesigns()
  }, [profile, hasAccess])

  const fetchDesigns = async () => {
    setLoading(true)
    try {
      // El servidor (api/db.ts) ya aplica la visibilidad: el admin ve TODOS los diseños (para
      // revisar/verificar); el resto ve los suyos + los públicos YA APROBADOS. El facade no soporta
      // .or(), por eso el filtro va server-side.
      const { data, error } = await supabase
        .from('design_3d')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setDesigns((data as any) || [])
    } catch (error) {
      console.error('Error fetching designs:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() { setEditing(null); setShowForm(true) }
  function openEdit(d: Design3D) { setEditing(d); setShowForm(true); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0) }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center" style={{ maxWidth: '480px', padding: '0 24px' }}>
          <div className="flex items-center justify-center" style={{ width: '72px', height: '72px', borderRadius: '18px', backgroundColor: '#F5F5F7', margin: '0 auto 24px' }}>
            <Lock size={32} style={{ color: '#86868B' }} />
          </div>
          <h1 className="text-headline" style={{ color: '#1D1D1F', marginBottom: '12px' }}>Acceso Restringido</h1>
          <p className="text-body-large" style={{ color: '#6E6E73', marginBottom: '32px', lineHeight: '1.5' }}>
            El acceso a los disenos 3D esta disponible solo para usuarios con plan Profesional o Premium.
          </p>
          <a href="/subscriptions" className="btn-text" style={{ fontSize: '21px' }}>Ver Suscripciones</a>
        </div>
      </div>
    )
  }

  return (
    <div className="content-width" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: '48px' }}>
        <div>
          <h1 className="text-headline" style={{ color: '#1D1D1F', marginBottom: '8px' }}>Disenos 3D</h1>
          <p className="text-body-large" style={{ color: '#6E6E73' }}>Visualiza y gestiona tus modelos tridimensionales</p>
          {isAdmin && <p style={{ fontSize: 13, color: '#8A6D00', marginTop: 6 }}>Como admin ves todos los diseños, incluidos los pendientes de verificar.</p>}
        </div>
        {canUpload && (
          <button onClick={openCreate} className="btn-pill btn-primary" style={{ gap: '8px', display: 'inline-flex', alignItems: 'center' }}>
            <Plus size={20} /> Subir Diseno
          </button>
        )}
      </div>

      {showForm && (
        <DesignForm
          editing={editing}
          isAdmin={isAdmin}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSuccess={() => { setShowForm(false); setEditing(null); fetchDesigns() }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: '80px 0' }}>
          <div className="flex items-center gap-3" style={{ color: '#86868B' }}>
            <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid #D2D2D7', borderTopColor: '#0071E3' }} />
            <span>Cargando disenos...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.length === 0 ? (
            <div className="col-span-full text-center" style={{ padding: '80px 32px' }}>
              <div className="flex items-center justify-center" style={{ width: '64px', height: '64px', borderRadius: '18px', backgroundColor: '#F5F5F7', margin: '0 auto 20px' }}>
                <Box size={28} style={{ color: '#86868B' }} />
              </div>
              <p style={{ color: '#86868B', fontSize: '17px' }}>No hay disenos disponibles todavia</p>
            </div>
          ) : (
            designs.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                isOwner={design.uploaded_by === profile?.id}
                isAdmin={isAdmin}
                onEdit={() => openEdit(design)}
                onChanged={fetchDesigns}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function DesignCard({ design, isOwner, isAdmin, onEdit, onChanged }: {
  design: Design3D; isOwner: boolean; isAdmin: boolean; onEdit: () => void; onChanged: () => void
}) {
  const canManage = isOwner || isAdmin
  const st = STATUS_META[design.status ?? 'approved'] ?? STATUS_META.approved

  async function setStatus(status: 'approved' | 'rejected') {
    const { error } = await supabase.from('design_3d')
      .update({ status, reviewed_by: useAuthStore.getState().profile?.id ?? null, reviewed_at: new Date().toISOString() } as any)
      .eq('id', design.id)
    if (error) { alert(error.message); return }
    onChanged()
  }

  async function remove() {
    if (!window.confirm(`¿Borrar el diseño "${design.title}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('design_3d').delete().eq('id', design.id)
    if (error) { alert(error.message); return }
    // Limpieza best-effort de ficheros en R2.
    const urls = [design.thumbnail_url, ...((design.files ?? []).map((f) => f.url)), design.file_url].filter(Boolean) as string[]
    urls.forEach((u) => deleteTutorialFile(u).catch(() => { /* huérfano tolerable */ }))
    onChanged()
  }

  return (
    <div className="card-apple" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-center relative" style={{ height: '200px', backgroundColor: '#F5F5F7', overflow: 'hidden' }}>
        {design.thumbnail_url ? (
          <img src={design.thumbnail_url} alt={design.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box size={40} style={{ color: '#C7C7CC' }} />
        )}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {design.part_type && (
            <span className="badge" style={{ background: 'rgba(0,113,227,.1)', color: '#0060C0' }}>{partLabel(design.part_type)}</span>
          )}
          {design.processing_status && design.processing_status !== 'procesado' && (
            <span className="badge" title={processingMeta(design.processing_status).hint}
              style={{ background: processingMeta(design.processing_status).bg, color: processingMeta(design.processing_status).fg }}>
              {processingMeta(design.processing_status).label}
            </span>
          )}
          {canManage && design.status && design.status !== 'approved' && (
            <span className="badge" style={{ background: st.bg, color: st.fg, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> {st.label}
            </span>
          )}
        </div>
        {isOwner && (
          <span className="badge" style={{ position: 'absolute', top: '12px', right: '12px', ...(design.is_public ? { background: 'rgba(52, 199, 89, 0.1)', color: '#34C759' } : { background: '#E5E5EA', color: '#6E6E73' }), display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {design.is_public ? <Eye size={12} /> : <EyeOff size={12} />}
            {design.is_public ? 'Publico' : 'Privado'}
          </span>
        )}
      </div>

      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>{design.title}</h3>
        {design.description && (
          <p className="line-clamp-2" style={{ fontSize: '14px', lineHeight: '1.5', color: '#6E6E73', marginBottom: '6px' }}>{design.description}</p>
        )}
        {design.file_size ? (
          <p style={{ fontSize: '13px', color: '#86868B', marginBottom: '12px' }}>Tamaño total: {(design.file_size / 1024 / 1024).toFixed(1)} MB</p>
        ) : null}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(design.files && design.files.length > 0
            ? design.files
            : design.file_url ? [{ url: design.file_url, name: 'Descargar', size: design.file_size ?? 0 }] : []
          ).map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="btn-pill btn-primary btn-sm"
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
              <Download size={14} /> {f.name}{f.size ? ` · ${(f.size / 1024 / 1024).toFixed(0)} MB` : ''}
            </a>
          ))}

          {canManage && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <button onClick={onEdit} style={mgmtBtn} title="Editar"><Pencil size={14} /> Editar</button>
              <button onClick={remove} style={{ ...mgmtBtn, color: '#FF3B30', borderColor: '#FFD5D2' }} title="Borrar"><Trash2 size={14} /> Borrar</button>
              {isAdmin && design.status !== 'approved' && (
                <button onClick={() => setStatus('approved')} style={{ ...mgmtBtn, color: '#1A8C1A', borderColor: '#B7E8B7' }} title="Verificar"><Check size={14} /> Verificar</button>
              )}
              {isAdmin && design.status !== 'rejected' && (
                <button onClick={() => setStatus('rejected')} style={{ ...mgmtBtn, color: '#B91C1C', borderColor: '#FCA5A5' }} title="Rechazar"><X size={14} /> Rechazar</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const mgmtBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid #E5E5EA', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#3A3A3C', cursor: 'pointer' }

function DesignForm({ editing, isAdmin, onClose, onSuccess }: {
  editing: Design3D | null; isAdmin: boolean; onClose: () => void; onSuccess: () => void
}) {
  const { profile } = useAuthStore()
  const [title, setTitle] = useState(editing?.title ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [partType, setPartType] = useState(editing?.part_type ?? '')
  const [processing, setProcessing] = useState(editing?.processing_status ?? 'procesado')
  const [isPublic, setIsPublic] = useState(editing?.is_public ?? false)
  const [thumbUrl, setThumbUrl] = useState<string | null>(editing?.thumbnail_url ?? null)
  const [thumbBusy, setThumbBusy] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const savingRef = useRef(false)

  const isEdit = !!editing
  const MAX_MB = 2048

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (savingRef.current) return
    if (!profile?.id) { setError('No hay perfil cargado'); return }
    if (!title.trim()) { setError('El título es obligatorio'); return }
    if (!partType) { setError('Selecciona el tipo de pieza'); return }
    if (!isEdit && files.length === 0) { setError('Selecciona al menos un archivo (STL, STP, STEP u OBJ)'); return }
    if (thumbBusy) { setError('Espera a que termine la subida de la imagen'); return }
    const tooBig = files.find((f) => f.size > MAX_MB * 1024 * 1024)
    if (tooBig) { setError(`"${tooBig.name}" supera ${MAX_MB} MB`); return }

    savingRef.current = true
    setLoading(true)
    setError('')
    try {
      // Meta común. status/reviewed_* están protegidos en el facade: solo el admin los fija;
      // un Profesional que edita NO puede auto-verificarse.
      const meta: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        part_type: partType,
        processing_status: processing,
        is_public: isPublic,
        thumbnail_url: thumbUrl,
      }

      // ¿Se suben/reemplazan archivos 3D? En alta es obligatorio; en edición es opcional.
      let uploaded: DesignFile[] | null = null
      if (files.length > 0) {
        uploaded = []
        for (let i = 0; i < files.length; i++) {
          setProgress(`Subiendo ${i + 1}/${files.length}: ${files[i].name}…`)
          const url = await uploadTutorialFile(files[i], 'designs-3d')
          uploaded.push({ url, name: files[i].name, size: files[i].size })
        }
      }

      if (isEdit) {
        if (uploaded) {
          meta.files = JSON.stringify(uploaded) // jsonb → stringify
          meta.file_url = uploaded[0].url
          meta.file_size = files.reduce((s, f) => s + f.size, 0)
        }
        const { error: upErr } = await supabase.from('design_3d').update(meta as any).eq('id', editing!.id)
        if (upErr) throw upErr
        // Reemplazo: borra los ficheros 3D viejos en R2 (best-effort).
        if (uploaded && editing) {
          const old = [...((editing.files ?? []).map((f) => f.url)), editing.file_url].filter(Boolean) as string[]
          old.forEach((u) => deleteTutorialFile(u).catch(() => {}))
        }
      } else {
        const totalSize = files.reduce((s, f) => s + f.size, 0)
        const insert: Record<string, unknown> = {
          ...meta,
          uploaded_by: profile.id,
          file_url: uploaded![0].url,
          files: JSON.stringify(uploaded),
          file_size: totalSize,
        }
        // El admin publica ya verificado; un Profesional entra 'pending' (default del server).
        if (isAdmin) insert.status = 'approved'
        const { error: insErr } = await supabase.from('design_3d').insert(insert as any)
        if (insErr) throw insErr
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el diseño')
    } finally {
      savingRef.current = false
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="card-apple" style={{ padding: '32px', marginBottom: '32px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1D1D1F', marginBottom: '24px' }}>
        {isEdit ? 'Editar diseño 3D' : 'Subir diseño 3D'}
      </h2>

      {error && (
        <div style={{ background: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.15)', color: '#FF3B30', borderRadius: '12px', padding: '14px', fontSize: '14px', marginBottom: '20px' }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '20px' }}>
        <div>
          <label style={fieldLabel}>Título</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Nombre del diseño" className="input-apple" />
        </div>

        <div>
          <label style={fieldLabel}>Tipo de pieza</label>
          <select value={partType} onChange={(e) => setPartType(e.target.value)} className="input-apple" required>
            <option value="">Selecciona…</option>
            {PART_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div>
          <label style={fieldLabel}>Estado de procesado</label>
          <select value={processing} onChange={(e) => setProcessing(e.target.value)} className="input-apple">
            {PROCESSING.map((p) => <option key={p.value} value={p.value}>{p.label} — {p.hint}</option>)}
          </select>
        </div>

        <div>
          <label style={fieldLabel}>Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe el diseño…" rows={3} className="input-apple" style={{ resize: 'none' }} />
        </div>

        <div>
          <label style={fieldLabel}>Imagen (foto real o render de la pieza)</label>
          <FileManagerField
            value={thumbUrl}
            onChange={(url) => setThumbUrl(url)}
            kind="image"
            bucket="content-media"
            prefix="designs-3d"
            accept="image/*"
            maxSizeMB={25}
            onBusyChange={setThumbBusy}
          />
        </div>

        <div>
          <label style={fieldLabel}>
            {isEdit ? 'Reemplazar archivos 3D (opcional — deja vacío para conservar los actuales)' : 'Archivos 3D (puedes subir varios: p.ej. lado izquierdo y derecho)'}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: '2px dashed #D2D2D7', borderRadius: 12, cursor: 'pointer', fontSize: 14, color: '#6E6E73' }}>
            <Upload size={16} />
            {`Seleccionar STL, STP, STEP u OBJ · varios permitidos · hasta ${(MAX_MB / 1024).toFixed(0)} GB c/u`}
            <input type="file" multiple accept=".stl,.stp,.step,.obj,model/stl,model/step,model/obj,application/octet-stream" style={{ display: 'none' }}
              onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} />
          </label>
          {isEdit && files.length === 0 && (editing?.files?.length ?? 0) > 0 && (
            <p style={{ fontSize: 12, color: '#86868B', marginTop: 6 }}>Actuales: {editing!.files!.map((f) => f.name).join(', ')}</p>
          )}
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
          <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#0071E3' }} />
          <label htmlFor="isPublic" style={{ fontSize: '15px', color: '#1D1D1F', cursor: 'pointer' }}>
            Hacer público (los públicos de otros usuarios se muestran tras verificación del admin)
          </label>
        </div>

        <div className="flex gap-3" style={{ paddingTop: '4px' }}>
          <button type="submit" disabled={loading || thumbBusy} className="btn-pill btn-primary" style={{ flex: 1, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? (progress || 'Guardando…') : (isEdit ? 'Guardar cambios' : 'Subir diseño')}
          </button>
          <button type="button" onClick={onClose} className="btn-pill btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  )
}

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: '14px', fontWeight: 500, color: '#1D1D1F', marginBottom: '8px' }
