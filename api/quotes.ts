import { Pool } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'
import { randomUUID } from 'node:crypto'

/**
 * /api/quotes — Presupuestos + módulo de VISITA DE DIAGNÓSTICO (fases 1-4 del PDF
 * ExhaustMarket_modulo_visita_diagnostico.pdf). Self-contained (sin _lib).
 *
 * Toda escritura del flujo pasa por aquí (el facade /api/db ya no permite escribir quote_requests ni
 * quotes a no-admins): el servidor valida QUIÉN puede hacer QUÉ en CADA estado (máquina de estados),
 * bloquea la fila (FOR UPDATE) para evitar dobles aceptaciones, deja historial (quote_events: fechas,
 * importes, condiciones) y genera los avisos (notifications in-app + email si hay RESEND_API_KEY).
 *
 *   GET  ?op=list&role=client|workshop   solicitudes con visita, presupuesto final, mensajes, historial
 *   GET  ?op=workshops                    talleres seleccionables (+ valoración, visita gratis, distancia)
 *   GET  ?op=admin_visits                 (admin) visitas, cobros y reclamaciones
 *   GET  ?op=cron_reminders               (cron horario) recordatorio de cita ~24 h antes; idempotente
 *   POST { action, ... }                  acciones (ver HANDLERS)
 */

type Db = { query: (s: string, p?: unknown[]) => Promise<{ rows: any[] }> }
type Row = Record<string, any>
type Role = 'client' | 'workshop' | 'admin'
interface Me { id: string; type: string; isAdmin: boolean; name: string; lat: number | null; lon: number | null }
interface Notif { user_id: string; kind: string; title: string; body: string; link: string; email: boolean }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RECEIVER_TYPES = ['workshop', 'professional', 'premium']
const OPEN_EARLY = ['pending', 'info_requested', 'quoted', 'visit_requested', 'visit_accepted']

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente de respuesta del taller', info_requested: 'Información solicitada', quoted: 'Presupuesto directo enviado',
  visit_requested: 'Visita solicitada', visit_accepted: 'Visita aceptada por el cliente', visit_rejected: 'Visita rechazada por el cliente',
  visit_scheduled: 'Visita pendiente (cita programada)', client_no_show: 'Cliente no presentado', visit_done: 'Visita realizada',
  final_sent: 'Presupuesto final enviado', contracted: 'Trabajo contratado', final_rejected: 'Presupuesto rechazado',
  rejected: 'Rechazada por el taller', closed: 'Cerrado', cancelled: 'Retirada',
}
export const VISIT_REASONS: Record<string, string> = {
  elevador: 'Necesito subirlo a elevador', faltan_fotos: 'Faltan fotos o vídeos', medir: 'Necesito medir diámetros',
  fugas: 'Revisar fugas', soldaduras: 'Revisar soldaduras', anclajes: 'Comprobar anclajes / silentblocks',
  valvulas: 'Revisar válvulas / electrónica', espacio: 'Comprobar espacio disponible', otro: 'Otro',
}

class ActionError extends Error { constructor(public status: number, message: string) { super(message) } }
function fail(message: string, status = 400): never { throw new ActionError(status, message) }

// ───────────────────────── entrada ─────────────────────────
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const op = url.searchParams.get('op') ?? 'list'
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    if (op === 'cron_reminders') return json(await cronReminders(pool))
    const me = await getMe(req, pool)
    if (!me) return json({ error: 'No autenticado' }, 401)
    if (op === 'list') return json(await listFor(pool, me, url.searchParams.get('role') === 'workshop' ? 'workshop' : 'client'))
    if (op === 'workshops') return json(await listWorkshops(pool, me))
    if (op === 'admin_visits') {
      if (!me.isAdmin) return json({ error: 'Solo administradores' }, 403)
      return json(await adminVisits(pool))
    }
    return json({ error: 'op desconocida' }, 400)
  } catch (e) {
    console.error('quotes GET', e)
    return json({ error: (e as Error).message }, 500)
  } finally {
    await pool.end().catch(() => {})
  }
}

export async function POST(req: Request): Promise<Response> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const me = await getMe(req, pool)
    if (!me) return json({ error: 'No autenticado' }, 401)
    const body = (await req.json().catch(() => null)) as Row | null
    if (!body || typeof body !== 'object') return json({ error: 'JSON no válido' }, 400)
    const r = await runAction(pool, me, body)
    return json(r.body, r.status)
  } catch (e) {
    console.error('quotes POST', e)
    return json({ error: (e as Error).message }, 500)
  } finally {
    await pool.end().catch(() => {})
  }
}

// ───────────────────────── acciones ─────────────────────────
interface Ctx {
  db: Db; me: Me; role: Role; req: Row; visit: Row | null; final: Row | null
  notes: Notif[]; events: { type: string; data?: unknown }[]; names: { client: string; workshop: string }
}
interface Handler { roles: Role[]; from: string[] | '*'; run: (c: Ctx, b: Row) => Promise<Row | void> }

export async function runAction(pool: Pool, me: Me, body: Row): Promise<{ status: number; body: Row }> {
  const action = String(body.action ?? '')
  try {
    if (action === 'create_request') return { status: 200, body: { ok: true, ...(await createRequest(pool, me, body)) } }
    if (action === 'set_free_visit') {
      if (!RECEIVER_TYPES.includes(me.type)) fail('Solo talleres y profesionales.', 403)
      await pool.query(`UPDATE user_profiles SET offers_free_visit = $1 WHERE id = $2`, [body.enabled === true, me.id])
      return { status: 200, body: { ok: true, offers_free_visit: body.enabled === true } }
    }
    const h = HANDLERS[action]
    if (!h) fail(`Acción desconocida «${action}».`)
    const id = String(body.quote_request_id ?? '')
    if (!UUID_RE.test(id)) fail('quote_request_id no válido.')
    const client = await pool.connect()
    const ctx = { notes: [] as Notif[] } as Ctx
    let extra: Row = {}
    try {
      await client.query('BEGIN')
      const req = (await client.query(`SELECT * FROM quote_requests WHERE id = $1 FOR UPDATE`, [id])).rows[0] as Row | undefined
      if (!req) fail('No existe esa solicitud.', 404)
      const role: Role | null = req!.user_id === me.id ? 'client' : req!.target_user_id === me.id ? 'workshop' : me.isAdmin ? 'admin' : null
      if (!role) fail('No tienes acceso a esta solicitud.', 403)
      if (!h.roles.includes(role!)) fail(role === 'client' ? 'Esta acción la hace el taller.' : role === 'workshop' ? 'Esta acción la hace el cliente.' : 'Acción no disponible para el administrador.', 403)
      if (h.from !== '*' && !h.from.includes(req!.status)) fail(`No se puede hacer en el estado actual («${STATUS_LABEL[req!.status] ?? req!.status}»).`, 409)
      const visit = ((await client.query(`SELECT * FROM diagnostic_visits WHERE quote_request_id = $1 FOR UPDATE`, [id])).rows[0] ?? null) as Row | null
      const final = ((await client.query(`SELECT * FROM final_quotes WHERE quote_request_id = $1 FOR UPDATE`, [id])).rows[0] ?? null) as Row | null
      const people = (await client.query(`SELECT id, full_name, company_name FROM user_profiles WHERE id = ANY($1)`, [[req!.user_id, req!.target_user_id]])).rows as Row[]
      const nameOf = (pid: string) => { const p = people.find((x) => x.id === pid); return (p?.company_name || p?.full_name || 'Usuario') as string }
      Object.assign(ctx, { db: client, me, role, req, visit, final, events: [], names: { client: nameOf(req!.user_id), workshop: nameOf(req!.target_user_id) } })
      const out = await h.run(ctx, body)
      if (out) extra = out
      for (const ev of ctx.events) {
        await client.query(`INSERT INTO quote_events (quote_request_id, actor_id, actor_role, type, data) VALUES ($1,$2,$3,$4,$5)`,
          [id, me.id, role, ev.type, ev.data == null ? null : JSON.stringify(ev.data)])
      }
      await insertNotes(client, ctx.notes)
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      throw e
    } finally { client.release() }
    await sendEmails(pool, ctx.notes)
    return { status: 200, body: { ok: true, status: ctx.req.status, ...extra } }
  } catch (e) {
    if (e instanceof ActionError) return { status: e.status, body: { error: e.message } }
    throw e
  }
}

