import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cart } from '../lib/cart'
import { useAuthStore } from '../stores/authStore'
import { auth as authClient } from '../lib/auth-client'

interface AnyProduct extends Record<string, any> {
  id: string
}

export default function MarketplaceProductPage() {
  const { kind, id } = useParams<{ kind: string; id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [item, setItem] = useState<AnyProduct | null>(null)
  const [seller, setSeller] = useState<AnyProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    ;(async () => {
      const table = kind === 'product' ? 'professional_products' :
                    kind === 'service' ? 'workshop_services' :
                    kind === 'aftermarket' ? 'exhaust_aftermarket_products' : null
      if (!table || !id) { setError('Producto inválido'); setLoading(false); return }

      const { data } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
      if (!data) { setError('Producto no encontrado'); setLoading(false); return }
      setItem(data as AnyProduct)

      const sellerCol = kind === 'product' ? 'professional_id' : kind === 'service' ? 'workshop_id' : null
      if (sellerCol && (data as any)[sellerCol]) {
        const { data: s } = await supabase.from('user_profiles').select('*').eq('id', (data as any)[sellerCol]).maybeSingle()
        setSeller(s as AnyProduct | null)
      }
      setLoading(false)
    })()
  }, [kind, id])

  const handleAddCart = () => {
    if (!item) return
    const result = cart.add({
      product_type: kind === 'product' ? 'professional_product' : kind === 'service' ? 'workshop_service' : 'aftermarket_product',
      product_id: item.id,
      product_name: item.product_name ?? item.service_name ?? 'Producto',
      unit_price: Number(item.price ?? item.base_price ?? 0),
      quantity: 1,
      seller_id: item.professional_id ?? item.workshop_id ?? null,
      seller_name: seller?.full_name ?? seller?.company_name ?? null,
      image_url: item.images?.[0] ?? null,
    })
    if (!result.ok) { alert(result.error); return }
    navigate('/marketplace/carrito')
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return
    if (!profile) { navigate('/login'); return }
    if (!seller) { setError('Sin vendedor para contactar'); return }
    setSending(true)
    try {
      const token = await authClient.__getToken()
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ op: 'send_message', recipient_id: seller.id, product_id: item?.id, body: message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error enviando mensaje')
      setMessage('')
      navigate('/panel/mensajes')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Cargando…</div>
  if (error || !item) return <div style={{ padding: 40, color: '#D70015' }}>{error || 'Producto no encontrado'}</div>

  const title = item.product_name ?? item.service_name ?? 'Producto'
  const price = Number(item.price ?? item.base_price ?? 0)
  const description = item.description ?? ''
  const images: string[] = item.images ?? []

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
      <Link to="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#86868B', textDecoration: 'none', fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Volver al marketplace
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>
        <div>
          {images.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {images.slice(0, 4).map((u, i) => (
                <img key={i} src={u} alt={title} style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E5EA' }} />
              ))}
            </div>
          ) : (
            <div style={{ aspectRatio: '4/3', background: '#F2F2F7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B', fontSize: 14 }}>
              Sin imágenes
            </div>
          )}
        </div>

        <div>
          <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>{title}</h1>
          {item.brand_name && <p style={{ color: '#86868B', margin: '0 0 12px', fontSize: 14 }}>{item.brand_name}</p>}
          {item.reference && <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#86868B', margin: '0 0 16px' }}>REF: {item.reference}</p>}

          <div style={{ fontSize: 32, fontWeight: 700, margin: '16px 0' }}>
            {price > 0 ? `${price.toFixed(2)} €` : 'Consultar precio'}
          </div>

          {item.homologation && (
            <div style={{ padding: '6px 10px', display: 'inline-block', background: '#34C75920', color: '#34C759', borderRadius: 6, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
              Homologación: {item.homologation}
            </div>
          )}

          <p style={{ lineHeight: 1.6, marginBottom: 24, whiteSpace: 'pre-wrap' }}>{description}</p>

          {item.stock !== undefined && item.stock !== null && (
            <p style={{ fontSize: 13, color: item.stock > 0 ? '#34C759' : '#FF3B30', marginBottom: 16 }}>
              {item.stock > 0 ? `${item.stock} unidades en stock` : 'Sin stock'}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button onClick={handleAddCart} style={primaryBtn}>
              <ShoppingCart size={16} /> Añadir al carrito
            </button>
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer" style={secondaryBtn}>
                Web del vendedor →
              </a>
            )}
          </div>

          {seller && (
            <div style={{ padding: 16, background: '#F2F2F7', borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#86868B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Vendedor</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{seller.company_name ?? seller.full_name}</div>
              {seller.is_verified && <div style={{ fontSize: 12, color: '#34C759' }}>✓ Verificado</div>}
            </div>
          )}

          {seller && profile && profile.id !== seller.id && (
            <div style={{ padding: 16, border: '1px solid #E5E5EA', borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                <MessageSquare size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Pregunta al vendedor
              </div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="¿Es compatible con mi BMW 320d F30 2015?"
                rows={3}
                style={{ width: '100%', padding: 10, border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
              <button onClick={handleSendMessage} disabled={sending || !message.trim()} style={{ ...primaryBtn, marginTop: 8 }}>
                {sending ? 'Enviando…' : 'Enviar mensaje'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '12px 20px', backgroundColor: '#0071E3', color: 'white',
  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '12px 20px', backgroundColor: '#F2F2F7', color: '#1D1D1F',
  borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none',
}
