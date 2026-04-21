import { useEffect, useMemo, useState } from 'react'
import { Search, Shield, ShieldOff, Crown, Users, Loader2, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../../lib/toast'
import {
  USER_TIER_LABEL,
  type UserTier,
} from '../../lib/contentTypes'

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  user_type: UserTier
  is_admin: boolean
  is_verified: boolean
  company_name: string | null
  phone: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<UserTier | 'all' | 'admins'>('all')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_profiles' as any)
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setRows((data ?? []) as unknown as UserRow[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    let list = rows
    if (tierFilter === 'admins') list = list.filter((r) => r.is_admin)
    else if (tierFilter !== 'all') list = list.filter((r) => r.user_type === tierFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.full_name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.company_name?.toLowerCase().includes(q),
      )
    }
    return list
  }, [rows, search, tierFilter])

  async function setTier(userId: string, tier: UserTier) {
    const { error } = await supabase
      .from('user_profiles' as any)
      .update({ user_type: tier } as any)
      .eq('id', userId)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Tier cambiado a ${USER_TIER_LABEL[tier]}`)
    await load()
  }

  async function toggleAdmin(user: UserRow) {
    const next = !user.is_admin
    const { error } = await supabase
      .from('user_profiles' as any)
      .update({ is_admin: next } as any)
      .eq('id', user.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(next ? 'Ahora es admin' : 'Ya no es admin')
    await load()
  }

  return (
    <div>
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
            Usuarios registrados
          </h1>
          <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0' }}>
            {rows.length} cuentas · {rows.filter((r) => r.is_admin).length} admins ·{' '}
            {rows.filter((r) => r.user_type === 'premium').length} premium
          </p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={14} style={searchIconStyle} />
          <input
            type="text"
            placeholder="Buscar por nombre, email o empresa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 34 }}
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as any)}
          style={{ ...inputStyle, width: 200 }}
        >
          <option value="all">Todos los tiers</option>
          <option value="admins">👑 Solo admins</option>
          <option value="standard">Standard (gratis)</option>
          <option value="professional">Professional</option>
          <option value="workshop">Taller</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#86868B' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} />
          <style>{`@keyframes spin {from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={emptyStyle}>
          <Users size={28} style={{ color: '#C7C7CC', marginBottom: 8 }} />
          <p style={{ margin: 0 }}>No hay usuarios que coincidan con esos filtros.</p>
        </div>
      ) : (
        <div style={tableStyle}>
          <div style={tableHeaderStyle}>
            <div>Usuario</div>
            <div>Tier</div>
            <div>Admin</div>
            <div>Registrado</div>
            <div />
          </div>
          {filtered.map((u) => (
            <div key={u.id} style={tableRowStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: '#1D1D1F', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {u.is_admin && <Crown size={13} style={{ color: '#FFD700' }} />}
                  {u.full_name || '(sin nombre)'}
                </div>
                <div style={{ fontSize: 11, color: '#86868B', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={10} />
                  {u.email || '—'}
                  {u.company_name && <span>· {u.company_name}</span>}
                </div>
              </div>
              <div>
                <select
                  value={u.user_type}
                  onChange={(e) => setTier(u.id, e.target.value as UserTier)}
                  style={tierSelectStyle(u.user_type)}
                >
                  <option value="standard">Standard</option>
                  <option value="professional">Professional</option>
                  <option value="workshop">Taller</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <button
                  onClick={() => toggleAdmin(u)}
                  title={u.is_admin ? 'Quitar admin' : 'Hacer admin'}
                  style={{
                    background: 'none',
                    border: '1px solid ' + (u.is_admin ? '#FFD700' : '#E5E5EA'),
                    borderRadius: 6,
                    padding: '5px 10px',
                    cursor: 'pointer',
                    color: u.is_admin ? '#B25400' : '#86868B',
                    fontSize: 11,
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {u.is_admin ? <Shield size={11} /> : <ShieldOff size={11} />}
                  {u.is_admin ? 'Admin' : 'Hacer admin'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#86868B' }}>
                {new Date(u.created_at).toLocaleDateString('es-ES')}
              </div>
              <div />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
  flexWrap: 'wrap',
  gap: 12,
}

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#86868B',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #E5E5EA',
  fontSize: 13,
  outline: 'none',
  backgroundColor: 'white',
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: 40,
  color: '#86868B',
  fontSize: 13,
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  border: '1px solid #E5E5EA',
}

const tableStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E5EA',
  borderRadius: 12,
  overflow: 'hidden',
}

const tableHeaderStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 140px 140px 120px 30px',
  gap: 12,
  padding: '10px 16px',
  backgroundColor: '#F5F5F7',
  fontSize: 11,
  fontWeight: 600,
  color: '#86868B',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const tableRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 140px 140px 120px 30px',
  gap: 12,
  padding: '12px 16px',
  borderTop: '1px solid #F2F2F7',
  alignItems: 'center',
  fontSize: 13,
}

function tierSelectStyle(tier: UserTier): React.CSSProperties {
  const colors: Record<UserTier, { bg: string; fg: string }> = {
    standard: { bg: '#F5F5F7', fg: '#86868B' },
    professional: { bg: '#D1EAFE', fg: '#0060C0' },
    workshop: { bg: '#D1F7D1', fg: '#1A8C1A' },
    premium: { bg: '#FFE5D1', fg: '#B25400' },
  }
  const c = colors[tier]
  return {
    padding: '4px 10px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: c.bg,
    color: c.fg,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  }
}
