import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Package, Truck, Clock, AlertTriangle, X, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { auth as authClient } from '../lib/auth-client'

interface Order {
  id: string
  buyer_id: string
  seller_id: string
  subtotal: number
  total: number
  commission: number
  wallet_discount: number
  status: string
  created_at: string
  paid_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  shipping_address: string | null
  shipping_notes: string | null
}

const STATUS_LABEL: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { label: 'Pendiente de pago', icon: Clock, color: '#FF9500' },
  paid: { label: 'Pagado · esperando envío', icon: CheckCircle2, color: '#34C759' },
  shipped: { label: 'Enviado', icon: Truck, color: '#0071E3' },
  delivered: { label: 'Entregado', icon: Package, color: '#34C759' },
  cancelled: { label: 'Cancelado', icon: X, color: '#86868B' },
  refunded: { label: 'Reembolsado', icon: X, color: '#86868B' },
  disputed: { label: 'En disputa', icon: AlertTriangle, color: '#FF3B30' },
}

export default function MarketplaceOrdersPage() {
  const { profile } = useAuthStore()
  const [params] = useSearchParams()
  const okOrder = params.get('ok')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [disputeFor, setDisputeFor] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const refresh = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('marketplace_orders')
      .select('*')
      .eq('buyer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { refresh() }, [profile])

  const apiCall = async (body: Record<string, unknown>) => {
    const token = await authClient.__getToken()
    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  const markDelivered = async (orderId: string) => {
    if (!confirm('¿Confirmas que has recibido el pedido en buen estado?')) return
    await apiCall({ op: 'mark_delivered', order_id: orderId })
    refresh()
  }

  const submitDispute = async () => {
    if (!disputeFor || !disputeReason.trim()) return
    setSubmitting(true)
    await apiCall({ op: 'raise_dispute', order_id: disputeFor, reason: disputeReason })
    setDisputeFor(null); setDisputeReason('')
    setSubmitting(false)
    refresh()
  }

  if (!profile) return <div style={{ padding: 40 }}>Inicia sesión para ver tus pedidos.</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, margin: '0 0 24px' }}>Mis pedidos</h1>

      {okOrder && (
        <div style={{ padding: 16, background: '#34C75920', color: '#34C759', borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={20} />
          Pedido <code style={{ fontSize: 12 }}>{okOrder.slice(0, 8)}</code> creado correctamente. Si has pagado, recibirás confirmación por email.
        </div>
      )}

      {loading ? (
        <p style={{ color: '#86868B' }}>Cargando…</p>
      ) : orders.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#86868B' }}>
          <p>Aún no tienes pedidos.</p>
          <Link to="/marketplace" style={{ color: '#0071E3', textDecoration: 'none' }}>Explorar marketplace →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map((o) => {
            const status = STATUS_LABEL[o.status] ?? { label: o.status, icon: Clock, color: '#86868B' }
            const Icon = status.icon
            return (
              <div key={o.id} style={{ padding: 16, border: '1px solid #E5E5EA', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#86868B' }}>
                    #{o.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: status.color, fontWeight: 600, fontSize: 13 }}>
                    <Icon size={14} /> {status.label}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: '#86868B' }}>
                    {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {o.shipped_at && <span> · enviado {new Date(o.shipped_at).toLocaleDateString('es-ES')}</span>}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{Number(o.total).toFixed(2)} €</div>
                </div>

                {o.shipping_notes && (
                  <div style={{ padding: 10, background: '#F2F2F7', borderRadius: 8, fontSize: 12, color: '#1D1D1F', marginBottom: 10, whiteSpace: 'pre-wrap' }}>
                    {o.shipping_notes}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {o.status === 'shipped' && (
                    <button onClick={() => markDelivered(o.id)} style={btnGreen}>
                      <CheckCircle2 size={13} /> He recibido el pedido
                    </button>
                  )}
                  {['paid', 'shipped', 'delivered'].includes(o.status) && (
                    <button onClick={() => setDisputeFor(o.id)} style={btnDanger}>
                      <AlertTriangle size={13} /> Hay un problema
                    </button>
                  )}
                  <Link to="/panel/mensajes" style={btnSec}>
                    <MessageSquare size={13} /> Contactar vendedor
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal disputa */}
      {disputeFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 500, width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, margin: 0 }}>Reportar un problema</h3>
              <button onClick={() => setDisputeFor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ color: '#86868B', fontSize: 13, marginBottom: 12 }}>
              El pedido pasará a estado <strong>en disputa</strong> y el vendedor recibirá un mensaje con tu motivo. Un revisor humano mediará.
            </p>
            <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Motivo *</label>
            <textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="No coincide con la descripción / no funciona / pieza dañada en el envío / no he recibido nada…"
              rows={5}
              style={{ width: '100%', padding: 10, border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
            <button onClick={submitDispute} disabled={submitting || !disputeReason.trim()} style={{
              marginTop: 12, padding: '10px 24px', background: '#FF3B30', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>
              {submitting ? 'Enviando…' : 'Abrir disputa'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const btnGreen: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: '#34C759', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { ...btnGreen, background: 'transparent', color: '#D70015', border: '1px solid #FFE5E7' }
const btnSec: React.CSSProperties = { ...btnGreen, background: '#F2F2F7', color: '#1D1D1F', textDecoration: 'none' }
