import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PhotoUploader from '../../components/admin/PhotoUploader'
import {
  QA_STATES, PART_TYPES, CONFIDENCE, PART_MATERIALS, HOMOLOGATION, DIFFICULTY,
  inputStyle, labelStyle, fieldGroupStyle, sectionTitleStyle, StatusBadge,
} from '../../lib/dataAdmin'

interface Part {
  id?: string
  diagram_id: string
  part_type: string
  name: string
  oem_ref?: string | null
  oem_not_found: boolean
  position_number?: number | null
  description?: string | null
  material?: string | null
  diameter_mm?: number | null
  thickness_mm?: number | null
  homologation?: string | null
  has_sensor?: boolean
  fabrication_hours?: number | null
  material_cost?: number | null
  total_cost?: number | null
  difficulty?: string | null
  fabricable?: boolean | null
  images?: string[]
  is_active?: boolean
  confidence: string
  source_url?: string | null
  notes?: string | null
  qa_issues?: string | null
  status: string
}

interface DiagramOpt {
  id: string
  label: string
}

export default function AdminPartEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'nuevo'

  const [part, setPart] = useState<Part>({
    diagram_id: searchParams.get('diagram') ?? '',
    part_type: 'otro',
    name: '',
    oem_ref: '',
    oem_not_found: false,
    images: [],
    is_active: true,
    confidence: 'media',
    status: 'draft',
  })
  const [diagrams, setDiagrams] = useState<DiagramOpt[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      // Load diagrams list for select
      const { data: ds } = await supabase
        .from('exhaust_diagrams').select('*').limit(500)
      if (ds) {
        const arr = ds as { id: string; engine_id: string }[]
        const engineIds = Array.from(new Set(arr.map((d) => d.engine_id)))
        const { data: es } = engineIds.length
          ? await supabase.from('engines').select('*').in('id', engineIds)
          : { data: [] }
        const eMap = new Map((es as { id: string; vehicle_id: string; version: string }[] ?? []).map((e) => [e.id, e]))
        const vIds = Array.from(new Set((es as { vehicle_id: string }[] ?? []).map(e => e.vehicle_id)))
        const { data: vs } = vIds.length
          ? await supabase.from('vehicles').select('*').in('id', vIds)
          : { data: [] }
        const vMap = new Map((vs as { id: string; brand: string; model: string }[] ?? []).map(v => [v.id, v]))
        setDiagrams(arr.map((d) => {
          const e = eMap.get(d.engine_id)
          const v = e ? vMap.get(e.vehicle_id) : null
          return { id: d.id, label: v && e ? `${v.brand} ${v.model} · ${e.version}` : d.id.slice(0, 8) }
        }).sort((a, b) => a.label.localeCompare(b.label)))
      }

      if (!isNew) {
        const { data } = await supabase.from('exhaust_parts').select('*').eq('id', id).maybeSingle()
        if (data) setPart(data as Part)
      }
      setLoading(false)
    })()
  }, [id, isNew])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (!part.diagram_id) throw new Error('Selecciona un esquema/diagrama')
      if (!part.name.trim()) throw new Error('Falta nombre')

      if (isNew) {
        const { error: e } = await supabase.from('exhaust_parts').insert(part)
        if (e) throw new Error(e.message)
      } else {
        const { error: e } = await supabase.from('exhaust_parts').update(part).eq('id', id)
        if (e) throw new Error(e.message)
      }
      navigate('/admin/data/piezas' + (part.diagram_id ? `?diagram=${part.diagram_id}` : ''))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!part.id) return
    if (!window.confirm('Borrar esta pieza?')) return
    setSaving(true)
    const { error: e } = await supabase.from('exhaust_parts').delete().eq('id', part.id)
    if (e) setError(e.message)
    else navigate('/admin/data/piezas')
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 32 }}>Cargando…</div>

  return (
    <div style={{ padding: 32, maxWidth: 880, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <Link to="/admin/data/piezas" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#86868B', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={14} /> Volver
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <h1 style={{ fontSize: 26, margin: 0 }}>{isNew ? 'Nueva pieza' : part.name}</h1>
          <StatusBadge status={part.status} />
        </div>
        <p style={{ color: '#86868B', marginTop: 4 }}>Formulario B — Pieza individual del esquema.</p>
      </header>

      {error && (
        <div style={{ padding: 12, backgroundColor: '#FFE5E7', color: '#D70015', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <h2 style={sectionTitleStyle}>Asociación</h2>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Esquema (vehículo + motor) *</label>
        <select value={part.diagram_id} onChange={(e) => setPart({ ...part, diagram_id: e.target.value })} style={inputStyle as React.CSSProperties}>
          <option value="">— seleccionar —</option>
          {diagrams.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>

      <h2 style={sectionTitleStyle}>Identificación de la pieza</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Tipo *" value={part.part_type} options={PART_TYPES.map(p => ({ value: p.value, label: p.label }))} onChange={(v) => setPart({ ...part, part_type: v })} isSelect />
        <Field label="Nombre exacto *" value={part.name} onChange={(v) => setPart({ ...part, name: v })} placeholder="Colector + Turbo Der." />
        <Field label="Referencia OEM" value={part.oem_ref ?? ''} onChange={(v) => setPart({ ...part, oem_ref: v })} placeholder="0AEA1140" disabled={part.oem_not_found} />
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>OEM no encontrado</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={part.oem_not_found} onChange={(e) => setPart({ ...part, oem_not_found: e.target.checked, oem_ref: e.target.checked ? null : part.oem_ref })} />
            Marcar si no hay referencia OEM
          </label>
        </div>
        <Field label="Posición en esquema (nº)" type="number" value={part.position_number?.toString() ?? ''} onChange={(v) => setPart({ ...part, position_number: v ? parseInt(v) : null })} />
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Visible en el mapa</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={part.is_active ?? true} onChange={(e) => setPart({ ...part, is_active: e.target.checked })} />
            {part.is_active === false ? 'Desactivada (oculta al cliente)' : 'Activa'}
          </label>
        </div>
      </div>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Descripción</label>
        <textarea value={part.description ?? ''} onChange={(e) => setPart({ ...part, description: e.target.value })} rows={2} style={{ ...inputStyle, minHeight: 50 }} />
      </div>

      <h2 style={sectionTitleStyle}>Datos técnicos</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Field label="Material" value={part.material ?? ''}
          options={[{ value: '', label: '— sin especificar —' }, ...PART_MATERIALS.map(m => ({ value: m.value, label: m.label }))]}
          onChange={(v) => setPart({ ...part, material: v })} isSelect />
        <Field label="Diámetro (mm)" type="number" step="0.1" value={part.diameter_mm?.toString() ?? ''} onChange={(v) => setPart({ ...part, diameter_mm: v ? parseFloat(v) : null })} />
        <Field label="Grosor (mm)" type="number" step="0.1" value={part.thickness_mm?.toString() ?? ''} onChange={(v) => setPart({ ...part, thickness_mm: v ? parseFloat(v) : null })} />
        <Field label="Homologación" value={part.homologation ?? ''}
          options={[{ value: '', label: '— sin especificar —' }, ...HOMOLOGATION.map(h => ({ value: h.value, label: h.label }))]}
          onChange={(v) => setPart({ ...part, homologation: v })} isSelect />
        <Field label="Dificultad fabricación" value={part.difficulty ?? ''}
          options={[{ value: '', label: '— sin especificar —' }, ...DIFFICULTY.map(d => ({ value: d.value, label: d.label }))]}
          onChange={(v) => setPart({ ...part, difficulty: v })} isSelect />
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Lleva sensor</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={part.has_sensor ?? false} onChange={(e) => setPart({ ...part, has_sensor: e.target.checked })} />
            Sí
          </label>
        </div>
      </div>

      <h2 style={sectionTitleStyle}>Fotos del componente</h2>
      <p style={{ color: '#86868B', fontSize: 13, marginTop: -8, marginBottom: 12 }}>
        Fotos técnicas de esta pieza concreta. La primera es la portada que verá el cliente al clicar el componente.
      </p>
      <PhotoUploader
        schemaId={`parts/${part.id ?? (part.diagram_id || 'nuevas')}`}
        coverUrl={part.images?.[0] ?? null}
        galleryUrls={part.images?.slice(1) ?? []}
        onChange={({ coverUrl, galleryUrls }) =>
          setPart({ ...part, images: [...(coverUrl ? [coverUrl] : []), ...galleryUrls] })
        }
      />

      <h2 style={sectionTitleStyle}>Coste estimado</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Field label="Horas fabricación" type="number" step="0.1" value={part.fabrication_hours?.toString() ?? ''} onChange={(v) => setPart({ ...part, fabrication_hours: v ? parseFloat(v) : null })} />
        <Field label="Coste material (€)" type="number" step="0.01" value={part.material_cost?.toString() ?? ''} onChange={(v) => setPart({ ...part, material_cost: v ? parseFloat(v) : null })} />
        <Field label="Coste total (€)" type="number" step="0.01" value={part.total_cost?.toString() ?? ''} onChange={(v) => setPart({ ...part, total_cost: v ? parseFloat(v) : null })} />
      </div>

      <h2 style={sectionTitleStyle}>Validación</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Fuente (URL)" value={part.source_url ?? ''} onChange={(v) => setPart({ ...part, source_url: v })} placeholder="https://catalogo.example.com/…" />
        <Field label="Confianza *" value={part.confidence} options={CONFIDENCE.map(c => ({ value: c.value, label: c.label }))} onChange={(v) => setPart({ ...part, confidence: v })} isSelect />
        <Field label="Estado QA" value={part.status} options={QA_STATES.map(s => ({ value: s.value, label: s.label }))} onChange={(v) => setPart({ ...part, status: v })} isSelect />
      </div>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Notas / comentarios del investigador</label>
        <textarea value={part.notes ?? ''} onChange={(e) => setPart({ ...part, notes: e.target.value })} rows={2} style={{ ...inputStyle, minHeight: 50 }} />
      </div>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Problemas encontrados</label>
        <textarea value={part.qa_issues ?? ''} onChange={(e) => setPart({ ...part, qa_issues: e.target.value })}
          placeholder="Fuentes contradictorias, OEM dudosa, etc." rows={2} style={{ ...inputStyle, minHeight: 50 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, padding: '16px 0', borderTop: '1px solid #E5E5EA' }}>
        {!isNew && (
          <button onClick={handleDelete} disabled={saving} style={btnDanger}>
            <Trash2 size={14} /> Borrar
          </button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={handleSave} disabled={saving} style={btnPrimary}>
            <Save size={14} /> {saving ? 'Guardando…' : 'Guardar pieza'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', step, options, isSelect, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; step?: string;
  options?: { value: string; label: string }[]; isSelect?: boolean; disabled?: boolean;
}) {
  return (
    <div style={fieldGroupStyle}>
      <label style={labelStyle}>{label}</label>
      {isSelect && options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle as React.CSSProperties} disabled={disabled}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} step={step} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} style={inputStyle} disabled={disabled} />
      )}
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 20px', backgroundColor: '#0071E3', color: 'white',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
const btnDanger: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 16px', backgroundColor: 'transparent', color: '#D70015',
  border: '1px solid #FFE5E7', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
