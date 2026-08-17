import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShoppingCart, Filter, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cart } from '../lib/cart'

interface Product {
  id: string
  professional_id: string
  product_name: string
  description: string
  price: number
  stock: number | null
  images: string[] | null
  category: string | null
  source: string | null
  external_ref: string | null
}

interface Service {
  id: string
  workshop_id: string
  service_name: string
  description: string
  base_price: number
  category: string | null
}

interface AftermarketProduct {
  id: string
  brand_name: string | null
  reference: string
  product_name: string
  product_type: string | null
  description: string | null
  price: number | null
  currency: string
  url: string | null
  country: string | null
  homologation: string | null
  status: string
}

type ListItem = {
  kind: 'product' | 'service' | 'aftermarket'
  id: string
  seller_id: string | null
  title: string
  description: string
  price: number
  currency: string
  category: string | null
  badge?: string | null
  image?: string | null
}

export default function MarketplaceBrowsePage() {
  const [tab, setTab] = useState<'all' | 'product' | 'service' | 'aftermarket'>('all')
  const [q, setQ] = useState('')
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [country, setCountry] = useState<string>('')
  const [homologation, setHomologation] = useState<string>('')
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [cartCount, setCartCount] = useState(cart.count())

  useEffect(() => {
    const refresh = () => setCartCount(cart.count())
    window.addEventListener('em_cart_changed', refresh)
    return () => window.removeEventListener('em_cart_changed', refresh)
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [prodRes, srvRes, aftRes] = await Promise.all([
        supabase.from('professional_products').select('*').eq('is_active', true).limit(500),
        supabase.from('workshop_services').select('*').eq('is_active', true).limit(200),
        supabase.from('exhaust_aftermarket_products').select('*').in('status', ['approved', 'legacy_imported']).limit(500),
      ])
      const all: ListItem[] = [
        ...((prodRes.data as Product[] | null) ?? []).map((p) => ({
          kind: 'product' as const,
          id: p.id,
          seller_id: p.professional_id,
          title: p.product_name,
          description: p.description,
          price: Number(p.price),
          currency: 'EUR',
          category: p.category,
          badge: p.source ? p.source.toUpperCase() : null,
          image: p.images?.[0] ?? null,
        })),
        ...((srvRes.data as Service[] | null) ?? []).map((s) => ({
          kind: 'service' as const,
          id: s.id,
          seller_id: s.workshop_id,
          title: s.service_name,
          description: s.description,
          price: Number(s.base_price),
          currency: 'EUR',
          category: s.category,
          badge: 'SERVICIO',
          image: null,
        })),
        ...((aftRes.data as AftermarketProduct[] | null) ?? []).map((a) => ({
          kind: 'aftermarket' as const,
          id: a.id,
          seller_id: null,
          title: `${a.brand_name ? a.brand_name + ' · ' : ''}${a.product_name}`,
          description: a.description ?? '',
          price: Number(a.price ?? 0),
          currency: a.currency || 'EUR',
          category: a.product_type,
          badge: a.homologation ?? null,
          image: null,
        })),
      ]
      setItems(all)
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (tab !== 'all' && it.kind !== tab) return false
      if (q.trim()) {
        const s = q.toLowerCase()
        if (!(it.title.toLowerCase().includes(s) || it.description.toLowerCase().includes(s))) return false
      }
      if (maxPrice !== null && it.price > maxPrice) return false
      if (country && it.kind === 'aftermarket' && !(items.find((x) => x.id === it.id)?.title.toLowerCase().includes(country.toLowerCase()))) {
        // simplificación; sería mejor cargar el country real
      }
      if (homologation && it.kind === 'aftermarket' && it.badge !== homologation) return false
      return true
    })
  }, [items, tab, q, maxPrice, country, homologation])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>Marketplace</h1>
          <p style={{ color: '#86868B', marginTop: 4 }}>
            Piezas y servicios de escape verificados. {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Link to="/marketplace/carrito" style={cartBtn}>
          <ShoppingCart size={16} />
          Carrito
          {cartCount > 0 && (
            <span style={{ padding: '1px 7px', background: '#FF3B30', color: 'white', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
              {cartCount}
            </span>
          )}
        </Link>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'product', 'aftermarket', 'service'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 14px',
            backgroundColor: tab === t ? '#0071E3' : '#F2F2F7',
            color: tab === t ? 'white' : '#1D1D1F',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            {t === 'all' ? 'Todo' : t === 'product' ? 'Productos pro' : t === 'aftermarket' ? 'Aftermarket' : 'Servicios taller'}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#86868B' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, modelo, pieza…"
            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 14 }} />
        </div>
        <input type="number" placeholder="Precio máx €"
          value={maxPrice ?? ''} onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: '8px 12px', border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 14 }} />
        <select value={homologation} onChange={(e) => setHomologation(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 14, background: 'white' }}>
          <option value="">Homologación: todas</option>
          <option value="ECE">ECE</option>
          <option value="TUV">TÜV</option>
          <option value="ITV_ES">ITV España</option>
          <option value="no_homologado">No homologado</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <p style={{ color: '#86868B' }}>Cargando productos…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#86868B', padding: 40, textAlign: 'center' }}>Sin resultados con esos filtros.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((it) => (
            <article key={`${it.kind}-${it.id}`} style={{
              border: '1px solid #E5E5EA', borderRadius: 12, overflow: 'hidden',
              backgroundColor: 'white', display: 'flex', flexDirection: 'column',
            }}>
              {it.image && (
                <div style={{ aspectRatio: '16/10', backgroundColor: '#F2F2F7', overflow: 'hidden' }}>
                  <img src={it.image} alt={it.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', flex: 1 }}>
                {it.badge && (
                  <span style={{ display: 'inline-block', padding: '2px 6px', backgroundColor: '#F2F2F7', borderRadius: 4, fontSize: 10, fontWeight: 600, alignSelf: 'flex-start', marginBottom: 6 }}>
                    <Tag size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                    {it.badge}
                  </span>
                )}
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', lineHeight: 1.3 }}>{it.title}</h3>
                <p style={{ fontSize: 13, color: '#86868B', lineHeight: 1.4, margin: '0 0 12px', flex: 1 }}>
                  {it.description.length > 110 ? it.description.slice(0, 110) + '…' : it.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>
                    {it.price > 0 ? `${it.price.toFixed(2)} ${it.currency}` : 'Consultar'}
                  </span>
                  <Link to={`/marketplace/${it.kind}/${it.id}`} style={detailLink}>Ver →</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

const cartBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '8px 14px', backgroundColor: '#1D1D1F', color: 'white',
  borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 500,
}
const detailLink: React.CSSProperties = {
  fontSize: 13, color: '#0071E3', textDecoration: 'none', fontWeight: 500,
}
