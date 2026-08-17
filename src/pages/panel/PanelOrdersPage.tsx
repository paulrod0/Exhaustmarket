import { useEffect, useState } from 'react'
import { Truck, CheckCircle2, AlertTriangle, Package, MessageSquare, Clock, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { auth as authClient } from '../../lib/auth-client'
import { supabase } from '../../lib/supabase'

interface Order {
  id: string
  buyer_id: string
  seller_id: string
  subtotal: number
  commission: number
  wallet_discount: number
  total: number
  status: string
  shipping_address: string | null
  shipping_notes: string | null
  created_at: string
  paid_at: string | null
  shipped_at: string | null
  delivered_at: string | null
}

interface OrderDetail {
  order: Order
  items: Array<{ id: string; product_snapshot: Record<string, unknown>; quantity: number; unit_price: number; line_total: number }>
  buyer: { id: string; full_name: string; company_name: string | null; email: string | null }
  seller: { id: string; full_name: string; company_name: string | null; email: string | null }
}

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Truck }> = {
  pending: { label: 'Pendiente pago', color: '#FF9500', icon: Clock },
  paid: { label: 'Pagado · listo para enviar', color: '#0071E3', icon: Package },
  shipped: { label: 'Enviado', color: '#5856D6', icon: Truck },
  delivered: { label: 'Entregado', color: '#34C759', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: '#86868B', icon: X },
  refunded: { label: 'Reembolsado', color: '#86868B', icon: X },
  disputed: { label: 'En disputa', color: '#FF3B30', icon: AlertTriangle },
}

