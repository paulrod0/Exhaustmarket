import { useEffect, useMemo, useState } from 'react'
import { Search, ChevronRight, ExternalLink, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ExhaustSchematic from '../components/ExhaustSchematic'

interface Vehicle { id: string; brand: string; model: string; year_from: number; year_to: number | null }
interface Engine { id: string; vehicle_id: string; version: string; engine_code: string | null; power_cv: number | null; fuel: string }
interface Diagram { id: string; engine_id: string; layout: string; architecture_code: string | null; total_estimated_cost: number | null }
interface Part {
  id: string; diagram_id: string; part_type: string; name: string;
  oem_ref: string | null; oem_not_found: boolean; material: string | null;
  diameter_mm: number | null; status: string; position_number: number | null;
  images: string[] | null; is_active: boolean;
}
interface Product {
  id: string; brand_name: string | null; reference: string; product_name: string;
  product_type: string | null; price: number | null; currency: string; url: string | null;
  homologation: string | null; status: string;
}
interface Compat { source_id: string; target_id: string }

/**
 * Página pública: el usuario selecciona marca → modelo → motor;
 * se le muestran las piezas OEM del esquema + productos aftermarket compatibles.
 */
export default function CompatibilidadPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [engines, setEngines] = useState<Engine[]>([])
  const [diagrams, setDiagrams] = useState<Diagram[]>([])

  const [brand, setBrand] = useState<string>('')
  const [vehicleId, setVehicleId] = useState<string>('')
  const [engineId, setEngineId] = useState<string>('')

  const [parts, setParts] = useState<Part[]>([])
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [archMap, setArchMap] = useState<Record<string, { name: string; description: string | null }>>({})

  useEffect(() => {
    supabase.from('exhaust_architectures').select('code,name,description').then(({ data }) => {
      if (data) {
        const m: Record<string, { name: string; description: string | null }> = {}
        for (const a of data as { code: string; name: string; description: string | null }[]) m[a.code] = { name: a.name, description: a.description }
        setArchMap(m)
      }
    })
  }, [])
  const [products, setProducts] = useState<Product[]>([])
  const [compats, setCompats] = useState<Compat[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Initial: load vehicles + engines list
  useEffect(() => {
    Promise.all([
      supabase.from('vehicles').select('*').order('brand').order('model').limit(1000),
      supabase.from('engines').select('*').limit(1000),
    ]).then(([vRes, eRes]) => {
      setVehicles((vRes.data as Vehicle[]) ?? [])
      setEngines((eRes.data as Engine[]) ?? [])
    })
  }, [])

  const brands = useMemo(() => Array.from(new Set(vehicles.map((v) => v.brand))).sort(), [vehicles])
  const modelsForBrand = useMemo(() => vehicles.filter((v) => v.brand === brand), [vehicles, brand])
  const enginesForVehicle = useMemo(() => engines.filter((e) => e.vehicle_id === vehicleId), [engines, vehicleId])

  // When engine selected, load diagram + parts + compatible products
  useEffect(() => {
    if (!engineId) {
      setParts([]); setProducts([]); setCompats([])
      return
    }
    setLoadingDetails(true)
    ;(async () => {
      const { data: dRows } = await supabase.from('exhaust_diagrams').select('*').eq('engine_id', engineId)
      const ds = (dRows as Diagram[]) ?? []
      setDiagrams(ds)
      if (ds.length === 0) {
        setParts([]); setProducts([]); setCompats([])
        setLoadingDetails(false)
        return
      }
      // Parts of these diagrams
      const partsPromises = ds.map((d) => supabase.from('exhaust_parts').select('*').eq('diagram_id', d.id).eq('is_active', true))
      const partsResults = await Promise.all(partsPromises)
      const allParts: Part[] = []
      for (const p of partsResults) allParts.push(...((p.data as Part[]) ?? []))
      setParts(allParts)

      // Compatibilities: products linked to these parts
      if (allParts.length > 0) {
        const { data: cRows } = await supabase
          .from('compatibilities')
          .select('*')
          .eq('source_type', 'product')
          .eq('target_type', 'part')
          .in('target_id', allParts.map((p) => p.id))
        const cs = (cRows as Compat[]) ?? []
        setCompats(cs)
        const productIds = Array.from(new Set(cs.map((c) => c.source_id)))
        if (productIds.length > 0) {
          const { data: pRows } = await supabase
            .from('exhaust_aftermarket_products').select('*').in('id', productIds)
          setProducts((pRows as Product[]) ?? [])
        } else {
          setProducts([])
        }
      } else {
        setCompats([]); setProducts([])
      }
      setLoadingDetails(false)
    })()
  }, [engineId])

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId)
  const selectedEngine = engines.find((e) => e.id === engineId)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      <header style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, margin: 0 }}>¿Qué encaja en tu coche?</h1>
        <p style={{ color: '#86868B', marginTop: 8 }}>
          Selecciona marca, modelo y motor para ver las piezas OEM del sistema de escape
          y los productos aftermarket compatibles.
        </p>
      </header>

      {/* SELECTORES */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        padding: 16, backgroundColor: '#F5F5F7', borderRadius: 12, marginBottom: 32,
      }}>
        <Select label="Marca" value={brand} options={brands.map((b) => ({ value: b, label: b }))}
          onChange={(v) => { setBrand(v); setVehicleId(''); setEngineId('') }} />
        <Select label="Modelo + años" value={vehicleId}
          options={modelsForBrand.map((v) => ({
            value: v.id, label: `${v.model} · ${v.year_from}${v.year_to ? `–${v.year_to}` : '+'}`,
          }))}
          onChange={(v) => { setVehicleId(v); setEngineId('') }}
          disabled={!brand} />
        <Select label="Motor / versión" value={engineId}
          options={enginesForVehicle.map((e) => ({
            value: e.id,
            label: `${e.version}${e.engine_code ? ` (${e.engine_code})` : ''} · ${e.power_cv ?? '?'} CV`,
          }))}
          onChange={setEngineId} disabled={!vehicleId} />
      </div>

      {!engineId ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#86868B' }}>
          <Search size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>Selecciona tu vehículo para ver compatibilidades.</p>
        </div>
      ) : loadingDetails ? (
        <p style={{ color: '#86868B', textAlign: 'center' }}>Cargando piezas y productos…</p>
      ) : (
        <>
          {/* HEADER VEHÍCULO */}
          {selectedVehicle && selectedEngine && (
            <div style={{
              padding: 20, backgroundColor: '#FFFFFF', border: '1px solid #E5E5EA',
              borderRadius: 12, marginBottom: 24,
            }}>
              <h2 style={{ fontSize: 22, margin: 0 }}>
                {selectedVehicle.brand} {selectedVehicle.model}
              </h2>
              <p style={{ color: '#86868B', marginTop: 4 }}>
                {selectedEngine.version} · {selectedEngine.power_cv ?? '?'} CV · {selectedEngine.fuel} · {selectedVehicle.year_from}{selectedVehicle.year_to ? `–${selectedVehicle.year_to}` : '+'}
                {diagrams[0] && ` · Layout ${diagrams[0].layout}`}
              </p>
            </div>
          )}

          {/* ESQUEMA 2D CLICABLE */}
          {parts.length > 0 && (
            <>
              <h3 style={{ fontSize: 18, margin: '24px 0 4px' }}>Esquema del escape — toca un componente</h3>
              {diagrams[0]?.architecture_code && archMap[diagrams[0].architecture_code] && (
                <p style={{ color: '#86868B', fontSize: 13, margin: '0 0 12px' }}>
                  Arquitectura <strong>{diagrams[0].architecture_code}</strong> · {archMap[diagrams[0].architecture_code].name}
                </p>
              )}
              <ExhaustSchematic
                parts={parts}
                selectedId={selectedPartId}
                onSelect={(id) => {
                  setSelectedPartId(id)
                  const el = document.getElementById(`part-${id}`)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
              />
            </>
          )}

          {/* PIEZAS OEM */}
          <h3 style={{ fontSize: 18, margin: '24px 0 12px' }}>Piezas OEM del sistema de escape ({parts.length})</h3>
          {parts.length === 0 ? (
            <div style={{ padding: 24, backgroundColor: '#FFF9E5', borderRadius: 10, color: '#86868B', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <AlertCircle size={18} color="#FF9500" />
              <div>
                <strong>Sin piezas registradas todavía.</strong>
                <p style={{ margin: '4px 0 0', fontSize: 14 }}>
                  El catálogo de este modelo está en proceso de carga.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {parts.map((p) => {
                const productsForThisPart = compats.filter((c) => c.target_id === p.id).length
                const isSel = p.id === selectedPartId
                return (
                  <div key={p.id} id={`part-${p.id}`} onClick={() => setSelectedPartId(p.id)} style={{
                    padding: 12, backgroundColor: isSel ? '#F0F7FF' : '#FFFFFF',
                    border: isSel ? '2px solid #0071E3' : '1px solid #E5E5EA',
                    borderRadius: 10, fontSize: 13, cursor: 'pointer', transition: 'border-color .15s, background-color .15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, padding: '2px 6px', backgroundColor: '#F2F2F7', borderRadius: 4, textTransform: 'uppercase' }}>
                        {p.part_type}
                      </span>
                      {productsForThisPart > 0 && (
                        <span style={{ fontSize: 11, color: '#0071E3', fontWeight: 500 }}>
                          {productsForThisPart} aftermarket
                        </span>
                      )}
                    </div>
                    {p.images && p.images.length > 0 && (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        loading="lazy"
                        style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 8, backgroundColor: '#F5F5F7' }}
                      />
                    )}
                    <div style={{ fontWeight: 600, marginTop: 6 }}>{p.name}</div>
                    {p.oem_ref ? (
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#86868B', marginTop: 4 }}>
                        OEM: {p.oem_ref}
                      </div>
                    ) : p.oem_not_found ? (
                      <div style={{ fontSize: 12, color: '#FF9500', marginTop: 4 }}>OEM no localizada</div>
                    ) : null}
                    {p.material && <div style={{ fontSize: 12, color: '#86868B', marginTop: 2 }}>{p.material}{p.diameter_mm && ` · Ø${p.diameter_mm}mm`}</div>}
                  </div>
                )
              })}
            </div>
          )}

          {/* PRODUCTOS AFTERMARKET COMPATIBLES */}
          <h3 style={{ fontSize: 18, margin: '32px 0 12px' }}>Productos aftermarket compatibles ({products.length})</h3>
          {products.length === 0 ? (
            <p style={{ color: '#86868B', fontSize: 14 }}>
              Aún no hay productos aftermarket registrados como compatibles con este vehículo.
              {' '}<a href="/marcas" style={{ color: '#0071E3' }}>Ver todas las marcas →</a>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {products.map((p) => (
                <div key={p.id} style={{
                  padding: 14, backgroundColor: '#FFFFFF', border: '1px solid #E5E5EA',
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 14 }}>{p.brand_name ?? '—'}</strong>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#86868B' }}>{p.reference}</span>
                      {p.homologation && p.homologation !== 'no_homologado' && (
                        <span style={{ fontSize: 10, padding: '2px 6px', backgroundColor: '#E5F8EB', color: '#1F7A3D', borderRadius: 4 }}>
                          {p.homologation}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 4 }}>{p.product_name}</div>
                    {p.product_type && (
                      <div style={{ fontSize: 12, color: '#86868B', marginTop: 2 }}>
                        {p.product_type.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {p.price != null && (
                      <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {p.price} {p.currency}
                      </div>
                    )}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#0071E3', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Ver producto <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Select({ label, value, options, onChange, disabled }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#1D1D1F', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
          style={{
            width: '100%', padding: '10px 28px 10px 12px', border: '1px solid #D2D2D7', borderRadius: 8,
            fontSize: 14, fontFamily: 'inherit', backgroundColor: disabled ? '#F5F5F7' : '#FFFFFF',
            appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          }}>
          <option value="">— seleccionar —</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronRight size={14} style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%) rotate(90deg)',
          color: '#86868B', pointerEvents: 'none',
        }} />
      </div>
    </div>
  )
}
