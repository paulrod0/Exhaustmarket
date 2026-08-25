import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  QA_STATES, PRODUCT_TYPE, HOMOLOGATION, COUNTRIES, CURRENCIES,
  inputStyle, labelStyle, fieldGroupStyle, sectionTitleStyle, StatusBadge,
} from '../../lib/dataAdmin'

interface Product {
  id?: string
  brand_id?: string | null
  brand_name?: string | null
  reference: string
  product_name: string
  product_type?: string | null
  description?: string | null
  price?: number | null
  currency: string
  url?: string | null
  country?: string | null
  in_stock?: boolean | null
  delivery_days?: number | null
  homologation?: string | null
  qa_issues?: string | null
  status: string
}

interface BrandOpt { id: string; name: string }
interface PartOpt {
  id: string
  name: string
  partType: string
  oemRef: string | null
  vehicle: string   // "Alfa Romeo Giulia · 2.9 V6" ('' si no resuelve)
  search: string    // haystack en minúsculas: name + oem_ref + vehículo + tipo
}

export default function AdminAftermarketProductEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'nuevo'

  const [product, setProduct] = useState<Product>({
    reference: '', product_name: '', currency: 'EUR', status: 'draft',
  })
  const [brands, setBrands] = useState<BrandOpt[]>([])
  const [parts, setParts] = useState<PartOpt[]>([])
  const [compatibilities, setCompatibilities] = useState<string[]>([]) // part ids
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: b } = await supabase.from('aftermarket_brands').select('*').order('name').limit(200)
      setBrands(((b as { id: string; name: string }[]) ?? []).map((x) => ({ id: x.id, name: x.name })))

      // Piezas OEM + contexto de vehículo. El facade NO hace joins anidados:
      // 3 queries separadas + Maps (patrón joinRelated).
      const { data: ps } = await supabase
        .from('exhaust_parts')
        .select('id, name, part_type, oem_ref, diagram_id')
        .order('part_type')
        .limit(5000)
      const partRows = (ps as { id: string; name: string; part_type: string; oem_ref: string | null; diagram_id: string }[]) ?? []

      const diagramIds = [...new Set(partRows.map(p => p.diagram_id).filter(Boolean))]
      const { data: ds } = diagramIds.length
        ? await supabase.from('exhaust_diagrams').select('id, engine_id').in('id', diagramIds)
        : { data: [] }
      const dMap = new Map(((ds as { id: string; engine_id: string }[]) ?? []).map(d => [d.id, d]))

      const engineIds = [...new Set(((ds as { engine_id: string }[]) ?? []).map(d => d.engine_id).filter(Boolean))]
      const { data: es } = engineIds.length
        ? await supabase.from('engines').select('id, vehicle_id, version').in('id', engineIds)
        : { data: [] }
      const eMap = new Map(((es as { id: string; vehicle_id: string; version: string }[]) ?? []).map(e => [e.id, e]))

      const vehicleIds = [...new Set(((es as { vehicle_id: string }[]) ?? []).map(e => e.vehicle_id).filter(Boolean))]
      const { data: vs } = vehicleIds.length
        ? await supabase.from('vehicles').select('id, brand, model').in('id', vehicleIds)
        : { data: [] }
      const vMap = new Map(((vs as { id: string; brand: string; model: string }[]) ?? []).map(v => [v.id, v]))

      setParts(partRows.map(p => {
        const d = dMap.get(p.diagram_id)
        const e = d ? eMap.get(d.engine_id) : null
        const v = e ? vMap.get(e.vehicle_id) : null
        const vehicle = v ? `${v.brand} ${v.model}${e?.version ? ` · ${e.version}` : ''}` : ''
        return {
          id: p.id,
          name: p.name,
          partType: p.part_type,
          oemRef: p.oem_ref,
          vehicle,
          search: [p.name, p.oem_ref ?? '', vehicle, p.part_type].join(' ').toLowerCase(),
        }
      }))

      if (!isNew) {
        const { data } = await supabase.from('exhaust_aftermarket_products').select('*').eq('id', id).maybeSingle()
        if (data) setProduct(data as Product)
        const { data: comps } = await supabase.from('compatibilities').select('*').eq('source_type', 'product').eq('source_id', id)
        setCompatibilities(((comps as { target_id: string }[]) ?? []).map(c => c.target_id))
      }
      setLoading(false)
    })()
  }, [id, isNew])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (!product.product_name.trim()) throw new Error('Falta nombre del producto')
      if (!product.reference.trim()) throw new Error('Falta referencia')

      // Resolve brand_name
      const brandName = brands.find(b => b.id === product.brand_id)?.name ?? product.brand_name ?? ''
      const payload = { ...product, brand_name: brandName }

      let productId = product.id
      if (isNew) {
        const { data, error: e } = await supabase.from('exhaust_aftermarket_products').insert(payload).select('*').single()
        if (e) throw new Error(e.message)
        productId = (data as Product).id
      } else {
        const { error: e } = await supabase.from('exhaust_aftermarket_products').update(payload).eq('id', productId)
        if (e) throw new Error(e.message)
      }
      if (!productId) throw new Error('No product id')

      // Sync compatibilities: delete existing, insert new
      await supabase.from('compatibilities').delete().eq('source_type', 'product').eq('source_id', productId)
      if (compatibilities.length > 0) {
        const rows = compatibilities.map(partId => ({
          source_type: 'product', source_id: productId, target_type: 'part', target_id: partId, confidence: 'media',
        }))
        const { error: e } = await supabase.from('compatibilities').insert(rows)
        if (e) throw new Error(e.message)
      }

      navigate('/admin/data/productos')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!product.id) return
    if (!window.confirm('Borrar este producto y sus compatibilidades?')) return
    setSaving(true)
    await supabase.from('compatibilities').delete().eq('source_type', 'product').eq('source_id', product.id)
    const { error: e } = await supabase.from('exhaust_aftermarket_products').delete().eq('id', product.id)
    if (e) setError(e.message)
    else navigate('/admin/data/productos')
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 32 }}>Cargando…</div>

  return (
    <div style={{ padding: 32, maxWidth: 880, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <Link to="/admin/data/productos" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#86868B', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={14} /> Volver
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <h1 style={{ fontSize: 26, margin: 0 }}>{isNew ? 'Nuevo producto aftermarket' : product.product_name}</h1>
          <StatusBadge status={product.status} />
        </div>
        <p style={{ color: '#86868B', marginTop: 4 }}>Formulario C — Producto comercial.</p>
      </header>

      {error && (
        <div style={{ padding: 12, backgroundColor: '#FFE5E7', color: '#D70015', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <h2 style={sectionTitleStyle}>Identificación</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Marca *</label>
          <select value={product.brand_id ?? ''} onChange={(e) => setProduct({ ...product, brand_id: e.target.value })} style={inputStyle as React.CSSProperties}>
            <option value="">— seleccionar —</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <Field label="Referencia *" value={product.reference} onChange={(v) => setProduct({ ...product, reference: v })} placeholder="MSVWG7CB" />
        <Field label="Nombre producto *" value={product.product_name} onChange={(v) => setProduct({ ...product, product_name: v })} placeholder="Milltek Cat-Back Resonated" />
        <Field label="Tipo" value={product.product_type ?? ''} options={PRODUCT_TYPE.map(t => ({ value: t.value, label: t.label }))} onChange={(v) => setProduct({ ...product, product_type: v })} isSelect />
      </div>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Descripción</label>
        <textarea value={product.description ?? ''} onChange={(e) => setProduct({ ...product, description: e.target.value })} rows={2} style={{ ...inputStyle, minHeight: 50 }} />
      </div>

      <h2 style={sectionTitleStyle}>Comercial</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Field label="Precio" type="number" step="0.01" value={product.price?.toString() ?? ''} onChange={(v) => setProduct({ ...product, price: v ? parseFloat(v) : null })} />
        <Field label="Moneda" value={product.currency}
          options={CURRENCIES.map(c => ({ value: c, label: c }))}
          onChange={(v) => setProduct({ ...product, currency: v })} isSelect />
        <Field label="País vendedor" value={product.country ?? ''}
          options={[{ value: '', label: '— sin especificar —' }, ...COUNTRIES.map(c => ({ value: c, label: c }))]}
          onChange={(v) => setProduct({ ...product, country: v })} isSelect />
        <Field label="URL" value={product.url ?? ''} onChange={(v) => setProduct({ ...product, url: v })} placeholder="https://…" />
        <Field label="Tiempo entrega (días)" type="number" value={product.delivery_days?.toString() ?? ''} onChange={(v) => setProduct({ ...product, delivery_days: v ? parseInt(v) : null })} />
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>En stock</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={product.in_stock ?? false} onChange={(e) => setProduct({ ...product, in_stock: e.target.checked })} />
            Sí
          </label>
        </div>
        <Field label="Homologación" value={product.homologation ?? ''}
          options={[{ value: '', label: '— sin especificar —' }, ...HOMOLOGATION.map(h => ({ value: h.value, label: h.label }))]}
          onChange={(v) => setProduct({ ...product, homologation: v })} isSelect />
      </div>

      <h2 style={sectionTitleStyle}>Compatibilidad con piezas del esquema</h2>
      <p style={{ fontSize: 13, color: '#86868B', marginBottom: 12 }}>
        Selecciona las piezas del catálogo OEM que este producto reemplaza/es compatible.
      </p>
      <MultiSelect
        options={parts}
        selected={compatibilities}
        onChange={setCompatibilities}
      />

      <h2 style={sectionTitleStyle}>Validación</h2>
      <Field label="Estado QA" value={product.status} options={QA_STATES.map(s => ({ value: s.value, label: s.label }))} onChange={(v) => setProduct({ ...product, status: v })} isSelect />
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Problemas encontrados</label>
        <textarea value={product.qa_issues ?? ''} onChange={(e) => setProduct({ ...product, qa_issues: e.target.value })}
          placeholder="Dudas, contradicciones, datos faltantes…" rows={2} style={{ ...inputStyle, minHeight: 50 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, padding: '16px 0', borderTop: '1px solid #E5E5EA' }}>
        {!isNew && (
          <button onClick={handleDelete} disabled={saving} style={btnDanger}>
            <Trash2 size={14} /> Borrar
          </button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={handleSave} disabled={saving} style={btnPrimary}>
            <Save size={14} /> {saving ? 'Guardando…' : 'Guardar producto'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', step, options, isSelect }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; step?: string;
  options?: { value: string; label: string }[]; isSelect?: boolean;
}) {
  return (
    <div style={fieldGroupStyle}>
      <label style={labelStyle}>{label}</label>
      {isSelect && options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle as React.CSSProperties}>
          <option value="">— seleccionar —</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} step={step} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      )}
    </div>
  )
}

function MultiSelect({ options, selected, onChange }: {
  options: PartOpt[];
  selected: string[];
  onChange: (vs: string[]) => void;
}) {
  const [search, setSearch] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')

  const vehicles = [...new Set(options.map(o => o.vehicle).filter(Boolean))].sort()
  const q = search.trim().toLowerCase()
  const matches = options.filter(o => {
    if (vehicleFilter && o.vehicle !== vehicleFilter) return false
    if (!q) return !!vehicleFilter // con filtro de vehículo lista todas; sin nada, no sugiere
    return o.search.includes(q) // busca por nombre + oem_ref + vehículo + tipo
  })
  const MAX = 50
  const shown = matches.slice(0, MAX)
  const selectedItems = options.filter(o => selected.includes(o.id))
  const partLabel = (o: PartOpt) => `${o.partType} · ${o.name}`

  return (
    <div>
      {selectedItems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {selectedItems.map(s => (
            <span key={s.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', backgroundColor: '#0071E3', color: 'white',
              borderRadius: 12, fontSize: 12,
            }}>
              <span>{partLabel(s)}</span>
              {s.oemRef && <span style={{ opacity: 0.85, fontFamily: 'monospace' }}>{s.oemRef}</span>}
              {s.vehicle && <span style={{ opacity: 0.7 }}>· {s.vehicle}</span>}
              <button onClick={() => onChange(selected.filter(x => x !== s.id))}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, marginLeft: 2 }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {vehicles.length > 1 && (
          <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}
            style={{ ...(inputStyle as React.CSSProperties), maxWidth: 280 }}>
            <option value="">Todos los vehículos</option>
            {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        )}
        <input type="text" placeholder="Buscar por nombre, referencia OEM o vehículo…" value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ ...(inputStyle as React.CSSProperties), flex: 1 }} />
      </div>

      {(q || vehicleFilter) && (
        <div style={{ marginTop: 8, maxHeight: 280, overflowY: 'auto', border: '1px solid #E5E5EA', borderRadius: 8 }}>
          {shown.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 13, color: '#86868B' }}>Sin coincidencias.</div>
          )}
          {shown.map(o => (
            <button key={o.id}
              onClick={() => {
                if (!selected.includes(o.id)) onChange([...selected, o.id])
                setSearch('')
              }}
              disabled={selected.includes(o.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', background: selected.includes(o.id) ? '#F5F5F7' : 'none', border: 'none',
                borderBottom: '1px solid #F2F2F7', cursor: selected.includes(o.id) ? 'default' : 'pointer', fontSize: 13,
                opacity: selected.includes(o.id) ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={12} style={{ verticalAlign: 'middle' }} />
                <span style={{ fontWeight: 500 }}>{partLabel(o)}</span>
                {o.oemRef && <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#0071E3' }}>{o.oemRef}</span>}
              </div>
              <div style={{ fontSize: 11, color: '#86868B', marginLeft: 18 }}>{o.vehicle || 'Sin vehículo asignado'}</div>
            </button>
          ))}
          {matches.length > MAX && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: '#86868B' }}>
              …{matches.length - MAX} más. Afina la búsqueda o filtra por vehículo.
            </div>
          )}
        </div>
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
