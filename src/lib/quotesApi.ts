import { adminFetch } from './adminApi'

/**
 * Cliente del flujo de presupuestos + visita de diagnóstico (/api/quotes). Toda escritura pasa por
 * el servidor (máquina de estados); aquí solo hay tipos, etiquetas y llamadas.
 */

export type QStatus =
  | 'pending' | 'info_requested' | 'quoted' | 'visit_requested' | 'visit_accepted' | 'visit_rejected' | 'visit_scheduled'
  | 'client_no_show' | 'visit_done' | 'final_sent' | 'contracted' | 'final_rejected' | 'rejected' | 'closed' | 'cancelled'
export type QRole = 'client' | 'workshop'

export interface QVisit {
  id: string; reasons: string[]; reason_other: string | null; explanation: string; duration_min: number
  pricing: 'gratis' | 'pago' | 'descontable'; fee: string | number; slots: string[]; conditions: string | null
  status: 'propuesta' | 'aceptada' | 'rechazada' | 'programada' | 'realizada' | 'cliente_no_presentado' | 'cancelada'
  conditions_accepted_at: string | null; rejected_reason: string | null; scheduled_at: string | null; reschedule_count: number
  fee_status: 'no_aplica' | 'pendiente' | 'cobrado' | 'devuelto'; done_at: string | null; done_notes: string | null; done_photos: string[]
  no_show_at: string | null; claim_status: 'abierta' | 'resuelta' | null; claim_reason: string | null; claim_resolution: string | null; claim_refund: boolean | null
}
export interface QMaterial { name: string; qty: number | null; price: number | null }
export interface QFinal {
  id: string; diagnosis: string; solution: string; materials: QMaterial[]; labor_hours: string | null; labor_price: string | null
  materials_price: string | null; total_price: string; visit_discount: string; amount_due: string; work_time: string | null
  availability: string | null; warranty: string | null; photos: string[]; conditions: string | null; valid_until: string | null
  status: 'enviado' | 'aceptado' | 'rechazado'; decided_at: string | null; decision_reason: string | null; version: number; updated_at: string
}
export interface QItem {
  id: string; role: QRole; status: QStatus; request_group_id: string | null; created_at: string; updated_at: string
  car_model: string; car_year: number; service_type: string; specifications: string; exhaust_zone: string | null; work_type: string | null
  location: string | null; budget_preference: string | null; media_urls: string[]; closed_reason: string | null
  counterpart: { id: string; name: string; address?: string | null; phone?: string | null; offers_free_visit?: boolean; rating?: { avg: number; count: number } | null; distance_km?: number | null }
  visit: QVisit | null; final: QFinal | null
  quotes: { id: string; price: string | null; notes: string | null; valid_until: string; response_type: string; created_at: string }[]
  messages: { id: string; author_role: 'client' | 'workshop' | 'admin'; body: string; media: string[]; created_at: string }[]
  events: { id: number; actor_role: string; type: string; data: Record<string, any> | null; created_at: string }[]
  rating: { overall: string; trato: number; puntualidad: number; claridad: number; profesionalidad: number; instalaciones: number; comment: string | null } | null
}
export interface WorkshopOpt { id: string; name: string; address: string | null; offers_free_visit: boolean; rating: { avg: number; count: number } | null; distance_km: number | null }

export const quotesApi = {
  list: (role: QRole) => adminFetch<{ items: QItem[]; me: { id: string; offers_free_visit: boolean } }>('/api/quotes', { query: { op: 'list', role } }),
  workshops: () => adminFetch<{ items: WorkshopOpt[] }>('/api/quotes', { query: { op: 'workshops' } }),
  act: (action: string, body: Record<string, unknown> = {}) => adminFetch<{ ok: boolean; status?: QStatus; ids?: string[] }>('/api/quotes', { method: 'POST', body: { action, ...body } }),
  adminVisits: () => adminFetch<{ items: Record<string, any>[] }>('/api/quotes', { query: { op: 'admin_visits' } }),
}

