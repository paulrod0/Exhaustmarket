import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Download, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { auth } from '../../lib/auth-client'
import { StatusBadge } from '../../lib/dataAdmin'

interface Vehicle {
  id: string
  internal_id: string | null
  brand: string
  model: string
  generation: string | null
  year_from: number
  year_to: number | null
  status: string
  updated_at: string
}

export default function AdminVehiclesListPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    const token = await auth.__getToken()
    const res = await fetch('/api/csv?table=vehicles&format=csv', {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) { alert('Error: ' + (await res.text())); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vehicles-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    setImporting(true)
    try {
      const token = await auth.__getToken()
      const csvText = await file.text()
      const res = await fetch('/api/csv?table=vehicles&conflict=internal_id', {
        method: 'POST',
        headers: {
          'content-type': 'text/csv',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: csvText,
      })
      const json = await res.json()
      if (json.ok) {
        alert(`Importadas ${json.inserted} filas. ${json.errors?.length ? `Errores: ${json.errors.length}` : ''}`)
        window.location.reload()
      } else {
        alert('Error: ' + (json.error || 'desconocido'))
      }
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    supabase
      .from('vehicles')
      .select('id,internal_id,brand,model,generation,year_from,year_to,status,updated_at')
      .order('brand')
      .order('model')
      .limit(500)
      .then(({ data }) => {
        setVehicles((data as Vehicle[]) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = vehicles.filter((v) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return (
      v.brand.toLowerCase().includes(s) ||
      v.model.toLowerCase().includes(s) ||
      (v.internal_id?.toLowerCase().includes(s) ?? false) ||
      (v.generation?.toLowerCase().includes(s) ?? false)
    )
  })

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Vehículos</h1>
          <p style={{ color: '#86868B', marginTop: 4 }}>
            Formulario A — Vehículo + motor + esquema. {vehicles.length} registros.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} style={btnSecondary}>
            <Download size={14} /> Exportar CSV
          </button>
          <label style={{ ...btnSecondary, cursor: importing ? 'wait' : 'pointer' }}>
            <Upload size={14} /> {importing ? 'Importando…' : 'Importar CSV'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImport(f)
              }}
            />
          </label>
          <Link
            to="/admin/data/vehiculos/nuevo"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', backgroundColor: '#0071E3', color: 'white',
              borderRadius: 8, textDecoration: 'none', fontWeight: 500, fontSize: 14,
            }}
          >
            <Plus size={16} /> Nuevo vehículo
          </Link>
        </div>
      </header>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#86868B' }} />
        <input
          type="text"
          placeholder="Buscar por marca, modelo, generación, ID interno…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px 10px 36px',
            border: '1px solid #D2D2D7', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
          }}
        />
      </div>

      {loading ? (
        <p style={{ color: '#86868B' }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#86868B' }}>Sin resultados.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E5EA', textAlign: 'left' }}>
              <th style={{ padding: '12px 8px' }}>ID interno</th>
              <th style={{ padding: '12px 8px' }}>Marca</th>
              <th style={{ padding: '12px 8px' }}>Modelo</th>
              <th style={{ padding: '12px 8px' }}>Gen.</th>
              <th style={{ padding: '12px 8px' }}>Años</th>
              <th style={{ padding: '12px 8px' }}>Estado</th>
              <th style={{ padding: '12px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} style={{ borderBottom: '1px solid #F2F2F7' }}>
                <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 12, color: '#86868B' }}>
                  {v.internal_id ?? '—'}
                </td>
                <td style={{ padding: '10px 8px', fontWeight: 500 }}>{v.brand}</td>
                <td style={{ padding: '10px 8px' }}>{v.model}</td>
                <td style={{ padding: '10px 8px', color: '#86868B' }}>{v.generation ?? '—'}</td>
                <td style={{ padding: '10px 8px', color: '#86868B' }}>
                  {v.year_from}{v.year_to ? `–${v.year_to}` : '+'}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <StatusBadge status={v.status} />
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                  <Link to={`/admin/data/vehiculos/${v.id}`} style={{ color: '#0071E3', textDecoration: 'none' }}>
                    Editar →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 14px', backgroundColor: '#FFFFFF', color: '#1D1D1F',
  border: '1px solid #D2D2D7', borderRadius: 8, textDecoration: 'none',
  fontWeight: 500, fontSize: 13, cursor: 'pointer',
}
