import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { uploadTutorialFile } from '../lib/storage'
import { useAuthStore } from '../stores/authStore'
import { FileText, Download, Search, Upload, Plus, X, ChevronRight } from 'lucide-react'

interface Manual {
  id: string
  title: string
  description: string
  car_brand: string
  car_model: string
  manual_type: string
  file_url: string
  file_size: number
  thumbnail_url?: string
  required_tier: string
  created_at: string
}

const manualTypeLabels: Record<string, string> = {
  car_manual: 'Manual de Coche',
  exhaust_installation: 'Instalacion de Escape',
  maintenance: 'Mantenimiento',
  other: 'Otros'
}

const filterOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'car_manual', label: 'Manual de Coche' },
  { value: 'exhaust_installation', label: 'Instalacion' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'other', label: 'Otros' },
]

export default function ManualsPage() {
  const [manuals, setManuals] = useState<Manual[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selected, setSelected] = useState<Manual | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Subida (solo admin)
  const isAdmin = useAuthStore((s) => Boolean((s.profile as { is_admin?: boolean } | null)?.is_admin))
  const profileId = useAuthStore((s) => (s.profile as { id?: string } | null)?.id ?? null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', car_brand: '', car_model: '',
    manual_type: 'car_manual', required_tier: 'standard',
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!file) { setFormError('Selecciona un archivo PDF'); return }
    if (!form.title.trim() || !form.car_brand.trim() || !form.car_model.trim()) {
      setFormError('Título, marca y modelo son obligatorios'); return
    }
    if (file.size > 50 * 1024 * 1024) { setFormError('Máximo 50 MB'); return }
    setUploading(true)
    try {
      const fileUrl = await uploadTutorialFile(file, 'manuals')
      const { error: insErr } = await supabase.from('manuals').insert({
        title: form.title.trim(),
        description: form.description.trim() || form.title.trim(),
        car_brand: form.car_brand.trim(),
        car_model: form.car_model.trim(),
        manual_type: form.manual_type,
        file_url: fileUrl,
        file_size: file.size,
        required_tier: form.required_tier,
        uploaded_by: profileId,
      })
      if (insErr) throw new Error(insErr.message)
      setForm({ title: '', description: '', car_brand: '', car_model: '', manual_type: 'car_manual', required_tier: 'standard' })
      setFile(null)
      setShowForm(false)
      await fetchManuals()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al subir el manual')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    fetchManuals()
  }, [])

  async function fetchManuals() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('manuals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setManuals(data || [])
    } catch (err) {
      console.error('Error fetching manuals:', err)
      setError('Error al cargar los manuales')
    } finally {
      setLoading(false)
    }
  }

  function handleDownload(manual: Manual) {
    // file_url ya es una URL pública de R2: abrimos en pestaña nueva (el navegador
    // descarga o previsualiza el PDF). El antiguo .download() de Supabase ya no existe.
    if (!manual.file_url) {
      alert('Este manual no tiene archivo asociado')
      return
    }
    window.open(manual.file_url, '_blank', 'noopener,noreferrer')
  }

  const filteredManuals = manuals.filter(manual => {
    const matchesSearch =
      manual.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manual.car_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manual.car_model.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = selectedType === 'all' || manual.manual_type === selectedType

    return matchesSearch && matchesType
  })

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3" style={{ color: '#86868B' }}>
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{ border: '2px solid #D2D2D7', borderTopColor: '#0071E3' }}
          />
          <span>Cargando manuales...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="content-width" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      {/* Page Header */}
      <div className="text-center" style={{ marginBottom: '48px' }}>
        <h1 className="text-headline" style={{ color: '#1D1D1F', marginBottom: '12px' }}>
          Manuales Tecnicos
        </h1>
        <p className="text-body-large" style={{ color: '#6E6E73', maxWidth: '600px', margin: '0 auto' }}>
          Accede a manuales de coches y guias de instalacion
        </p>
      </div>

      {/* Admin: subir manual */}
      {isAdmin && (
        <div style={{ maxWidth: '600px', margin: '0 auto 24px' }}>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="btn-pill btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> Subir manual (admin)
            </button>
          ) : (
            <form
              onSubmit={handleUpload}
              style={{ border: '1px solid #E5E5EA', borderRadius: 14, padding: 20, background: '#FFFFFF', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <strong style={{ fontSize: 15 }}>Nuevo manual</strong>
                <button type="button" onClick={() => setShowForm(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#86868B' }}>
                  <X size={18} />
                </button>
              </div>
              <input className="input-apple" placeholder="Título *" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginBottom: 10 }} />
              <textarea className="input-apple" placeholder="Descripción" value={form.description} rows={2}
                onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 10, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input className="input-apple" placeholder="Marca *" value={form.car_brand}
                  onChange={(e) => setForm({ ...form, car_brand: e.target.value })} />
                <input className="input-apple" placeholder="Modelo *" value={form.car_model}
                  onChange={(e) => setForm({ ...form, car_model: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <select className="input-apple" value={form.manual_type}
                  onChange={(e) => setForm({ ...form, manual_type: e.target.value })}>
                  {Object.entries(manualTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select className="input-apple" value={form.required_tier}
                  onChange={(e) => setForm({ ...form, required_tier: e.target.value })}>
                  <option value="standard">Acceso libre</option>
                  <option value="professional">Profesional</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', border: '2px dashed #D2D2D7', borderRadius: 10, cursor: 'pointer', marginBottom: 12, fontSize: 13, color: '#6E6E73' }}>
                <Upload size={15} />
                {file ? file.name : 'Seleccionar PDF (máx. 50 MB)'}
                <input type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              {formError && <div style={{ color: '#D70015', fontSize: 13, marginBottom: 10 }}>{formError}</div>}
              <button type="submit" disabled={uploading} className="btn-pill btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {uploading ? 'Subiendo…' : 'Guardar manual'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div style={{ maxWidth: '600px', margin: '0 auto 32px' }}>
        <div className="relative">
          <Search
            size={20}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: '16px', color: '#86868B' }}
          />
          <input
            type="text"
            placeholder="Buscar por titulo, marca o modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-apple"
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap" style={{ marginBottom: '48px' }}>
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedType(option.value)}
            style={{
              padding: '8px 20px',
              borderRadius: '980px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: selectedType === option.value ? '#1D1D1F' : '#F5F5F7',
              color: selectedType === option.value ? '#FFFFFF' : '#1D1D1F',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: 'rgba(255, 59, 48, 0.08)',
            border: '1px solid rgba(255, 59, 48, 0.15)',
            color: '#FF3B30',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            marginBottom: '32px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {/* Content */}
      {filteredManuals.length === 0 ? (
        <div className="text-center" style={{ padding: '80px 32px' }}>
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
            <FileText size={28} style={{ color: '#86868B' }} />
          </div>
          <p style={{ color: '#86868B', fontSize: '17px' }}>
            {searchTerm || selectedType !== 'all'
              ? 'No se encontraron manuales con los criterios seleccionados'
              : 'No hay manuales disponibles'}
          </p>
        </div>
      ) : (
        <div style={{ maxWidth: 820, margin: '0 auto', border: '1px solid #F2F2F7', borderRadius: 16, overflow: 'hidden', background: '#FFFFFF' }}>
          {filteredManuals.map((manual, i) => (
            <button key={manual.id} onClick={() => setSelected(manual)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '13px 18px',
                border: 'none', borderTop: i === 0 ? 'none' : '1px solid #F2F2F7',
                cursor: 'pointer', background: 'transparent', textAlign: 'left', transition: 'background .15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={16} style={{ color: '#86868B' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{manual.title}</span>
                  <span className="badge badge-green" style={{ flexShrink: 0 }}>{manualTypeLabels[manual.manual_type]}</span>
                </div>
                <div style={{ fontSize: 13, color: '#86868B', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {manual.car_brand} {manual.car_model} · {formatFileSize(manual.file_size)}
                </div>
              </div>
              <ChevronRight size={18} style={{ color: '#C7C7CC', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ManualDetailModal
          manual={selected}
          onClose={() => setSelected(null)}
          onDownload={() => handleDownload(selected)}
          formatFileSize={formatFileSize}
        />
      )}
    </div>
  )
}

function ManualDetailModal({ manual, onClose, onDownload, formatFileSize }: {
  manual: Manual; onClose: () => void; onDownload: () => void; formatFileSize: (b: number) => string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: 18, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 12px 48px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '22px 24px 16px', borderBottom: '1px solid #F2F2F7' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={22} style={{ color: '#86868B' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 19, fontWeight: 600, color: '#1D1D1F', margin: 0, lineHeight: 1.3 }}>{manual.title}</h3>
            <p style={{ fontSize: 14, color: '#6E6E73', margin: '4px 0 0' }}>{manual.car_brand} {manual.car_model}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#86868B', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '18px 24px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span className="badge badge-green">{manualTypeLabels[manual.manual_type]}</span>
            <span className="badge badge-gray">{formatFileSize(manual.file_size)}</span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#3A3A3C', margin: 0, whiteSpace: 'pre-wrap' }}>
            {manual.description}
          </p>
        </div>
        <div style={{ padding: '16px 24px 22px', borderTop: '1px solid #F2F2F7' }}>
          <button onClick={onDownload} className="btn-pill btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Download size={16} /> Descargar / Ver PDF
          </button>
        </div>
      </div>
    </div>
  )
}