const H = (roles: Role[], from: string[] | '*', run: Handler['run']): Handler => ({ roles, from, run })
const HANDLERS: Record<string, Handler> = {
  // ── TALLER: las 4 acciones al recibir la solicitud ──
  quote_direct: H(['workshop'], ['pending', 'info_requested'], async (c, b) => {
    const price = num(b.price, 'precio', { min: 0.01, max: 1_000_000, required: true })!
    const notes = str(b.notes, 'notas', 4000)
    const validUntil = dateStr(b.valid_until, 'válido hasta') ?? plusDays(30)
    await c.db.query(`INSERT INTO quotes (quote_request_id, quoted_by, price, notes, valid_until, response_type) VALUES ($1,$2,$3,$4,$5,'direct')`,
      [c.req.id, c.me.id, price, notes, validUntil])
    await setStatus(c, 'quoted')
    c.events.push({ type: 'direct_quote', data: { price, valid_until: validUntil } })
    note(c, 'client', 'quote_direct', 'Has recibido un presupuesto', `${c.names.workshop}: ${eur(price)}. Puedes aceptarlo, rechazarlo o preguntar.`)
  }),
  request_info: H(['workshop'], ['pending', 'info_requested'], async (c, b) => {
    const msg = str(b.message, 'mensaje', 4000, true)!
    await addMessage(c, msg, [])
    await setStatus(c, 'info_requested')
    c.events.push({ type: 'info_requested' })
    note(c, 'client', 'info_requested', 'El taller necesita más información', `${c.names.workshop}: «${clip(msg, 140)}»`)
  }),
  propose_visit: H(['workshop'], ['pending', 'info_requested', 'visit_rejected', 'client_no_show'], async (c, b) => {
    const rescheduling = c.req.status === 'client_no_show'
    if (rescheduling && (c.visit?.reschedule_count ?? 0) >= 1) fail('Ya se reagendó una vez: no se permite otro reagendado.', 409)
    const reasons = Array.isArray(b.reasons) ? [...new Set(b.reasons.map(String))].filter((r) => r in VISIT_REASONS) : []
    const reasonOther = str(b.reason_other, 'otro motivo', 300)
    if (!reasons.length && !reasonOther) fail('Indica al menos un motivo de la visita.')
    const explanation = str(b.explanation, 'explicación al cliente', 1500, true)!
    const duration = num(b.duration_min, 'duración', { min: 5, max: 480, int: true, required: true })!
    const pricing = oneOf(b.pricing, ['gratis', 'pago', 'descontable'], 'tipo de precio') ?? 'descontable'
    const fee = pricing === 'gratis' ? 0 : num(b.fee, 'importe', { min: 1, max: 2000, required: true })!
    const slots = isoSlots(b.slots)
    const conditions = str(b.conditions, 'condiciones', 2000)
    const vals = [c.req.id, c.req.target_user_id, c.req.user_id, reasons, reasonOther, explanation, duration, pricing, fee, JSON.stringify(slots), conditions]
    const v = (await c.db.query(`INSERT INTO diagnostic_visits (quote_request_id, workshop_id, client_id, reasons, reason_other, explanation, duration_min, pricing, fee, slots, conditions)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (quote_request_id) DO UPDATE SET reasons = EXCLUDED.reasons, reason_other = EXCLUDED.reason_other, explanation = EXCLUDED.explanation,
        duration_min = EXCLUDED.duration_min, pricing = EXCLUDED.pricing, fee = EXCLUDED.fee, slots = EXCLUDED.slots, conditions = EXCLUDED.conditions,
        status = 'propuesta', conditions_accepted_at = NULL, rejected_reason = NULL, scheduled_at = NULL, reminder_sent_at = NULL,
        fee_status = 'no_aplica', done_at = NULL, done_notes = NULL, done_photos = '[]'::jsonb, no_show_at = NULL,
        reschedule_count = diagnostic_visits.reschedule_count + ${rescheduling ? 1 : 0}, updated_at = now()
      RETURNING *`, vals)).rows[0]
    c.visit = v
    await setStatus(c, 'visit_requested')
    c.events.push({ type: rescheduling ? 'visit_rescheduled' : 'visit_proposed', data: { pricing, fee, duration_min: duration, slots, reasons, conditions } })
    note(c, 'client', 'visit_proposed', rescheduling ? 'El taller te propone una nueva cita de diagnóstico' : 'El taller necesita revisar tu vehículo para poder presupuestar',
      `${c.names.workshop}: visita de ${duration} min · ${costLabel(pricing, fee)}. Revisa la propuesta y acéptala o recházala.`)
  }),
  decline: H(['workshop'], ['pending', 'info_requested'], async (c, b) => {
    const reason = str(b.reason, 'motivo', 1000)
    await setStatus(c, 'rejected', reason)
    c.events.push({ type: 'declined', data: { reason } })
    note(c, 'client', 'declined', 'Un taller no puede atender tu solicitud', `${c.names.workshop}${reason ? `: «${clip(reason, 140)}»` : ''}. Tu solicitud sigue activa para los demás talleres.`)
  }),

  // ── CLIENTE: completar información y decidir sobre un presupuesto directo ──
  complete_info: H(['client'], ['info_requested'], async (c, b) => {
    const msg = str(b.message, 'mensaje', 4000, true)!
    const media = urlList(b.media_urls, 'fotos/vídeos', 12)
    await addMessage(c, msg, media)
    if (media.length) {
      const cur = Array.isArray(c.req.media_urls) ? c.req.media_urls : []
      await c.db.query(`UPDATE quote_requests SET media_urls = $1 WHERE id = $2`, [JSON.stringify([...cur, ...media].slice(0, 30)), c.req.id])
    }
    await setStatus(c, 'pending')
    c.events.push({ type: 'info_completed', data: { media: media.length } })
    note(c, 'workshop', 'info_completed', 'El cliente ha completado la información', `${c.names.client}: «${clip(msg, 140)}»`)
  }),
  accept_direct: H(['client'], ['quoted'], async (c) => {
    await setStatus(c, 'contracted')
    c.events.push({ type: 'direct_accepted' })
    note(c, 'workshop', 'quote_accepted', 'El cliente ha aceptado tu presupuesto', `${c.names.client} · ${c.req.car_model} (${c.req.car_year})`)
    await closeSiblings(c)
  }),
  reject_direct: H(['client'], ['quoted'], async (c, b) => {
    const reason = str(b.reason, 'motivo', 1000)
    await setStatus(c, 'final_rejected', reason)
    c.events.push({ type: 'direct_rejected', data: { reason } })
    note(c, 'workshop', 'quote_rejected', 'El cliente ha rechazado el presupuesto', `${c.names.client}${reason ? `: «${clip(reason, 140)}»` : ''}`)
  }),
  withdraw: H(['client'], OPEN_EARLY, async (c, b) => {
    const reason = str(b.reason, 'motivo', 1000)
    if (c.visit && ['propuesta', 'aceptada'].includes(c.visit.status)) await setVisit(c, { status: 'cancelada' })
    await setStatus(c, 'cancelled', reason ?? 'Retirada por el cliente')
    c.events.push({ type: 'withdrawn', data: { reason } })
    note(c, 'workshop', 'withdrawn', 'El cliente ha retirado la solicitud', `${c.names.client} · ${c.req.service_type}`)
  }),

  // ── CLIENTE: propuesta de visita ──
  accept_visit: H(['client'], ['visit_requested'], async (c, b) => {
    const v = needVisit(c, ['propuesta'])
    if (b.accept_conditions !== true) fail('Tienes que aceptar el coste y las condiciones de la visita.')
    const slots = (Array.isArray(v.slots) ? v.slots : []) as string[]
    let scheduled: string | null = null
    if (slots.length) {
      const pick = String(b.slot ?? '')
      const match = slots.find((s) => sameInstant(s, pick))
      if (!match) fail('Elige una de las fechas propuestas por el taller.')
      if (Date.parse(match!) < Date.now()) fail('Esa fecha ya ha pasado: pide otra al taller.')
      scheduled = match!
    }
    const feeStatus = v.pricing === 'gratis' ? 'no_aplica' : 'pendiente'
    await setVisit(c, { status: scheduled ? 'programada' : 'aceptada', conditions_accepted_at: new Date().toISOString(), scheduled_at: scheduled, fee_status: feeStatus })
    await setStatus(c, scheduled ? 'visit_scheduled' : 'visit_accepted')
    c.events.push({ type: 'visit_accepted', data: { pricing: v.pricing, fee: Number(v.fee), conditions: v.conditions, scheduled_at: scheduled } })
    note(c, 'workshop', 'visit_accepted', 'El cliente ha aceptado la visita de diagnóstico',
      `${c.names.client}${scheduled ? ` · cita el ${fmtDate(scheduled)}` : ' · fija tú la fecha y hora de la cita'} · ${costLabel(v.pricing, Number(v.fee))}`)
    if (scheduled) note(c, 'client', 'visit_scheduled', 'Cita de diagnóstico confirmada', `${c.names.workshop} · ${fmtDate(scheduled)} · ${v.duration_min} min`, false)
  }),
  reject_visit: H(['client'], ['visit_requested'], async (c, b) => {
    needVisit(c, ['propuesta'])
    const reason = str(b.reason, 'motivo', 1000)
    await setVisit(c, { status: 'rechazada', rejected_reason: reason })
    await setStatus(c, 'visit_rejected')
    c.events.push({ type: 'visit_rejected', data: { reason } })
    note(c, 'workshop', 'visit_rejected', 'El cliente ha rechazado la visita', `${c.names.client}${reason ? `: «${clip(reason, 140)}»` : ''}`)
  }),
  schedule_visit: H(['workshop'], ['visit_accepted'], async (c, b) => {
    const v = needVisit(c, ['aceptada'])
    const when = isoSlots([b.scheduled_at])[0]
    if (!when) fail('Indica la fecha y hora de la cita.')
    await setVisit(c, { status: 'programada', scheduled_at: when })
    await setStatus(c, 'visit_scheduled')
    c.events.push({ type: 'visit_scheduled', data: { scheduled_at: when } })
    note(c, 'client', 'visit_scheduled', 'Tu cita de diagnóstico está programada', `${c.names.workshop} · ${fmtDate(when)} · ${v.duration_min} min`)
  }),
  cancel_visit: H(['client'], ['visit_accepted', 'visit_scheduled'], async (c, b) => {
    const v = needVisit(c, ['aceptada', 'programada'])
    if (v.scheduled_at && Date.parse(v.scheduled_at) <= Date.now()) fail('La hora de la cita ya ha pasado: si hubo un problema, usa «Reclamar».', 409)
    const reason = str(b.reason, 'motivo', 1000)
    await setVisit(c, { status: 'cancelada' })
    await setStatus(c, 'closed', reason ?? 'El cliente canceló la visita')
    c.events.push({ type: 'visit_cancelled', data: { reason } })
    note(c, 'workshop', 'visit_cancelled', 'El cliente ha cancelado la visita', `${c.names.client}${v.scheduled_at ? ` · cita del ${fmtDate(v.scheduled_at)}` : ''}`)
  }),

  // ── TALLER: la cita ──
  mark_visit_done: H(['workshop'], ['visit_scheduled'], async (c, b) => {
    const v = needVisit(c, ['programada'])
    if (v.scheduled_at && Date.parse(v.scheduled_at) - Date.now() > 12 * 3600_000) fail('Aún falta para la cita: podrás marcarla como realizada el mismo día.', 409)
    const notesTxt = str(b.notes, 'notas', 2000)
    const photos = urlList(b.photos, 'fotos', 12)
    const feeStatus = v.pricing === 'gratis' ? 'no_aplica' : b.fee_collected === true ? 'cobrado' : 'pendiente'
    await setVisit(c, { status: 'realizada', done_at: new Date().toISOString(), done_notes: notesTxt, done_photos: JSON.stringify(photos), fee_status: feeStatus })
    await setStatus(c, 'visit_done')
    c.events.push({ type: 'visit_done', data: { fee_status: feeStatus, photos: photos.length } })
    note(c, 'client', 'visit_done', 'El taller está preparando tu presupuesto final', `${c.names.workshop} ha revisado tu vehículo.`)
    note(c, 'workshop', 'visit_done', 'Ahora puedes enviar el presupuesto final', `${c.names.client} · ${c.req.car_model}`, false)
  }),
  mark_no_show: H(['workshop'], ['visit_scheduled'], async (c) => {
    const v = needVisit(c, ['programada'])
    if (!v.scheduled_at || Date.parse(v.scheduled_at) > Date.now()) fail('Solo puedes marcarlo después de la hora de la cita.', 409)
    await setVisit(c, { status: 'cliente_no_presentado', no_show_at: new Date().toISOString() })
    await setStatus(c, 'client_no_show')
    c.events.push({ type: 'client_no_show', data: { scheduled_at: v.scheduled_at } })
    note(c, 'client', 'client_no_show', 'El taller indica que no acudiste a la cita',
      `${c.names.workshop} · cita del ${fmtDate(v.scheduled_at)}. Si es un error, puedes reclamar desde la solicitud.`)
  }),

  // ── TALLER: presupuesto final tras la visita (se puede reenviar corregido tras una aclaración) ──
  send_final: H(['workshop'], ['visit_done', 'final_sent'], async (c, b) => {
    const v = needVisit(c, ['realizada'])
    const diagnosis = str(b.diagnosis, 'diagnóstico', 4000, true)!
    const solution = str(b.solution, 'solución propuesta', 4000, true)!
    const materials = materialList(b.materials)
    const laborHours = num(b.labor_hours, 'horas de mano de obra', { min: 0, max: 1000 })
    const laborPrice = num(b.labor_price, 'precio de mano de obra', { min: 0, max: 1_000_000 })
    const materialsPrice = num(b.materials_price, 'precio de materiales', { min: 0, max: 1_000_000 })
    const total = num(b.total_price, 'precio total', { min: 0.01, max: 1_000_000, required: true })!
    // Descuento automático de la visita descontable (salvo que se devolviera por una reclamación).
    const discount = v.pricing === 'descontable' && v.fee_status !== 'devuelto' ? Math.min(Number(v.fee), total) : 0
    const due = Math.round((total - discount) * 100) / 100
    const vals = [c.req.id, v.id, c.req.target_user_id, c.req.user_id, diagnosis, solution, JSON.stringify(materials), laborHours, laborPrice, materialsPrice,
      total, discount, due, str(b.work_time, 'tiempo de trabajo', 300), str(b.availability, 'disponibilidad', 300), str(b.warranty, 'garantía', 300),
      JSON.stringify(urlList(b.photos, 'fotos', 12)), str(b.conditions, 'condiciones', 2000), dateStr(b.valid_until, 'válido hasta')]
    const f = (await c.db.query(`INSERT INTO final_quotes (quote_request_id, visit_id, workshop_id, client_id, diagnosis, solution, materials, labor_hours, labor_price,
        materials_price, total_price, visit_discount, amount_due, work_time, availability, warranty, photos, conditions, valid_until)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (quote_request_id) DO UPDATE SET diagnosis = EXCLUDED.diagnosis, solution = EXCLUDED.solution, materials = EXCLUDED.materials,
        labor_hours = EXCLUDED.labor_hours, labor_price = EXCLUDED.labor_price, materials_price = EXCLUDED.materials_price, total_price = EXCLUDED.total_price,
        visit_discount = EXCLUDED.visit_discount, amount_due = EXCLUDED.amount_due, work_time = EXCLUDED.work_time, availability = EXCLUDED.availability,
        warranty = EXCLUDED.warranty, photos = EXCLUDED.photos, conditions = EXCLUDED.conditions, valid_until = EXCLUDED.valid_until,
        status = 'enviado', decided_at = NULL, decision_reason = NULL, version = final_quotes.version + 1, updated_at = now()
      RETURNING *`, vals)).rows[0]
    c.final = f
    await setStatus(c, 'final_sent')
    c.events.push({ type: f.version > 1 ? 'final_resent' : 'final_sent', data: { total_price: total, visit_discount: discount, amount_due: due, version: f.version } })
    note(c, 'client', 'final_sent', f.version > 1 ? 'Has recibido un presupuesto final corregido' : 'Has recibido un presupuesto final',
      `${c.names.workshop}: ${eur(due)}${discount ? ` (ya descontados ${eur(discount)} de la visita)` : ''}.`)
  }),

  // ── CLIENTE: decisión sobre el presupuesto final ──
  accept_final: H(['client'], ['final_sent'], async (c) => {
    const f = c.final ?? fail('No hay presupuesto final.', 409)
    if (f.status !== 'enviado') fail('Ese presupuesto ya no está pendiente.', 409)
    if (f.valid_until && String(f.valid_until).slice(0, 10) < today()) fail('El presupuesto ha caducado: pide al taller que lo renueve.', 409)
    await c.db.query(`UPDATE final_quotes SET status = 'aceptado', decided_at = now(), updated_at = now() WHERE id = $1`, [f.id])
    await setStatus(c, 'contracted')
    c.events.push({ type: 'final_accepted', data: { amount_due: Number(f.amount_due), visit_discount: Number(f.visit_discount) } })
    note(c, 'workshop', 'final_accepted', 'El cliente ha aceptado tu presupuesto', `${c.names.client}: ${eur(Number(f.amount_due))} · ${c.req.car_model}`)
    await closeSiblings(c)
  }),
  reject_final: H(['client'], ['final_sent'], async (c, b) => {
    const f = c.final ?? fail('No hay presupuesto final.', 409)
    const reason = str(b.reason, 'motivo', 1000)
    await c.db.query(`UPDATE final_quotes SET status = 'rechazado', decided_at = now(), decision_reason = $1, updated_at = now() WHERE id = $2`, [reason, f.id])
    await setStatus(c, 'final_rejected', reason)
    c.events.push({ type: 'final_rejected', data: { reason, fee_kept: c.visit && c.visit.pricing !== 'gratis' ? Number(c.visit.fee) : 0 } })
    note(c, 'workshop', 'final_rejected', 'El cliente ha rechazado el presupuesto', `${c.names.client}${reason ? `: «${clip(reason, 140)}»` : ''}`)
  }),

  // ── cierre, mensajes, reclamación, valoración ──
  close: H(['workshop'], ['contracted'], async (c, b) => {
    const reason = str(b.note, 'nota', 1000)
    await setStatus(c, 'closed', reason ?? 'Trabajo finalizado')
    c.events.push({ type: 'closed', data: { note: reason } })
    note(c, 'client', 'closed', 'Trabajo finalizado', `${c.names.workshop} ha cerrado el trabajo. ¿Nos cuentas qué tal? Puedes valorarlo desde la solicitud.`)
  }),
  message: H(['client', 'workshop'], '*', async (c, b) => {
    if (c.req.status === 'cancelled') fail('La solicitud está retirada.', 409)
    const msg = str(b.message, 'mensaje', 4000, true)!
    await addMessage(c, msg, urlList(b.media_urls, 'adjuntos', 6))
    c.events.push({ type: 'message' })
    note(c, c.role === 'client' ? 'workshop' : 'client', 'message', c.role === 'client' ? 'El cliente te ha escrito' : 'El taller te ha escrito',
      `${c.role === 'client' ? c.names.client : c.names.workshop}: «${clip(msg, 140)}»`, false)
  }),
  open_claim: H(['client'], ['visit_scheduled', 'client_no_show', 'visit_done', 'final_sent', 'final_rejected', 'contracted', 'closed'], async (c, b) => {
    const v = needVisit(c, ['programada', 'cliente_no_presentado', 'realizada'])
    if (v.status === 'programada' && (!v.scheduled_at || Date.parse(v.scheduled_at) > Date.now())) fail('Podrás reclamar a partir de la hora de la cita.', 409)
    if (v.claim_status === 'abierta') fail('Ya hay una reclamación abierta.', 409)
    const reason = str(b.reason, 'motivo de la reclamación', 2000, true)!
    await setVisit(c, { claim_status: 'abierta', claim_reason: reason, claim_opened_at: new Date().toISOString(), claim_resolution: null, claim_refund: null, claim_resolved_at: null })
    c.events.push({ type: 'claim_opened', data: { reason } })
    note(c, 'workshop', 'claim_opened', 'El cliente ha abierto una reclamación', `${c.names.client}: «${clip(reason, 160)}». ExhaustMarket la revisará.`)
    const admins = (await c.db.query(`SELECT id FROM user_profiles WHERE is_admin = true`)).rows as Row[]
    for (const a of admins) c.notes.push({ user_id: a.id, kind: 'claim_opened', title: 'Nueva reclamación de visita', body: `${c.names.client} → ${c.names.workshop}: «${clip(reason, 140)}»`, link: '/admin/visitas', email: true })
  }),
  resolve_claim: H(['admin', 'client', 'workshop'], '*', async (c, b) => {
    if (!c.me.isAdmin) fail('Solo administradores.', 403)
    const v = needVisit(c, ['programada', 'cliente_no_presentado', 'realizada', 'cancelada'])
    if (v.claim_status !== 'abierta') fail('No hay reclamación abierta.', 409)
    const resolution = str(b.resolution, 'resolución', 2000, true)!
    const refund = b.refund === true
    await setVisit(c, { claim_status: 'resuelta', claim_resolution: resolution, claim_refund: refund, claim_resolved_at: new Date().toISOString(), claim_resolved_by: c.me.id,
      ...(refund && v.fee_status !== 'no_aplica' ? { fee_status: 'devuelto' } : {}) })
    c.events.push({ type: 'claim_resolved', data: { resolution, refund } })
    const body = `${clip(resolution, 200)}${refund ? ' · Se devuelve el importe de la visita.' : ''}`
    note(c, 'client', 'claim_resolved', 'Tu reclamación se ha resuelto', body)
    note(c, 'workshop', 'claim_resolved', 'Reclamación resuelta por ExhaustMarket', body)
  }),
  rate: H(['client'], '*', async (c, b) => {
    // Solo valoraciones reales: tras una visita realizada o un trabajo contratado (no si se canceló antes de acudir).
    let allowed = c.visit?.status === 'realizada' || c.req.status === 'contracted'
    if (!allowed && c.req.status === 'closed') {
      allowed = (await c.db.query(`SELECT 1 FROM quote_events WHERE quote_request_id = $1 AND type IN ('direct_accepted','final_accepted') LIMIT 1`, [c.req.id])).rows.length > 0
    }
    if (!allowed) fail('Solo se puede valorar tras una visita realizada o un trabajo contratado.', 409)
    const s = (k: string, label: string) => num(b[k], label, { min: 1, max: 5, int: true, required: true })!
    const vals = [c.req.id, c.req.target_user_id, c.req.user_id, c.visit?.id ?? null, s('trato', 'trato'), s('puntualidad', 'puntualidad'),
      s('claridad', 'claridad'), s('profesionalidad', 'profesionalidad'), s('instalaciones', 'instalaciones'), str(b.comment, 'comentario', 2000)]
    const r = await c.db.query(`INSERT INTO workshop_ratings (quote_request_id, workshop_id, client_id, visit_id, trato, puntualidad, claridad, profesionalidad, instalaciones, comment)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (quote_request_id) DO NOTHING RETURNING overall`, vals)
    if (!r.rows.length) fail('Ya has valorado este trabajo.', 409)
    c.events.push({ type: 'rated', data: { overall: Number(r.rows[0].overall) } })
    note(c, 'workshop', 'rated', 'Has recibido una valoración', `${c.names.client}: ${Number(r.rows[0].overall).toFixed(1)} / 5`, false)
  }),
}

