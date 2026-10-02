import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Webhook, ScrollText, BookOpen, Plus, Copy, Check, Ban, Loader2, RefreshCw, Send, Trash2, ExternalLink, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { adminFetch } from '../../lib/adminApi'
import { toast } from '../../lib/toast'

/**
 * Admin → API y webhooks (Solicitud nº3, F2/F3).
 * Claves por integración (se muestran UNA vez), registro de llamadas, webhooks firmados y la guía de uso.
 * Todo va contra /api/v1/_admin/* con el token de Clerk del admin.
 */

interface ApiKey { id: string; name: string; key_prefix: string; scope: 'read' | 'read_write'; created_by: string | null; created_at: string; revoked_at: string | null; last_used_at: string | null; calls_24h: number; errors_24h: number }
interface CallLog { id: number; key_name: string | null; method: string; path: string; entity: string | null; records: number; status: number; error: string | null; duration_ms: number | null; created_at: string }
interface Hook { id: string; name: string; url: string; events: string[]; active: boolean; created_at: string; last_delivery_at: string | null; last_status: number | null; pending: number; failed: number }
interface Delivery { id: string; event: string; status: string; attempts: number; next_attempt_at: string; last_response_code: number | null; last_error: string | null; created_at: string; delivered_at: string | null }

const EVENT_LABEL: Record<string, string> = {
  'file.uploaded': 'Archivo subido (3D o manual)', 'record.created': 'Registro creado por API', 'record.approved': 'Registro aprobado',
  'record.rejected': 'Registro rechazado', 'batch.created': 'Lote recibido (API o importación)', 'submission.created': 'Envío de colaborador', 'test.ping': 'Prueba',
}
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—')

export default function AdminApiPage() {
  const [tab, setTab] = useState<'keys' | 'hooks' | 'logs' | 'docs'>(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    return t === 'hooks' || t === 'logs' || t === 'docs' ? t : 'keys'
  })
  const tabs = [['keys', 'Claves', KeyRound], ['hooks', 'Webhooks', Webhook], ['logs', 'Registro de llamadas', ScrollText], ['docs', 'Cómo se usa', BookOpen]] as const
  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <KeyRound size={22} /> API y webhooks
        </h1>
        <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0', maxWidth: 800, lineHeight: 1.5 }}>
          Acceso para integraciones externas (scripts, la herramienta de verificación OEM…). Cada integración tiene su propia clave.
          Todo lo que entra por la API llega <strong>pendiente de revisión</strong> a la <Link to="/admin/revision" style={{ color: '#0071E3' }}>Bandeja</Link> con
          su origen <code style={code}>api:&lt;nombre&gt;</code>; nada se publica sin que lo apruebes.
        </p>
      </header>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid #E5E5EA', overflowX: 'auto' }}>
        {tabs.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: `2px solid ${tab === id ? '#0071E3' : 'transparent'}`, color: tab === id ? '#0071E3' : '#3A3A3C', fontSize: 13, fontWeight: tab === id ? 700 : 500, marginBottom: -1,
          }}><Icon size={14} /> {label}</button>
        ))}
      </div>
      {tab === 'keys' && <KeysPanel />}
      {tab === 'hooks' && <HooksPanel />}
      {tab === 'logs' && <LogsPanel />}
      {tab === 'docs' && <DocsPanel />}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─────────────────────────────── CLAVES ───────────────────────────────
