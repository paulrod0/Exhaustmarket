import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../lib/dataAdmin'

interface Part {
  id: string
  diagram_id: string
  part_type: string
  name: string
  oem_ref: string | null
  oem_not_found: boolean
  position_number: number | null
  confidence: string
  status: string
  is_active: boolean
  images: string[] | null
}

interface DiagramInfo {
  id: string
  engine_id: string
  layout: string
  engine_version?: string
  vehicle_brand?: string
  vehicle_model?: string
}

export default function AdminPartsListPage() {
  const [params] = useSearchParams()
  const diagramFilter = params.get('diagram')

  const [parts, setParts] = useState<Part[]>([])
  const [diagram, setDiagram] = useState<DiagramInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    ;(async () => {
      let query = supabase.from('exhaust_parts').select('*')
      if (diagramFilter) query = query.eq('diagram_id', diagramFilter)
      const { data } = await query.order('position_number').limit(1000)
      setParts((data as Part[]) ?? [])

      if (diagramFilter) {
        const { data: d } = await supabase.from('exhaust_diagrams').select('*').eq('id', diagramFilter).maybeSingle()
        if (d) {
          const { data: e } = await supabase.from('engines').select('*').eq('id', d.engine_id).maybeSingle()
          const { data: v } = e ? await supabase.from('vehicles').select('*').eq('id', e.vehicle_id).maybeSingle() : { data: null }
          setDiagram({
            id: d.id,
            engine_id: d.engine_id,
            layout: d.layout,
            engine_version: e?.version,
            vehicle_brand: v?.brand,
            vehicle_model: v?.model,
          })
        }
      }
      setLoading(false)
    })()
  }, [diagramFilter])

  const filtered = parts.filter((p) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return p.name.toLowerCase().includes(s) || (p.oem_ref?.toLowerCase().includes(s) ?? false)
  })

  async function toggleActive(p: Part) {
    const next = !(p.is_active ?? true)
    setParts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: next } : x)))
    const { error } = await supabase.from('exhaust_parts').update({ is_active: next }).eq('id', p.id)
    if (error) {
      // revertir si falla
      setParts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !next } : x)))
      alert('No se pudo cambiar la visibilidad: ' + error.message)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        {diagramFilter && (
          <Link to="/admin/data/vehiculos" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#86868B', textDecoration: 'none', fontSize: 13 }}>
            <ArrowLeft size={14} /> Volver
          </Link>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, margin: 0 }}>Piezas OEM</h1>
            <p style={{ color: '#86868B', marginTop: 4 }}>
              Formulario B — Piezas individuales del esquema.
              {diagram && ` Filtrando: ${diagram.vehicle_brand} ${diagram.vehicle_model} · ${diagram.engine_version}`}
              {' '}{parts.length} registros{!diagramFilter ? ' (todas)' : ''}.
            </p>
          </div>
          <Link to={`/admin/data/piezas/nuevo${diagramFilter ? `?diagram=${diagramFilter}` : ''}`} style={btnPrimary}>
            <Plus size={16} /> Nueva pieza
          </Link>
        </div>
      </header>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#86868B' }} />
        <input
          type="text" placeholder="Buscar por nombre o referencia OEM…"
          value={q} onChange={(e) => setQ(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #D2D2D7', borderRadius: 10, fontSize: 14, fontFamily: 'inherit' }}
        />
      </div>

      {loading ? (
        <p style={{ color: '#86868B' }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#86868B' }}>Sin piezas.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E5EA', textAlign: 'left' }}>
              <th style={{ padding: '12px 8px', width: 50 }}>#</th>
              <th style={{ padding: '12px 8px' }}>Tipo</th>
              <th style={{ padding: '12px 8px' }}>Nombre</th>
              <th style={{ padding: '12px 8px', width: 50 }}>Fotos</th>
              <th style={{ padding: '12px 8px' }}>OEM Ref</th>
              <th style={{ padding: '12px 8px' }}>Confianza</th>
              <th style={{ padding: '12px 8px' }}>Estado</th>
              <th style={{ padding: '12px 8px', width: 90 }}>Visible</th>
              <th style={{ padding: '12px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #F2F2F7', opacity: p.is_active === false ? 0.45 : 1 }}>
                <td style={{ padding: '10px 8px', color: '#86868B' }}>{p.position_number ?? '—'}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{ padding: '2px 8px', backgroundColor: '#F2F2F7', borderRadius: 4, fontSize: 12 }}>
                    {p.part_type}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', fontWeight: 500 }}>{p.name}</td>
                <td style={{ padding: '10px 8px', color: '#86868B', fontSize: 12 }}>
                  {p.images && p.images.length > 0 ? `${p.images.length} 📷` : '—'}
                </td>
                <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 12 }}>
                  {p.oem_not_found ? <span style={{ color: '#FF9500' }}>No encontrado</span> : (p.oem_ref ?? '—')}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{ fontSize: 12, color: p.confidence === 'alta' ? '#34C759' : p.confidence === 'media' ? '#FF9500' : '#FF3B30' }}>
                    {p.confidence}
                  </span>
                </td>
                <td style={{ padding: '10px 8px' }}><StatusBadge status={p.status} /></td>
                <td style={{ padding: '10px 8px' }}>
                  <button
                    type="button"
                    onClick={() => toggleActive(p)}
                    title={p.is_active === false ? 'Desactivada — clic para mostrar' : 'Activa — clic para ocultar'}
                    style={{
                      cursor: 'pointer', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 500,
                      backgroundColor: p.is_active === false ? '#F2F2F7' : '#E3F7E8',
                      color: p.is_active === false ? '#86868B' : '#1A7F37',
                    }}
                  >
                    {p.is_active === false ? 'Oculta' : 'Visible'}
                  </button>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                  <Link to={`/admin/data/piezas/${p.id}`} style={{ color: '#0071E3', textDecoration: 'none' }}>Editar →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 16px', backgroundColor: '#0071E3', color: 'white',
  borderRadius: 8, textDecoration: 'none', fontWeight: 500, fontSize: 14,
}