async function createRequest(pool: Pool, me: Me, b: Row) {
  const targets = Array.isArray(b.target_user_ids) ? [...new Set(b.target_user_ids.map(String))] : []
  if (!targets.length) fail('Selecciona al menos un taller.')
  if (targets.length > 10) fail('Máximo 10 talleres por solicitud.')
  if (targets.some((t) => !UUID_RE.test(t))) fail('Taller no válido.')
  if (targets.includes(me.id)) fail('No puedes pedirte presupuesto a ti mismo.')
  const carModel = str(b.car_model, 'vehículo', 200, true)!
  const carYear = num(b.car_year, 'año', { min: 1900, max: new Date().getFullYear() + 1, int: true, required: true })!
  const service = str(b.service_type, 'tipo de servicio', 200, true)!
  const specs = str(b.specifications, 'descripción', 4000, true)!
  const media = urlList(b.media_urls, 'fotos/vídeos', 12)
  const vehicleId = b.vehicle_id && UUID_RE.test(String(b.vehicle_id)) ? String(b.vehicle_id) : null
  const engineId = b.engine_id && UUID_RE.test(String(b.engine_id)) ? String(b.engine_id) : null
  const client = await pool.connect()
  const notes: Notif[] = []
  let ids: string[] = []
  try {
    await client.query('BEGIN')
    const ws = (await client.query(`SELECT id, full_name, company_name, user_type FROM user_profiles WHERE id = ANY($1)`, [targets])).rows as Row[]
    if (ws.length !== targets.length || ws.some((w) => !RECEIVER_TYPES.includes(w.user_type))) fail('Alguno de los destinatarios no es un taller o profesional.')
    const group = randomUUID()
    for (const t of targets) {
      const r = (await client.query(`INSERT INTO quote_requests (user_id, target_user_id, car_model, car_year, service_type, specifications, exhaust_zone, work_type,
          location, budget_preference, request_group_id, media_urls, vehicle_id, engine_id, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending') RETURNING id`,
      [me.id, t, carModel, carYear, service, specs, str(b.exhaust_zone, 'zona', 200), str(b.work_type, 'tipo de trabajo', 200), str(b.location, 'ubicación', 200),
        str(b.budget_preference, 'preferencia', 200), group, JSON.stringify(media), vehicleId, engineId])).rows[0]
      ids.push(r.id)
      await client.query(`INSERT INTO quote_events (quote_request_id, actor_id, actor_role, type, data) VALUES ($1,$2,'client','created',$3)`,
        [r.id, me.id, JSON.stringify({ group, targets: targets.length })])
      notes.push({ user_id: t, kind: 'request_received', title: 'Has recibido una nueva solicitud de presupuesto',
        body: `${me.name}: ${service} · ${carModel} (${carYear})`, link: `/quotes?view=received&r=${r.id}`, email: true })
    }
    notes.push({ user_id: me.id, kind: 'request_sent', title: 'Tu solicitud se ha enviado',
      body: `Enviada a ${targets.length} taller${targets.length === 1 ? '' : 'es'}: ${ws.map((w) => w.company_name || w.full_name).join(', ')}.`, link: '/quotes', email: false })
    await insertNotes(client, notes)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    ids = []
    throw e
  } finally { client.release() }
  await sendEmails(pool, notes)
  return { ids }
}

// ───────────────────────── helpers de acción ─────────────────────────
async function setStatus(c: Ctx, status: string, closedReason?: string | null) {
  await c.db.query(`UPDATE quote_requests SET status = $1, closed_reason = COALESCE($2, closed_reason), updated_at = now() WHERE id = $3`, [status, closedReason ?? null, c.req.id])
  c.req.status = status
}
async function setVisit(c: Ctx, patch: Row) {
  const cols = Object.keys(patch)
  const vals = cols.map((k) => patch[k])
  vals.push(c.visit!.id)
  const r = await c.db.query(`UPDATE diagnostic_visits SET ${cols.map((k, i) => `${k} = $${i + 1}`).join(', ')}, updated_at = now() WHERE id = $${vals.length} RETURNING *`, vals)
  c.visit = r.rows[0]
}
function needVisit(c: Ctx, states: string[]): Row {
  if (!c.visit) fail('No hay visita de diagnóstico en esta solicitud.', 409)
  if (!states.includes(c.visit!.status)) fail(`La visita está «${c.visit!.status}»: no se puede hacer eso ahora.`, 409)
  return c.visit!
}
async function addMessage(c: Ctx, body: string, media: string[]) {
  await c.db.query(`INSERT INTO quote_messages (quote_request_id, author_id, author_role, body, media) VALUES ($1,$2,$3,$4,$5)`,
    [c.req.id, c.me.id, c.role === 'admin' ? 'admin' : c.role, body, JSON.stringify(media)])
}
function note(c: Ctx, to: 'client' | 'workshop', kind: string, title: string, body: string, email = true) {
  const user = to === 'client' ? c.req.user_id : c.req.target_user_id
  c.notes.push({ user_id: user, kind, title, body, link: `/quotes?view=${to === 'client' ? 'sent' : 'received'}&r=${c.req.id}`, email })
}
/** Al contratar con un taller, las solicitudes hermanas aún abiertas (mismo envío) se retiran con aviso. */
async function closeSiblings(c: Ctx) {
  if (!c.req.request_group_id) return
  const sib = (await c.db.query(`SELECT id, target_user_id, status FROM quote_requests WHERE request_group_id = $1 AND id <> $2 AND status = ANY($3) FOR UPDATE`,
    [c.req.request_group_id, c.req.id, OPEN_EARLY])).rows as Row[]
  for (const s of sib) {
    await c.db.query(`UPDATE quote_requests SET status = 'cancelled', closed_reason = 'El cliente eligió otro taller', updated_at = now() WHERE id = $1`, [s.id])
    await c.db.query(`UPDATE diagnostic_visits SET status = 'cancelada', updated_at = now() WHERE quote_request_id = $1 AND status IN ('propuesta','aceptada')`, [s.id])
    await c.db.query(`INSERT INTO quote_events (quote_request_id, actor_id, actor_role, type, data) VALUES ($1,$2,'client','withdrawn',$3)`,
      [s.id, c.me.id, JSON.stringify({ reason: 'El cliente eligió otro taller' })])
    c.notes.push({ user_id: s.target_user_id, kind: 'withdrawn', title: 'El cliente ha elegido otro taller', body: `${c.names.client} · ${c.req.service_type} · ${c.req.car_model}`,
      link: `/quotes?view=received&r=${s.id}`, email: false })
  }
}
async function insertNotes(db: Db, notes: Notif[]) {
  for (const n of notes) {
    await db.query(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5)`, [n.user_id, n.kind, n.title, n.body, n.link])
  }
}

// ───────────────────────── lectura ─────────────────────────
async function listFor(pool: Pool, me: Me, role: 'client' | 'workshop') {
  const col = role === 'client' ? 'user_id' : 'target_user_id'
  const reqs = (await pool.query(`SELECT * FROM quote_requests WHERE ${col} = $1 ORDER BY created_at DESC LIMIT 300`, [me.id])).rows as Row[]
  if (!reqs.length) return { items: [], me: { id: me.id, offers_free_visit: await freeVisitFlag(pool, me.id) } }
  const ids = reqs.map((r) => r.id)
  const otherIds = [...new Set(reqs.map((r) => (role === 'client' ? r.target_user_id : r.user_id)))]
  const [profiles, visits, finals, quotes, messages, events, ratings, summary] = await Promise.all([
    pool.query(`SELECT id, full_name, company_name, address, latitude, longitude, phone, offers_free_visit, user_type FROM user_profiles WHERE id = ANY($1)`, [otherIds]),
    pool.query(`SELECT * FROM diagnostic_visits WHERE quote_request_id = ANY($1)`, [ids]),
    pool.query(`SELECT * FROM final_quotes WHERE quote_request_id = ANY($1)`, [ids]),
    pool.query(`SELECT * FROM quotes WHERE quote_request_id = ANY($1) ORDER BY created_at`, [ids]),
    pool.query(`SELECT id, quote_request_id, author_role, body, media, created_at FROM quote_messages WHERE quote_request_id = ANY($1) ORDER BY created_at`, [ids]),
    pool.query(`SELECT id, quote_request_id, actor_role, type, data, created_at FROM quote_events WHERE quote_request_id = ANY($1) ORDER BY created_at`, [ids]),
    pool.query(`SELECT * FROM workshop_ratings WHERE quote_request_id = ANY($1)`, [ids]),
    role === 'client' ? ratingSummary(pool, otherIds) : Promise.resolve(new Map<string, { avg: number; count: number }>()),
  ])
  const pmap = new Map((profiles.rows as Row[]).map((p) => [p.id, p]))
  const by = <T extends Row>(rows: T[]) => { const m = new Map<string, T[]>(); for (const r of rows) m.set(r.quote_request_id, [...(m.get(r.quote_request_id) ?? []), r]); return m }
  const vmap = new Map((visits.rows as Row[]).map((v) => [v.quote_request_id, v]))
  const fmap = new Map((finals.rows as Row[]).map((f) => [f.quote_request_id, f]))
  const rmap = new Map((ratings.rows as Row[]).map((r) => [r.quote_request_id, r]))
  const qmap = by(quotes.rows as Row[]), mmap = by(messages.rows as Row[]), emap = by(events.rows as Row[])
  const PHONE_STATES = ['visit_accepted', 'visit_scheduled', 'client_no_show', 'visit_done', 'final_sent', 'contracted', 'final_rejected', 'closed']
  const items = reqs.map((r) => {
    const o = pmap.get(role === 'client' ? r.target_user_id : r.user_id) ?? {}
    const counterpart: Row = { id: o.id, name: o.company_name || o.full_name || 'Usuario' }
    if (role === 'client') {
      Object.assign(counterpart, { address: o.address ?? null, offers_free_visit: !!o.offers_free_visit, rating: (summary as Map<string, Row>).get(o.id) ?? null,
        distance_km: distanceKm(me.lat, me.lon, o.latitude, o.longitude) })
    }
    // El teléfono se comparte solo cuando hay una cita aceptada (para coordinarla).
    if (PHONE_STATES.includes(r.status)) counterpart.phone = o.phone ?? null
    return { ...r, role, counterpart, visit: vmap.get(r.id) ?? null, final: fmap.get(r.id) ?? null, quotes: qmap.get(r.id) ?? [],
      messages: mmap.get(r.id) ?? [], events: emap.get(r.id) ?? [], rating: rmap.get(r.id) ?? null }
  })
  return { items, me: { id: me.id, offers_free_visit: await freeVisitFlag(pool, me.id) } }
}

async function listWorkshops(pool: Pool, me: Me) {
  const rows = (await pool.query(`SELECT id, full_name, company_name, address, latitude, longitude, offers_free_visit, user_type FROM user_profiles
    WHERE user_type IN ('workshop','professional') AND is_verified = true AND id <> $1`, [me.id])).rows as Row[]
  const summary = await ratingSummary(pool, rows.map((r) => r.id))
  const items = rows.map((w) => ({
    id: w.id, name: w.company_name || w.full_name || 'Taller', address: w.address ?? null, user_type: w.user_type,
    offers_free_visit: !!w.offers_free_visit, rating: summary.get(w.id) ?? null, distance_km: distanceKm(me.lat, me.lon, w.latitude, w.longitude),
  }))
  items.sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9) || (b.rating?.avg ?? 0) - (a.rating?.avg ?? 0) || a.name.localeCompare(b.name))
  return { items }
}

async function adminVisits(pool: Pool) {
  const rows = (await pool.query(`SELECT v.*, r.car_model, r.car_year, r.service_type, r.status AS request_status,
      c.full_name AS client_name, coalesce(w.company_name, w.full_name) AS workshop_name, f.amount_due, f.status AS final_status
    FROM diagnostic_visits v JOIN quote_requests r ON r.id = v.quote_request_id
    LEFT JOIN user_profiles c ON c.id = v.client_id LEFT JOIN user_profiles w ON w.id = v.workshop_id
    LEFT JOIN final_quotes f ON f.quote_request_id = v.quote_request_id
    ORDER BY (v.claim_status = 'abierta') DESC NULLS LAST, v.updated_at DESC LIMIT 500`)).rows
  return { items: rows }
}

async function ratingSummary(pool: Pool, ids: string[]) {
  const m = new Map<string, { avg: number; count: number }>()
  if (!ids.length) return m
  const r = (await pool.query(`SELECT workshop_id, round(avg(overall)::numeric, 1) AS avg, count(*)::int AS n FROM workshop_ratings WHERE workshop_id = ANY($1) AND is_public GROUP BY 1`, [ids])).rows as Row[]
  for (const x of r) m.set(x.workshop_id, { avg: Number(x.avg), count: x.n })
  return m
}
async function freeVisitFlag(pool: Pool, id: string) {
  return !!(await pool.query(`SELECT offers_free_visit FROM user_profiles WHERE id = $1`, [id])).rows[0]?.offers_free_visit
}

// ───────────────────────── recordatorios (cron horario) ─────────────────────────
async function cronReminders(pool: Pool) {
  // Reclama (marca) las citas de dentro de 1-26 h sin recordatorio: idempotente y sin dobles avisos.
  const due = (await pool.query(`UPDATE diagnostic_visits SET reminder_sent_at = now()
    WHERE status = 'programada' AND reminder_sent_at IS NULL AND scheduled_at BETWEEN now() + interval '1 hour' AND now() + interval '26 hours'
    RETURNING id, quote_request_id, workshop_id, client_id, scheduled_at, duration_min`)).rows as Row[]
  const notes: Notif[] = []
  for (const v of due) {
    const body = `Visita de diagnóstico el ${fmtDate(v.scheduled_at)} (${v.duration_min} min).`
    notes.push({ user_id: v.client_id, kind: 'visit_reminder', title: 'Recordatorio: tienes una visita de diagnóstico programada', body, link: `/quotes?view=sent&r=${v.quote_request_id}`, email: true })
    notes.push({ user_id: v.workshop_id, kind: 'visit_reminder', title: 'Recordatorio: tienes una visita de diagnóstico programada', body, link: `/quotes?view=received&r=${v.quote_request_id}`, email: true })
    await pool.query(`INSERT INTO quote_events (quote_request_id, actor_role, type, data) VALUES ($1, 'system', 'reminder_sent', $2)`, [v.quote_request_id, JSON.stringify({ scheduled_at: v.scheduled_at })])
  }
  await insertNotes(pool, notes)
  await sendEmails(pool, notes)
  return { reminders: due.length }
}

// ───────────────────────── email (opcional: solo si hay RESEND_API_KEY) ─────────────────────────
async function sendEmails(pool: Pool, notes: Notif[]) {
  const key = process.env.RESEND_API_KEY
  const list = notes.filter((n) => n.email)
  if (!key || !list.length) return
  try {
    const users = new Map(((await pool.query(`SELECT id, email, full_name, company_name FROM user_profiles WHERE id = ANY($1)`, [[...new Set(list.map((n) => n.user_id))]])).rows as Row[]).map((u) => [u.id, u]))
    const origin = process.env.PUBLIC_ORIGIN ?? 'https://exhaustmarket.vercel.app'
    await Promise.allSettled(list.map(async (n) => {
      const u = users.get(n.user_id)
      if (!u?.email) return
      const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1D1D1F">
        <h2 style="font-size:20px">${esc(n.title)}</h2><p style="font-size:15px;line-height:1.5">${esc(n.body)}</p>
        <p><a href="${origin}${n.link}" style="background:#0071E3;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Ver en ExhaustMarket</a></p>
        <p style="font-size:12px;color:#86868B">Recibes este aviso por tu actividad en ExhaustMarket.</p></div>`
      await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(6000),
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: 'ExhaustMarket <noreply@exhaustmarket.com>', to: u.email, subject: n.title, html }),
      })
    }))
  } catch (e) { console.error('quotes email', e) }
}

// ───────────────────────── utilidades ─────────────────────────
async function getMe(req: Request, pool: Pool): Promise<Me | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return null
  try {
    const payload = (await verifyToken(header.slice(7), { secretKey: secret })) as { sub: string }
    const r = (await pool.query(`SELECT id, user_type, is_admin, full_name, company_name, latitude, longitude FROM user_profiles WHERE clerk_user_id = $1 LIMIT 1`, [payload.sub])).rows[0]
    if (!r) return null
    return { id: r.id, type: r.user_type, isAdmin: !!r.is_admin, name: r.company_name || r.full_name || 'Usuario', lat: r.latitude == null ? null : Number(r.latitude), lon: r.longitude == null ? null : Number(r.longitude) }
  } catch { return null }
}
function str(v: unknown, label: string, max: number, required = false): string | null {
  if (v == null || (typeof v === 'string' && !v.trim())) { if (required) fail(`Falta ${label}.`); return null }
  if (typeof v !== 'string' && typeof v !== 'number') fail(`${label}: texto no válido.`)
  const s = String(v).trim()
  if (s.length > max) fail(`${label}: máximo ${max} caracteres.`)
  return s
}
function num(v: unknown, label: string, o: { min: number; max: number; int?: boolean; required?: boolean }): number | null {
  if (v == null || v === '') { if (o.required) fail(`Falta ${label}.`); return null }
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  if (!Number.isFinite(n)) fail(`${label}: número no válido.`)
  if (o.int && !Number.isInteger(n)) fail(`${label}: debe ser un número entero.`)
  if (n < o.min || n > o.max) fail(`${label}: debe estar entre ${o.min} y ${o.max}.`)
  return Math.round(n * 100) / 100
}
function oneOf(v: unknown, values: string[], label: string): string | null {
  if (v == null || v === '') return null
  if (!values.includes(String(v))) fail(`${label}: valor no válido.`)
  return String(v)
}
function dateStr(v: unknown, label: string): string | null {
  if (v == null || v === '') return null
  const s = String(v).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) fail(`${label}: fecha no válida.`)
  if (s < today()) fail(`${label}: no puede ser una fecha pasada.`)
  return s
}
function isoSlots(v: unknown): string[] {
  if (v == null) return []
  if (!Array.isArray(v)) fail('Las fechas propuestas deben ser una lista.')
  const arr = v as unknown[]
  if (arr.length > 8) fail('Máximo 8 franjas propuestas.')
  const out: string[] = []
  for (const x of arr) {
    if (x == null || x === '') continue
    const t = Date.parse(String(x))
    if (Number.isNaN(t)) fail('Fecha propuesta no válida.')
    if (t < Date.now() + 15 * 60_000) fail('Las fechas propuestas deben ser futuras.')
    if (t > Date.now() + 180 * 86400_000) fail('Las fechas propuestas no pueden pasar de 6 meses.')
    const iso = new Date(Math.floor(t / 60_000) * 60_000).toISOString() // al minuto
    if (!out.includes(iso)) out.push(iso)
  }
  return out.sort()
}
function urlList(v: unknown, label: string, max: number): string[] {
  if (v == null) return []
  if (!Array.isArray(v)) fail(`${label}: lista no válida.`)
  const arr = (v as unknown[]).filter((x) => x != null && x !== '').map(String)
  if (arr.length > max) fail(`${label}: máximo ${max}.`)
  for (const u of arr) if (!/^https:\/\/\S+$/i.test(u) || u.length > 600) fail(`${label}: URL no válida.`)
  return arr
}
function materialList(v: unknown) {
  if (v == null) return []
  if (!Array.isArray(v)) fail('Materiales: lista no válida.')
  const arr = v as Row[]
  if (arr.length > 60) fail('Materiales: máximo 60 líneas.')
  return arr.filter((m) => m && String(m.name ?? '').trim()).map((m) => ({
    name: str(m.name, 'material', 200, true)!,
    qty: num(m.qty, 'cantidad', { min: 0, max: 100000 }),
    price: num(m.price, 'precio del material', { min: 0, max: 1_000_000 }),
  }))
}
function sameInstant(a: string, b: string) { const x = Date.parse(a), y = Date.parse(b); return !Number.isNaN(x) && !Number.isNaN(y) && Math.floor(x / 60_000) === Math.floor(y / 60_000) }
function plusDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
function today() { return new Date().toISOString().slice(0, 10) }
function clip(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + '…' : s }
function eur(n: number) { return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) }
function costLabel(pricing: string, fee: number) {
  return pricing === 'gratis' ? 'gratis' : pricing === 'pago' ? `${eur(fee)}` : `${eur(fee)} descontables si aceptas el presupuesto final`
}
function fmtDate(iso: string | Date) {
  return new Date(iso).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}
function distanceKm(lat1: number | null, lon1: number | null, lat2: unknown, lon2: unknown): number | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180
  const a2 = Number(lat2), o2 = Number(lon2)
  if (!Number.isFinite(a2) || !Number.isFinite(o2)) return null
  const dLat = toRad(a2 - lat1), dLon = toRad(o2 - lon1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(a2)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10
}
function esc(s: string) { return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch)) }
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}
