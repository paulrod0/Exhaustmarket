import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Inbox, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, Pencil, Filter, History,
  ClipboardCheck, Users, Layers, RefreshCw, ExternalLink,
} from 'lucide-react'
import { adminFetch, notifyReviewChanged } from '../../lib/adminApi'
import { toast } from '../../lib/toast'
import AdminQAPanelPage from './AdminQAPanelPage'
import AdminSubmissionsPage from './AdminSubmissionsPage'

interface Counts { publicacion: number; qa: number; envios: number; by_entity: Record<string, number>; qa_by_entity: Record<string, number> }
interface Item {
  entity: string; entity_label: string; id: string; title: string | null; brand: string | null; model: string | null
  pub_status: string; origen: string | null; lote_id: string | null; created_at: string; has_changes: boolean
}
interface Detail {
  entity: string; entity_label: string; pub_col: string
  record: Record<string, any>
  audit: any[]; qa: any[]; batch: any | null
}

const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas las entidades' },
  { value: 'vehicles', label: 'Vehículos' },
  { value: 'engines', label: 'Motorizaciones' },
  { value: 'exhaust_diagrams', label: 'Diagramas' },
  { value: 'exhaust_parts', label: 'Componentes OEM' },
  { value: 'exhaust_aftermarket_products', label: 'Productos aftermarket' },
  { value: 'compatibilities', label: 'Compatibilidades' },
  { value: 'exhaust_schemas', label: 'Esquemas' },
  { value: 'articles', label: 'Guías' },
  { value: 'manuals', label: 'Manuales' },
  { value: 'design_3d', label: 'Archivos 3D' },
  { value: 'schema_article_links', label: 'Relaciones guía↔esquema' },
  { value: 'schema_manual_links', label: 'Relaciones manual↔esquema' },
  { value: 'schema_3d_links', label: 'Relaciones 3D↔esquema' },
]
const ORIGEN_OPTIONS = [
  { value: '', label: 'Cualquier origen' },
  { value: 'api', label: 'API' },
  { value: 'importacion', label: 'Importación CSV' },
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'admin', label: 'Admin' },
  { value: 'migracion', label: 'Migración' },
]
// Columnas que no aportan al revisar (se muestran aparte o son ruido).
const HIDDEN_FIELDS = new Set(['_title', 'pending_changes', 'pub_status', 'status', 'origen', 'lote_id', 'review_note',
  'reviewed_by', 'reviewed_at', 'id_externo', 'created_by', 'updated_at'])

type Tab = 'publicacion' | 'qa' | 'envios' | 'auditoria'

export default function AdminReviewInboxPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'publicacion'
  const setTab = (t: Tab) => { const p = new URLSearchParams(params); p.set('tab', t); setParams(p, { replace: true }) }
  const [counts, setCounts] = useState<Counts | null>(null)

  const loadCounts = useCallback(async () => {
    try { setCounts(await adminFetch<Counts>('/api/review', { query: { op: 'counts' } })) } catch { /* el badge no es crítico */ }
  }, [])
  useEffect(() => { void loadCounts() }, [loadCounts])

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'publicacion', label: 'Publicación', icon: Inbox, count: counts?.publicacion },
    { id: 'qa', label: 'Verificación QA', icon: ClipboardCheck, count: counts?.qa },
    { id: 'envios', label: 'Envíos de colaboradores', icon: Users, count: counts?.envios },
    { id: 'auditoria', label: 'Auditoría', icon: History },
  ]

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Inbox size={22} /> Bandeja de revisión
        </h1>
        <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0', maxWidth: 760, lineHeight: 1.5 }}>
          Todo lo que necesita tu visto bueno, en un solo sitio. Lo que entra por <strong>API, importación o colaboradores</strong> nace
          <strong> pendiente</strong> y no se ve en la web hasta que lo apruebas aquí.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap', borderBottom: '1px solid #E5E5EA' }}>
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: 'none', background: 'none',
              borderBottom: `2px solid ${active ? '#0071E3' : 'transparent'}`, color: active ? '#0071E3' : '#3A3A3C',
              fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', marginBottom: -1,
            }}>
              <Icon size={14} /> {t.label}
              {typeof t.count === 'number' && (
                <span style={{ background: t.count ? (active ? '#0071E3' : '#FF9500') : '#E5E5EA', color: t.count ? '#fff' : '#86868B', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                  {t.count > 999 ? '999+' : t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'publicacion' && <PublicationQueue counts={counts} initialLote={params.get('lote') ?? ''} onChanged={() => { void loadCounts(); notifyReviewChanged() }} />}
      {tab === 'qa' && (
        <div>
          <Explainer>
            <strong>Verificación QA</strong> = control de calidad de los datos del catálogo técnico (metodología del dossier:
            enviado → aprobado / necesita cambios / duplicado). Es independiente de la publicación: lo existente sigue visible
            mientras se verifica.
          </Explainer>
          <AdminQAPanelPage />
        </div>
      )}
      {tab === 'envios' && (
        <div>
          <Explainer>
            Formularios enviados por colaboradores (Ruta A y Ruta B). Al aprobar uno se crea el esquema como borrador; el
            escaneo 3D adjunto se verifica y se sube a Diseños 3D.
          </Explainer>
          <AdminSubmissionsPage />
        </div>
      )}
      {tab === 'auditoria' && <AuditLog />}
    </div>
  )
}

function Explainer({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12.5, color: '#3A3A3C', background: '#F5F8FF', border: '1px solid #DCE8FB', borderRadius: 10, padding: '10px 14px', margin: '0 0 16px', lineHeight: 1.5 }}>{children}</p>
}

// ─────────────────────────────── Cola de PUBLICACIÓN ───────────────────────────────
function PublicationQueue({ counts, initialLote, onChanged }: { counts: Counts | null; initialLote: string; onChanged: () => void }) {
  const [entity, setEntity] = useState('')
  const [origen, setOrigen] = useState('')
  const [lote, setLote] = useState(initialLote)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const key = (it: { entity: string; id: string }) => `${it.entity}:${it.id}`

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminFetch<{ items: Item[] }>('/api/review', { query: { op: 'list', entity, origen, lote, q, from, to } })
      setItems(r.items)
      setSelected(new Set())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [entity, origen, lote, q, from, to])
  useEffect(() => { const t = setTimeout(() => { void load() }, 250); return () => clearTimeout(t) }, [load])

  const allSelected = items.length > 0 && items.every((it) => selected.has(key(it)))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map(key)))
  const toggle = (it: Item) => setSelected((prev) => { const n = new Set(prev); n.has(key(it)) ? n.delete(key(it)) : n.add(key(it)); return n })

  async function act(op: 'approve' | 'reject', targets: { table: string; id: string }[] | { lote_id: string }) {
    let note = ''
    if (op === 'reject') {
      note = window.prompt('Motivo del rechazo (queda registrado en la auditoría):', '') ?? ''
      if (!note.trim()) { toast.error('El rechazo necesita un motivo.'); return }
    }
    setBusy(true)
    try {
      const body = Array.isArray(targets) ? { op, items: targets, note } : { op, lote_id: targets.lote_id, note }
      const r = await adminFetch<{ processed: number; total: number }>('/api/review', { body })
      toast.success(`${op === 'approve' ? 'Aprobados' : 'Rechazados'}: ${r.processed} de ${r.total}`)
      setOpen(null)
      await load()
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const selectedTargets = items.filter((it) => selected.has(key(it))).map((it) => ({ table: it.entity, id: it.id }))
  const loteActivo = lote && /^[0-9a-f-]{36}$/i.test(lote) ? lote : ''

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <Filter size={14} style={{ color: '#86868B' }} />
        <select value={entity} onChange={(e) => setEntity(e.target.value)} style={ctl}>
          {ENTITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}{o.value && counts?.by_entity?.[o.value] ? ` (${counts.by_entity[o.value]})` : ''}
            </option>
          ))}
        </select>
        <select value={origen} onChange={(e) => setOrigen(e.target.value)} style={ctl}>
          {ORIGEN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Marca, modelo o título…" style={{ ...ctl, minWidth: 200 }} />
        <input value={lote} onChange={(e) => setLote(e.target.value.trim())} placeholder="Lote (id)" style={{ ...ctl, width: 150, fontFamily: 'ui-monospace, monospace', fontSize: 11 }} />
        <label style={{ fontSize: 12, color: '#86868B' }}>desde <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={ctl} /></label>
        <label style={{ fontSize: 12, color: '#86868B' }}>hasta <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={ctl} /></label>
        <button onClick={() => void load()} style={ghostBtn} title="Recargar"><RefreshCw size={13} /></button>
      </div>

      {/* Acciones en bloque */}
      {(selected.size > 0 || loteActivo) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: '#F0F7FF', border: '1px solid #CFE4FF', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
          {selected.size > 0 && <>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0060C0' }}>{selected.size} seleccionado{selected.size === 1 ? '' : 's'}</span>
            <button disabled={busy} onClick={() => act('approve', selectedTargets)} style={approveBtn}><CheckCircle2 size={14} /> Aprobar</button>
            <button disabled={busy} onClick={() => act('reject', selectedTargets)} style={rejectBtn}><XCircle size={14} /> Rechazar</button>
          </>}
          {loteActivo && (
            <button disabled={busy} onClick={() => { if (window.confirm('¿Aprobar TODO el lote filtrado?')) void act('approve', { lote_id: loteActivo }) }} style={approveBtn}>
              <Layers size={14} /> Aprobar lote completo
            </button>
          )}
          {busy && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} />}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} /></div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '44px 20px', background: '#fff', border: '1px solid #E5E5EA', borderRadius: 14 }}>
          <CheckCircle2 size={30} style={{ color: '#34C759', marginBottom: 8 }} />
          <p style={{ margin: 0, fontWeight: 600, color: '#1D1D1F' }}>¡Todo al día! No hay nada pendiente de publicar.</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#86868B' }}>
            Aquí aparecerá lo que llegue por API, importación CSV o colaboradores, y los cambios propuestos a fichas ya publicadas.
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 150px 1fr 120px 110px 92px', gap: 10, padding: '9px 14px', background: '#F5F5F7', fontSize: 11, fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em', alignItems: 'center' }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>Tipo</span><span>Registro</span><span>Origen</span><span>Lote</span><span>Fecha</span>
          </div>
          {items.map((it) => (
            <div key={key(it)} style={{ borderTop: '1px solid #F2F2F7' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '28px 150px 1fr 120px 110px 92px', gap: 10, padding: '10px 14px', alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={selected.has(key(it))} onChange={() => toggle(it)} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0060C0', background: '#EAF3FF', borderRadius: 6, padding: '3px 7px', justifySelf: 'start' }}>{it.entity_label}</span>
                <button onClick={() => setOpen(open === key(it) ? null : key(it))} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, color: '#1D1D1F' }}>
                  {open === key(it) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{it.title || '(sin título)'}</span>
                  {it.has_changes && <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#8A6D00', background: '#FFF3CD', borderRadius: 6, padding: '2px 6px' }}>CAMBIOS PROPUESTOS</span>}
                </button>
                <span style={{ fontSize: 12, color: '#3A3A3C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.origen ?? ''}>{origenLabel(it.origen)}</span>
                <span>{it.lote_id
                  ? <button onClick={() => setLote(it.lote_id!)} title="Filtrar por este lote" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#0071E3' }}>{it.lote_id.slice(0, 8)}…</button>
                  : <span style={{ color: '#C7C7CC' }}>—</span>}</span>
                <span style={{ fontSize: 12, color: '#86868B' }}>{new Date(it.created_at).toLocaleDateString('es-ES')}</span>
              </div>
              {open === key(it) && <DetailPanel item={it} busy={busy} onAct={(op) => act(op, [{ table: it.entity, id: it.id }])} />}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function DetailPanel({ item, busy, onAct }: { item: Item; busy: boolean; onAct: (op: 'approve' | 'reject') => void }) {
  const [d, setD] = useState<Detail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let cancel = false
    adminFetch<Detail>('/api/review', { query: { op: 'detail', table: item.entity, id: item.id } })
      .then((r) => { if (!cancel) setD(r) })
      .catch((e) => { if (!cancel) setErr((e as Error).message) })
    return () => { cancel = true }
  }, [item.entity, item.id])

  const editPath = useMemo(() => d ? editorPath(item.entity, d.record) : null, [d, item.entity])
  if (err) return <div style={{ padding: 14, color: '#B91C1C', fontSize: 13 }}>{err}</div>
  if (!d) return <div style={{ padding: 16 }}><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} /></div>

  const rec = d.record
  const pc = rec.pending_changes && typeof rec.pending_changes === 'object' ? rec.pending_changes as Record<string, unknown> : null
  const fields = Object.entries(rec).filter(([k, v]) => !HIDDEN_FIELDS.has(k) && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))

  return (
    <div style={{ padding: '4px 18px 18px 52px', background: '#FAFAFC' }}>
      {pc && pc._delete === true && (
        <div style={{ background: '#FEEDEC', border: '1px solid #FCA5A5', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 12.5, color: '#B91C1C' }}>
          <strong>Eliminación propuesta.</strong> Aprobar = quitar esta relación de la web. Rechazar = se mantiene publicada.
        </div>
      )}
      {pc && pc._delete !== true && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FFE08A', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6D00', marginBottom: 6 }}>Cambios propuestos (no visibles hasta aprobarlos)</div>
          {Object.entries(pc).map(([k, v]) => (
            <div key={k} style={{ fontSize: 12.5, color: '#3A3A3C', marginBottom: 3 }}>
              <code style={{ fontSize: 11.5 }}>{k}</code>: <span style={{ color: '#B91C1C', textDecoration: 'line-through' }}>{fmt(rec[k])}</span> → <span style={{ color: '#1A8C1A', fontWeight: 600 }}>{fmt(v)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px 18px', margin: '8px 0 12px' }}>
        {fields.map(([k, v]) => (
          <div key={k} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
            <div style={{ fontSize: 13, color: '#1D1D1F', overflowWrap: 'anywhere' }}><Value v={v} /></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#86868B', marginBottom: 10 }}>
        <span>Origen: <strong style={{ color: '#3A3A3C' }}>{origenLabel(rec.origen)}</strong></span>
        {rec.id_externo && <span>id_externo: <code>{rec.id_externo}</code></span>}
        {d.batch && <span>Lote: <code>{String(d.batch.id).slice(0, 8)}</code> · {d.batch.total} registros · {new Date(d.batch.created_at).toLocaleString('es-ES')}</span>}
      </div>

      {(d.audit.length > 0 || d.qa.length > 0) && (
        <details style={{ marginBottom: 12 }}>
          <summary style={{ fontSize: 12, fontWeight: 600, color: '#3A3A3C', cursor: 'pointer' }}>Historial ({d.audit.length + d.qa.length})</summary>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.audit.map((a) => (
              <div key={a.id} style={{ fontSize: 12, color: '#3A3A3C' }}>
                {new Date(a.created_at).toLocaleString('es-ES')} · <strong>{actionLabel(a.action)}</strong> {a.prev_status ? `${a.prev_status} → ${a.new_status}` : ''} · {a.actor_label}{a.note ? ` · «${a.note}»` : ''}
              </div>
            ))}
            {d.qa.map((r) => (
              <div key={r.id} style={{ fontSize: 12, color: '#3A3A3C' }}>
                {new Date(r.created_at).toLocaleString('es-ES')} · QA <strong>{r.action}</strong>{r.comments ? ` · «${r.comments}»` : ''}
              </div>
            ))}
          </div>
        </details>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button disabled={busy} onClick={() => onAct('approve')} style={approveBtn}><CheckCircle2 size={14} /> {pc ? 'Aprobar cambios' : 'Aprobar y publicar'}</button>
        <button disabled={busy} onClick={() => onAct('reject')} style={rejectBtn}><XCircle size={14} /> {pc ? 'Descartar cambios' : 'Rechazar'}</button>
        {editPath && (
          <Link to={editPath} style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Pencil size={13} /> Editar (y luego aprobar)
          </Link>
        )}
      </div>
    </div>
  )
}

function Value({ v }: { v: unknown }) {
  if (typeof v === 'string' && /^https?:\/\//.test(v)) {
    if (/\.(png|jpe?g|webp|avif|gif)(\?|$)/i.test(v) || v.includes('/api/img/')) {
      return <a href={v} target="_blank" rel="noreferrer"><img src={v} alt="" style={{ maxWidth: 160, maxHeight: 100, borderRadius: 6, border: '1px solid #E5E5EA', display: 'block' }} /></a>
    }
    return <a href={v} target="_blank" rel="noreferrer" style={{ color: '#0071E3' }}>{v.length > 60 ? v.slice(0, 60) + '…' : v} <ExternalLink size={10} /></a>
  }
  if (Array.isArray(v) && v.every((x) => typeof x === 'string' && /^https?:\/\//.test(x))) {
    return <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{v.map((u, i) => <Value key={i} v={u} />)}</span>
  }
  return <>{fmt(v)}</>
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'sí' : 'no'
  if (typeof v === 'object') { const s = JSON.stringify(v); return s.length > 160 ? s.slice(0, 160) + '…' : s }
  return String(v)
}

function origenLabel(o: string | null | undefined): string {
  if (!o) return '—'
  if (o.startsWith('api:')) return `API · ${o.slice(4)}`
  if (o.startsWith('colaborador:')) return 'Colaborador'
  if (o === 'importacion') return 'Importación CSV'
  if (o === 'migracion') return 'Migración'
  if (o === 'admin') return 'Admin'
  return o
}

function actionLabel(a: string): string {
  return ({ approve: 'Aprobado', reject: 'Rechazado', create: 'Creado', update: 'Actualizado', changes_proposed: 'Cambios propuestos', changes_approved: 'Cambios aprobados', changes_rejected: 'Cambios descartados', delete: 'Borrado', delete_approved: 'Eliminación aprobada' } as Record<string, string>)[a] ?? a
}

function editorPath(entity: string, rec: Record<string, any>): string | null {
  switch (entity) {
    case 'vehicles': return `/admin/data/vehiculos/${rec.id}`
    case 'engines': return rec.vehicle_id ? `/admin/data/vehiculos/${rec.vehicle_id}` : null
    case 'exhaust_parts': return `/admin/data/piezas/${rec.id}`
    case 'exhaust_aftermarket_products': return `/admin/data/productos/${rec.id}`
    case 'exhaust_schemas': return `/admin/esquemas/${rec.id}`
    case 'articles': return `/admin/articulos/${rec.id}`
    case 'manuals': return '/manuals'
    case 'design_3d': return '/designs'
    case 'schema_article_links': case 'schema_manual_links': case 'schema_3d_links': return rec.schema_id ? `/admin/esquemas/${rec.schema_id}` : null
    default: return null
  }
}

// ─────────────────────────────── AUDITORÍA ───────────────────────────────
function AuditLog() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    adminFetch<{ items: any[] }>('/api/review', { query: { op: 'audit', limit: 200 } })
      .then((r) => setItems(r.items)).catch((e) => toast.error((e as Error).message)).finally(() => setLoading(false))
  }, [])
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} /></div>
  if (!items.length) return <p style={{ color: '#86868B', fontSize: 13 }}>Aún no hay acciones de revisión registradas.</p>
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, overflow: 'hidden' }}>
      {items.map((a, i) => (
        <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '150px 140px 1fr', gap: 12, padding: '9px 14px', borderTop: i ? '1px solid #F2F2F7' : 'none', fontSize: 12.5 }}>
          <span style={{ color: '#86868B' }}>{new Date(a.created_at).toLocaleString('es-ES')}</span>
          <span style={{ fontWeight: 600, color: a.action.includes('reject') ? '#B91C1C' : '#1A8C1A' }}>{actionLabel(a.action)}</span>
          <span style={{ color: '#3A3A3C', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.table_name} <code style={{ fontSize: 11 }}>{String(a.record_id).slice(0, 8)}</code>
            {a.prev_status ? ` · ${a.prev_status} → ${a.new_status}` : ''} · {a.actor_label}{a.note ? ` · «${a.note}»` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

const ctl: React.CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid #E5E5EA', fontSize: 13, background: '#fff', outline: 'none' }
const ghostBtn: React.CSSProperties = { background: '#fff', border: '1px solid #E5E5EA', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, fontWeight: 600, color: '#3A3A3C', cursor: 'pointer' }
const approveBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1A8C1A', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const rejectBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
