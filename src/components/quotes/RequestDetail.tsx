import { useMemo, useRef, useState } from 'react'
import { Send, HelpCircle, MapPin, XCircle, CheckCircle2, Calendar, Clock, Euro, Star, Phone, AlertTriangle, MessageSquare, History, ChevronDown, ChevronRight, Plus, Trash2, Wrench, CalendarPlus, Loader2 } from 'lucide-react'
import PhotoUploader from '../admin/PhotoUploader'
import { toast } from '../../lib/toast'
import {
  quotesApi, STATUS_META, statusLabel, VISIT_REASONS, PRICING_LABEL, FEE_STATUS_LABEL, eur, fmtDateTime, fmtShort, costLabel,
  suggestedExplanation, suggestedConditions, eventLabel, downloadIcs, type QItem, type QVisit, type QFinal, type QMaterial,
} from '../../lib/quotesApi'

type Run = (action: string, body?: Record<string, unknown>, okMsg?: string) => Promise<boolean>

/**
 * Detalle de una solicitud de presupuesto: siguiente paso, panel de acciones según rol + estado
 * (módulo de visita de diagnóstico, PDF apartados 6-12), datos, conversación e historial.
 */
export default function RequestDetail({ item, onChanged, onOtherWorkshop }: { item: QItem; onChanged: () => void; onOtherWorkshop?: (item: QItem) => void }) {
  const [busy, setBusy] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const run: Run = async (action, body = {}, okMsg) => {
    setBusy(true)
    try {
      await quotesApi.act(action, { quote_request_id: item.id, ...body })
      if (okMsg) toast.success(okMsg)
      onChanged()
      return true
    } catch (e) {
      toast.error((e as Error).message)
      return false
    } finally { setBusy(false) }
  }
  const ask = () => { composerRef.current?.focus(); composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  const meta = STATUS_META[item.status]
  const next = item.role === 'client' ? meta?.client : meta?.workshop

  return (
    <div style={{ display: 'grid', gap: 14, paddingTop: 14 }}>
      {next && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: '#F5F8FF', border: '1px solid #DCE8FF', fontSize: 13, color: '#1D3A6B' }}>
          <ChevronRight size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span><strong>Siguiente paso:</strong> {next}</span>
        </div>
      )}
      <ActionPanel item={item} run={run} busy={busy} ask={ask} onOtherWorkshop={onOtherWorkshop} />
      <RequestInfo item={item} />
      <Conversation item={item} run={run} busy={busy} composerRef={composerRef} />
      <Timeline item={item} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─────────────────────────────── panel de acciones ───────────────────────────────
function ActionPanel({ item, run, busy, ask, onOtherWorkshop }: { item: QItem; run: Run; busy: boolean; ask: () => void; onOtherWorkshop?: (i: QItem) => void }) {
  const v = item.visit
  const s = item.status
  const pastAppointment = !!v?.scheduled_at && Date.parse(v.scheduled_at) <= Date.now()
  const canClaim = item.role === 'client' && !!v && v.claim_status !== 'abierta'
    && ((v.status === 'programada' && pastAppointment) || v.status === 'cliente_no_presentado' || v.status === 'realizada')
  const canRate = item.role === 'client' && !item.rating
    && (v?.status === 'realizada' || s === 'contracted' || (s === 'closed' && item.events.some((e) => e.type === 'direct_accepted' || e.type === 'final_accepted')))

  if (item.role === 'workshop') {
    if (s === 'pending' || s === 'info_requested') return <WorkshopRespond item={item} run={run} busy={busy} />
    if (s === 'visit_requested' && v) return <Card title="Visita propuesta · esperando al cliente" icon={<MapPin size={16} />}><VisitSummary v={v} /></Card>
    if (s === 'visit_accepted' && v) return <ScheduleCard v={v} run={run} busy={busy} />
    if (s === 'visit_rejected') return (
      <Card title="El cliente rechazó la visita" icon={<XCircle size={16} />} tone="gray">
        {v?.rejected_reason && <Quote text={v.rejected_reason} />}
        <Collapsible label="Proponer otra visita"><VisitProposalForm initial={v} busy={busy} onSubmit={(b) => run('propose_visit', b, 'Nueva propuesta enviada')} /></Collapsible>
      </Card>
    )
    if (s === 'visit_scheduled' && v) return (
      <>
        <AppointmentCard item={item} v={v} />
        <Card title="Después de la visita" icon={<Wrench size={16} />}>
          <MarkDoneForm v={v} busy={busy} onSubmit={(b) => run('mark_visit_done', b, 'Visita marcada como realizada')} />
          <div style={{ borderTop: '1px solid #F2F2F7', marginTop: 12, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-pill btn-sm" disabled={busy || !pastAppointment} onClick={() => { if (window.confirm('¿Marcar que el cliente no se presentó a la cita?')) void run('mark_no_show', {}, 'Marcado: cliente no presentado') }}
              style={{ ...dangerBtn, opacity: pastAppointment ? 1 : 0.45 }}>Cliente no presentado</button>
            {!pastAppointment && <span style={hint}>Disponible a partir de la hora de la cita.</span>}
          </div>
        </Card>
      </>
    )
    if (s === 'client_no_show' && v) return (
      <Card title="El cliente no se presentó" icon={<AlertTriangle size={16} />} tone="red">
        {v.claim_status === 'abierta' && <Notice tone="red">El cliente ha abierto una reclamación: ExhaustMarket la está revisando.</Notice>}
        {v.reschedule_count < 1
          ? <Collapsible label="Reagendar la visita (se permite una vez)"><VisitProposalForm initial={v} busy={busy} onSubmit={(b) => run('propose_visit', b, 'Nueva cita propuesta')} /></Collapsible>
          : <p style={hint}>Ya se reagendó una vez: no se permite otro reagendado.</p>}
      </Card>
    )
    if (s === 'visit_done' && v) return (
      <Card title="Presupuesto final tras la visita" icon={<Send size={16} />}>
        <DoneNotes v={v} />
        <FinalQuoteForm v={v} busy={busy} onSubmit={(b) => run('send_final', b, 'Presupuesto final enviado')} />
      </Card>
    )
    if (s === 'final_sent' && item.final) return <FinalSentWorkshop item={item} v={v} run={run} busy={busy} />
    if (s === 'contracted') return (
      <Card title="Trabajo contratado" icon={<CheckCircle2 size={16} />} tone="green">
        <ContractSummary item={item} />
        <button className="btn-pill btn-primary btn-sm" disabled={busy} onClick={() => { if (window.confirm('¿Marcar el trabajo como terminado y cerrar la solicitud?')) void run('close', {}, 'Trabajo cerrado') }} style={{ marginTop: 12 }}>
          Marcar trabajo terminado
        </button>
      </Card>
    )
    return <ClosedCard item={item} />
  }

  // ── CLIENTE ──
  if (s === 'pending') return (
    <Card title="Esperando respuesta del taller" icon={<Clock size={16} />}>
      <p style={hint}>El taller puede enviarte un presupuesto directo, pedirte más información o proponerte una visita de diagnóstico.</p>
      <WithdrawButton run={run} busy={busy} />
    </Card>
  )
  if (s === 'info_requested') return (
    <Card title="El taller necesita más información" icon={<HelpCircle size={16} />} tone="orange">
      {lastFrom(item, 'workshop') && <Quote text={lastFrom(item, 'workshop')!} />}
      <CompleteInfoForm item={item} busy={busy} onSubmit={(b) => run('complete_info', b, 'Información enviada al taller')} />
    </Card>
  )
  if (s === 'quoted') {
    const q = [...item.quotes].reverse().find((x) => x.response_type === 'direct' && x.price != null)
    return (
      <Card title="Presupuesto del taller" icon={<Euro size={16} />}>
        {q && <div style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F' }}>{eur(q.price)}</div>}
        {q?.notes && <p style={{ ...p, marginTop: 6 }}>{q.notes}</p>}
        {q && <p style={hint}>Válido hasta el {new Date(q.valid_until).toLocaleDateString('es-ES')}</p>}
        <DecisionButtons busy={busy} acceptLabel="Aceptar presupuesto" onAccept={() => run('accept_direct', {}, '¡Presupuesto aceptado! Trabajo contratado')}
          onReject={(reason) => run('reject_direct', { reason }, 'Presupuesto rechazado')} onAsk={ask} askLabel="Preguntar al taller" />
      </Card>
    )
  }
  if (s === 'visit_requested' && v) return <VisitProposalCard item={item} v={v} run={run} busy={busy} ask={ask} onOtherWorkshop={onOtherWorkshop} />
  if (s === 'visit_accepted' && v) return (
    <Card title="Visita aceptada" icon={<Calendar size={16} />}>
      <p style={p}>Has aceptado la visita ({costLabel(v)}). El taller te confirmará la fecha y hora de la cita.</p>
      <CancelVisitButton run={run} busy={busy} />
    </Card>
  )
  if (s === 'visit_rejected') return (
    <Card title="Has rechazado la visita" icon={<XCircle size={16} />} tone="gray">
      <p style={p}>Puedes enviar la misma solicitud a otro taller.</p>
      {onOtherWorkshop && <button className="btn-pill btn-primary btn-sm" onClick={() => onOtherWorkshop(item)}>Enviar a otro taller</button>}
    </Card>
  )
  if (s === 'visit_scheduled' && v) return (
    <>
      <AppointmentCard item={item} v={v} />
      {!pastAppointment && <div><CancelVisitButton run={run} busy={busy} /></div>}
      {canClaim && <ClaimCard run={run} busy={busy} />}
    </>
  )
  if (s === 'client_no_show' && v) return (
    <Card title="El taller indica que no acudiste a la cita" icon={<AlertTriangle size={16} />} tone="red">
      <p style={p}>Cita del {fmtDateTime(v.scheduled_at)}. Si acudiste o hubo un problema, puedes reclamar y ExhaustMarket lo revisará.</p>
      {v.claim_status === 'abierta' ? <Notice tone="orange">Reclamación abierta: ExhaustMarket la está revisando.</Notice> : canClaim && <ClaimForm run={run} busy={busy} />}
    </Card>
  )
  if (s === 'visit_done' && v) return (
    <>
      <Card title="El taller está preparando tu presupuesto final" icon={<Clock size={16} />}>
        <DoneNotes v={v} />
      </Card>
      {canRate && <RatingCard run={run} busy={busy} />}
      {canClaim && <ClaimCard run={run} busy={busy} />}
    </>
  )
  if (s === 'final_sent' && item.final) return (
    <>
      <Card title={`Presupuesto final${item.final.version > 1 ? ` (corregido · v${item.final.version})` : ''}`} icon={<Euro size={16} />}>
        <FinalQuoteView f={item.final} />
        <DecisionButtons busy={busy} acceptLabel={`Aceptar presupuesto · ${eur(item.final.amount_due)}`} onAccept={() => run('accept_final', {}, '¡Presupuesto aceptado! Trabajo contratado')}
          onReject={(reason) => run('reject_final', { reason }, 'Presupuesto rechazado')} onAsk={ask} askLabel="Solicitar aclaración"
          rejectHint={v && v.pricing !== 'gratis' ? 'Si lo rechazas, el taller conserva el importe de la visita (la revisión se realizó).' : undefined} />
      </Card>
      {canRate && <RatingCard run={run} busy={busy} />}
    </>
  )
  if (s === 'contracted') return (
    <>
      <Card title="Trabajo contratado" icon={<CheckCircle2 size={16} />} tone="green"><ContractSummary item={item} /></Card>
      {canRate && <RatingCard run={run} busy={busy} />}
    </>
  )
  if (s === 'rejected') return (
    <Card title="Este taller no puede atender tu solicitud" icon={<XCircle size={16} />} tone="gray">
      {item.closed_reason && <Quote text={item.closed_reason} />}
      <p style={p}>Tu solicitud sigue activa para los demás talleres a los que la enviaste.</p>
      {onOtherWorkshop && <button className="btn-pill btn-secondary btn-sm" onClick={() => onOtherWorkshop(item)}>Enviar a otro taller</button>}
    </Card>
  )
  return (
    <>
      <ClosedCard item={item} />
      {canRate && <RatingCard run={run} busy={busy} />}
      {canClaim && <ClaimCard run={run} busy={busy} />}
    </>
  )
}

// ── taller: 4 acciones (apartado 6) ──
function WorkshopRespond({ item, run, busy }: { item: QItem; run: Run; busy: boolean }) {
  const [mode, setMode] = useState<null | 'direct' | 'info' | 'visit' | 'decline'>(null)
  const opts = [
    { id: 'direct' as const, label: 'Enviar presupuesto directo', hint: 'La información del cliente es suficiente', icon: <Send size={15} /> },
    { id: 'info' as const, label: 'Pedir más información', hint: 'Falta una foto, kilómetros, una medida, un ruido…', icon: <HelpCircle size={15} /> },
    { id: 'visit' as const, label: 'Solicitar visita de diagnóstico', hint: 'Necesitas ver el coche o subirlo a elevador', icon: <MapPin size={15} /> },
    { id: 'decline' as const, label: 'Rechazar solicitud', hint: 'No haces ese trabajo, está lejos o no tienes hueco', icon: <XCircle size={15} /> },
  ]
  return (
    <Card title={item.status === 'info_requested' ? 'Has pedido más información · puedes responder igualmente' : '¿Cómo quieres responder?'} icon={<Wrench size={16} />}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
        {opts.map((o) => (
          <button key={o.id} type="button" onClick={() => setMode(mode === o.id ? null : o.id)} style={{
            textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: mode === o.id ? '#EAF2FF' : '#fff',
            border: `1px solid ${mode === o.id ? '#0071E3' : o.id === 'decline' ? '#FFD5D2' : '#E5E5EA'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 13.5, color: o.id === 'decline' ? '#D70015' : '#1D1D1F' }}>{o.icon} {o.label}</div>
            <div style={{ fontSize: 12, color: '#86868B', marginTop: 3 }}>{o.hint}</div>
          </button>
        ))}
      </div>
      {mode && <div style={{ marginTop: 14 }}>
        {mode === 'direct' && <DirectQuoteForm busy={busy} onSubmit={(b) => run('quote_direct', b, 'Presupuesto enviado al cliente')} />}
        {mode === 'info' && <TextForm label="¿Qué necesitas saber?" placeholder="Ej.: ¿puedes mandar una foto del flexible? ¿Cuántos km tiene el coche?" cta="Pedir información" busy={busy}
          onSubmit={(message) => run('request_info', { message }, 'Pregunta enviada al cliente')} required />}
        {mode === 'visit' && <VisitProposalForm busy={busy} onSubmit={(b) => run('propose_visit', b, 'Propuesta de visita enviada')} />}
        {mode === 'decline' && <TextForm label="Motivo (opcional, lo verá el cliente)" placeholder="Ej.: no hacemos ese trabajo / no tenemos disponibilidad" cta="Rechazar solicitud" danger busy={busy}
          onSubmit={(reason) => run('decline', { reason }, 'Solicitud rechazada')} />}
      </div>}
    </Card>
  )
}

// ── formulario de visita del taller (apartado 7) ──
function VisitProposalForm({ initial, busy, onSubmit }: { initial?: QVisit | null; busy: boolean; onSubmit: (b: Record<string, unknown>) => Promise<boolean> }) {
  const [reasons, setReasons] = useState<string[]>(initial?.reasons?.length ? initial.reasons : ['elevador'])
  const [reasonOther, setReasonOther] = useState(initial?.reason_other ?? '')
  const preset = [15, 30, 45, 60]
  const [duration, setDuration] = useState<number>(initial?.duration_min ?? 30)
  const [customDur, setCustomDur] = useState(initial && !preset.includes(initial.duration_min) ? String(initial.duration_min) : '')
  const [pricing, setPricing] = useState<'gratis' | 'pago' | 'descontable'>(initial?.pricing ?? 'descontable')
  const [fee, setFee] = useState(initial && initial.pricing !== 'gratis' ? String(Number(initial.fee)) : '')
  const [explanation, setExplanation] = useState(initial?.explanation ?? suggestedExplanation(30))
  const [explTouched, setExplTouched] = useState(!!initial)
  const [conditions, setConditions] = useState(initial?.conditions ?? suggestedConditions('descontable'))
  const [condTouched, setCondTouched] = useState(!!initial)
  const [slots, setSlots] = useState<string[]>([''])
  const effDuration = customDur ? Number(customDur) || 0 : duration
  const toggleReason = (r: string) => setReasons((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]))
  const setDur = (d: number) => { setDuration(d); setCustomDur(''); if (!explTouched) setExplanation(suggestedExplanation(d)) }
  const setPr = (pr: 'gratis' | 'pago' | 'descontable') => { setPricing(pr); if (!condTouched) setConditions(suggestedConditions(pr)) }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await onSubmit({
      reasons, reason_other: reasons.includes('otro') ? reasonOther : null, explanation, duration_min: effDuration, pricing,
      fee: pricing === 'gratis' ? 0 : Number(fee.replace(',', '.')), conditions,
      slots: slots.filter(Boolean).map((s) => new Date(s).toISOString()),
    })
    if (ok) setSlots([''])
  }
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <Field label="Motivo de la visita">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(VISIT_REASONS).map(([k, l]) => (
            <button key={k} type="button" onClick={() => toggleReason(k)} style={{ ...chip, ...(reasons.includes(k) ? chipOn : {}) }}>{l}</button>
          ))}
        </div>
        {reasons.includes('otro') && <input className="input-apple" style={{ marginTop: 8 }} value={reasonOther} onChange={(e) => setReasonOther(e.target.value)} placeholder="Describe el motivo" maxLength={300} />}
      </Field>
      <Field label="Duración estimada">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {preset.map((d) => <button key={d} type="button" onClick={() => setDur(d)} style={{ ...chip, ...(!customDur && duration === d ? chipOn : {}) }}>{d} min</button>)}
          <input className="input-apple" style={{ width: 130 }} inputMode="numeric" value={customDur} placeholder="Otra (min)" onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setCustomDur(v); if (!explTouched && v) setExplanation(suggestedExplanation(Number(v))) }} />
        </div>
      </Field>
      <Field label="Precio de la visita">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 6 }}>
          {(['descontable', 'pago', 'gratis'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setPr(k)} style={{ ...chip, borderRadius: 10, padding: '9px 10px', textAlign: 'left', ...(pricing === k ? chipOn : {}) }}>
              <strong>{k === 'descontable' ? 'Descontable' : k === 'pago' ? 'Importe fijo' : 'Gratis'}</strong>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{k === 'descontable' ? 'Recomendado: se resta del presupuesto final si lo acepta' : k === 'pago' ? 'El cliente paga la revisión' : 'Visibilidad extra para captar clientes'}</div>
            </button>
          ))}
        </div>
        {pricing !== 'gratis' && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="input-apple" style={{ width: 140 }} inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="Importe" required />
            <span style={hint}>€ {pricing === 'descontable' ? '· se descuenta automáticamente del presupuesto final' : ''}</span>
          </div>
        )}
      </Field>
      <Field label="Explicación al cliente">
        <textarea className="input-apple" rows={3} value={explanation} onChange={(e) => { setExplanation(e.target.value); setExplTouched(true) }} maxLength={1500} required style={{ resize: 'vertical' }} />
      </Field>
      <Field label="Fechas disponibles (franjas que propones)" help="Opcional: si no pones ninguna, fijarás la cita cuando el cliente acepte.">
        <div style={{ display: 'grid', gap: 6 }}>
          {slots.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input type="datetime-local" className="input-apple" value={s} min={localNow()} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))} />
              {slots.length > 1 && <button type="button" onClick={() => setSlots(slots.filter((_, j) => j !== i))} style={iconBtn} aria-label="Quitar franja"><Trash2 size={14} /></button>}
            </div>
          ))}
          {slots.length < 6 && <button type="button" style={{ ...linkBtn, justifySelf: 'start', fontSize: 13 }} onClick={() => setSlots([...slots, ''])}><Plus size={13} /> Añadir otra franja</button>}
        </div>
      </Field>
      <Field label="Condiciones">
        <textarea className="input-apple" rows={3} value={conditions} onChange={(e) => { setConditions(e.target.value); setCondTouched(true) }} maxLength={2000} style={{ resize: 'vertical' }} />
      </Field>
      <div><button type="submit" className="btn-pill btn-primary" disabled={busy || !effDuration || (!reasons.length)}>{busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={15} />} Solicitar visita de diagnóstico</button></div>
    </form>
  )
}

// ── propuesta que recibe el cliente (apartado 8) ──
function VisitProposalCard({ item, v, run, busy, ask, onOtherWorkshop }: { item: QItem; v: QVisit; run: Run; busy: boolean; ask: () => void; onOtherWorkshop?: (i: QItem) => void }) {
  const futureSlots = (v.slots ?? []).filter((s) => Date.parse(s) > Date.now())
  const [slot, setSlot] = useState<string>(futureSlots[0] ?? '')
  const [agree, setAgree] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const cp = item.counterpart
  return (
    <Card title="El taller solicita una visita de diagnóstico" icon={<MapPin size={16} />} tone="blue">
      <div style={{ display: 'grid', gap: 10 }}>
        <Row label="Taller"><strong>{cp.name}</strong> <RatingBadge r={cp.rating} />{cp.distance_km != null && <span style={hint}> · a {cp.distance_km.toLocaleString('es-ES')} km</span>}{cp.address && <div style={hint}>{cp.address}</div>}</Row>
        <Row label="Motivo">{reasonText(v)}</Row>
        <Row label="Por qué"><Quote text={v.explanation} /></Row>
        <Row label="Duración estimada">{v.duration_min} minutos</Row>
        <Row label="Coste"><strong>{costLabel(v)}</strong></Row>
        {v.conditions && <Row label="Condición principal"><span style={{ color: '#3A3A3C' }}>{v.conditions}</span></Row>}
        <Row label="Fecha">
          {futureSlots.length ? (
            <div style={{ display: 'grid', gap: 6 }}>
              {futureSlots.map((s) => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                  <input type="radio" name={`slot-${item.id}`} checked={slot === s} onChange={() => setSlot(s)} /> {fmtDateTime(s)}
                </label>
              ))}
            </div>
          ) : (v.slots?.length ? <span style={{ color: '#D70015' }}>Las fechas propuestas ya han pasado: pregunta al taller por otra.</span> : <span>El taller te propondrá la fecha cuando aceptes.</span>)}
        </Row>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 14, padding: '10px 12px', borderRadius: 10, background: '#FAFAFC', border: '1px solid #E5E5EA', fontSize: 13.5, cursor: 'pointer' }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2 }} />
        <span>Acepto el coste de la visita (<strong>{costLabel(v)}</strong>) y sus condiciones.</span>
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button className="btn-pill btn-primary" disabled={busy || !agree || (!!v.slots?.length && !slot)}
          onClick={() => run('accept_visit', { accept_conditions: true, slot: slot || undefined }, futureSlots.length ? 'Visita aceptada · cita programada' : 'Visita aceptada')}>
          <CheckCircle2 size={15} /> Aceptar visita
        </button>
        <button className="btn-pill btn-secondary" disabled={busy} onClick={() => setRejecting(!rejecting)}>Rechazar visita</button>
        {onOtherWorkshop && <button className="btn-pill btn-secondary" onClick={() => onOtherWorkshop(item)}>Elegir otro taller</button>}
        <button className="btn-pill btn-secondary" onClick={ask}><MessageSquare size={14} /> Preguntar al taller</button>
      </div>
      {rejecting && <div style={{ marginTop: 12 }}><TextForm label="Motivo (opcional)" placeholder="Ej.: prefiero otro taller / el coste es alto" cta="Rechazar visita" danger busy={busy}
        onSubmit={(reason) => run('reject_visit', { reason }, 'Visita rechazada')} /></div>}
    </Card>
  )
}

// ── cita (apartado 4: agenda) ──
function AppointmentCard({ item, v }: { item: QItem; v: QVisit }) {
  const cp = item.counterpart
  return (
    <Card title="Cita de diagnóstico" icon={<Calendar size={16} />} tone="green">
      <div style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F' }}>{cap(fmtDateTime(v.scheduled_at))}</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        <Row label="Duración">{v.duration_min} minutos</Row>
        <Row label={item.role === 'client' ? 'Taller' : 'Cliente'}><strong>{cp.name}</strong>{cp.address && item.role === 'client' && <div style={hint}>{cp.address}</div>}
          {item.role === 'workshop' && item.location && <div style={hint}>{item.location}</div>}</Row>
        {cp.phone && <Row label="Teléfono"><a href={`tel:${cp.phone}`} style={{ color: '#0071E3', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Phone size={12} /> {cp.phone}</a></Row>}
        <Row label="Coste">{costLabel(v)}{v.pricing !== 'gratis' && <span style={hint}> · {FEE_STATUS_LABEL[v.fee_status]}</span>}</Row>
        {v.conditions && <Row label="Condiciones aceptadas"><span style={{ color: '#3A3A3C' }}>{v.conditions}</span>{v.conditions_accepted_at && <div style={hint}>Aceptadas el {fmtShort(v.conditions_accepted_at)}</div>}</Row>}
      </div>
      {v.pricing !== 'gratis' && item.role === 'client' && <Notice tone="blue">El pago online de visitas llegará con el monedero de ExhaustMarket; de momento se abona en el taller.</Notice>}
      <button type="button" className="btn-pill btn-secondary btn-sm" onClick={() => downloadIcs(item)} style={{ marginTop: 12 }}><CalendarPlus size={14} /> Añadir al calendario</button>
    </Card>
  )
}

function ScheduleCard({ v, run, busy }: { v: QVisit; run: Run; busy: boolean }) {
  const [when, setWhen] = useState('')
  return (
    <Card title="El cliente aceptó la visita · fija la cita" icon={<Calendar size={16} />} tone="blue">
      <VisitSummary v={v} />
      <form onSubmit={(e) => { e.preventDefault(); if (when) void run('schedule_visit', { scheduled_at: new Date(when).toISOString() }, 'Cita programada') }} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input type="datetime-local" className="input-apple" style={{ maxWidth: 260 }} value={when} min={localNow()} onChange={(e) => setWhen(e.target.value)} required />
        <button className="btn-pill btn-primary" disabled={busy || !when}>Programar cita</button>
      </form>
    </Card>
  )
}

function MarkDoneForm({ v, busy, onSubmit }: { v: QVisit; busy: boolean; onSubmit: (b: Record<string, unknown>) => Promise<boolean> }) {
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [collected, setCollected] = useState(false)
  const soon = !v.scheduled_at || Date.parse(v.scheduled_at) - Date.now() <= 12 * 3600_000
  return (
    <form onSubmit={(e) => { e.preventDefault(); void onSubmit({ notes, photos, fee_collected: collected }) }} style={{ display: 'grid', gap: 10 }}>
      <Field label="Notas de la revisión (opcional)"><textarea className="input-apple" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Qué has visto: flexible roto, soporte partido…" style={{ resize: 'vertical' }} /></Field>
      <Field label="Fotos del diagnóstico (opcional)"><MediaPicker prefix={`visits/${v.id}`} value={photos} onChange={setPhotos} /></Field>
      {v.pricing !== 'gratis' && (
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
          <input type="checkbox" checked={collected} onChange={(e) => setCollected(e.target.checked)} /> He cobrado el importe de la visita ({eur(v.fee)})
        </label>
      )}
      <div><button className="btn-pill btn-primary" disabled={busy || !soon}><CheckCircle2 size={15} /> Marcar visita como realizada</button>
        {!soon && <span style={{ ...hint, marginLeft: 8 }}>Disponible el mismo día de la cita.</span>}</div>
    </form>
  )
}

// ── presupuesto final (apartado 12) ──
function FinalQuoteForm({ v, initial, busy, onSubmit }: { v: QVisit; initial?: QFinal | null; busy: boolean; onSubmit: (b: Record<string, unknown>) => Promise<boolean> }) {
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? (v.done_notes ?? ''))
  const [solution, setSolution] = useState(initial?.solution ?? '')
  const [materials, setMaterials] = useState<{ name: string; qty: string; price: string }[]>(
    initial?.materials?.length ? initial.materials.map((m: QMaterial) => ({ name: m.name, qty: m.qty == null ? '' : String(m.qty), price: m.price == null ? '' : String(m.price) })) : [{ name: '', qty: '1', price: '' }])
  const [laborHours, setLaborHours] = useState(initial?.labor_hours ? String(Number(initial.labor_hours)) : '')
  const [laborPrice, setLaborPrice] = useState(initial?.labor_price ? String(Number(initial.labor_price)) : '')
  const [materialsPrice, setMaterialsPrice] = useState(initial?.materials_price ? String(Number(initial.materials_price)) : '')
  const [total, setTotal] = useState(initial ? String(Number(initial.total_price)) : '')
  const [totalTouched, setTotalTouched] = useState(!!initial)
  const [workTime, setWorkTime] = useState(initial?.work_time ?? '')
  const [availability, setAvailability] = useState(initial?.availability ?? '')
  const [warranty, setWarranty] = useState(initial?.warranty ?? '')
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? (v.done_photos ?? []))
  const [conditions, setConditions] = useState(initial?.conditions ?? '')
  const [validUntil, setValidUntil] = useState(initial?.valid_until?.slice(0, 10) ?? plusDays(15))
  const n = (s: string) => Number(String(s).replace(',', '.')) || 0
  const matSum = materials.reduce((acc, m) => acc + n(m.qty || '1') * n(m.price), 0)
  const effMaterials = materialsPrice ? n(materialsPrice) : matSum
  const suggestedTotal = Math.round((n(laborPrice) + effMaterials) * 100) / 100
  const effTotal = totalTouched ? n(total) : suggestedTotal
  const discountable = v.pricing === 'descontable' && v.fee_status !== 'devuelto'
  const discount = discountable ? Math.min(Number(v.fee), effTotal) : 0
  const due = Math.max(0, Math.round((effTotal - discount) * 100) / 100)
  const setMat = (i: number, k: 'name' | 'qty' | 'price', val: string) => setMaterials(materials.map((m, j) => (j === i ? { ...m, [k]: val } : m)))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    void onSubmit({
      diagnosis, solution, materials: materials.filter((m) => m.name.trim()).map((m) => ({ name: m.name.trim(), qty: m.qty ? n(m.qty) : null, price: m.price ? n(m.price) : null })),
      labor_hours: laborHours ? n(laborHours) : null, labor_price: laborPrice ? n(laborPrice) : null, materials_price: effMaterials || null,
      total_price: effTotal, work_time: workTime, availability, warranty, photos, conditions, valid_until: validUntil || null,
    })
  }
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 6 }}>
      <Field label="Diagnóstico"><textarea className="input-apple" rows={2} required value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Lo que has visto: fuga, flexible roto, soldadura agrietada, silencioso dañado…" style={{ resize: 'vertical' }} /></Field>
      <Field label="Solución propuesta"><textarea className="input-apple" rows={2} required value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Qué trabajo recomiendas hacer" style={{ resize: 'vertical' }} /></Field>
      <Field label="Materiales necesarios">
        <div style={{ display: 'grid', gap: 6 }}>
          {materials.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <input className="input-apple" style={{ flex: '1 1 200px', minWidth: 0 }} value={m.name} onChange={(e) => setMat(i, 'name', e.target.value)} placeholder="Tubo inox, flexible, abrazaderas…" aria-label="Material" />
              <input className="input-apple" style={{ flex: '0 0 70px', width: 70 }} value={m.qty} onChange={(e) => setMat(i, 'qty', e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="Ud." inputMode="decimal" aria-label="Cantidad" />
              <input className="input-apple" style={{ flex: '0 0 100px', width: 100 }} value={m.price} onChange={(e) => setMat(i, 'price', e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="€ / ud." inputMode="decimal" aria-label="Precio por unidad" />
              <button type="button" onClick={() => setMaterials(materials.filter((_, j) => j !== i))} style={iconBtn} aria-label="Quitar material" disabled={materials.length === 1}><Trash2 size={14} /></button>
            </div>
          ))}
          <button type="button" style={{ ...linkBtn, justifySelf: 'start', fontSize: 13 }} onClick={() => setMaterials([...materials, { name: '', qty: '1', price: '' }])}><Plus size={13} /> Añadir material</button>
        </div>
      </Field>
      <div style={grid3}>
        <Field label="Mano de obra (horas)"><input className="input-apple" inputMode="decimal" value={laborHours} onChange={(e) => setLaborHours(e.target.value.replace(/[^0-9.,]/g, ''))} /></Field>
        <Field label="Mano de obra (€)"><input className="input-apple" inputMode="decimal" value={laborPrice} onChange={(e) => setLaborPrice(e.target.value.replace(/[^0-9.,]/g, ''))} /></Field>
        <Field label="Materiales (€)" help={!materialsPrice && matSum ? `Suma de líneas: ${eur(matSum)}` : undefined}><input className="input-apple" inputMode="decimal" value={materialsPrice} placeholder={matSum ? String(Math.round(matSum * 100) / 100) : ''} onChange={(e) => setMaterialsPrice(e.target.value.replace(/[^0-9.,]/g, ''))} /></Field>
      </div>
      <div style={{ ...grid3, alignItems: 'end' }}>
        <Field label="Precio total (€)" help={!totalTouched ? 'Se calcula solo; puedes cambiarlo' : undefined}>
          <input className="input-apple" inputMode="decimal" required value={totalTouched ? total : suggestedTotal ? String(suggestedTotal) : ''} onChange={(e) => { setTotal(e.target.value.replace(/[^0-9.,]/g, '')); setTotalTouched(true) }} />
        </Field>
        <div style={{ fontSize: 13, color: '#3A3A3C', paddingBottom: 10 }}>{discountable ? <>Descuento de la visita: <strong>−{eur(discount || Number(v.fee))}</strong> <span style={hint}>(automático)</span></> : <span style={hint}>Sin descuento de visita</span>}</div>
        <div style={{ fontSize: 13, paddingBottom: 10 }}>Total para el cliente: <strong style={{ fontSize: 17 }}>{eur(due)}</strong></div>
      </div>
      <div style={grid3}>
        <Field label="Tiempo de trabajo"><input className="input-apple" value={workTime} onChange={(e) => setWorkTime(e.target.value)} placeholder="2 horas, 1 día…" maxLength={300} /></Field>
        <Field label="Disponibilidad"><input className="input-apple" value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Esta semana, a partir del…" maxLength={300} /></Field>
        <Field label="Garantía"><input className="input-apple" value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="1 año en mano de obra y piezas" maxLength={300} /></Field>
      </div>
      <Field label="Fotos del diagnóstico (recomendado)"><MediaPicker prefix={`visits/${v.id}/final`} value={photos} onChange={setPhotos} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 180px', gap: 10 }}>
        <Field label="Condiciones"><textarea className="input-apple" rows={2} value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Validez, pagos, anulación, homologación si aplica…" style={{ resize: 'vertical' }} /></Field>
        <Field label="Válido hasta"><input type="date" className="input-apple" value={validUntil} min={plusDays(0)} onChange={(e) => setValidUntil(e.target.value)} /></Field>
      </div>
      <div><button className="btn-pill btn-primary" disabled={busy || !effTotal}><Send size={15} /> {initial ? 'Reenviar presupuesto corregido' : 'Enviar presupuesto final'}</button></div>
    </form>
  )
}

function FinalQuoteView({ f }: { f: QFinal }) {
  const has = (x: unknown) => x != null && x !== ''
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <Row label="Diagnóstico">{f.diagnosis}</Row>
      <Row label="Solución propuesta">{f.solution}</Row>
      {f.materials?.length > 0 && (
        <Row label="Materiales">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><tbody>
            {f.materials.map((m, i) => <tr key={i} style={{ borderBottom: '1px solid #F2F2F7' }}><td style={{ padding: '4px 0' }}>{m.name}</td><td style={{ padding: '4px 6px', color: '#86868B' }}>{m.qty != null ? `× ${m.qty}` : ''}</td><td style={{ padding: '4px 0', textAlign: 'right' }}>{m.price != null ? eur(m.price) : ''}</td></tr>)}
          </tbody></table>
        </Row>
      )}
      {(has(f.labor_hours) || has(f.labor_price)) && <Row label="Mano de obra">{has(f.labor_hours) && `${Number(f.labor_hours)} h`}{has(f.labor_hours) && has(f.labor_price) && ' · '}{has(f.labor_price) && eur(f.labor_price)}</Row>}
      {has(f.materials_price) && <Row label="Precio materiales">{eur(f.materials_price)}</Row>}
      <Row label="Precio total">{eur(f.total_price)}</Row>
      {Number(f.visit_discount) > 0 && <Row label="Descuento de la visita"><span style={{ color: '#1E8E3E' }}>−{eur(f.visit_discount)}</span></Row>}
      <Row label="Total a pagar"><strong style={{ fontSize: 22 }}>{eur(f.amount_due)}</strong></Row>
      {f.work_time && <Row label="Tiempo de trabajo">{f.work_time}</Row>}
      {f.availability && <Row label="Disponibilidad">{f.availability}</Row>}
      {f.warranty && <Row label="Garantía">{f.warranty}</Row>}
      {f.photos?.length > 0 && <Row label="Fotos"><Thumbs urls={f.photos} /></Row>}
      {f.conditions && <Row label="Condiciones"><span style={{ color: '#3A3A3C' }}>{f.conditions}</span></Row>}
      {f.valid_until && <Row label="Válido hasta">{new Date(f.valid_until).toLocaleDateString('es-ES')}</Row>}
    </div>
  )
}

function FinalSentWorkshop({ item, v, run, busy }: { item: QItem; v: QVisit | null; run: Run; busy: boolean }) {
  const [editing, setEditing] = useState(false)
  return (
    <Card title={`Presupuesto final enviado${item.final!.version > 1 ? ` · v${item.final!.version}` : ''} · esperando al cliente`} icon={<Euro size={16} />}>
      {!editing && <FinalQuoteView f={item.final!} />}
      {v && <button type="button" className="btn-pill btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setEditing(!editing)}>{editing ? 'Cancelar edición' : 'Editar y reenviar (p. ej. tras una aclaración)'}</button>}
      {editing && v && <FinalQuoteForm v={v} initial={item.final} busy={busy} onSubmit={async (b) => { const ok = await run('send_final', b, 'Presupuesto corregido enviado'); if (ok) setEditing(false); return ok }} />}
    </Card>
  )
}

function ContractSummary({ item }: { item: QItem }) {
  const direct = [...item.quotes].reverse().find((q) => q.response_type === 'direct' && q.price != null)
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {item.final ? <><Row label="Importe acordado"><strong style={{ fontSize: 20 }}>{eur(item.final.amount_due)}</strong>{Number(item.final.visit_discount) > 0 && <span style={hint}> (ya descontados {eur(item.final.visit_discount)} de la visita)</span>}</Row>
        <Row label="Trabajo">{item.final.solution}</Row>{item.final.availability && <Row label="Disponibilidad">{item.final.availability}</Row>}</>
        : direct && <Row label="Importe acordado"><strong style={{ fontSize: 20 }}>{eur(direct.price)}</strong></Row>}
      {item.counterpart.phone && <Row label="Teléfono"><a href={`tel:${item.counterpart.phone}`} style={{ color: '#0071E3' }}>{item.counterpart.phone}</a></Row>}
      <p style={hint}>El pago del trabajo se acuerda con el taller (el pago dentro de ExhaustMarket llegará con el monedero).</p>
    </div>
  )
}

function ClosedCard({ item }: { item: QItem }) {
  return (
    <Card title={statusLabel(item.status, item.role)} icon={<History size={16} />} tone="gray">
      {item.closed_reason ? <p style={p}>{item.closed_reason}</p> : <p style={hint}>{item.role === 'client' ? STATUS_META[item.status]?.client : STATUS_META[item.status]?.workshop}</p>}
      {item.visit?.claim_status && <Notice tone={item.visit.claim_status === 'abierta' ? 'orange' : 'gray'}>
        Reclamación {item.visit.claim_status}{item.visit.claim_resolution ? `: ${item.visit.claim_resolution}` : ''}{item.visit.claim_refund ? ' · importe devuelto' : ''}
      </Notice>}
      {item.rating && <p style={{ ...hint, marginTop: 8 }}>Valoración: <RatingBadge r={{ avg: Number(item.rating.overall), count: 1 }} hideCount /></p>}
    </Card>
  )
}

// ── formularios pequeños ──
function DirectQuoteForm({ busy, onSubmit }: { busy: boolean; onSubmit: (b: Record<string, unknown>) => Promise<boolean> }) {
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [valid, setValid] = useState(plusDays(30))
  return (
    <form onSubmit={(e) => { e.preventDefault(); void onSubmit({ price: Number(price.replace(',', '.')), notes, valid_until: valid }) }} style={{ display: 'grid', gap: 10 }}>
      <div style={grid3}>
        <Field label="Precio (€)"><input className="input-apple" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="450" /></Field>
        <Field label="Válido hasta"><input type="date" className="input-apple" value={valid} min={plusDays(0)} onChange={(e) => setValid(e.target.value)} required /></Field>
      </div>
      <Field label="Detalle"><textarea className="input-apple" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Qué incluye, plazos, garantía…" style={{ resize: 'vertical' }} /></Field>
      <div><button className="btn-pill btn-primary" disabled={busy || !price}><Send size={15} /> Enviar presupuesto</button></div>
    </form>
  )
}

function CompleteInfoForm({ item, busy, onSubmit }: { item: QItem; busy: boolean; onSubmit: (b: Record<string, unknown>) => Promise<boolean> }) {
  const [msg, setMsg] = useState('')
  const [media, setMedia] = useState<string[]>([])
  return (
    <form onSubmit={async (e) => { e.preventDefault(); if (await onSubmit({ message: msg, media_urls: media })) { setMsg(''); setMedia([]) } }} style={{ display: 'grid', gap: 10, marginTop: 10 }}>
      <Field label="Tu respuesta"><textarea className="input-apple" rows={3} required value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={4000} style={{ resize: 'vertical' }} /></Field>
      <Field label="Fotos / vídeos (opcional)"><MediaPicker prefix={`quotes/${item.id}/info`} value={media} onChange={setMedia} /></Field>
      <div><button className="btn-pill btn-primary" disabled={busy || !msg.trim()}><Send size={15} /> Enviar al taller</button></div>
    </form>
  )
}

function TextForm({ label, placeholder, cta, busy, onSubmit, danger, required }: { label: string; placeholder?: string; cta: string; busy: boolean; onSubmit: (text: string) => Promise<boolean>; danger?: boolean; required?: boolean }) {
  const [text, setText] = useState('')
  return (
    <form onSubmit={async (e) => { e.preventDefault(); if (await onSubmit(text)) setText('') }} style={{ display: 'grid', gap: 8 }}>
      <Field label={label}><textarea className="input-apple" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} required={required} maxLength={2000} style={{ resize: 'vertical' }} /></Field>
      <div><button className="btn-pill btn-sm" disabled={busy || (required && !text.trim())} style={danger ? dangerBtn : { background: '#0071E3', color: '#fff' }}>{cta}</button></div>
    </form>
  )
}

function DecisionButtons({ busy, acceptLabel, onAccept, onReject, onAsk, askLabel, rejectHint }: {
  busy: boolean; acceptLabel: string; onAccept: () => Promise<boolean>; onReject: (reason: string) => Promise<boolean>; onAsk: () => void; askLabel: string; rejectHint?: string
}) {
  const [rejecting, setRejecting] = useState(false)
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-pill" disabled={busy} onClick={() => { if (window.confirm('¿Aceptar este presupuesto? Pasará a trabajo contratado.')) void onAccept() }} style={{ background: '#34C759', color: '#fff' }}><CheckCircle2 size={15} /> {acceptLabel}</button>
        <button className="btn-pill btn-secondary" disabled={busy} onClick={() => setRejecting(!rejecting)}>Rechazar</button>
        <button className="btn-pill btn-secondary" onClick={onAsk}><MessageSquare size={14} /> {askLabel}</button>
      </div>
      {rejecting && <div style={{ marginTop: 10 }}>{rejectHint && <p style={hint}>{rejectHint}</p>}<TextForm label="Motivo (opcional)" cta="Rechazar presupuesto" danger busy={busy} onSubmit={onReject} /></div>}
    </div>
  )
}

function WithdrawButton({ run, busy }: { run: Run; busy: boolean }) {
  return <button disabled={busy} style={{ ...linkBtn, fontSize: 13, color: '#D70015', marginTop: 4 }} onClick={() => { if (window.confirm('¿Retirar la solicitud a este taller?')) void run('withdraw', {}, 'Solicitud retirada') }}>Retirar solicitud</button>
}
function CancelVisitButton({ run, busy }: { run: Run; busy: boolean }) {
  return <button disabled={busy} style={{ ...linkBtn, fontSize: 13, color: '#D70015' }} onClick={() => { const r = window.prompt('¿Cancelar la cita? Puedes indicar el motivo (opcional):', ''); if (r !== null) void run('cancel_visit', { reason: r || null }, 'Cita cancelada') }}>Cancelar la cita</button>
}

function ClaimCard({ run, busy }: { run: Run; busy: boolean }) {
  return <Card title="¿Algún problema con la visita?" icon={<AlertTriangle size={16} />} tone="gray"><Collapsible label="Abrir una reclamación"><ClaimForm run={run} busy={busy} /></Collapsible></Card>
}
function ClaimForm({ run, busy }: { run: Run; busy: boolean }) {
  return <TextForm label="Cuéntanos qué pasó" placeholder="Ej.: el taller estaba cerrado a la hora de la cita" cta="Enviar reclamación" required busy={busy} onSubmit={(reason) => run('open_claim', { reason }, 'Reclamación enviada: la revisaremos')} />
}

// ── valoración tras visita (apartado 13) ──
function RatingCard({ run, busy }: { run: Run; busy: boolean }) {
  const crit = [['trato', 'Trato'], ['puntualidad', 'Puntualidad'], ['claridad', 'Claridad'], ['profesionalidad', 'Profesionalidad'], ['instalaciones', 'Instalaciones']] as const
  const [vals, setVals] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const complete = crit.every(([k]) => vals[k])
  return (
    <Card title="Valora al taller" icon={<Star size={16} />}>
      <p style={hint}>Tu valoración ayuda a otros clientes. Solo cuenta si la visita o el trabajo se realizaron de verdad.</p>
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {crit.map(([k, l]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 120, fontSize: 13.5 }}>{l}</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${l}: ${n}`} onClick={() => setVals({ ...vals, [k]: n })} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer' }}>
                <Star size={20} fill={(vals[k] ?? 0) >= n ? '#FFB800' : 'none'} color={(vals[k] ?? 0) >= n ? '#FFB800' : '#C7C7CC'} />
              </button>
            ))}
          </div>
        ))}
      </div>
      <textarea className="input-apple" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentario (opcional)" maxLength={2000} style={{ marginTop: 10, resize: 'vertical' }} />
      <div style={{ marginTop: 10 }}><button className="btn-pill btn-primary btn-sm" disabled={busy || !complete} onClick={() => void run('rate', { ...vals, comment }, '¡Gracias por tu valoración!')}>Enviar valoración</button></div>
    </Card>
  )
}

// ─────────────────────────────── datos, conversación, historial ───────────────────────────────
function RequestInfo({ item }: { item: QItem }) {
  const cp = item.counterpart
  return (
    <Card title="Datos de la solicitud" icon={<Wrench size={16} />} tone="gray">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        <Row label="Vehículo">{item.car_model} ({item.car_year})</Row>
        {item.exhaust_zone && <Row label="Zona del escape">{item.exhaust_zone}</Row>}
        {item.work_type && <Row label="Tipo de trabajo">{item.work_type}</Row>}
        {item.location && <Row label="Ubicación">{item.location}</Row>}
        {item.budget_preference && <Row label="Preferencia">{item.budget_preference}</Row>}
        <Row label={item.role === 'client' ? 'Taller' : 'Cliente'}>{cp.name}{item.role === 'client' && <> <RatingBadge r={cp.rating} />{cp.offers_free_visit && <span style={freeBadge}>Visita gratuita</span>}</>}</Row>
      </div>
      <div style={{ marginTop: 10 }}><Row label="Descripción"><span style={{ whiteSpace: 'pre-wrap' }}>{item.specifications}</span></Row></div>
      {item.media_urls?.length > 0 && <div style={{ marginTop: 10 }}><Row label="Fotos / vídeos"><Thumbs urls={item.media_urls} /></Row></div>}
    </Card>
  )
}

function Conversation({ item, run, busy, composerRef }: { item: QItem; run: Run; busy: boolean; composerRef: React.MutableRefObject<HTMLTextAreaElement | null> }) {
  const [msg, setMsg] = useState('')
  const closed = item.status === 'cancelled'
  return (
    <Card title={`Conversación${item.messages.length ? ` (${item.messages.length})` : ''}`} icon={<MessageSquare size={16} />} tone="gray">
      {item.messages.length === 0 && <p style={hint}>Aún no hay mensajes. Si tienes dudas, pregunta aquí: queda registrado para ambas partes.</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {item.messages.map((m) => {
          const mine = m.author_role === item.role
          return (
            <div key={m.id} style={{ justifySelf: mine ? 'end' : 'start', maxWidth: '85%', background: mine ? '#0071E3' : '#F2F2F7', color: mine ? '#fff' : '#1D1D1F', borderRadius: 14, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2 }}>{m.author_role === 'client' ? 'Cliente' : m.author_role === 'workshop' ? 'Taller' : 'ExhaustMarket'} · {fmtShort(m.created_at)}</div>
              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.body}</div>
              {m.media?.length > 0 && <div style={{ marginTop: 6 }}><Thumbs urls={m.media} /></div>}
            </div>
          )
        })}
      </div>
      {!closed && (
        <form onSubmit={async (e) => { e.preventDefault(); if (msg.trim() && (await run('message', { message: msg }))) setMsg('') }} style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
          <textarea ref={composerRef} className="input-apple" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={4000} placeholder={item.role === 'client' ? 'Escribe al taller…' : 'Escribe al cliente…'} style={{ resize: 'vertical' }} />
          <button className="btn-pill btn-primary btn-sm" disabled={busy || !msg.trim()} aria-label="Enviar mensaje"><Send size={14} /></button>
        </form>
      )}
    </Card>
  )
}

function Timeline({ item }: { item: QItem }) {
  const [open, setOpen] = useState(false)
  const events = useMemo(() => item.events.filter((e) => e.type !== 'message'), [item.events])
  if (!events.length) return null
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6E6E73', fontSize: 13, padding: 0 }}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} <History size={14} /> Historial ({events.length})
      </button>
      {open && (
        <ol style={{ listStyle: 'none', margin: '8px 0 0', padding: '0 0 0 14px', borderLeft: '2px solid #E5E5EA', display: 'grid', gap: 8 }}>
          {events.map((e) => (
            <li key={e.id} style={{ fontSize: 13 }}>
              <span style={{ color: '#86868B', fontSize: 12 }}>{fmtShort(e.created_at)} · {e.actor_role === 'client' ? 'Cliente' : e.actor_role === 'workshop' ? 'Taller' : e.actor_role === 'admin' ? 'ExhaustMarket' : 'Sistema'}</span>
              <div style={{ color: '#1D1D1F' }}>{eventLabel(e.type, e.data)}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// ─────────────────────────────── piezas ───────────────────────────────
function VisitSummary({ v }: { v: QVisit }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Row label="Motivo">{reasonText(v)}</Row>
      <Row label="Duración">{v.duration_min} minutos</Row>
      <Row label="Coste">{costLabel(v)} <span style={hint}>· {PRICING_LABEL[v.pricing]}</span></Row>
      {v.slots?.length > 0 && <Row label="Franjas propuestas">{v.slots.map((s) => <div key={s}>{fmtDateTime(s)}</div>)}</Row>}
      {v.conditions && <Row label="Condiciones"><span style={{ color: '#3A3A3C' }}>{v.conditions}</span></Row>}
    </div>
  )
}
function DoneNotes({ v }: { v: QVisit }) {
  if (!v.done_notes && !v.done_photos?.length) return <p style={hint}>Visita realizada el {fmtShort(v.done_at)}.</p>
  return (
    <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
      <p style={hint}>Visita realizada el {fmtShort(v.done_at)}.</p>
      {v.done_notes && <Row label="Notas de la revisión">{v.done_notes}</Row>}
      {v.done_photos?.length > 0 && <Row label="Fotos"><Thumbs urls={v.done_photos} /></Row>}
    </div>
  )
}
function reasonText(v: QVisit) {
  const list = (v.reasons ?? []).filter((r) => r !== 'otro').map((r) => VISIT_REASONS[r] ?? r)
  if (v.reason_other) list.push(v.reason_other)
  return list.join(' · ') || '—'
}
function lastFrom(item: QItem, role: 'client' | 'workshop') { return [...item.messages].reverse().find((m) => m.author_role === role)?.body ?? null }

export function RatingBadge({ r, hideCount }: { r?: { avg: number; count: number } | null; hideCount?: boolean }) {
  if (!r || !r.count) return <span style={{ ...hint, fontSize: 12 }}>· sin valoraciones</span>
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, color: '#1D1D1F' }}><Star size={12} fill="#FFB800" color="#FFB800" /> {r.avg.toFixed(1)}{!hideCount && <span style={{ color: '#86868B' }}>({r.count})</span>}</span>
}

function MediaPicker({ prefix, value, onChange }: { prefix: string; value: string[]; onChange: (v: string[]) => void }) {
  return <PhotoUploader schemaId={prefix} coverUrl={value[0] ?? null} galleryUrls={value.slice(1)} onChange={({ coverUrl, galleryUrls }) => onChange([...(coverUrl ? [coverUrl] : []), ...galleryUrls])} />
}
function Thumbs({ urls }: { urls: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E5EA' }} /></a>)}
    </div>
  )
}
function Card({ title, icon, tone, children }: { title: string; icon?: React.ReactNode; tone?: 'blue' | 'green' | 'red' | 'orange' | 'gray'; children: React.ReactNode }) {
  const border = { blue: '#BFD8FF', green: '#B7E8C4', red: '#FFC9C5', orange: '#FFE0A8', gray: '#E5E5EA' }[tone ?? 'gray']
  return (
    <section style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: 7 }}>{icon}{title}</h4>
      {children}
    </section>
  )
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ minWidth: 0 }}><div style={{ fontSize: 11, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div><div style={{ fontSize: 14, color: '#1D1D1F', overflowWrap: 'anywhere' }}>{children}</div></div>
}
function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 5, minWidth: 0 }}><span style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>{label}</span>{children}{help && <span style={hint}>{help}</span>}</label>
}
function Quote({ text }: { text: string }) {
  return <blockquote style={{ margin: 0, padding: '6px 10px', borderLeft: '3px solid #0071E3', background: '#F5F8FF', borderRadius: 6, fontSize: 13.5, color: '#3A3A3C', whiteSpace: 'pre-wrap' }}>{text}</blockquote>
}
function Notice({ tone, children }: { tone: 'blue' | 'orange' | 'red' | 'gray'; children: React.ReactNode }) {
  const c = { blue: ['#F5F8FF', '#1D3A6B'], orange: ['#FFF8E6', '#8A5A00'], red: ['#FEEDEC', '#B91C1C'], gray: ['#F5F5F7', '#3A3A3C'] }[tone]
  return <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: c[0], color: c[1], fontSize: 12.5 }}>{children}</div>
}
function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" style={{ ...linkBtn, fontSize: 13 }} onClick={() => setOpen(!open)}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {label}</button>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  )
}

function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }
function plusDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
function localNow() { const d = new Date(Date.now() + 30 * 60_000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }

const p: React.CSSProperties = { fontSize: 14, color: '#3A3A3C', margin: 0, lineHeight: 1.5 }
const hint: React.CSSProperties = { fontSize: 12.5, color: '#86868B', margin: 0, lineHeight: 1.45 }
const chip: React.CSSProperties = { padding: '6px 11px', borderRadius: 999, border: '1px solid #D2D2D7', background: '#fff', fontSize: 12.5, cursor: 'pointer', color: '#3A3A3C' }
const chipOn: React.CSSProperties = { background: '#0071E3', color: '#fff', borderColor: '#0071E3' }
const iconBtn: React.CSSProperties = { width: 32, height: 38, border: '1px solid #E5E5EA', borderRadius: 8, background: '#fff', color: '#D70015', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const dangerBtn: React.CSSProperties = { background: 'transparent', color: '#D70015', border: '1px solid #D70015' }
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }
const freeBadge: React.CSSProperties = { marginLeft: 6, fontSize: 11, fontWeight: 600, color: '#1E8E3E', background: '#E8F7EE', borderRadius: 999, padding: '2px 7px' }
const linkBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#0071E3', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }
