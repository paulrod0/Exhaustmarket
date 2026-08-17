import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, CheckCircle2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { auth as authClient } from '../../lib/auth-client'

interface KycRow {
  id: string
  full_name: string
  email: string | null
  company_name: string | null
  user_type: string
  dni_cif: string | null
  iban: string | null
  billing_address: string | null
  billing_city: string | null
  billing_zip: string | null
  billing_country: string | null
  kyc_status: string
  kyc_submitted_at: string | null
  kyc_verified_at: string | null
}

export default function AdminKycReviewPage() {
  const [rows, setRows] = useState<KycRow[]>([])
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<KycRow | null>(null)
  const [notes, setNotes] = useState('')

  const refresh = async () => {
    setLoading(true)
    let q = supabase.from('user_profiles').select('*').limit(200)
    if (filter === 'pending') q = q.eq('kyc_status', 'pending')
    else q = q.in('kyc_status', ['pending', 'verified', 'rejected'])
    const { data } = await q
    setRows(((data as KycRow[]) ?? []).sort((a, b) => (b.kyc_submitted_at ?? '').localeCompare(a.kyc_submitted_at ?? '')))
    setLoading(false)
  }

  useEffect(() => { refresh() }, [filter])

  const review = async (action: 'verified' | 'rejected') => {
    if (!selected) return
    const token = await authClient.__getToken()
    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ op: 'kyc_review', profile_id: selected.id, action, notes }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Error'); return }
    setSelected(null); setNotes('')
    refresh()
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Verificación KYC vendedores</h1>
        <p style={{ color: '#86868B', marginTop: 4 }}>Aprueba o rechaza las solicitudes de verificación de identidad.</p>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['pending', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 14px',
            backgroundColor: filter === f ? '#0071E3' : '#F2F2F7',
            color: filter === f ? 'white' : '#1D1D1F',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            {f === 'pending' ? 'Pendientes' : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#86868B' }}>Cargando…</p> :
       rows.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#86868B' }}>
          <ShieldCheck size={36} style={{ color: '#34C759', margin: '0 auto 12px' }} />
          <p>No hay verificaciones {filter === 'pending' ? 'pendientes' : ''}.</p>
        </div>
      ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5E5EA', textAlign: 'left' }}>
            <th style={{ padding: '12px 8px' }}>Vendedor</th>
            <th style={{ padding: '12px 8px' }}>Empresa</th>
            <th style={{ padding: '12px 8px' }}>DNI/CIF</th>
            <th style={{ padding: '12px 8px' }}>País</th>
            <th style={{ padding: '12px 8px' }}>Enviado</th>
            <th style={{ padding: '12px 8px' }}>Estado</th>
            <th style={{ padding: '12px 8px' }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #F2F2F7' }}>
              <td style={{ padding: '10px 8px' }}>
                <div style={{ fontWeight: 500 }}>{r.full_name}</div>
                <div style={{ fontSize: 12, color: '#86868B' }}>{r.email}</div>
              </td>
              <td style={{ padding: '10px 8px' }}>{r.company_name ?? '—'}</td>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 12 }}>{r.dni_cif ?? '—'}</td>
              <td style={{ padding: '10px 8px' }}>{r.billing_country ?? '—'}</td>
              <td style={{ padding: '10px 8px', fontSize: 12, color: '#86868B' }}>
                {r.kyc_submitted_at ? new Date(r.kyc_submitted_at).toLocaleDateString('es-ES') : '—'}
              </td>
              <td style={{ padding: '10px 8px' }}><Badge status={r.kyc_status} /></td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                <button onClick={() => setSelected(r)} style={{ padding: '6px 12px', background: '#0071E3', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  Revisar →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>)}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 600, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, margin: 0 }}>Revisar KYC: {selected.full_name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <DataRow label="Email" value={selected.email ?? '—'} />
            <DataRow label="Empresa" value={selected.company_name ?? '—'} />
            <DataRow label="DNI / CIF" value={selected.dni_cif ?? '—'} mono />
            <DataRow label="IBAN" value={selected.iban ?? '—'} mono />
            <DataRow label="Dirección" value={selected.billing_address ?? '—'} />
            <DataRow label="Ciudad" value={selected.billing_city ?? '—'} />
            <DataRow label="CP" value={selected.billing_zip ?? '—'} />
            <DataRow label="País" value={selected.billing_country ?? '—'} />
            <DataRow label="Estado" value={selected.kyc_status} />

            <label style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', display: 'block', marginBottom: 4, marginTop: 16 }}>Notas (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Si rechazas, indica el motivo (será visible para el vendedor)"
              style={{ width: '100%', padding: 10, border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => review('rejected')} style={{ padding: '10px 20px', background: '#FF3B30', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={14} /> Rechazar
              </button>
              <button onClick={() => review('verified')} style={{ padding: '10px 20px', background: '#34C759', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} /> Verificar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ status }: { status: string }) {
  const m: Record<string, { color: string; label: string }> = {
    none: { color: '#86868B', label: 'Sin enviar' },
    pending: { color: '#FF9500', label: 'Pendiente' },
    verified: { color: '#34C759', label: 'Verificado' },
    rejected: { color: '#D70015', label: 'Rechazado' },
  }
  const x = m[status] ?? m.none
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: `${x.color}20`, color: x.color, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
      {x.label}
    </span>
  )
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, padding: '8px 0', borderBottom: '1px solid #F2F2F7', fontSize: 13 }}>
      <div style={{ color: '#86868B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}
