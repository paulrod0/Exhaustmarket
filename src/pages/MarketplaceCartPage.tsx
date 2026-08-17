import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Trash2, ArrowLeft } from 'lucide-react'
import { cart, CartItem } from '../lib/cart'
import { auth as authClient } from '../lib/auth-client'
import { useAuthStore } from '../stores/authStore'

export default function MarketplaceCartPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [items, setItems] = useState<CartItem[]>(cart.list())
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [useWallet, setUseWallet] = useState(false)
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => setItems(cart.list())
    window.addEventListener('em_cart_changed', refresh)
    ;(async () => {
      if (!profile) return
      const token = await authClient.__getToken()
      if (!token) return
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ op: 'wallet_info' }),
      })
      if (res.ok) {
        const data = await res.json()
        setWalletBalance(Number(data.wallet?.balance ?? 0))
      }
    })()
    return () => window.removeEventListener('em_cart_changed', refresh)
  }, [profile])

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  const handleCheckout = async () => {
    if (!profile) { navigate('/login'); return }
    if (items.length === 0) return
    if (!shippingAddress.trim()) { setError('Indica una dirección de envío'); return }
    setSubmitting(true)
    setError(null)
    try {
      const token = await authClient.__getToken()
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          op: 'create_order',
          items: items.map((i) => ({ product_type: i.product_type, product_id: i.product_id, quantity: i.quantity })),
          shipping_address: shippingAddress,
          shipping_notes: notes,
          use_wallet: useWallet,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creando pedido')
      cart.clear()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        navigate(`/marketplace/pedidos?ok=${data.order_id}`)
      }
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <Link to="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#86868B', textDecoration: 'none', fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Seguir comprando
      </Link>
      <h1 style={{ fontSize: 28, margin: '0 0 24px' }}>Carrito</h1>

      {items.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#86868B' }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>Tu carrito está vacío.</p>
          <Link to="/marketplace" style={{ color: '#0071E3', textDecoration: 'none' }}>Explorar productos →</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
          <div>
            {items.map((i) => (
              <div key={`${i.product_type}-${i.product_id}`} style={{
                padding: 16, border: '1px solid #E5E5EA', borderRadius: 12,
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {i.image_url && (
                  <img src={i.image_url} alt={i.product_name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{i.product_name}</div>
                  {i.seller_name && <div style={{ fontSize: 12, color: '#86868B' }}>{i.seller_name}</div>}
                  <div style={{ fontSize: 12, color: '#86868B', marginTop: 4 }}>{i.unit_price.toFixed(2)} € · ud</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => cart.setQuantity(i.product_type, i.product_id, i.quantity - 1)} style={qtyBtn}>−</button>
                  <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{i.quantity}</span>
                  <button onClick={() => cart.setQuantity(i.product_type, i.product_id, i.quantity + 1)} style={qtyBtn}>+</button>
                </div>
                <div style={{ fontWeight: 600, minWidth: 80, textAlign: 'right' }}>{(i.unit_price * i.quantity).toFixed(2)} €</div>
                <button onClick={() => cart.remove(i.product_type, i.product_id)} style={removeBtn}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <aside style={{ padding: 20, border: '1px solid #E5E5EA', borderRadius: 12, height: 'fit-content', position: 'sticky', top: 80 }}>
            <h3 style={{ fontSize: 16, margin: '0 0 16px' }}>Resumen</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6, color: '#86868B' }}>
              <span>Envío</span>
              <span>A calcular</span>
            </div>
            <hr style={{ border: 0, borderTop: '1px solid #E5E5EA', margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              <span>Total</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Dirección de envío</label>
              <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} rows={3}
                placeholder="Calle, número, CP, ciudad, país"
                style={{ width: '100%', padding: 8, border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Notas (opcional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                style={{ width: '100%', padding: 8, border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
            </div>

            {walletBalance > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12, padding: 10, background: '#5856D620', borderRadius: 8 }}>
                <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
                Aplicar monedero ({walletBalance.toFixed(2)} €) al pago
              </label>
            )}

            {error && <div style={{ padding: 10, background: '#FFE5E7', color: '#D70015', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}

            <button onClick={handleCheckout} disabled={submitting || items.length === 0} style={{
              width: '100%', padding: 14, background: '#0071E3', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>
              {submitting ? 'Procesando…' : 'Pagar con tarjeta'}
            </button>
            <p style={{ fontSize: 11, color: '#86868B', marginTop: 8, textAlign: 'center' }}>
              Pago seguro · Stripe · sin comisión añadida
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}

const qtyBtn: React.CSSProperties = {
  width: 28, height: 28, border: '1px solid #D2D2D7', background: 'white',
  borderRadius: 6, cursor: 'pointer', fontSize: 16, lineHeight: 1, fontWeight: 600,
}
const removeBtn: React.CSSProperties = {
  width: 32, height: 32, border: 'none', background: 'transparent', color: '#D70015',
  borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
