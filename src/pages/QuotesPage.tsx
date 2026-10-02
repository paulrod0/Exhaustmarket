import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Plus, ChevronDown, ChevronRight, MapPin, Search, X, Loader2, RefreshCw, Gift } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import PhotoUploader from '../components/admin/PhotoUploader'
import RequestDetail, { RatingBadge } from '../components/quotes/RequestDetail'
import { quotesApi, statusLabel, STATUS_META, eur, fmtShort, type QItem, type QRole, type WorkshopOpt } from '../lib/quotesApi'

// Listas del formulario del cliente (apartado 5 del PDF del módulo de visita).
const EXHAUST_ZONES = ['Colector', 'Catalizador', 'FAP / DPF', 'Flexible', 'Tubo intermedio', 'Silencioso', 'Válvulas', 'Colas', 'Línea completa', 'No lo sé']
const WORK_TYPES = ['Reparación', 'Fabricación a medida', 'Instalación', 'Sustitución', 'Homologación', 'Ruido / fuga', 'Mejora de sonido', 'Otro']
const BUDGET_PREFS = ['Presupuesto directo si es posible', 'Acepto visita si hace falta', 'Solo talleres con visita gratuita']

type Prefill = Partial<Pick<QItem, 'car_model' | 'car_year' | 'service_type' | 'specifications' | 'exhaust_zone' | 'work_type' | 'location' | 'budget_preference' | 'media_urls'>> & { exclude?: string[] }