function KeysPanel() {
  const [items, setItems] = useState<ApiKey[] | null>(null)
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'read' | 'read_write'>('read_write')
  const [busy, setBusy] = useState(false)
  const [fresh, setFresh] = useState<{ name: string; key: string } | null>(null)

  const load = useCallback(() => {
    adminFetch<{ items: ApiKey[] }>('/api/v1/_admin/keys').then((r) => setItems(r.items)).catch((e) => toast.error((e as Error).message))
  }, [])
  useEffect(load, [load])

  async function create() {
    if (!name.trim()) return
    setBusy(true)
    try {
      const r = await adminFetch<{ name: string; key: string }>('/api/v1/_admin/keys', { method: 'POST', body: { name, scope } })
      setFresh({ name: r.name, key: r.key })
      setName('')
      load()
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  async function revoke(k: ApiKey) {
    if (!window.confirm(`¿Revocar la clave «${k.name}»? La integración dejará de funcionar al instante.`)) return
    try { await adminFetch(`/api/v1/_admin/keys/${k.id}/revoke`, { method: 'POST', body: {} }); toast.success('Clave revocada'); load() } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={card}>
        <h2 style={h2}>Nueva clave</h2>
        <p style={hint}>Una por integración (p. ej. <code style={code}>verificacion-oem</code>). El nombre queda como origen de todo lo que envíe: <code style={code}>api:verificacion-oem</code>.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))} placeholder="nombre-de-la-integracion"
            maxLength={40} style={{ ...input, flex: '1 1 220px' }} onKeyDown={(e) => { if (e.key === 'Enter') create() }} />
          <select value={scope} onChange={(e) => setScope(e.target.value as 'read' | 'read_write')} style={input}>
            <option value="read_write">Lectura + escritura</option>
            <option value="read">Solo lectura</option>
          </select>
          <button onClick={create} disabled={busy || name.length < 2} style={{ ...btnPrimary, opacity: busy || name.length < 2 ? 0.5 : 1 }}>
            {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />} Crear clave
          </button>
        </div>
        {fresh && <SecretBox title={`Clave de «${fresh.name}»`} value={fresh.key} onClose={() => setFresh(null)}
          note="Cópiala ahora y pásala por un canal privado a quien la vaya a usar. No se vuelve a mostrar (solo guardamos su huella); si se pierde, revócala y crea otra." />}
      </section>

      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ ...h2, margin: 0 }}>Claves</h2>
          <button onClick={load} style={btnGhost}><RefreshCw size={13} /> Actualizar</button>
        </div>
        {!items ? <Loading /> : !items.length ? <p style={hint}>Aún no hay claves.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={table}>
              <thead><tr>{['Integración', 'Clave', 'Permiso', 'Creada', 'Último uso', 'Llamadas 24 h', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {items.map((k) => (
                  <tr key={k.id} style={{ opacity: k.revoked_at ? 0.5 : 1 }}>
                    <td style={td}><strong>{k.name}</strong>{k.revoked_at && <span style={{ ...pill, background: '#F2F2F7', color: '#86868B', marginLeft: 6 }}>revocada</span>}</td>
                    <td style={{ ...td, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{k.key_prefix}…</td>
                    <td style={td}><span style={{ ...pill, ...(k.scope === 'read_write' ? { background: '#FFF4E5', color: '#B25E00' } : { background: '#E8F2FF', color: '#0058B0' }) }}>{k.scope === 'read_write' ? 'Lectura + escritura' : 'Solo lectura'}</span></td>
                    <td style={td}>{fmt(k.created_at)}<div style={{ fontSize: 11, color: '#86868B' }}>{k.created_by?.replace(/^admin:/, '')}</div></td>
                    <td style={td}>{fmt(k.last_used_at)}</td>
                    <td style={td}>{k.calls_24h}{k.errors_24h > 0 && <span style={{ color: '#D70015', marginLeft: 6 }}>({k.errors_24h} con error)</span>}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{!k.revoked_at && <button onClick={() => revoke(k)} style={{ ...btnGhost, color: '#D70015' }}><Ban size={13} /> Revocar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ─────────────────────────────── WEBHOOKS ───────────────────────────────
function HooksPanel() {
  const [items, setItems] = useState<Hook[] | null>(null)
  const [events, setEvents] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[] })
  const [busy, setBusy] = useState(false)
  const [fresh, setFresh] = useState<{ name: string; secret: string } | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(() => {
    adminFetch<{ items: Hook[]; events: string[] }>('/api/v1/_admin/webhooks').then((r) => { setItems(r.items); setEvents(r.events.filter((e) => e !== 'test.ping')) })
      .catch((e) => toast.error((e as Error).message))
  }, [])
  useEffect(load, [load])

  async function create() {
    setBusy(true)
    try {
      const r = await adminFetch<{ name: string; secret: string }>('/api/v1/_admin/webhooks', { method: 'POST', body: form })
      setFresh({ name: r.name, secret: r.secret })
      setForm({ name: '', url: '', events: [] })
      load()
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  async function patch(h: Hook, body: Partial<Hook>) {
    try { await adminFetch(`/api/v1/_admin/webhooks/${h.id}`, { method: 'PATCH', body }); load() } catch (e) { toast.error((e as Error).message) }
  }
  async function remove(h: Hook) {
    if (!window.confirm(`¿Borrar el webhook «${h.name}» y su historial de entregas?`)) return
    try { await adminFetch(`/api/v1/_admin/webhooks/${h.id}`, { method: 'DELETE' }); toast.success('Webhook borrado'); load() } catch (e) { toast.error((e as Error).message) }
  }
  async function test(h: Hook) {
    try {
      const r = await adminFetch<{ dispatch: { processed: number; delivered?: number } }>(`/api/v1/_admin/webhooks/${h.id}/test`, { method: 'POST', body: {} })
      if (r.dispatch.delivered) toast.success('Prueba entregada (respuesta 2xx)')
      else toast.error('La prueba no se entregó: mira el detalle de entregas (se reintentará)')
      load(); setOpen(h.id)
    } catch (e) { toast.error((e as Error).message) }
  }
  const toggleEvent = (ev: string) => setForm((f) => ({ ...f, events: f.events.includes(ev) ? f.events.filter((x) => x !== ev) : [...f.events, ev] }))

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={card}>
        <h2 style={h2}>Nuevo webhook</h2>
        <p style={hint}>ExhaustMarket hará un <code style={code}>POST</code> firmado a esa URL cuando ocurra el evento (sube un archivo, se aprueba algo…). Si falla, reintenta durante unas 2 horas (1, 2, 4… 64 min).</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre (p. ej. Avisos Daniel)" style={{ ...input, flex: '1 1 200px' }} />
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value.trim() })} placeholder="https://…" style={{ ...input, flex: '2 1 300px' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {events.map((ev) => {
              const on = form.events.includes(ev)
              return <button key={ev} onClick={() => toggleEvent(ev)} style={{ ...chip, ...(on ? { background: '#0071E3', color: '#fff', borderColor: '#0071E3' } : {}) }}>{EVENT_LABEL[ev] ?? ev}</button>
            })}
          </div>
          <div style={{ fontSize: 12, color: '#86868B' }}>{form.events.length ? `${form.events.length} evento(s) seleccionados` : 'Sin selección = todos los eventos'}</div>
          <div><button onClick={create} disabled={busy || !/^https?:\/\/\S+$/.test(form.url)} style={{ ...btnPrimary, opacity: busy || !/^https?:\/\/\S+$/.test(form.url) ? 0.5 : 1 }}>
            {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />} Crear webhook
          </button></div>
        </div>
        {fresh && <SecretBox title={`Secreto de firma de «${fresh.name}»`} value={fresh.secret} onClose={() => setFresh(null)}
          note="El receptor lo usa para comprobar que el aviso viene de ExhaustMarket (ver «Cómo se usa»). No se vuelve a mostrar." />}
      </section>

      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ ...h2, margin: 0 }}>Webhooks</h2>
          <button onClick={load} style={btnGhost}><RefreshCw size={13} /> Actualizar</button>
        </div>
        {!items ? <Loading /> : !items.length ? <p style={hint}>Aún no hay webhooks.</p> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((h) => (
              <div key={h.id} style={{ border: '1px solid #E5E5EA', borderRadius: 10, padding: 12, opacity: h.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => setOpen(open === h.id ? null : h.id)} style={{ ...btnGhost, padding: 2, border: 'none' }} aria-label="Ver entregas">
                    {open === h.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{h.name} {!h.active && <span style={{ ...pill, background: '#F2F2F7', color: '#86868B' }}>pausado</span>}</div>
                    <div style={{ fontSize: 12, color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.url}</div>
                    <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 4 }}>{h.events?.length ? h.events.map((e) => EVENT_LABEL[e] ?? e).join(' · ') : 'Todos los eventos'}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6E6E73', textAlign: 'right' }}>
                    Último aviso: {fmt(h.last_delivery_at)}{h.last_status != null && <span style={{ marginLeft: 6, color: h.last_status < 300 ? '#1E8E3E' : '#D70015' }}>HTTP {h.last_status}</span>}
                    <div>{h.pending > 0 && <span style={{ color: '#B25E00' }}>{h.pending} pendiente(s) </span>}{h.failed > 0 && <span style={{ color: '#D70015' }}>{h.failed} fallida(s)</span>}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => test(h)} style={btnGhost}><Send size={13} /> Probar</button>
                    <button onClick={() => patch(h, { active: !h.active })} style={btnGhost}>{h.active ? 'Pausar' : 'Activar'}</button>
                    <button onClick={() => remove(h)} style={{ ...btnGhost, color: '#D70015' }} aria-label="Borrar"><Trash2 size={13} /></button>
                  </div>
                </div>
                {open === h.id && <Deliveries hookId={h.id} />}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Deliveries({ hookId }: { hookId: string }) {
  const [items, setItems] = useState<Delivery[] | null>(null)
  useEffect(() => {
    adminFetch<{ items: Delivery[] }>('/api/v1/_admin/deliveries', { query: { webhook_id: hookId } }).then((r) => setItems(r.items)).catch((e) => toast.error((e as Error).message))
  }, [hookId])
  if (!items) return <Loading />
  if (!items.length) return <p style={{ ...hint, margin: '10px 0 0 30px' }}>Sin entregas todavía.</p>
  return (
    <div style={{ overflowX: 'auto', marginTop: 10 }}>
      <table style={table}>
        <thead><tr>{['Fecha', 'Evento', 'Estado', 'Intentos', 'Respuesta', 'Próximo intento'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{items.map((d) => (
          <tr key={d.id}>
            <td style={td}>{fmt(d.created_at)}</td>
            <td style={td}>{EVENT_LABEL[d.event] ?? d.event}</td>
            <td style={td}><span style={{ ...pill, ...(d.status === 'delivered' ? { background: '#E8F7EE', color: '#1E8E3E' } : d.status === 'failed' ? { background: '#FDECEC', color: '#D70015' } : { background: '#FFF4E5', color: '#B25E00' }) }}>
              {d.status === 'delivered' ? 'entregado' : d.status === 'failed' ? 'fallido' : 'pendiente'}</span></td>
            <td style={td}>{d.attempts}</td>
            <td style={td}>{d.last_response_code ?? '—'}{d.last_error && <div style={{ fontSize: 11, color: '#D70015', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.last_error}>{d.last_error}</div>}</td>
            <td style={td}>{d.status === 'pending' ? fmt(d.next_attempt_at) : '—'}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────── REGISTRO ───────────────────────────────
function LogsPanel() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [keyId, setKeyId] = useState('')
  const [items, setItems] = useState<CallLog[] | null>(null)
  const load = useCallback(() => {
    setItems(null)
    adminFetch<{ items: CallLog[] }>('/api/v1/_admin/logs', { query: { key_id: keyId, limit: 300 } }).then((r) => setItems(r.items)).catch((e) => toast.error((e as Error).message))
  }, [keyId])
  useEffect(() => { adminFetch<{ items: ApiKey[] }>('/api/v1/_admin/keys').then((r) => setKeys(r.items)).catch(() => {}) }, [])
  useEffect(load, [load])
  return (
    <section style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ ...h2, margin: 0, flex: 1 }}>Últimas llamadas</h2>
        <select value={keyId} onChange={(e) => setKeyId(e.target.value)} style={input}>
          <option value="">Todas las claves</option>
          {keys.map((k) => <option key={k.id} value={k.id}>{k.name}{k.revoked_at ? ' (revocada)' : ''}</option>)}
        </select>
        <button onClick={load} style={btnGhost}><RefreshCw size={13} /> Actualizar</button>
      </div>
      {!items ? <Loading /> : !items.length ? <p style={hint}>Sin llamadas registradas.</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead><tr>{['Fecha', 'Clave', 'Llamada', 'Registros', 'Resultado', 'ms'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{items.map((l) => (
              <tr key={l.id}>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmt(l.created_at)}</td>
                <td style={td}>{l.key_name ?? '—'}</td>
                <td style={{ ...td, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}><strong>{l.method}</strong> {l.path}</td>
                <td style={td}>{l.records}</td>
                <td style={td}><span style={{ color: l.status < 300 ? '#1E8E3E' : l.status < 500 ? '#B25E00' : '#D70015', fontWeight: 600 }}>{l.status}</span>
                  {l.error && <div style={{ fontSize: 11, color: '#6E6E73', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.error}>{l.error}</div>}</td>
                <td style={td}>{l.duration_ms ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────── CÓMO SE USA ───────────────────────────────
function DocsPanel() {
  const base = `${window.location.origin}/api/v1`
  const Block = ({ children }: { children: string }) => <pre style={pre}>{children}</pre>
  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 900 }}>
      <section style={card}>
        <h2 style={h2}>Lo básico</h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: '#3A3A3C' }}>
          <li>Dirección base: <code style={code}>{base}</code> · especificación OpenAPI: <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer" style={{ color: '#0071E3' }}>openapi.json <ExternalLink size={11} /></a></li>
          <li>Cabecera en cada llamada: <code style={code}>Authorization: Bearer emk_…</code></li>
          <li>Entidades: <code style={code}>vehicles</code>, <code style={code}>engines</code>, <code style={code}>components</code>, <code style={code}>guides</code>, <code style={code}>manuals</code>, <code style={code}>designs3d</code>, <code style={code}>relations</code> (lectura y escritura) · <code style={code}>diagrams</code>, <code style={code}>schemas</code>, <code style={code}>products</code> (solo lectura).</li>
          <li><strong>Todo lo creado o cambiado entra pendiente de revisión</strong>. Si el registro ya estaba publicado, el cambio queda como «cambios propuestos» y la web sigue mostrando la versión aprobada.</li>
          <li><strong>Idempotencia:</strong> cada registro lleva <code style={code}>id_externo</code> (tu id). Reenviarlo no duplica: actualiza el pendiente o propone cambios.</li>
          <li>Hasta 200 registros por llamada, con resultado por fila (un fallo no tumba el lote). Límite de 2.000 llamadas por hora y clave.</li>
          <li>Los archivos (fotos, PDF, 3D) no van en el JSON: pide una URL firmada a <code style={code}>/uploads</code>, súbelo con PUT y usa la <code style={code}>public_url</code>.</li>
        </ul>
      </section>
      <section style={card}>
        <h2 style={h2}>Ejemplos</h2>
        <p style={hint}>Buscar un vehículo por texto libre (normaliza «golf 7 2.0 tdi 2015» a vehículo + motorización):</p>
        <Block>{`curl -H "Authorization: Bearer $EMK_KEY" "${base}/search/vehicles?q=golf%207%202.0%20tdi%202015"`}</Block>
        <p style={hint}>Listar componentes de una motorización (paginado):</p>
        <Block>{`curl -H "Authorization: Bearer $EMK_KEY" "${base}/components?engine_id=<uuid>&limit=100&offset=0"`}</Block>
        <p style={hint}>Crear componentes en lote (nacen pendientes; tramo de la lista cerrada, admite sinónimos como «FAP» o «colas»):</p>
        <Block>{`curl -X POST -H "Authorization: Bearer $EMK_KEY" -H "Content-Type: application/json" ${base}/components -d '[
  { "id_externo": "oem-123", "engine_id": "<uuid>", "part_type": "dpf", "oem_ref": "8W0254750", "variant": "con AdBlue",
    "source_url": "https://…", "source_url_2": "https://…", "verification_status": "verificado" }
]'`}</Block>
        <p style={hint}>Relacionar un manual con <em>todas</em> las motorizaciones del modelo:</p>
        <Block>{`curl -X POST -H "Authorization: Bearer $EMK_KEY" -H "Content-Type: application/json" ${base}/relations -d '{
  "id_externo": "rel-1", "schema_id": "<uuid esquema>", "content_type": "manual", "content_id": "<uuid manual>", "scope": "modelo" }'`}</Block>
        <p style={hint}>Subir un archivo y registrarlo como 3D:</p>
        <Block>{`# 1) URL firmada
curl -X POST -H "Authorization: Bearer $EMK_KEY" -H "Content-Type: application/json" ${base}/uploads \\
  -d '{ "filename": "downpipe.stl", "content_type": "model/stl", "kind": "3d" }'
# 2) PUT del archivo a upload_url (con la cabecera content-type indicada)
# 3) POST ${base}/designs3d con file_url = public_url`}</Block>
      </section>
      <section style={card}>
        <h2 style={h2}>Verificar la firma de un webhook</h2>
        <p style={hint}>Cada aviso trae <code style={code}>X-ExhaustMarket-Event</code>, <code style={code}>X-ExhaustMarket-Delivery</code>, <code style={code}>X-ExhaustMarket-Timestamp</code> y
          <code style={code}>X-ExhaustMarket-Signature: sha256=…</code> = HMAC-SHA256(secreto, timestamp + "." + cuerpo). Responde 2xx en menos de 8 s; si no, se reintenta.</p>
        <Block>{`import { createHmac, timingSafeEqual } from 'node:crypto'
function esDeExhaustMarket(req, cuerpoCrudo, secreto) {
  const ts = req.headers['x-exhaustmarket-timestamp']
  const esperado = 'sha256=' + createHmac('sha256', secreto).update(ts + '.' + cuerpoCrudo).digest('hex')
  const recibido = String(req.headers['x-exhaustmarket-signature'] || '')
  return recibido.length === esperado.length && timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado))
    && Math.abs(Date.now() / 1000 - Number(ts)) < 300   // descarta avisos de hace más de 5 min
}`}</Block>
      </section>
    </div>
  )
}

// ─────────────────────────────── piezas ───────────────────────────────
function SecretBox({ title, value, note, onClose }: { title: string; value: string; note: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: '#FFF8E6', border: '1px solid #F5D78E' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: '#8A5A00' }}><AlertTriangle size={15} /> {title}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <code style={{ ...code, flex: '1 1 300px', padding: '8px 10px', fontSize: 12, wordBreak: 'break-all', background: '#fff' }}>{value}</code>
        <button onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { toast.error('No se pudo copiar') } }} style={btnPrimary}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiada' : 'Copiar'}
        </button>
        <button onClick={onClose} style={btnGhost}>Ya la he guardado</button>
      </div>
      <p style={{ ...hint, margin: '8px 0 0', color: '#8A5A00' }}>{note}</p>
    </div>
  )
}
function Loading() { return <div style={{ padding: 16, color: '#86868B', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando…</div> }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E5E5EA', borderRadius: 14, padding: 18 }
const h2: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: '#1D1D1F', margin: '0 0 6px' }
const hint: React.CSSProperties = { fontSize: 12.5, color: '#6E6E73', margin: '0 0 10px', lineHeight: 1.5 }
const code: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, background: '#F2F2F7', borderRadius: 5, padding: '1px 5px' }
const pre: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, background: '#1D1D1F', color: '#F5F5F7', borderRadius: 10, padding: 12, overflowX: 'auto', margin: '0 0 12px', lineHeight: 1.5 }
const input: React.CSSProperties = { padding: '9px 11px', border: '1px solid #D2D2D7', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', background: '#fff', minWidth: 0 }
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#0071E3', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: '#fff', color: '#1D1D1F', border: '1px solid #D2D2D7', borderRadius: 8, fontSize: 12.5, cursor: 'pointer' }
const chip: React.CSSProperties = { padding: '6px 10px', borderRadius: 999, border: '1px solid #D2D2D7', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#3A3A3C' }
const pill: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 8px', borderBottom: '1px solid #E5E5EA', fontSize: 11.5, color: '#86868B', fontWeight: 600, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '9px 8px', borderBottom: '1px solid #F2F2F7', verticalAlign: 'top' }
