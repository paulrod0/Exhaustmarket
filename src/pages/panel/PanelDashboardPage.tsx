import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, ShoppingCart, Clock, Package, Truck, AlertTriangle,
  Wallet, MessageSquare, ShieldCheck, TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { auth as authClient } from '../../lib/auth-client'

interface Totals {
  total_orders: number
  gross_sales: number
  total_commission: number
  net_payout: number
  pending_count: number
  to_ship_count: number
  shipped_count: number
  disputed_count: number
}

interface MonthRow { month: string; orders: number; sales: number; commission: number }
interface TopProduct { product_id: string; name: string; units: number; revenue: number }

export default function PanelDashboardPage() {
  const { profile } = useAuthStore()
  const [totals, setTotals] = useState<Totals | null>(null)
  const [byMonth, setByMonth] = useState<MonthRow[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const token = await authClient.__getToken()
      const [stats, wallet] = await Promise.all([
        fetch('/api/marketplace', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ op: 'seller_stats' }) }).then((r) => r.json()),
        fetch('/api/marketplace', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ op: 'wallet_info' }) }).then((r) => r.json()),
      ])
      if (stats.totals) setTotals(stats.totals)
      if (stats.by_month) setByMonth(stats.by_month)
      if (stats.top_products) setTopProducts(stats.top_products)
      if (wallet.wallet) setWalletBalance(Number(wallet.wallet.balance ?? 0))
      setLoading(false)
    })()
  }, [profile])

  if (!profile) return <div style={{ padding: 40 }}>Inicia sesión.</div>
  if (loading) return <div style={{ padding: 40 }}>Cargando estadísticas…</div>

  const t = totals ?? { total_orders: 0, gross_sales: 0, total_commission: 0, net_payout: 0, pending_count: 0, to_ship_count: 0, shipped_count: 0, disputed_count: 0 }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Panel del vendedor</h1>
        <p style={{ color: '#86868B', marginTop: 4 }}>
          Hola {profile.full_name ?? 'vendedor'} · resumen de tu actividad.
        </p>
      </header>

      {/* Verificación KYC banner */}
      {profile.kyc_status !== 'verified' && (
        <div style={{ padding: 14, background: profile.kyc_status === 'pending' ? '#FF950020' : '#FFE5E7', color: profile.kyc_status === 'pending' ? '#FF9500' : '#D70015', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={18} />
          <div style={{ flex: 1, fontSize: 13 }}>
            {profile.kyc_status === 'pending' ? 'Tu verificación KYC está en revisión.' : 'Para recibir pagos debes completar tu verificación KYC.'}
          </div>
          <Link to="/panel/kyc" style={{ padding: '6px 14px', background: 'white', color: '#1D1D1F', borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
            {profile.kyc_status === 'pending' ? 'Ver estado' : 'Completar →'}
          </Link>
        </div>
      )}

      {/* KPIs principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <Kpi icon={DollarSign} label="Ventas brutas" value={`${Number(t.gross_sales).toFixed(2)} €`} color="#34C759" />
        <Kpi icon={TrendingUp} label="A cobrar (neto)" value={`${Number(t.net_payout).toFixed(2)} €`} color="#0071E3" highlight />
        <Kpi icon={ShoppingCart} label="Total pedidos" value={String(t.total_orders)} color="#1D1D1F" />
        <Kpi icon={Wallet} label="Monedero" value={`${walletBalance.toFixed(2)} €`} color="#5856D6" />
      </div>

      {/* Estado pedidos pendientes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <Kpi icon={Clock} label="Pendientes pago" value={String(t.pending_count)} color="#FF9500" />
        <Kpi icon={Package} label="Pagados · enviar" value={String(t.to_ship_count)} color="#0071E3" />
        <Kpi icon={Truck} label="Enviados" value={String(t.shipped_count)} color="#5856D6" />
        <Kpi icon={AlertTriangle} label="En disputa" value={String(t.disputed_count)} color="#FF3B30" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Ventas por mes */}
        <div style={{ padding: 18, background: 'white', border: '1px solid #E5E5EA', borderRadius: 12 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 16px' }}>Ventas por mes</h2>
          {byMonth.length === 0 ? (
            <p style={{ color: '#86868B', fontSize: 13 }}>Sin ventas todavía.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E5EA', textAlign: 'left' }}>
                  <th style={{ padding: '6px 4px' }}>Mes</th>
                  <th style={{ padding: '6px 4px' }}>Pedidos</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Ventas</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Comisión</th>
                </tr>
              </thead>
              <tbody>
                {byMonth.map((m) => (
                  <tr key={m.month} style={{ borderBottom: '1px solid #F2F2F7' }}>
                    <td style={{ padding: '8px 4px' }}>{new Date(m.month).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '8px 4px' }}>{m.orders}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>{Number(m.sales).toFixed(2)} €</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: '#86868B' }}>−{Number(m.commission).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Productos top */}
        <div style={{ padding: 18, background: 'white', border: '1px solid #E5E5EA', borderRadius: 12 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 16px' }}>Productos más vendidos</h2>
          {topProducts.length === 0 ? (
            <p style={{ color: '#86868B', fontSize: 13 }}>Sin productos vendidos.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E5EA', textAlign: 'left' }}>
                  <th style={{ padding: '6px 4px' }}>Producto</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Unid.</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.product_id} style={{ borderBottom: '1px solid #F2F2F7' }}>
                    <td style={{ padding: '8px 4px' }}>{p.name ?? p.product_id.slice(0, 8)}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>{p.units}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600 }}>{Number(p.revenue).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 24 }}>
        <QuickLink to="/panel/products" icon={Package} label="Mis productos" />
        <QuickLink to="/panel/orders" icon={ShoppingCart} label="Pedidos recibidos" />
        <QuickLink to="/panel/mensajes" icon={MessageSquare} label="Mensajes" />
        <QuickLink to="/panel/monedero" icon={Wallet} label="Monedero" />
        <QuickLink to="/panel/kyc" icon={ShieldCheck} label="Verificación KYC" />
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, color, highlight }: { icon: typeof DollarSign; label: string; value: string; color: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: 16, background: 'white',
      border: highlight ? `2px solid ${color}` : '1px solid #E5E5EA',
      borderRadius: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#86868B', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        <Icon size={13} /> {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof Package; label: string }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px',
      background: 'white', border: '1px solid #E5E5EA', borderRadius: 10,
      textDecoration: 'none', color: '#1D1D1F', fontSize: 13, fontWeight: 500,
    }}>
      <Icon size={16} /> {label}
    </Link>
  )
}
