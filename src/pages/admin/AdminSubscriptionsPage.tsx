import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Loader2, Search, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type UserTier } from '../../lib/contentTypes'

interface SubRow {
  id: string
  user_id: string
  tier_id: string
  status: 'active' | 'cancelled' | 'expired' | 'pending'
  billing_cycle: 'monthly' | 'yearly'
  started_at: string
  expires_at: string
  stripe_subscription_id: string | null
  created_at: string
  user_profiles: { full_name: string | null; email: string | null; user_type: UserTier } | null
  subscription_tiers: { name: string; price_monthly: number; price_yearly: number } | null
}

const STATUS_LABEL: Record<SubRow['status'], string> = {
  active: 'Activa',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  expired: 'Expirada',
}

const STATUS_COLOR: Record<SubRow['status'], { bg: string; fg: string }> = {
  active: { bg: '#D1F7D1', fg: '#1A8C1A' },
  pending: { bg: '#FFF7E5', fg: '#B25400' },
  cancelled: { bg: '#FFE5E7', fg: '#D70015' },
  expired: { bg: '#F5F5F7', fg: '#86868B' },
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubRow['status'] | 'all'>('all')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('user_subscriptions' as any)
        .select(
          '*, user_profiles(full_name, email, user_type), subscription_tiers(name, price_monthly, price_yearly)',
        )
        .order('created_at', { ascending: false })
      setRows((data ?? []) as unknown as SubRow[])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    let list = rows
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.user_profiles?.full_name?.toLowerCase().includes(q) ||
          r.user_profiles?.email?.toLowerCase().includes(q),
      )
    }
    return list
  }, [rows, search, statusFilter])

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === 'active')
    const mrr = active.reduce((sum, r) => {
      const tier = r.subscription_tiers
      if (!tier) return sum
      return sum + (r.billing_cycle === 'monthly' ? tier.price_monthly : tier.price_yearly / 12)
    }, 0)
    return {
      active: active.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      cancelled: rows.filter((r) => r.status === 'cancelled').length,
      mrr: mrr.toFixed(2),
    }
  }, [rows])

  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
            Suscripciones
          </h1>
          <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0' }}>
            Gestionadas por Stripe. Los estados se sincronizan vía webhook.
          </p>
        </div>
      </header>

      {/* Stats bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard label="Activas" value={stats.active} color="#34C759" icon={<CreditCard size={16} />} />
        <StatCard label="Pendientes" value={stats.pending} color="#FF9500" icon={<CreditCard size={16} />} />
        <StatCard label="Canceladas" value={stats.cancelled} color="#86868B" icon={<CreditCard size={16} />} />
        <StatCard
          label="MRR estimado"
          value={`${stats.mrr} €`}
          color="#0071E3"
          icon={<TrendingUp size={16} />}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#86868B',
            }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 12px 9px 34px',
              borderRadius: 8,
              border: '1px solid #E5E5EA',
              fontSize: 13,
              outline: 'none',
              backgroundColor: 'white',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid #E5E5EA',
            fontSize: 13,
            backgroundColor: 'white',
          }}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="pending">Pendientes</option>
          <option value="cancelled">Canceladas</option>
          <option value="expired">Expiradas</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#86868B' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} />
          <style>{`@keyframes spin {from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: '#86868B',
            fontSize: 13,
            backgroundColor: 'white',
            border: '1px solid #E5E5EA',
            borderRadius: 12,
          }}
        >
          <CreditCard size={28} style={{ color: '#C7C7CC', marginBottom: 8 }} />
          <p style={{ margin: 0 }}>
            {rows.length === 0
              ? 'Todavía no hay suscripciones. Cuando los usuarios paguen por Stripe aparecerán aquí.'
              : 'No hay suscripciones con esos filtros.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5EA',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 130px 110px 120px 130px',
              gap: 12,
              padding: '10px 16px',
              backgroundColor: '#F5F5F7',
              fontSize: 11,
              fontWeight: 600,
              color: '#86868B',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <div>Usuario</div>
            <div>Plan</div>
            <div>Ciclo</div>
            <div>Estado</div>
            <div>Expira</div>
          </div>
          {filtered.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 130px 110px 120px 130px',
                gap: 12,
                padding: '12px 16px',
                borderTop: '1px solid #F2F2F7',
                alignItems: 'center',
                fontSize: 13,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: '#1D1D1F' }}>
                  {s.user_profiles?.full_name || '(sin nombre)'}
                </div>
                <div style={{ fontSize: 11, color: '#86868B' }}>
                  {s.user_profiles?.email || '—'}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#1D1D1F', textTransform: 'capitalize' }}>
                {s.subscription_tiers?.name ?? s.tier_id}
              </div>
              <div style={{ fontSize: 11, color: '#86868B' }}>
                {s.billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}
              </div>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: 980,
                    backgroundColor: STATUS_COLOR[s.status].bg,
                    color: STATUS_COLOR[s.status].fg,
                  }}
                >
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#86868B' }}>
                {s.expires_at ? new Date(s.expires_at).toLocaleDateString('es-ES') : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: string | number
  color: string
  icon: React.ReactNode
}) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #E5E5EA',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: '#86868B',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 500,
        }}
      >
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#1D1D1F',
          marginTop: 6,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  )
}
