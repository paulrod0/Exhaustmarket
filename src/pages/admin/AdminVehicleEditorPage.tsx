import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  QA_STATES, FUEL_OPTIONS, BODY_TYPES, ENGINE_LAYOUTS, EMISSIONS_NORMS,
  DRIVE_TYPES, GEARBOX_TYPES, CONFIDENCE, COUNTRIES, buildInternalId,
  inputStyle, labelStyle, fieldGroupStyle, sectionTitleStyle, StatusBadge,
} from '../../lib/dataAdmin'

interface Vehicle {
  id?: string
  internal_id?: string | null
  brand: string
  model: string
  generation?: string | null
  year_from: number
  year_to?: number | null
  body?: string | null
  doors?: number | null
  notes?: string | null
  status: string
  // Investigador (Anexo A)
  investigator_name?: string | null
  investigator_email?: string | null
  investigator_country?: string | null
  investigator_date?: string | null
}

interface Engine {
  id?: string
  vehicle_id?: string
  internal_id?: string | null
  version: string
  engine_code?: string | null
  fuel: string
  displacement_l?: number | null
  power_cv?: number | null
  power_kw?: number | null
  emissions?: string | null
  drive?: string | null
  gearbox?: string | null
  status: string
}

interface Diagram {
  id?: string
  engine_id?: string
  layout: string
  architecture_code?: string | null
  color: string
  diagram_image_url?: string | null
  source_url?: string | null
  source_quality?: string | null
  notes?: string | null
  related_video_url?: string | null
  status: string
  // Anexo A
  schema_exists?: boolean
  parts_numbered?: boolean | null
  qa_issues?: string | null
}

/**
 * Formulario A — Vehículo + Motor + Esquema (en una pantalla).
 * Crea el vehicle, luego un engine asociado, luego un exhaust_diagram inicial.
 * El detalle de piezas se completa en Formulario B (AdminPartsListPage).
 */
