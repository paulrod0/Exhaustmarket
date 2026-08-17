import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../lib/dataAdmin'

interface Product {
  id: string
  brand_name: string | null
  reference: string
  product_name: string
  product_type: string | null
  price: number | null
  currency: string
  country: string | null
  homologation: string | null
  status: string
}

export default function AdminAftermarketProductsListPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    supabase
      .from('exhaust_aftermarket_products')
      .select('*')
      .order('brand_name')
      .limit(500)
      .then(({ data }) => {
        setProducts((data as Product[]) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = products.filter((p) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return (
      p.product_name.toLowerCase().includes(s) ||
      p.reference.toLowerCase().includes(s) ||
      (p.brand_name?.toLowerCase().includes(s) ?? false)
    )
  })

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Productos aftermarket</h1>
          <p style={{ color: '#86868B', marginTop: 4 }}>
            Formulario C — Productos comerciales (Akrapovic, Milltek, Walker, etc.). {products.length} registros.
          </p>
        </div>
        <Link to="/admin/data/productos/nuevo" style={btnPrimary}>
          <Plus size={16} /> Nuevo producto
        </Link>
      </header>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#86868B' }} />
        <input type="text" placeholder="Buscar por nombre, marca o referencia…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #D2D2D7', borderRadius: 10, fontSize: 14, fontFamily: 'inherit' }} />
      </div>

      {loading ? (
        <p style={{ color: '#86868B' }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#86868B' }}>
          <p>Sin productos todavía.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Los productos aftermarket conectan marcas (Akrapovic, Milltek…) con piezas concretas del esquema.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E5EA', textAlign: 'left' }}>
              <th style={{ padding: '12px 8px' }}>Marca</th>
              <th style={{ padding: '12px 8px' }}>Referencia</th>
              <th style={{ padding: '12px 8px' }}>Nombre producto</th>
              <th style={{ padding: '12px 8px' }}>Tipo</th>
              <th style={{ padding: '12px 8px' }}>Precio</th>
              <th style={{ padding: '12px 8px' }}>Homol.</th>
              <th style={{ padding: '12px 8px' }}>Estado</th>
              <th style={{ padding: '12px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #F2F2F7' }}>
                <td style={{ padding: '10px 8px', fontWeight: 500 }}>{p.brand_name ?? '—'}</td>
                <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 12 }}>{p.reference}</td>
                <td style={{ padding: '10px 8px' }}>{p.product_name}</td>
                <td style={{ padding: '10px 8px', fontSize: 12, color: '#86868B' }}>{p.product_type ?? '—'}</td>
                <td style={{ padding: '10px 8px' }}>{p.price ? `${p.price} ${p.currency}` : '—'}</td>
                <td style={{ padding: '10px 8px', fontSize: 12 }}>{p.homologation ?? '—'}</td>
                <td style={{ padding: '10px 8px' }}><StatusBadge status={p.status} /></td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                  <Link to={`/admin/data/productos/${p.id}`} style={{ color: '#0071E3', textDecoration: 'none' }}>Editar →</Link>
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