type Tone = 'orange' | 'blue' | 'green' | 'red' | 'gray'
/** Estados del PDF (apartado 11) + qué le toca hacer a cada parte. */
export const STATUS_META: Record<QStatus, { label: string; tone: Tone; client: string; workshop: string; clientLabel?: string }> = {
  pending: { label: 'Pendiente de respuesta', tone: 'orange', client: 'Esperando a que el taller responda.', workshop: 'Responde: presupuesto directo, pedir información, solicitar visita o rechazar.' },
  info_requested: { label: 'Información solicitada', tone: 'orange', client: 'El taller necesita más información: respóndele.', workshop: 'Esperando a que el cliente complete la información.' },
  quoted: { label: 'Presupuesto enviado', clientLabel: 'Presupuesto recibido', tone: 'blue', client: 'Acepta, rechaza o pregunta al taller.', workshop: 'Esperando la decisión del cliente.' },
  visit_requested: { label: 'Visita solicitada', tone: 'blue', client: 'El taller propone una visita de diagnóstico: revisa el coste y las condiciones.', workshop: 'Esperando a que el cliente acepte la visita.' },
  visit_accepted: { label: 'Visita aceptada', tone: 'blue', client: 'El taller fijará la fecha y hora de la cita.', workshop: 'Fija la fecha y hora de la cita.' },
  visit_rejected: { label: 'Visita rechazada', tone: 'gray', client: 'Puedes enviar la solicitud a otro taller.', workshop: 'El cliente no aceptó la visita. Puedes proponer otra.' },
  visit_scheduled: { label: 'Cita programada', tone: 'green', client: 'Acude al taller el día de la cita.', workshop: 'Tras revisar el coche, marca la visita como realizada.' },
  client_no_show: { label: 'Cliente no presentado', tone: 'red', client: 'El taller indica que no acudiste. Si es un error, reclama.', workshop: 'Puedes reagendar una vez.' },
  visit_done: { label: 'Visita realizada', tone: 'blue', client: 'El taller está preparando tu presupuesto final.', workshop: 'Rellena y envía el presupuesto final.' },
  final_sent: { label: 'Presupuesto final enviado', clientLabel: 'Presupuesto final recibido', tone: 'blue', client: 'Acepta, rechaza o pide una aclaración.', workshop: 'Esperando la decisión del cliente.' },
  contracted: { label: 'Trabajo contratado', tone: 'green', client: 'Coordina el trabajo con el taller.', workshop: 'Cuando termines el trabajo, ciérralo.' },
  final_rejected: { label: 'Presupuesto rechazado', tone: 'gray', client: 'Has rechazado el presupuesto.', workshop: 'El cliente rechazó el presupuesto.' },
  rejected: { label: 'Rechazada por el taller', tone: 'gray', client: 'Tu solicitud sigue activa para los demás talleres.', workshop: 'Rechazaste esta solicitud.' },
  closed: { label: 'Cerrado', tone: 'gray', client: 'Proceso finalizado.', workshop: 'Proceso finalizado.' },
  cancelled: { label: 'Retirada', tone: 'gray', client: 'Solicitud retirada.', workshop: 'El cliente retiró la solicitud.' },
}
export const statusLabel = (s: QStatus, role: QRole) => (role === 'client' ? STATUS_META[s]?.clientLabel : undefined) ?? STATUS_META[s]?.label ?? s

/** Lista cerrada de motivos (apartado 7 del PDF) — mismos códigos que el servidor. */
export const VISIT_REASONS: Record<string, string> = {
  elevador: 'Necesito subirlo a elevador', faltan_fotos: 'Faltan fotos o vídeos', medir: 'Necesito medir diámetros',
  fugas: 'Revisar fugas', soldaduras: 'Revisar soldaduras', anclajes: 'Comprobar anclajes / silentblocks',
  valvulas: 'Revisar válvulas / electrónica', espacio: 'Comprobar espacio disponible', otro: 'Otro',
}
export const PRICING_LABEL: Record<string, string> = { gratis: 'Gratis', pago: 'De pago', descontable: 'Descontable si aceptas el presupuesto final' }
export const FEE_STATUS_LABEL: Record<string, string> = { no_aplica: 'Sin coste', pendiente: 'Pendiente de cobro', cobrado: 'Cobrado', devuelto: 'Devuelto' }

export const eur = (v: number | string | null | undefined) => (v == null || v === '' ? '—' : Number(v).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }))
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—'
export const fmtShort = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—')
export function costLabel(v: Pick<QVisit, 'pricing' | 'fee'>) {
  if (v.pricing === 'gratis') return 'Gratis'
  if (v.pricing === 'pago') return eur(v.fee)
  return `${eur(v.fee)} descontables si aceptas el presupuesto final`
}