export default function PanelOrdersPage() {
  const { profile } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [detailFor, setDetailFor] = useState<OrderDetail | null>(null)
  const [actionState, setActionState] = useState<{ id: string; mode: 'ship' | 'cancel' | null }>({ id: '', mode: null })
  const [courier, setCourier] = useState('')
  const [tracking, setTracking] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const refresh = async () => {
    if (!profile) return
    setLoading(true)
    const { data } = await supabase
      .from('marketplace_orders')
      .select('*')
      .eq('seller_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(200)
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

  const openDetail = async (orderId: string) => {
    const data = await apiCall({ op: 'order_detail', order_id: orderId })
    if (data.order) setDetailFor(data as OrderDetail)
  }

  const confirmShip = async (orderId: string) => {
    await apiCall({ op: 'ship_order', order_id: orderId, courier, tracking_number: tracking })
    setActionState({ id: '', mode: null }); setCourier(''); setTracking('')
    refresh(); if (detailFor) openDetail(orderId)
  }

  const confirmDeliver = async (orderId: string) => {
    if (!confirm('¿Confirmar que el comprador ha recibido el pedido?')) return
    await apiCall({ op: 'mark_delivered', order_id: orderId })
    refresh(); if (detailFor) openDetail(orderId)
  }

  const confirmCancel = async (orderId: string) => {
    await apiCall({ op: 'cancel_order', order_id: orderId, reason: cancelReason })
    setActionState({ id: '', mode: null }); setCancelReason('')
    refresh(); if (detailFor) openDetail(orderId)
  }

  if (!profile) return <div style={{ padding: 40 }}>Inicia sesión.</div>

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Pedidos recibidos</h1>
        <p style={{ color: '#86868B', marginTop: 4 }}>{orders.length} pedido{orders.length !== 1 ? 's' : ''} como vendedor.</p>
      </header>

      {loading ? <p style={{ color: '#86868B' }}>Cargando…</p> :
       orders.length === 0 ? <p style={{ color: '#86868B', padding: 40, textAlign: 'center' }}>Aún no has recibido pedidos.</p> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5E5EA', textAlign: 'left' }}>
            <th style={{ padding: '12px 8px' }}>Pedido</th>
            <th style={{ padding: '12px 8px' }}>Fecha</th>
            <th style={{ padding: '12px 8px' }}>Total</th>
            <th style={{ padding: '12px 8px' }}>Comisión</th>
            <th style={{ padding: '12px 8px' }}>Estado</th>
            <th style={{ padding: '12px 8px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const meta = STATUS_META[o.status] ?? STATUS_META.pending
            const Icon = meta.icon
            return (
              <tr key={o.id} style={{ borderBottom: '1px solid #F2F2F7' }}>
                <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 12 }}>{o.id.slice(0, 8).toUpperCase()}</td>
                <td style={{ padding: '10px 8px', fontSize: 12, color: '#86868B' }}>{new Date(o.created_at).toLocaleDateString('es-ES')}</td>
                <td style={{ padding: '10px 8px', fontWeight: 600 }}>{Number(o.total).toFixed(2)} €</td>
                <td style={{ padding: '10px 8px', color: '#86868B', fontSize: 13 }}>
                  −{Number(o.commission).toFixed(2)} €
                  {Number(o.wallet_discount) > 0 && (
                    <span style={{ marginLeft: 4, color: '#5856D6', fontSize: 11 }}>(monedero −{Number(o.wallet_discount).toFixed(2)} €)</span>
                  )}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', background: `${meta.color}20`, color: meta.color,
                    borderRadius: 4, fontSize: 11, fontWeight: 600,
                  }}>
                    <Icon size={12} /> {meta.label}
                  </span>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openDetail(o.id)} style={btnSec}>Ver</button>
                    {o.status === 'paid' && <button onClick={() => setActionState({ id: o.id, mode: 'ship' })} style={btnPrimary}>Enviar</button>}
                    {o.status === 'shipped' && <button onClick={() => confirmDeliver(o.id)} style={btnGreen}>Marcar entregado</button>}
                    {['pending', 'paid'].includes(o.status) && (
                      <button onClick={() => setActionState({ id: o.id, mode: 'cancel' })} style={btnDanger}>Cancelar</button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>}

      {/* Modal: Marcar enviado */}
      {actionState.mode === 'ship' && (
        <Modal onClose={() => setActionState({ id: '', mode: null })} title="Marcar pedido como enviado">
          <Field label="Mensajería (opcional)" value={courier} onChange={setCourier} placeholder="Correos Express, SEUR, DHL…" />
          <Field label="Número de tracking (opcional)" value={tracking} onChange={setTracking} placeholder="ES-1234567890" />
          <button onClick={() => confirmShip(actionState.id)} style={{ ...btnPrimary, padding: '10px 20px', marginTop: 8 }}>
            <Truck size={14} /> Confirmar envío
          </button>
        </Modal>
      )}
      {actionState.mode === 'cancel' && (
        <Modal onClose={() => setActionState({ id: '', mode: null })} title="Cancelar pedido">
          <p style={{ color: '#86868B', fontSize: 13 }}>Si ya se ha cobrado, el comprador deberá ser reembolsado manualmente vía Stripe.</p>
          <Field label="Motivo (visible para el comprador)" value={cancelReason} onChange={setCancelReason} placeholder="Sin stock, dirección errónea…" />
          <button onClick={() => confirmCancel(actionState.id)} style={{ ...btnDanger, padding: '10px 20px', marginTop: 8 }}>
            <X size={14} /> Cancelar pedido
          </button>
        </Modal>
      )}
      {detailFor && (
        <Modal onClose={() => setDetailFor(null)} title={`Pedido ${detailFor.order.id.slice(0, 8).toUpperCase()}`} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#86868B', textTransform: 'uppercase', marginBottom: 4 }}>Comprador</div>
              <div style={{ fontWeight: 600 }}>{detailFor.buyer?.company_name ?? detailFor.buyer?.full_name ?? '—'}</div>
              <div style={{ fontSize: 13, color: '#86868B' }}>{detailFor.buyer?.email ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#86868B', textTransform: 'uppercase', marginBottom: 4 }}>Dirección envío</div>
              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{detailFor.order.shipping_address ?? '—'}</div>
            </div>
          </div>
          <table style={{ width: '100%', fontSize: 13, marginBottom: 16 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E5EA', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Producto</th>
                <th style={{ padding: 8 }}>Cantidad</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Precio</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {detailFor.items.map((it) => (
                <tr key={it.id} style={{ borderBottom: '1px solid #F2F2F7' }}>
                  <td style={{ padding: 8 }}>{String(it.product_snapshot.product_name ?? it.product_snapshot.service_name ?? 'Producto')}</td>
                  <td style={{ padding: 8 }}>{it.quantity}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{Number(it.unit_price).toFixed(2)} €</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{Number(it.line_total).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
          {detailFor.order.shipping_notes && (
            <div style={{ padding: 12, background: '#F2F2F7', borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}>
              <strong>Histórico:</strong>
              <br />
              {detailFor.order.shipping_notes}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: wide ? 700 : 480, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: 8, border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
    </div>
  )
}

const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#0071E3', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }
const btnGreen: React.CSSProperties = { ...btnPrimary, background: '#34C759' }
const btnDanger: React.CSSProperties = { ...btnPrimary, background: '#FF3B30' }
const btnSec: React.CSSProperties = { ...btnPrimary, background: '#F2F2F7', color: '#1D1D1F' }