export default function AdminVehicleEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'nuevo'

  const [vehicle, setVehicle] = useState<Vehicle>({
    brand: '', model: '', generation: '', year_from: new Date().getFullYear(), year_to: null,
    body: '', doors: null, notes: '', status: 'draft',
    investigator_name: '', investigator_email: '', investigator_country: 'ES',
    investigator_date: new Date().toISOString().slice(0, 10),
  })
  const [engine, setEngine] = useState<Engine>({
    version: '', engine_code: '', fuel: 'gasolina',
    displacement_l: null, power_cv: null, power_kw: null,
    emissions: '', drive: '', gearbox: '', status: 'draft',
  })
  const [diagram, setDiagram] = useState<Diagram>({
    layout: 'unknown', architecture_code: '', color: '#1D1D1F', diagram_image_url: '',
    source_url: '', source_quality: 'media', notes: '', related_video_url: '',
    status: 'draft',
    schema_exists: true, parts_numbered: null, qa_issues: '',
  })
  const [architectures, setArchitectures] = useState<{ code: string; name: string; category: string }[]>([])

  useEffect(() => {
    supabase.from('exhaust_architectures').select('code,name,category').then(({ data }) => {
      if (data) setArchitectures(data as { code: string; name: string; category: string }[])
    })
  }, [])

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [engineId, setEngineId] = useState<string | undefined>()
  const [diagramId, setDiagramId] = useState<string | undefined>()

  useEffect(() => {
    if (isNew) return
    ;(async () => {
      const { data: vRow } = await supabase.from('vehicles').select('*').eq('id', id).maybeSingle()
      if (vRow) setVehicle(vRow as Vehicle)
      const { data: eRow } = await supabase.from('engines').select('*').eq('vehicle_id', id).limit(1)
      const eArr = (eRow as Engine[] | null) ?? []
      if (eArr[0]) {
        setEngine(eArr[0])
        setEngineId(eArr[0].id)
        const { data: dRow } = await supabase.from('exhaust_diagrams').select('*').eq('engine_id', eArr[0].id).limit(1)
        const dArr = (dRow as Diagram[] | null) ?? []
        if (dArr[0]) {
          setDiagram(dArr[0])
          setDiagramId(dArr[0].id)
        }
      }
      setLoading(false)
    })()
  }, [id, isNew])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // 1. Save vehicle
      const internalIdV = buildInternalId([vehicle.brand, vehicle.model, vehicle.generation || null, vehicle.year_from])
      const vPayload = { ...vehicle, internal_id: internalIdV }
      let vehicleId = vehicle.id
      if (isNew) {
        const { data, error: e } = await supabase.from('vehicles').insert(vPayload).select('*').single()
        if (e) throw new Error(e.message)
        vehicleId = (data as Vehicle).id
      } else {
        const { error: e } = await supabase.from('vehicles').update(vPayload).eq('id', vehicleId)
        if (e) throw new Error(e.message)
      }
      if (!vehicleId) throw new Error('No vehicle id')

      // 2. Save engine
      const internalIdE = buildInternalId([
        vehicle.brand, vehicle.generation || vehicle.model, engine.version,
        vehicle.year_from, engine.engine_code || null,
      ])
      const ePayload = { ...engine, vehicle_id: vehicleId, internal_id: internalIdE }
      let eId = engineId
      if (!eId) {
        const { data, error: e } = await supabase.from('engines').insert(ePayload).select('*').single()
        if (e) throw new Error(e.message)
        eId = (data as Engine).id
        setEngineId(eId)
      } else {
        const { error: e } = await supabase.from('engines').update(ePayload).eq('id', eId)
        if (e) throw new Error(e.message)
      }
      if (!eId) throw new Error('No engine id')

      // 3. Save diagram
      const dPayload = { ...diagram, engine_id: eId }
      if (!diagramId) {
        const { data, error: e } = await supabase.from('exhaust_diagrams').insert(dPayload).select('*').single()
        if (e) throw new Error(e.message)
        setDiagramId((data as Diagram).id)
      } else {
        const { error: e } = await supabase.from('exhaust_diagrams').update(dPayload).eq('id', diagramId)
        if (e) throw new Error(e.message)
      }

      navigate('/admin/data/vehiculos')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!vehicle.id) return
    if (!window.confirm('Borrar el vehículo, su motor, esquema y todas las piezas asociadas?')) return
    setSaving(true)
    const { error: e } = await supabase.from('vehicles').delete().eq('id', vehicle.id)
    if (e) setError(e.message)
    else navigate('/admin/data/vehiculos')
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 32 }}>Cargando…</div>

  return (
    <div style={{ padding: 32, maxWidth: 980, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <Link to="/admin/data/vehiculos" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#86868B', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={14} /> Volver al listado
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <h1 style={{ fontSize: 26, margin: 0 }}>
            {isNew ? 'Nuevo vehículo' : `${vehicle.brand} ${vehicle.model}`}
          </h1>
          <StatusBadge status={vehicle.status} />
        </div>
        <p style={{ color: '#86868B', marginTop: 4 }}>
          Formulario A — Vehículo, motor y esquema.
        </p>
      </header>

      {error && (
        <div style={{ padding: 12, backgroundColor: '#FFE5E7', color: '#D70015', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ─── INVESTIGADOR ─── */}
      <h2 style={sectionTitleStyle}>Datos del investigador</h2>
      <p style={{ fontSize: 12, color: '#86868B', marginTop: -8, marginBottom: 16 }}>
        Quién está rellenando el registro y desde dónde. Útil para el flujo QA.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Nombre y apellidos" value={vehicle.investigator_name ?? ''} onChange={(v) => setVehicle({ ...vehicle, investigator_name: v })} placeholder="Juan García" />
        <Field label="Email" type="email" value={vehicle.investigator_email ?? ''} onChange={(v) => setVehicle({ ...vehicle, investigator_email: v })} placeholder="juan@example.com" />
        <SelectField label="País de investigación" value={vehicle.investigator_country ?? ''}
          options={[{ value: '', label: '— sin especificar —' }, ...COUNTRIES.map(c => ({ value: c, label: c }))]}
          onChange={(v) => setVehicle({ ...vehicle, investigator_country: v })} />
        <Field label="Fecha de investigación" type="date" value={vehicle.investigator_date ?? ''} onChange={(v) => setVehicle({ ...vehicle, investigator_date: v })} />
      </div>

      {/* ─── VEHÍCULO ─── */}
      <h2 style={sectionTitleStyle}>Vehículo</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Marca *" value={vehicle.brand} onChange={(v) => setVehicle({ ...vehicle, brand: v })} placeholder="BMW" />
        <Field label="Modelo *" value={vehicle.model} onChange={(v) => setVehicle({ ...vehicle, model: v })} placeholder="Serie 3" />
        <Field label="Generación / código carrocería" value={vehicle.generation ?? ''} onChange={(v) => setVehicle({ ...vehicle, generation: v })} placeholder="F30" />
        <SelectField label="Carrocería" value={vehicle.body ?? ''}
          options={[{ value: '', label: '— sin especificar —' }, ...BODY_TYPES.map(b => ({ value: b.value, label: b.label }))]}
          onChange={(v) => setVehicle({ ...vehicle, body: v })} />
        <Field label="Año desde *" type="number" value={vehicle.year_from?.toString() ?? ''} onChange={(v) => setVehicle({ ...vehicle, year_from: parseInt(v) || 0 })} />
        <Field label="Año hasta" type="number" value={vehicle.year_to?.toString() ?? ''} onChange={(v) => setVehicle({ ...vehicle, year_to: v ? parseInt(v) : null })} placeholder="vacío = sigue en producción" />
        <Field label="Nº puertas" type="number" value={vehicle.doors?.toString() ?? ''} onChange={(v) => setVehicle({ ...vehicle, doors: v ? parseInt(v) : null })} />
        <SelectField label="Estado QA" value={vehicle.status} options={QA_STATES.map(s => ({ value: s.value, label: s.label }))} onChange={(v) => setVehicle({ ...vehicle, status: v })} />
      </div>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Notas vehículo</label>
        <textarea value={vehicle.notes ?? ''} onChange={(e) => setVehicle({ ...vehicle, notes: e.target.value })} rows={2} style={{ ...inputStyle, minHeight: 50 }} />
      </div>

      {/* ─── MOTOR ─── */}
      <h2 style={sectionTitleStyle}>Motor</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Versión exacta *" value={engine.version} onChange={(v) => setEngine({ ...engine, version: v })} placeholder="320d / Carrera S" />
        <Field label="Código motor" value={engine.engine_code ?? ''} onChange={(v) => setEngine({ ...engine, engine_code: v })} placeholder="N47 / B58 / M139" />
        <SelectField label="Combustible *" value={engine.fuel}
          options={FUEL_OPTIONS.map(f => ({ value: f.value, label: f.label }))}
          onChange={(v) => setEngine({ ...engine, fuel: v })} />
        <Field label="Cilindrada (L)" type="number" step="0.1" value={engine.displacement_l?.toString() ?? ''} onChange={(v) => setEngine({ ...engine, displacement_l: v ? parseFloat(v) : null })} placeholder="2.0" />
        <Field label="Potencia (CV)" type="number" value={engine.power_cv?.toString() ?? ''} onChange={(v) => setEngine({ ...engine, power_cv: v ? parseInt(v) : null })} />
        <Field label="Potencia (kW)" type="number" value={engine.power_kw?.toString() ?? ''} onChange={(v) => setEngine({ ...engine, power_kw: v ? parseInt(v) : null })} />
        <SelectField label="Normativa emisiones" value={engine.emissions ?? ''}
          options={[{ value: '', label: '— sin especificar —' }, ...EMISSIONS_NORMS.map(e => ({ value: e, label: e }))]}
          onChange={(v) => setEngine({ ...engine, emissions: v })} />
        <SelectField label="Tracción" value={engine.drive ?? ''}
          options={[{ value: '', label: '— sin especificar —' }, ...DRIVE_TYPES.map(d => ({ value: d.value, label: d.label }))]}
          onChange={(v) => setEngine({ ...engine, drive: v })} />
        <SelectField label="Caja de cambios" value={engine.gearbox ?? ''}
          options={[{ value: '', label: '— sin especificar —' }, ...GEARBOX_TYPES.map(g => ({ value: g.value, label: g.label }))]}
          onChange={(v) => setEngine({ ...engine, gearbox: v })} />
        <SelectField label="Estado QA motor" value={engine.status} options={QA_STATES.map(s => ({ value: s.value, label: s.label }))} onChange={(v) => setEngine({ ...engine, status: v })} />
      </div>

      {/* ─── ESQUEMA ─── */}
      <h2 style={sectionTitleStyle}>Esquema del sistema de escape</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SelectField label="Arquitectura de escape (esquema 2D)" value={diagram.architecture_code ?? ''}
          options={[{ value: '', label: '— sin asignar —' }, ...architectures.map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` }))]}
          onChange={(v) => setDiagram({ ...diagram, architecture_code: v })} />
        <SelectField label="Layout / arquitectura motor *" value={diagram.layout}
          options={ENGINE_LAYOUTS.map(l => ({ value: l.value, label: l.label }))}
          onChange={(v) => setDiagram({ ...diagram, layout: v })} />
        <Field label="Color (hex)" value={diagram.color} onChange={(v) => setDiagram({ ...diagram, color: v })} placeholder="#1D1D1F" />
        <Field label="URL imagen del esquema" value={diagram.diagram_image_url ?? ''} onChange={(v) => setDiagram({ ...diagram, diagram_image_url: v })} placeholder="https://… (R2 o externo)" />
        <Field label="URL fuente del esquema" value={diagram.source_url ?? ''} onChange={(v) => setDiagram({ ...diagram, source_url: v })} placeholder="https://catalogo-oem.com/…" />
        <SelectField label="Calidad fuente" value={diagram.source_quality ?? 'media'} options={[{value:'alta',label:'Alta'},{value:'media',label:'Media'},{value:'baja',label:'Baja'}]} onChange={(v) => setDiagram({ ...diagram, source_quality: v })} />
        <Field label="Vídeo relacionado (YouTube/Vimeo)" value={diagram.related_video_url ?? ''} onChange={(v) => setDiagram({ ...diagram, related_video_url: v })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>¿Existe esquema OEM?</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={diagram.schema_exists ?? true} onChange={(e) => setDiagram({ ...diagram, schema_exists: e.target.checked })} />
            Sí, hay esquema/despiece disponible
          </label>
        </div>
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>¿Piezas numeradas en el esquema?</label>
          <select value={diagram.parts_numbered === null || diagram.parts_numbered === undefined ? '' : (diagram.parts_numbered ? 'yes' : 'no')}
            onChange={(e) => setDiagram({ ...diagram, parts_numbered: e.target.value === '' ? null : e.target.value === 'yes' })}
            style={inputStyle as React.CSSProperties}>
            <option value="">— sin verificar —</option>
            <option value="yes">Sí, piezas numeradas</option>
            <option value="no">No (sin numeración visual)</option>
          </select>
        </div>
      </div>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Notas esquema</label>
        <textarea value={diagram.notes ?? ''} onChange={(e) => setDiagram({ ...diagram, notes: e.target.value })} rows={3} style={{ ...inputStyle, minHeight: 70 }} />
      </div>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Problemas encontrados (para QA)</label>
        <textarea value={diagram.qa_issues ?? ''} onChange={(e) => setDiagram({ ...diagram, qa_issues: e.target.value })}
          placeholder="Dudas técnicas, fuentes contradictorias, datos faltantes…" rows={2} style={{ ...inputStyle, minHeight: 50 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, padding: '16px 0', borderTop: '1px solid #E5E5EA' }}>
        {!isNew && (
          <button onClick={handleDelete} disabled={saving} style={btnDanger}>
            <Trash2 size={14} /> Borrar
          </button>
        )}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {diagramId && (
            <Link to={`/admin/data/piezas?diagram=${diagramId}`} style={btnSecondary as React.CSSProperties}>
              Gestionar piezas →
            </Link>
          )}
          <button onClick={handleSave} disabled={saving} style={btnPrimary}>
            <Save size={14} /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ───────── Helper components ───────── */

function Field({ label, value, onChange, placeholder, type = 'text', step }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; step?: string;
}) {
  return (
    <div style={fieldGroupStyle}>
      <label style={labelStyle}>{label}</label>
      <input type={type} step={step} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  )
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={fieldGroupStyle}>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle as React.CSSProperties}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 20px', backgroundColor: '#0071E3', color: 'white',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 16px', backgroundColor: '#F2F2F7', color: '#1D1D1F',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', cursor: 'pointer',
}
const btnDanger: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 16px', backgroundColor: 'transparent', color: '#D70015',
  border: '1px solid #FFE5E7', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