/** Textos sugeridos del PDF (apartado 15), editables por el taller. */
export const suggestedExplanation = (minutes: number) =>
  `Para poder darte un presupuesto real y evitar errores, necesitamos revisar el vehículo presencialmente y subirlo a elevador. La visita tendrá una duración estimada de ${minutes} minutos. Después de la revisión te enviaremos un presupuesto final desde ExhaustMarket.`
export const suggestedConditions = (pricing: string) =>
  pricing === 'gratis'
    ? 'La visita de diagnóstico es gratuita. Después de la revisión te enviaremos un presupuesto final sin compromiso.'
    : pricing === 'descontable'
      ? 'El importe de la visita corresponde al tiempo de diagnóstico del taller. Si aceptas el presupuesto final, este importe se descuenta del total. Si no aceptas el presupuesto, el taller conserva el importe de la visita siempre que la revisión se haya realizado.'
      : 'El importe de la visita corresponde al tiempo de diagnóstico del taller y no se devuelve si no aceptas el presupuesto final, siempre que la revisión se haya realizado.'

/** Evento del historial → texto legible. */
export function eventLabel(type: string, data: Record<string, any> | null): string {
  const d = data ?? {}
  switch (type) {
    case 'created': return 'Solicitud enviada'
    case 'info_requested': return 'El taller pidió más información'
    case 'info_completed': return 'El cliente completó la información'
    case 'direct_quote': return `Presupuesto directo: ${eur(d.price)}`
    case 'visit_proposed': return `Visita propuesta · ${d.duration_min} min · ${d.pricing === 'gratis' ? 'gratis' : eur(d.fee) + (d.pricing === 'descontable' ? ' descontables' : '')}`
    case 'visit_rescheduled': return 'Nueva cita propuesta (reagendado)'
    case 'visit_accepted': return `Visita aceptada (coste y condiciones aceptados)${d.scheduled_at ? ` · cita ${fmtShort(d.scheduled_at)}` : ''}`
    case 'visit_rejected': return 'Visita rechazada por el cliente'
    case 'visit_scheduled': return `Cita programada · ${fmtShort(d.scheduled_at)}`
    case 'visit_cancelled': return 'Visita cancelada por el cliente'
    case 'client_no_show': return 'Cliente no presentado'
    case 'visit_done': return `Visita realizada${d.fee_status === 'cobrado' ? ' · importe cobrado' : ''}`
    case 'final_sent': return `Presupuesto final enviado · ${eur(d.amount_due)}`
    case 'final_resent': return `Presupuesto final corregido (v${d.version}) · ${eur(d.amount_due)}`
    case 'final_accepted': return `Presupuesto aceptado · ${eur(d.amount_due)}`
    case 'final_rejected': return 'Presupuesto final rechazado'
    case 'direct_accepted': return 'Presupuesto aceptado'
    case 'direct_rejected': return 'Presupuesto rechazado'
    case 'declined': return 'El taller rechazó la solicitud'
    case 'withdrawn': return d.reason === 'El cliente eligió otro taller' ? 'Retirada: el cliente eligió otro taller' : 'Solicitud retirada por el cliente'
    case 'message': return 'Mensaje'
    case 'claim_opened': return 'Reclamación abierta'
    case 'claim_resolved': return `Reclamación resuelta${d.refund ? ' · importe devuelto' : ''}`
    case 'rated': return `Valoración: ${Number(d.overall).toFixed(1)} / 5`
    case 'closed': return 'Trabajo finalizado'
    case 'reminder_sent': return 'Recordatorio de cita enviado'
    default: return type
  }
}

/** Fichero .ics para añadir la cita al calendario. */
export function downloadIcs(item: QItem) {
  const v = item.visit
  if (!v?.scheduled_at) return
  const start = new Date(v.scheduled_at)
  const end = new Date(start.getTime() + v.duration_min * 60_000)
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n')
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ExhaustMarket//Visitas//ES', 'BEGIN:VEVENT', `UID:${v.id}@exhaustmarket`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${esc(`Visita de diagnóstico · ${item.counterpart.name}`)}`,
    `DESCRIPTION:${esc(`${item.service_type} · ${item.car_model} (${item.car_year})`)}`, ...(item.counterpart.address ? [`LOCATION:${esc(item.counterpart.address)}`] : []),
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = 'visita-diagnostico.ics'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