export default function QuotesPage() {
  const { profile, user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const canReceive = ['workshop', 'professional', 'premium'].includes(profile?.user_type ?? '')
  const [view, setView] = useState<'sent' | 'received'>(searchParams.get('view') === 'received' && canReceive ? 'received' : 'sent')
  const [items, setItems] = useState<QItem[] | null>(null)
  const [freeVisit, setFreeVisit] = useState(false)
  const [open, setOpen] = useState<string | null>(searchParams.get('r'))
  const [form, setForm] = useState<{ prefill?: Prefill; preset?: string } | null>(null)
  const role: QRole = view === 'received' ? 'workshop' : 'client'

  const load = useCallback(async () => {
    try {
      const r = await quotesApi.list(role)
      setItems(r.items)
      setFreeVisit(r.me.offers_free_visit)
    } catch (e) { toast.error((e as Error).message); setItems([]) }
  }, [role])

  useEffect(() => { if (user) { setItems(null); void load() } }, [user, load])
  // Llegada desde "Solicitar presupuesto" de una ficha: abre el formulario apuntando a ese taller.
  useEffect(() => { const t = searchParams.get('taller'); if (t) setForm({ preset: t }) }, [searchParams])
  // Llegada desde un aviso (?view=…&r=…): abre esa solicitud.
  useEffect(() => {
    const r = searchParams.get('r'), v = searchParams.get('view')
    if (v === 'received' && canReceive) setView('received')
    if (v === 'sent') setView('sent')
    if (r) setOpen(r)
  }, [searchParams, canReceive])
  useEffect(() => {
    if (!open || !items) return
    const el = document.getElementById(`q-${open}`)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [open, items])

  const toggle = (id: string) => {
    const next = open === id ? null : id
    setOpen(next)
    const sp = new URLSearchParams(searchParams)
    if (next) sp.set('r', next); else sp.delete('r')
    sp.set('view', view)
    setSearchParams(sp, { replace: true })
  }
  const switchView = (v: 'sent' | 'received') => { setView(v); setOpen(null); setSearchParams({ view: v }, { replace: true }) }
  const otherWorkshop = (it: QItem) => setForm({ prefill: {
    car_model: it.car_model, car_year: it.car_year, service_type: it.service_type, specifications: it.specifications, exhaust_zone: it.exhaust_zone,
    work_type: it.work_type, location: it.location, budget_preference: it.budget_preference, media_urls: it.media_urls,
    exclude: (items ?? []).filter((x) => x.request_group_id && x.request_group_id === it.request_group_id).map((x) => x.counterpart.id).concat(it.counterpart.id),
  } })

  // Cliente: una tarjeta por envío (mismo request_group_id = mismo trabajo enviado a varios talleres).
  const groups = useMemo(() => {
    if (!items || role !== 'client') return []
    const m = new Map<string, QItem[]>()
    for (const it of items) { const k = it.request_group_id ?? it.id; m.set(k, [...(m.get(k) ?? []), it]) }
    return [...m.values()]
  }, [items, role])

  const toggleFree = async () => {
    try { const r = await quotesApi.act('set_free_visit', { enabled: !freeVisit }); setFreeVisit(!freeVisit); toast.success(r.ok && !freeVisit ? 'Ahora apareces con «Visita de diagnóstico gratuita disponible»' : 'Etiqueta de visita gratuita quitada') }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="content-width" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        <h1 className="text-headline" style={{ color: '#1D1D1F', margin: 0 }}>Cotizaciones</h1>
        <button onClick={() => setForm({})} className="btn-pill btn-primary" style={{ gap: 8, display: 'inline-flex', alignItems: 'center' }}>
          <Plus size={18} /> Nueva solicitud
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'flex', backgroundColor: '#F5F5F7', borderRadius: 980, padding: 4, width: 'fit-content' }}>
          {(['sent', ...(canReceive ? ['received'] : [])] as ('sent' | 'received')[]).map((v) => (
            <button key={v} onClick={() => switchView(v)} style={{
              padding: '10px 22px', borderRadius: 980, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
              backgroundColor: view === v ? '#FFFFFF' : 'transparent', color: view === v ? '#1D1D1F' : '#6E6E73', boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>{v === 'sent' ? 'Mis solicitudes' : 'Recibidas'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {view === 'received' && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3A3A3C', cursor: 'pointer' }} title="Se muestra a los clientes al elegir taller">
              <input type="checkbox" checked={freeVisit} onChange={() => void toggleFree()} /> <Gift size={14} /> Ofrezco visita de diagnóstico gratuita
            </label>
          )}
          <button onClick={() => { setItems(null); void load() }} style={{ ...linkBtn, fontSize: 13 }} aria-label="Actualizar"><RefreshCw size={14} /></button>
        </div>
      </div>

      {form && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, overflowY: 'auto', padding: '40px 0' }}
          onClick={(e) => { if (e.target === e.currentTarget) setForm(null) }}>
          <div style={{ width: '100%', maxWidth: 620, margin: '0 16px' }}>
            <NewQuoteRequestForm presetWorkshopId={form.preset} prefill={form.prefill} onClose={() => setForm(null)}
              onSuccess={() => { setForm(null); if (view !== 'sent') switchView('sent'); else { setItems(null); void load() } }} />
          </div>
        </div>
      )}

      {!items ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '70px 0', color: '#86868B', gap: 10, alignItems: 'center' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Cargando…
        </div>
      ) : items.length === 0 ? (
        <EmptyState message={view === 'sent' ? 'No has enviado ninguna solicitud de presupuesto todavía.' : 'No has recibido ninguna solicitud de presupuesto todavía.'} />
      ) : role === 'client' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {groups.map((g) => (
            <div key={g[0].request_group_id ?? g[0].id} className="card-flat" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px' }}>{g[0].service_type}</h3>
                  <p style={{ fontSize: 14, color: '#6E6E73', margin: 0 }}>{g[0].car_model} ({g[0].car_year})</p>
                </div>
                <span style={{ fontSize: 12, color: '#86868B' }}>{fmtShort(g[0].created_at)} · {g.length} taller{g.length === 1 ? '' : 'es'}</span>
              </div>
              <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                {g.map((it) => <Line key={it.id} it={it} open={open === it.id} onToggle={() => toggle(it.id)} onChanged={load} onOtherWorkshop={otherWorkshop} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((it) => (
            <div key={it.id} className="card-flat" style={{ padding: 16 }}>
              <Line it={it} open={open === it.id} onToggle={() => toggle(it.id)} onChanged={load} workshopView />
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

/** Una solicitud (fila) con su detalle desplegable. */
function Line({ it, open, onToggle, onChanged, onOtherWorkshop, workshopView }: { it: QItem; open: boolean; onToggle: () => void; onChanged: () => void; onOtherWorkshop?: (i: QItem) => void; workshopView?: boolean }) {
  const meta = STATUS_META[it.status]
  const tone = meta?.tone ?? 'gray'
  const summary = lineSummary(it)
  const actionNeeded = (it.role === 'client' && ['info_requested', 'quoted', 'visit_requested', 'final_sent'].includes(it.status))
    || (it.role === 'workshop' && ['pending', 'visit_accepted', 'visit_scheduled', 'visit_done'].includes(it.status))
  return (
    <div id={`q-${it.id}`} style={{ border: workshopView ? 'none' : '1px solid #E5E5EA', borderRadius: 12, padding: workshopView ? 0 : '10px 12px', scrollMarginTop: 80 }}>
      <button type="button" onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
        {open ? <ChevronDown size={16} color="#86868B" /> : <ChevronRight size={16} color="#86868B" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          {workshopView ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F' }}>{it.service_type}</div>
              <div style={{ fontSize: 13, color: '#6E6E73' }}>{it.counterpart.name} · {it.car_model} ({it.car_year}){it.location ? ` · ${it.location}` : ''}</div>
            </>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {it.counterpart.name} <RatingBadge r={it.counterpart.rating} />
              {it.counterpart.distance_km != null && <span style={{ fontSize: 12, color: '#86868B', fontWeight: 400 }}><MapPin size={11} /> {it.counterpart.distance_km.toLocaleString('es-ES')} km</span>}
            </div>
          )}
          {summary && <div style={{ fontSize: 12.5, color: '#3A3A3C', marginTop: 2 }}>{summary}</div>}
        </div>
        {actionNeeded && <span title="Te toca" style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF9500', flexShrink: 0 }} />}
        <span className={`badge badge-${tone}`} style={{ flexShrink: 0 }}>{statusLabel(it.status, it.role)}</span>
      </button>
      {open && <RequestDetail item={it} onChanged={onChanged} onOtherWorkshop={onOtherWorkshop} />}
    </div>
  )
}

function lineSummary(it: QItem): string | null {
  const v = it.visit
  if (it.status === 'quoted') { const q = [...it.quotes].reverse().find((x) => x.price != null); return q ? `Presupuesto: ${eur(q.price)}` : null }
  if (it.status === 'visit_requested' && v) return `Visita de ${v.duration_min} min · ${v.pricing === 'gratis' ? 'gratis' : eur(v.fee)}`
  if (it.status === 'visit_scheduled' && v?.scheduled_at) return `Cita: ${new Date(v.scheduled_at).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
  if ((it.status === 'final_sent' || it.status === 'contracted') && it.final) return `Presupuesto final: ${eur(it.final.amount_due)}`
  if (it.status === 'contracted') { const q = [...it.quotes].reverse().find((x) => x.price != null); return q ? `Acordado: ${eur(q.price)}` : null }
  if (it.messages.length) return `Último mensaje: ${it.messages[it.messages.length - 1].body.slice(0, 80)}`
  return null
}

// ─────────────────────────────── nueva solicitud (apartado 5) ───────────────────────────────
interface VehicleOpt { id: string; brand: string; model: string; generation: string | null; year_from: number; year_to: number | null }
interface EngineOpt { id: string; version: string; fuel: string | null; power_cv: number | null }

function NewQuoteRequestForm({ onClose, onSuccess, presetWorkshopId, prefill }: { onClose: () => void; onSuccess: () => void; presetWorkshopId?: string; prefill?: Prefill }) {
  const [workshops, setWorkshops] = useState<WorkshopOpt[] | null>(null)
  const [targetIds, setTargetIds] = useState<string[]>(presetWorkshopId ? [presetWorkshopId] : [])
  // Vehículo: del catálogo (autocompleta marca/modelo/motor) o escrito a mano.
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([])
  const [vq, setVq] = useState('')
  const [vehicle, setVehicle] = useState<VehicleOpt | null>(null)
  const [engines, setEngines] = useState<EngineOpt[]>([])
  const [engineId, setEngineId] = useState('')
  const [manual, setManual] = useState(!!prefill?.car_model)
  const [carModel, setCarModel] = useState(prefill?.car_model ?? '')
  const [carYear, setCarYear] = useState<number>(prefill?.car_year ?? new Date().getFullYear())
  const [serviceType, setServiceType] = useState(prefill?.service_type ?? '')
  const [specifications, setSpecifications] = useState(prefill?.specifications ?? '')
  const [exhaustZone, setExhaustZone] = useState(prefill?.exhaust_zone ?? '')
  const [workType, setWorkType] = useState(prefill?.work_type ?? '')
  const [location, setLocation] = useState(prefill?.location ?? '')
  const [budgetPref, setBudgetPref] = useState(prefill?.budget_preference ?? BUDGET_PREFS[0])
  const [media, setMedia] = useState<{ coverUrl: string | null; galleryUrls: string[] }>({ coverUrl: prefill?.media_urls?.[0] ?? null, galleryUrls: prefill?.media_urls?.slice(1) ?? [] })
  const [tempId] = useState(() => 'quote-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    quotesApi.workshops().then((r) => setWorkshops(r.items)).catch(() => setWorkshops([]))
    supabase.from('vehicles').select('id, brand, model, generation, year_from, year_to').order('brand').order('model').limit(2000)
      .then(({ data }) => setVehicles((data as VehicleOpt[]) ?? []))
  }, [])
  useEffect(() => {
    setEngines([]); setEngineId('')
    if (!vehicle) return
    supabase.from('engines').select('id, version, fuel, power_cv').eq('vehicle_id', vehicle.id).order('version')
      .then(({ data }) => setEngines((data as EngineOpt[]) ?? []))
  }, [vehicle])

  const vMatches = useMemo(() => {
    const t = vq.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!t.length) return []
    return vehicles.filter((v) => { const h = `${v.brand} ${v.model} ${v.generation ?? ''}`.toLowerCase(); return t.every((x) => h.includes(x)) }).slice(0, 8)
  }, [vq, vehicles])
  const pickVehicle = (v: VehicleOpt) => {
    setVehicle(v); setVq('')
    const y = new Date().getFullYear()
    setCarYear(Math.min(Math.max(carYear, v.year_from), v.year_to ?? y))
  }
  const engine = engines.find((e) => e.id === engineId)
  const finalCarModel = manual || !vehicle ? carModel : `${vehicle.brand} ${vehicle.model}${vehicle.generation ? ` (${vehicle.generation})` : ''}${engine ? ` · ${engine.version}` : ''}`

  const onlyFree = budgetPref === BUDGET_PREFS[2]
  const exclude = new Set(prefill?.exclude ?? [])
  const list = (workshops ?? []).filter((w) => !exclude.has(w.id) && (!onlyFree || w.offers_free_visit))
  const presetMissing = presetWorkshopId && workshops && !workshops.some((w) => w.id === presetWorkshopId)
  const toggleTarget = (id: string) => setTargetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (targetIds.length === 0) { setError('Selecciona al menos un taller'); return }
    if (!finalCarModel.trim()) { setError('Indica tu vehículo'); return }
    setSubmitting(true); setError('')
    try {
      await quotesApi.act('create_request', {
        target_user_ids: targetIds, car_model: finalCarModel, car_year: carYear, vehicle_id: !manual ? vehicle?.id ?? null : null, engine_id: !manual ? engineId || null : null,
        service_type: serviceType, specifications, exhaust_zone: exhaustZone || null, work_type: workType || null, location: location || null,
        budget_preference: budgetPref || null, media_urls: [media.coverUrl, ...media.galleryUrls].filter(Boolean),
      })
      toast.success(`Solicitud enviada${targetIds.length > 1 ? ` a ${targetIds.length} talleres` : ''}`)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la solicitud')
    } finally { setSubmitting(false) }
  }

  const lbl: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 28, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1D1D1F', margin: '0 0 6px' }}>Nueva solicitud de presupuesto</h2>
        <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868B' }}><X size={20} /></button>
      </div>
      <p style={{ fontSize: 14, color: '#6E6E73', margin: '0 0 20px' }}>Puedes enviarla a varios talleres a la vez. Si no puedes aportar buenas fotos, el taller puede proponerte una visita de diagnóstico.</p>
      {error && <div style={{ backgroundColor: 'rgba(255,59,48,0.08)', color: '#FF3B30', borderRadius: 12, padding: 14, marginBottom: 18, fontSize: 14 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={lbl}>Vehículo</label>
          {!manual && !vehicle && (
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 13, color: '#86868B' }} />
              <input className="input-apple" style={{ paddingLeft: 34 }} value={vq} onChange={(e) => setVq(e.target.value)} placeholder="Busca tu coche: marca, modelo, generación… (p. ej. golf mk7)" />
              {vMatches.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  {vMatches.map((v) => (
                    <button key={v.id} type="button" onClick={() => pickVehicle(v)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 'none', borderBottom: '1px solid #F2F2F7', cursor: 'pointer', fontSize: 14 }}>
                      <strong>{v.brand} {v.model}</strong> <span style={{ color: '#86868B' }}>{v.generation ?? ''} · {v.year_from}{v.year_to ? `–${v.year_to}` : '+'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!manual && vehicle && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 12, background: '#F5F8FF', border: '1px solid #DCE8FF' }}>
                <span style={{ flex: 1, fontSize: 14 }}><strong>{vehicle.brand} {vehicle.model}</strong> {vehicle.generation ? `· ${vehicle.generation}` : ''}</span>
                <button type="button" onClick={() => setVehicle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868B' }} aria-label="Cambiar vehículo"><X size={15} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px', gap: 8 }}>
                <select className="input-apple" value={engineId} onChange={(e) => setEngineId(e.target.value)}>
                  <option value="">Motor / versión (opcional)</option>
                  {engines.map((e) => <option key={e.id} value={e.id}>{e.version}{e.fuel ? ` · ${e.fuel}` : ''}{e.power_cv ? ` · ${e.power_cv} CV` : ''}</option>)}
                </select>
                <input type="number" className="input-apple" value={carYear} min={vehicle.year_from} max={vehicle.year_to ?? new Date().getFullYear() + 1} onChange={(e) => setCarYear(parseInt(e.target.value) || vehicle.year_from)} aria-label="Año" />
              </div>
            </div>
          )}
          {manual && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px', gap: 8 }}>
              <input type="text" className="input-apple" value={carModel} onChange={(e) => setCarModel(e.target.value)} required placeholder="Marca, modelo y motor (p. ej. Toyota GR Yaris 1.6)" />
              <input type="number" className="input-apple" value={carYear} onChange={(e) => setCarYear(parseInt(e.target.value))} required min={1900} max={new Date().getFullYear() + 1} aria-label="Año" />
            </div>
          )}
          <button type="button" style={{ ...linkBtn, fontSize: 12.5, marginTop: 6 }} onClick={() => { setManual(!manual); if (!manual && vehicle) setCarModel(finalCarModel) }}>
            {manual ? 'Buscar en el catálogo' : '¿No aparece tu coche? Escríbelo a mano'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div><label style={lbl}>Zona del escape</label>
            <select value={exhaustZone ?? ''} onChange={(e) => setExhaustZone(e.target.value)} className="input-apple"><option value="">Selecciona…</option>{EXHAUST_ZONES.map((z) => <option key={z}>{z}</option>)}</select></div>
          <div><label style={lbl}>Tipo de trabajo</label>
            <select value={workType ?? ''} onChange={(e) => setWorkType(e.target.value)} className="input-apple"><option value="">Selecciona…</option>{WORK_TYPES.map((w) => <option key={w}>{w}</option>)}</select></div>
        </div>
        <div><label style={lbl}>Título corto</label>
          <input type="text" value={serviceType} onChange={(e) => setServiceType(e.target.value)} required placeholder="Ej.: Ruido metálico al acelerar / línea deportiva con válvulas" className="input-apple" /></div>
        <div><label style={lbl}>Descripción</label>
          <textarea value={specifications} onChange={(e) => setSpecifications(e.target.value)} required rows={4} className="input-apple" style={{ resize: 'vertical' }}
            placeholder='Cuéntalo con tus palabras: "tiene fuga", "suena metálico", "quiero línea deportiva", "no sé qué pieza es"…' /></div>
        <div>
          <label style={lbl}>Fotos / vídeos (opcional)</label>
          <p style={{ fontSize: 12, color: '#86868B', margin: '0 0 8px' }}>Nunca obligatorias: si no puedes hacerlas bien, el taller puede pedirte una visita de diagnóstico.</p>
          <PhotoUploader schemaId={`${tempId}/media`} coverUrl={media.coverUrl} galleryUrls={media.galleryUrls} onChange={setMedia} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div><label style={lbl}><MapPin size={12} style={{ verticalAlign: 'middle' }} /> Ubicación (CP / ciudad)</label>
            <input type="text" value={location ?? ''} onChange={(e) => setLocation(e.target.value)} placeholder="Ej.: 28010 Madrid" className="input-apple" /></div>
          <div><label style={lbl}>Preferencia de presupuesto</label>
            <select value={budgetPref ?? ''} onChange={(e) => setBudgetPref(e.target.value)} className="input-apple">{BUDGET_PREFS.map((b) => <option key={b}>{b}</option>)}</select></div>
        </div>

        <div>
          <label style={lbl}>Talleres a los que se envía{targetIds.length > 0 ? ` (${targetIds.length})` : ''}</label>
          {presetMissing && <p style={{ fontSize: 12.5, color: '#3A3A3C', margin: '0 0 6px' }}>✓ Incluye el taller desde el que pediste presupuesto.</p>}
          {!workshops ? <p style={{ fontSize: 13, color: '#86868B' }}>Cargando talleres…</p>
            : list.length === 0 ? <p style={{ color: '#FF9500', fontSize: 12.5 }}>{onlyFree ? 'Ningún taller ofrece ahora visita gratuita: cambia la preferencia para ver todos.' : 'No hay talleres verificados disponibles todavía.'}</p>
            : (
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #E5E5EA', borderRadius: 12, padding: 6, display: 'grid', gap: 2 }}>
                {list.map((w) => (
                  <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: targetIds.includes(w.id) ? '#F0F7FF' : 'transparent' }}>
                    <input type="checkbox" checked={targetIds.includes(w.id)} onChange={() => toggleTarget(w.id)} style={{ width: 16, height: 16, accentColor: '#0071E3' }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14, color: '#1D1D1F', fontWeight: 500 }}>{w.name}</span> <RatingBadge r={w.rating} />
                      {w.offers_free_visit && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: '#1E8E3E', background: '#E8F7EE', borderRadius: 999, padding: '2px 7px' }}>Visita de diagnóstico gratuita disponible</span>}
                      <span style={{ display: 'block', fontSize: 12, color: '#86868B' }}>{[w.distance_km != null ? `${w.distance_km.toLocaleString('es-ES')} km` : null, w.address].filter(Boolean).join(' · ')}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
        </div>

        <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
          <button type="submit" disabled={submitting} className="btn-pill btn-primary" style={{ flex: 1, opacity: submitting ? 0.5 : 1 }}>
            {submitting ? 'Enviando…' : `Enviar solicitud${targetIds.length > 1 ? ` a ${targetIds.length} talleres` : ''}`}
          </button>
          <button type="button" onClick={onClose} className="btn-pill btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-flat" style={{ padding: '56px 32px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: '#E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={24} style={{ color: '#86868B' }} /></div>
      </div>
      <p style={{ fontSize: 14, color: '#86868B', margin: 0 }}>{message}</p>
    </div>
  )
}
const linkBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#0071E3', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }
