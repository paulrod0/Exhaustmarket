import { useEffect, useState } from 'react'
import { Wallet, ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react'
import { auth as authClient } from '../../lib/auth-client'
import { useAuthStore } from '../../stores/authStore'

interface WalletData {
  balance: number
  total_earned: number
  total_spent: number
  currency: string
}

interface Tx {
  id: string
  kind: string
  amount: number
  reason: string | null
  related_record_type: string | null
  related_record_id: string | null
  related_order_id: string | null
  created_at: string
}

const KIND_LABEL: Record<string, string> = {
  credit_qa_approval: 'Aprobación QA',
  credit_referral: 'Referido',
  credit_admin_grant: 'Ajuste admin (+)',
  debit_commission_offset: 'Comisión cubierta',
  debit_admin_revoke: 'Penalización',
}

export default function PanelWalletPage() {
  const { profile } = useAuthStore()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const token = await authClient.__getToken()
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ op: 'wallet_info' }),
      })
      const data = await res.json()
      setWallet(data.wallet ?? null)
      setTxs(data.transactions ?? [])
      setLoading(false)
    })()
  }, [profile])

  if (!profile) return <div style={{ padding: 40 }}>Inicia sesión.</div>
  if (loading) return <div style={{ padding: 40 }}>Cargando…</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>Monedero colaborativo</h1>
      <p style={{ color: '#86868B', marginBottom: 24 }}>
        Ganas créditos rellenando datos del catálogo. Solo canjeables como descuento de comisión en tus ventas. No retirables a tarjeta.
      </p>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <Card icon={Wallet} label="Saldo actual" value={`${Number(wallet?.balance ?? 0).toFixed(2)} €`} color="#0071E3" highlight />
        <Card icon={ArrowDownLeft} label="Ganado total" value={`${Number(wallet?.total_earned ?? 0).toFixed(2)} €`} color="#34C759" />
        <Card icon={ArrowUpRight} label="Canjeado" value={`${Number(wallet?.total_spent ?? 0).toFixed(2)} €`} color="#FF9500" />
      </div>

      <div style={{ padding: 14, background: '#E5F2FF', borderRadius: 10, marginBottom: 24, fontSize: 13, color: '#003e80', display: 'flex', gap: 10 }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Cómo ganar créditos:</strong> rellena el catálogo (vehículos, esquemas, piezas, productos aftermarket) desde el área admin si tienes acceso, o como colaborador externo. El sistema te acredita automáticamente cuando un revisor aprueba tu trabajo:
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            <li>Vehículo o motor: 2 €</li>
            <li>Esquema completo: 3 €</li>
            <li>Pieza OEM: 1 €</li>
            <li>Producto aftermarket: 3 €</li>
          </ul>
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Movimientos</h2>
      {txs.length === 0 ? (
        <p style={{ color: '#86868B', textAlign: 'center', padding: 40 }}>Aún no hay movimientos.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E5EA', textAlign: 'left' }}>
              <th style={{ padding: '8px 4px' }}>Fecha</th>
              <th style={{ padding: '8px 4px' }}>Tipo</th>
              <th style={{ padding: '8px 4px' }}>Razón</th>
              <th style={{ padding: '8px 4px', textAlign: 'right' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #F2F2F7' }}>
                <td style={{ padding: '10px 4px', fontSize: 12, color: '#86868B' }}>
                  {new Date(t.created_at).toLocaleString('es-ES')}
                </td>
                <td style={{ padding: '10px 4px', fontSize: 13 }}>{KIND_LABEL[t.kind] ?? t.kind}</td>
                <td style={{ padding: '10px 4px', fontSize: 13, color: '#86868B' }}>{t.reason ?? '—'}</td>
                <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 600, color: Number(t.amount) > 0 ? '#34C759' : '#FF3B30' }}>
                  {Number(t.amount) > 0 ? '+' : ''}{Number(t.amount).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Card({ icon: Icon, label, value, color, highlight }: { icon: typeof Wallet; label: string; value: string; color: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: 18,
      border: highlight ? `2px solid ${color}` : '1px solid #E5E5EA',
      borderRadius: 12, background: 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#86868B', fontSize: 12, fontWeight: 500, marginBottom: 8, textTransform: 'uppercase' }}>
        <Icon size={14} /> {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
