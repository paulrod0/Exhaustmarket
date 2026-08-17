import { useEffect, useState } from 'react'
import { Shield, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { auth as authClient } from '../../lib/auth-client'
import { COUNTRIES } from '../../lib/dataAdmin'

interface KycData {
  dni_cif: string
  iban: string
  billing_address: string
  billing_city: string
  billing_zip: string
  billing_country: string
}

export default function PanelKycPage() {
  const { profile, fetchProfile } = useAuthStore()
  const [data, setData] = useState<KycData>({ dni_cif: '', iban: '', billing_address: '', billing_city: '', billing_zip: '', billing_country: 'ES' })
  const [kycStatus, setKycStatus] = useState<string>('none')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const { data: row } = await supabase.from('user_profiles').select('*').eq('id', profile.id).maybeSingle()
      if (row) {
        const r = row as Record<string, unknown>
        setData({
          dni_cif: String(r.dni_cif ?? ''),
          iban: String(r.iban ?? ''),
          billing_address: String(r.billing_address ?? ''),
          billing_city: String(r.billing_city ?? ''),
          billing_zip: String(r.billing_zip ?? ''),
          billing_country: String(r.billing_country ?? 'ES'),
        })
        setKycStatus(String(r.kyc_status ?? 'none'))
      }
    })()
  }, [profile])

  const submit = async () => {
    if (!data.dni_cif.trim() || !data.iban.trim()) {
      setError('DNI/CIF e IBAN son obligatorios para verificar.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const token = await authClient.__getToken()
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ op: 'kyc_submit', ...data }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error')
      setKycStatus('pending')
      setOk(true)
      fetchProfile().catch(() => undefined)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = () => {
    if (kycStatus === 'verified') return { icon: CheckCircle2, color: '#34C759', label: 'Verificado · puedes cobrar' }
    if (kycStatus === 'pending') return { icon: Clock, color: '#FF9500', label: 'En revisión · te avisaremos por email' }
    if (kycStatus === 'rejected') return { icon: AlertCircle, color: '#D70015', label: 'Rechazado · revisa los datos y vuelve a enviar' }
    return { icon: Shield, color: '#86868B', label: 'Sin verificar · no puedes recibir pagos todavía' }
  }
  const s = statusBadge()
  const Icon = s.icon

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>Verificación de vendedor (KYC)</h1>
      <p style={{ color: '#86868B', marginBottom: 24 }}>
        Para recibir pagos en el marketplace necesitamos verificar tu identidad y cuenta bancaria. Los datos solo se ven en admin para procesar payouts.
      </p>

      <div style={{ padding: 16, background: `${s.color}15`, color: s.color, borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={20} />
        <span style={{ fontWeight: 500 }}>{s.label}</span>
      </div>

      {ok && (
        <div style={{ padding: 12, background: '#34C75920', color: '#34C759', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          Datos enviados. Te avisaremos por email cuando estés verificado (24-48h hábiles).
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: '#FFE5E7', color: '#D70015', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="DNI o CIF *" value={data.dni_cif} onChange={(v) => setData({ ...data, dni_cif: v })} placeholder="12345678X / B12345678" />
        <Field label="IBAN *" value={data.iban} onChange={(v) => setData({ ...data, iban: v })} placeholder="ES91 2100 0418 4502 0005 1332" />
        <Field label="Dirección fiscal" value={data.billing_address} onChange={(v) => setData({ ...data, billing_address: v })} placeholder="Calle Principal 12, 3ºB" full />
        <Field label="Ciudad" value={data.billing_city} onChange={(v) => setData({ ...data, billing_city: v })} />
        <Field label="Código postal" value={data.billing_zip} onChange={(v) => setData({ ...data, billing_zip: v })} />
        <div>
          <label style={lbl}>País</label>
          <select value={data.billing_country} onChange={(e) => setData({ ...data, billing_country: e.target.value })} style={inp as React.CSSProperties}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <button onClick={submit} disabled={submitting} style={{
        marginTop: 24, padding: '12px 24px', background: '#0071E3', color: 'white',
        border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
      }}>
        {submitting ? 'Enviando…' : 'Enviar para verificación'}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, full }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <label style={lbl}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inp} />
    </div>
  )
}
const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', backgroundColor: 'white' }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#1D1D1F', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }
