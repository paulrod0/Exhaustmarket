import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2, Database, RefreshCw, Inbox } from 'lucide-react'
import { adminFetch } from '../../lib/adminApi'
import { readSheetFile } from '../../lib/sheetReader'
import { toast } from '../../lib/toast'

interface FieldDoc { col: string; type: string; required: boolean; values: string[] | null; aliases: string[]; help: string; example: string }
interface SchemaDoc { entity: string; label: string; needsOneOf: string[] | null; fields: FieldDoc[] }
interface RowMsg { row: number; field?: string; message: string }
interface ValidateRes { ok: boolean; total: number; errors: RowMsg[]; warnings: RowMsg[]; plan: { nuevos: number; actualiza_pendientes: number; cambios_propuestos: number; sin_cambios?: number; omitidos: number } | null }
interface CommitRes { ok: boolean; lote_id: string | null; created: number; updated: number; proposed: number; skipped: number; unchanged?: number }
interface ExportRec { id: string; kind: string; export_date: string; created_at: string; created_by: string | null; files: { entity: string; rows: number; bytes: number }[] }

const ENTITIES = [
  { key: 'vehicles', label: 'Vehículos', hint: 'Primer paso: los vehículos.' },
  { key: 'engines', label: 'Motorizaciones', hint: 'Referencian el vehículo por vehicle_id o vehicle_id_externo.' },
  { key: 'components', label: 'Componentes OEM', hint: 'Referencian la motorización (engine_id o engine_id_externo).' },
  { key: 'relations', label: 'Relaciones contenido ↔ esquema', hint: 'Guías, manuales o archivos 3D enlazados a un esquema.' },
]
const EXPORT_TABLES = ['vehicles', 'engines', 'exhaust_diagrams', 'exhaust_parts', 'exhaust_schemas', 'manuals', 'articles', 'design_3d',
  'schema_article_links', 'schema_manual_links', 'schema_3d_links', 'professional_products', 'exhaust_aftermarket_products', 'compatibilities', 'aftermarket_brands']

async function downloadBlob(path: string, query: Record<string, string>, filename: string) {
  const res = await adminFetch<Response>(path, { query, raw: true })
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export default function AdminDataIOPage() {
  const [tab, setTab] = useState<'import' | 'export'>('import')
  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Database size={22} /> Importar / exportar datos
        </h1>
        <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0', maxWidth: 780, lineHeight: 1.5 }}>
          Carga masiva desde CSV o Excel (.xlsx). Todo lo importado entra <strong>pendiente de revisión</strong> en un lote que
          apruebas de golpe en la <Link to="/admin/revision" style={{ color: '#0071E3' }}>Bandeja</Link>. Nada se ve en la web hasta entonces.
        </p>
      </header>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid #E5E5EA' }}>
        {([['import', 'Importar', Upload], ['export', 'Exportar y copias', Download]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer',
            borderBottom: `2px solid ${tab === id ? '#0071E3' : 'transparent'}`, color: tab === id ? '#0071E3' : '#3A3A3C', fontSize: 13, fontWeight: tab === id ? 700 : 500, marginBottom: -1,
          }}><Icon size={14} /> {label}</button>
        ))}
      </div>
      {tab === 'import' ? <ImportPanel /> : <ExportPanel />}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─────────────────────────────── IMPORTAR ───────────────────────────────
function ImportPanel() {
  const [entity, setEntity] = useState('vehicles')
  const [schema, setSchema] = useState<SchemaDoc | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<string[][] | null>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<ValidateRes | null>(null)
  const [result, setResult] = useState<CommitRes | null>(null)

  useEffect(() => {
    setSchema(null); setReport(null); setResult(null)
    adminFetch<SchemaDoc>('/api/csv', { query: { op: 'schema', entity } }).then(setSchema).catch((e) => toast.error((e as Error).message))
  }, [entity])

  async function onFile(f: File | undefined) {
    setReport(null); setResult(null); setRows(null); setFileName(null)
    if (!f) return
    try {
      const r = await readSheetFile(f)
      if (r.length < 2) throw new Error('El archivo no tiene filas de datos.')
      setRows(r); setFileName(f.name)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function runValidate() {
    if (!rows) return
    setBusy(true); setResult(null)
    try { setReport(await adminFetch<ValidateRes>('/api/csv', { query: { op: 'validate', entity }, body: { rows } })) }
    catch (e) { toast.error((e as Error).message) }
    finally { setBusy(false) }
  }

  async function runCommit() {
    if (!rows) return
    setBusy(true)
    try {
      const r = await adminFetch<CommitRes>('/api/csv', { query: { op: 'commit', entity, file: fileName ?? '' }, body: { rows } })
      setResult(r)
      if (r.lote_id) toast.success(`Importado: ${r.created} nuevos · ${r.updated} actualizados · ${r.proposed} cambios propuestos`)
      else toast.success('Nada nuevo: todas las filas ya estaban así (o eran duplicadas)')
    } catch (e) {
      toast.error((e as Error).message)
      await runValidate()
    } finally { setBusy(false) }
  }

  const ent = ENTITIES.find((e) => e.key === entity)!
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
      {/* Paso 1 */}
      <section style={card}>
        <h2 style={h2}>1 · ¿Qué vas a importar?</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {ENTITIES.map((e) => (
            <button key={e.key} onClick={() => { setEntity(e.key); setRows(null); setFileName(null) }} style={pill(entity === e.key)}>{e.label}</button>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: '#86868B', margin: '0 0 10px' }}>{ent.hint} Las cabeceras pueden ir en inglés (como en la plantilla) o en español (marca, modelo, año desde…).</p>
        <button onClick={() => downloadBlob('/api/csv', { op: 'template', entity }, `plantilla-${entity}.csv`).catch((e) => toast.error((e as Error).message))} style={ghostBtn}>
          <FileSpreadsheet size={14} /> Descargar plantilla CSV
        </button>
        {schema && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 12.5, fontWeight: 600, color: '#3A3A3C', cursor: 'pointer' }}>Ver columnas ({schema.fields.length}){schema.needsOneOf ? ` · referencia obligatoria: ${schema.needsOneOf.join(' / ')}` : ''}</summary>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Columna', 'Oblig.', 'Tipo / valores', 'También vale', 'Descripción'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {schema.fields.map((f) => (
                    <tr key={f.col}>
                      <td style={td}><code>{f.col}</code></td>
                      <td style={td}>{f.required ? 'sí' : ''}</td>
                      <td style={td}>{f.values ? f.values.join(', ') : f.type}</td>
                      <td style={{ ...td, color: '#86868B' }}>{f.aliases.join(', ')}</td>
                      <td style={td}>{f.help}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* Paso 2 */}
      <section style={card}>
        <h2 style={h2}>2 · Sube el archivo (.csv o .xlsx)</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: '2px dashed #D2D2D7', borderRadius: 12, cursor: 'pointer', fontSize: 13, color: '#3A3A3C' }}>
          <Upload size={16} />
          {fileName ? <span><strong>{fileName}</strong> · {(rows?.length ?? 1) - 1} filas leídas</span> : 'Elegir archivo CSV o Excel (.xlsx)…'}
          <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }}
            onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {rows && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button disabled={busy} onClick={runValidate} style={primaryBtn}>
              {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />} Validar (no escribe nada)
            </button>
          </div>
        )}
      </section>

      {/* Paso 3: informe */}
      {report && (
        <section style={card}>
          <h2 style={h2}>3 · Informe de validación</h2>
          {report.ok ? (
            <div style={{ ...banner, background: '#EAF8EC', borderColor: '#B7E8B7', color: '#1A6B1A' }}>
              <CheckCircle2 size={16} /> Sin errores · {report.total} filas listas
              {report.plan && <span style={{ color: '#3A3A3C', fontWeight: 400 }}> — {report.plan.nuevos} nuevas · {report.plan.actualiza_pendientes} actualizan pendientes · {report.plan.cambios_propuestos} proponen cambios a fichas publicadas{report.plan.sin_cambios ? ` · ${report.plan.sin_cambios} sin cambios` : ''}{report.plan.omitidos ? ` · ${report.plan.omitidos} omitidas (duplicadas)` : ''}</span>}
            </div>
          ) : (
            <div style={{ ...banner, background: '#FEEDEC', borderColor: '#FCA5A5', color: '#B91C1C' }}>
              <XCircle size={16} /> {report.errors.length} error{report.errors.length === 1 ? '' : 'es'} en {new Set(report.errors.map((e) => e.row)).size} fila(s). No se importará NADA hasta corregirlos.
            </div>
          )}
          {report.errors.length > 0 && <MsgTable title="Errores (bloquean la importación)" items={report.errors} color="#B91C1C" />}
          {report.warnings.length > 0 && <MsgTable title="Avisos (no bloquean)" items={report.warnings} color="#8A6D00" />}
          {report.ok && !result && (
            <button disabled={busy} onClick={runCommit} style={{ ...primaryBtn, marginTop: 12 }}>
              {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />} Importar {report.total} registros como pendientes
            </button>
          )}
        </section>
      )}

      {result && !result.lote_id && (
        <section style={{ ...card, borderColor: '#D2D2D7' }}>
          <h2 style={h2}>Nada nuevo que revisar</h2>
          <p style={{ fontSize: 13, color: '#3A3A3C', margin: 0 }}>
            {result.unchanged ? `${result.unchanged} fila(s) ya estaban publicadas con los mismos datos` : 'Ninguna fila cambia nada'}{result.skipped ? ` · ${result.skipped} omitidas (duplicadas)` : ''}. No se ha creado ningún lote.
          </p>
        </section>
      )}
      {result && result.lote_id && (
        <section style={{ ...card, borderColor: '#B7E8B7' }}>
          <h2 style={h2}>✓ Importado en un lote pendiente de revisión</h2>
          <p style={{ fontSize: 13, color: '#3A3A3C', margin: '0 0 10px' }}>
            {result.created} nuevos · {result.updated} actualizados · {result.proposed} cambios propuestos{result.unchanged ? ` · ${result.unchanged} sin cambios` : ''}{result.skipped ? ` · ${result.skipped} omitidos` : ''}.
            Lote <code>{result.lote_id.slice(0, 8)}</code>. Nada es visible en la web hasta que lo apruebes.
          </p>
          <Link to={`/admin/revision?lote=${result.lote_id}`} style={{ ...primaryBtn, textDecoration: 'none' }}><Inbox size={14} /> Revisar este lote en la Bandeja</Link>
        </section>
      )}
    </div>
  )
}

function MsgTable({ title, items, color }: { title: string; items: RowMsg[]; color: string }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} /> {title}</div>
      <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #F2F2F7', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr><th style={th}>Fila</th><th style={th}>Campo</th><th style={th}>Detalle</th></tr></thead>
          <tbody>{items.map((m, i) => <tr key={i}><td style={td}>{m.row}</td><td style={td}><code>{m.field ?? ''}</code></td><td style={td}>{m.message}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────── EXPORTAR ───────────────────────────────
function ExportPanel() {
  const [table, setTable] = useState('vehicles')
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [exports, setExports] = useState<ExportRec[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setExports((await adminFetch<{ items: ExportRec[] }>('/api/csv', { query: { op: 'exports' } })).items) }
    catch (e) { toast.error((e as Error).message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function exportNow() {
    setBusy(true)
    try { await adminFetch('/api/csv', { query: { op: 'export_now' }, body: {} }); toast.success('Exportación completa generada'); await load() }
    catch (e) { toast.error((e as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={card}>
        <h2 style={h2}>Descarga directa</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={table} onChange={(e) => setTable(e.target.value)} style={ctl}>{EXPORT_TABLES.map((t) => <option key={t}>{t}</option>)}</select>
          <select value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'json')} style={ctl}><option value="csv">CSV</option><option value="json">JSON</option></select>
          <button onClick={() => downloadBlob('/api/csv', { table, format }, `${table}-${new Date().toISOString().slice(0, 10)}.${format}`).catch((e) => toast.error((e as Error).message))} style={primaryBtn}>
            <Download size={14} /> Descargar
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#86868B', margin: '8px 0 0' }}>Incluye todos los registros con sus ids (también los pendientes y su estado de publicación).</p>
      </section>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          <h2 style={{ ...h2, margin: 0 }}>Copias completas guardadas</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => void load()} style={ghostBtn}><RefreshCw size={13} /></button>
            <button disabled={busy} onClick={exportNow} style={primaryBtn}>{busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Database size={14} />} Generar ahora</button>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: '#86868B', margin: '0 0 12px' }}>
          Cada noche (03:00 UTC) se guarda automáticamente una copia completa del catálogo (un JSON por entidad, con ids): sirve de copia de seguridad y
          para calcular fuera el grado de completitud por modelo.
        </p>
        {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} />
          : !exports.length ? <p style={{ fontSize: 13, color: '#86868B' }}>Aún no hay copias. La primera nocturna se generará esta noche, o pulsa «Generar ahora».</p>
          : exports.map((x) => (
            <details key={x.id} style={{ borderTop: '1px solid #F2F2F7', padding: '8px 0' }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, color: '#1D1D1F' }}>
                <strong>{new Date(x.created_at).toLocaleString('es-ES')}</strong> · {x.kind === 'nightly' ? 'nocturna' : 'manual'} · {x.files.reduce((s, f) => s + f.rows, 0).toLocaleString('es-ES')} registros
              </summary>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {x.files.map((f) => (
                  <button key={f.entity} onClick={() => downloadBlob('/api/csv', { op: 'download_export', id: x.id, entity: f.entity }, `${f.entity}-${String(x.export_date).slice(0, 10)}.json`).catch((e) => toast.error((e as Error).message))}
                    style={{ ...ghostBtn, fontSize: 11.5 }}>
                    <Download size={12} /> {f.entity} · {f.rows}
                  </button>
                ))}
              </div>
            </details>
          ))}
      </section>
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E5E5EA', borderRadius: 14, padding: 18 }
const h2: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: '#1D1D1F', margin: '0 0 12px' }
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #E5E5EA', fontSize: 11, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#FAFAFC', position: 'sticky', top: 0 }
const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #F2F2F7', verticalAlign: 'top' }
const ctl: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E5EA', fontSize: 13, background: '#fff' }
const banner: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', border: '1px solid', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600 }
const primaryBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0071E3', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#3A3A3C', border: '1px solid #E5E5EA', borderRadius: 9, padding: '8px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const pill = (active: boolean): React.CSSProperties => ({ padding: '7px 13px', borderRadius: 20, border: '1px solid ' + (active ? '#0071E3' : '#E5E5EA'), background: active ? '#0071E3' : '#fff', color: active ? '#fff' : '#3A3A3C', fontSize: 13, fontWeight: 600, cursor: 'pointer' })
