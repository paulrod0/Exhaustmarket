import { useCallback, useEffect, useState } from 'react'
import { CalendarCheck, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react'
import { quotesApi, PRICING_LABEL, FEE_STATUS_LABEL, STATUS_META, eur, fmtShort } from '../../lib/quotesApi'
import { toast } from '../../lib/toast'

/**
 * Admin → Visitas de diagnóstico: registro de citas, importes, cobros y reclamaciones (PDF módulo de
 * visita, apartados 10 y 16: «la plataforma debe registrar fechas, importes y condiciones»).
 */
const VISIT_STATUS: Record<string, string> = {
  propuesta: 'Propuesta', aceptada: 'Aceptada (sin fecha)', rechazada: 'Rechazada', programada: 'Programada',
  realizada: 'Realizada', cliente_no_presentado: 'Cliente no presentado', cancelada: 'Cancelada',
}

export default function AdminVisitsPage() {
  const [items, setItems] = useState<Record<string, any>[] | null>(null)
  const [onlyClaims, setOnlyClaims] = useState(false)
  const load = useCallback(() => {
    setItems(null)
    quotesApi.adminVisits().then((r) => setItems(r.items)).catch((e) => { toast.error((e as Error).message); setItems([]) })
  }, [])
  useEffect(load, [load])
  const list = (items ?? []).filter((v) => !onlyClaims || v.claim_status === 'abierta')
  const openClaims = (items ?? []).filter((v) => v.claim_status === 'abierta').length

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><CalendarCheck size={22} /> Visitas de diagnóstico</h1>
        <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0', maxWidth: 780, lineHeight: 1.5 }}>
          Citas que los talleres piden antes de presupuestar: condiciones aceptadas, importes, cobro y reclamaciones. Las reclamaciones abiertas salen primero.
        </p>
      </header>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={onlyClaims} onChange={(e) => setOnlyClaims(e.target.checked)} /> Solo reclamaciones abiertas {openClaims > 0 && <strong style={{ color: '#D70015' }}>({openClaims})</strong>}
        </label>
        <button onClick={load} style={ghost}><RefreshCw size={13} /> Actualizar</button>
      </div>
      {!items ? <div style={{ padding: 20, color: '#86868B', display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Cargando…</div>
        : !list.length ? <p style={{ color: '#86868B', fontSize: 13 }}>{onlyClaims ? 'No hay reclamaciones abiertas.' : 'Todavía no hay visitas de diagnóstico.'}</p>
        : (
          <div style={{ display: 'grid', gap: 10 }}>
            {list.map((v) => <VisitRow key={v.id} v={v} onChanged={load} />)}
          </div>
        )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function VisitRow({ v, onChanged }: { v: Record<string, any>; onChanged: () => void }) {
  const [resolution, setResolution] = useState('')
  const [refund, setRefund] = useState(false)
  const [busy, setBusy] = useState(false)
  const claimOpen = v.claim_status === 'abierta'
  const resolve = async () => {
    setBusy(true)
    try {
      await quotesApi.act('resolve_claim', { quote_request_id: v.quote_request_id, resolution, refund })
      toast.success('Reclamación resuelta: avisados cliente y taller')
      onChanged()
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <div style={{ background: '#fff', border: `1px solid ${claimOpen ? '#FCA5A5' : '#E5E5EA'}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{v.client_name || 'Cliente'} → {v.workshop_name || 'Taller'}</div>
          <div style={{ fontSize: 12.5, color: '#6E6E73' }}>{v.service_type} · {v.car_model} ({v.car_year})</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`badge badge-${STATUS_META[v.request_status as keyof typeof STATUS_META]?.tone ?? 'gray'}`}>{STATUS_META[v.request_status as keyof typeof STATUS_META]?.label ?? v.request_status}</span>
          <span className="badge badge-gray">Visita: {VISIT_STATUS[v.status] ?? v.status}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 10, fontSize: 13 }}>
        <Cell label="Cita">{v.scheduled_at ? fmtShort(v.scheduled_at) : '—'}</Cell>
        <Cell label="Duración">{v.duration_min} min</Cell>
        <Cell label="Precio">{v.pricing === 'gratis' ? 'Gratis' : `${eur(v.fee)} · ${PRICING_LABEL[v.pricing]}`}</Cell>
        <Cell label="Cobro">{FEE_STATUS_LABEL[v.fee_status] ?? v.fee_status}</Cell>
        <Cell label="Condiciones aceptadas">{v.conditions_accepted_at ? fmtShort(v.conditions_accepted_at) : '—'}</Cell>
        <Cell label="Presupuesto final">{v.amount_due != null ? `${eur(v.amount_due)} · ${v.final_status}` : '—'}</Cell>
      </div>
      {v.claim_status && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: claimOpen ? '#FEEDEC' : '#F5F5F7', fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 700, color: claimOpen ? '#B91C1C' : '#3A3A3C' }}><AlertTriangle size={14} /> Reclamación {v.claim_status}{v.claim_opened_at ? ` · ${fmtShort(v.claim_opened_at)}` : ''}</div>
          <div style={{ marginTop: 4, color: '#3A3A3C' }}>«{v.claim_reason}»</div>
          {v.claim_resolution && <div style={{ marginTop: 4, color: '#3A3A3C' }}>Resolución: {v.claim_resolution}{v.claim_refund ? ' · importe devuelto' : ''}</div>}
          {claimOpen && (
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              <textarea className="input-apple" rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Resolución (la verán cliente y taller)" maxLength={2000} />
              {v.pricing !== 'gratis' && <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} /> Devolver el importe de la visita al cliente (se marca como devuelto; la devolución se hace fuera de la plataforma)</label>}
              <div><button onClick={() => void resolve()} disabled={busy || !resolution.trim()} style={{ ...ghost, background: '#0071E3', color: '#fff', borderColor: '#0071E3' }}>Resolver reclamación</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 10.5, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div><div>{children}</div></div>
}
const ghost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: '#fff', color: '#1D1D1F', border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 12.5, cursor: 'pointer' }
