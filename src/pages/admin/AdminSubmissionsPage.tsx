import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Inbox, CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../../lib/toast'
import { useCollabStore, type SchemaSubmission } from '../../stores/collabStore'
import { LAYOUT_BY_ID, sortedComponents } from '../../lib/schemaDefinitions'

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'

export default function AdminSubmissionsPage() {
  const { all, loading, fetchAll, review } = useCollabStore()
  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => { void fetchAll() }, [fetchAll])

  const filtered = useMemo(
    () => (filter === 'all' ? all : all.filter((s) => s.status === filter)),
    [all, filter],
  )
  const counts = useMemo(() => ({
    pending: all.filter((s) => s.status === 'pending').length,
    approved: all.filter((s) => s.status === 'approved').length,
    rejected: all.filter((s) => s.status === 'rejected').length,
  }), [all])

  /** Aprueba y crea el esquema en el catálogo como BORRADOR (is_active=false) para
   *  que el admin lo pula en el editor real antes de activarlo. */
  async function approveAndPublish(sub: SchemaSubmission) {
    setBusy(sub.id)
    try {
      const d = sub.data ?? ({} as SchemaSubmission['data'])
      const v = d.vehiculo ?? {}
      const photos = gatherPhotos(d)
      const payload = {
        // Soporta el formato legacy (d.brand plano) y el nuevo por ruta (d.vehiculo).
        brand: (d.brand || v.marca || '').trim() || 'Sin marca',
        model: (d.model || v.modelo || '').trim() || 'Sin modelo',
        year: (d.year || v.anios || '').trim(),
        engine: (d.engine || v.motorizacion || '').trim(),
        power: (d.power || '').trim(),
        emissions: d.emissions || null,
        layout: d.layout || 'v8tt',
        color: d.color || '#0071E3',
        note: d.note || d.notas || null,
        components: JSON.stringify(d.components || {}),   // jsonb (vacío en A/B → el admin lo completa)
        cover_url: d.cover_url ?? photos[0] ?? null,
        gallery_urls: d.gallery_urls || photos.slice(1),  // text[]
        is_active: false,                                  // borrador: el admin lo activa luego
        allowed_tiers: [],                                 // text[]
        despiece: JSON.stringify([]),                      // jsonb
        cost_breakdown: JSON.stringify({}),                // jsonb
        reference_photos: d.reference_photos || photos,    // text[]
        related_video_url: d.related_video_url || d.desmontaje?.video_url || d.sistema?.video_url || null,
        // Trazabilidad (Solicitud nº3, pto 6/7): el registro nace de un envío de colaborador.
        origen: `colaborador:${sub.submitted_by}`,
      }
      const { data, error } = await supabase
        .from('exhaust_schemas' as any)
        .insert(payload as any)
        .select('id')
        .single()
      if (error) throw error
      const newId = (data as any).id as string
      await review(sub.id, 'approved', '', newId)
      toast.success('Aprobado y creado como borrador en el catálogo.')
    } catch (e) {
      toast.error('No se pudo publicar: ' + (e instanceof Error ? e.message : 'error'))
    } finally {
      setBusy(null)
    }
  }

  async function reject(sub: SchemaSubmission) {
    const notes = window.prompt('Motivo del rechazo (se mostrará al colaborador):', '') ?? ''
    setBusy(sub.id)
    try {
      await review(sub.id, 'rejected', notes)
      toast.success('Envío rechazado.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0 }}>Envíos de colaboradores</h1>
        <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0' }}>
          {counts.pending} pendientes · {counts.approved} aprobados · {counts.rejected} rechazados
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={tabStyle(filter === f)}>
            {f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobados' : f === 'rejected' ? 'Rechazados' : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#86868B' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} />
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={emptyStyle}>
          <Inbox size={28} style={{ color: '#C7C7CC', marginBottom: 8 }} />
          <p style={{ margin: 0 }}>No hay envíos {filter !== 'all' ? `en estado "${filter}"` : ''}.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((s) => {
            const isOpen = expanded === s.id
            const d = s.data ?? ({} as SchemaSubmission['data'])
            return (
              <div key={s.id} style={rowCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setExpanded(isOpen ? null : s.id)} style={chevBtn}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1D1D1F', fontSize: 14 }}>{s.title || '(sin título)'}</div>
                    <div style={{ fontSize: 12, color: '#86868B' }}>
                      {s.submitter?.full_name || s.submitter?.email || 'colaborador'} · {new Date(s.created_at).toLocaleString('es-ES')}
                      {s.route ? ` · ${s.route}` : (LAYOUT_BY_ID[d.layout]?.label ? ` · ${LAYOUT_BY_ID[d.layout].label}` : '')}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>

                {isOpen && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F2F2F7' }}>
                    <SubmissionDetail sub={s} onChanged={fetchAll} />
                    {s.review_notes && (
                      <div style={{ fontSize: 12, color: '#B25400', marginTop: 10 }}>Nota de revisión: {s.review_notes}</div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                      {s.status === 'pending' && (
                        <>
                          <button disabled={busy === s.id} onClick={() => approveAndPublish(s)} style={approveBtn}>
                            {busy === s.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />}
                            Aprobar y crear borrador
                          </button>
                          <button disabled={busy === s.id} onClick={() => reject(s)} style={rejectBtn}>
                            <XCircle size={14} /> Rechazar
                          </button>
                        </>
                      )}
                      {s.published_schema_id && (
                        <Link to={`/admin/esquemas/${s.published_schema_id}`} style={openBtn}>
                          <ExternalLink size={14} /> Abrir en el editor
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Info({ k, v }: { k: string; v?: string | null }) {
  return (
    <div>
      <dt style={{ fontSize: 11, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</dt>
      <dd style={{ margin: '2px 0 0', fontSize: 13, color: '#1D1D1F' }}>{v || '—'}</dd>
    </div>
  )
}

/** Reúne todas las URLs de fotos de un envío (legacy o por ruta) para el borrador/preview. */
function gatherPhotos(d: any): string[] {
  const out: string[] = []
  const push = (u: any) => { if (typeof u === 'string' && u) out.push(u) }
  push(d?.cover_url)
  ;(d?.gallery_urls || []).forEach(push)
  if (d?.fotos) { push(d.fotos.vehiculo); push(d.fotos.pieza) }
  ;(d?.desmontaje?.fotos || []).forEach(push)
  ;(d?.sistema?.fotos || []).forEach(push)
  ;(d?.piezas || []).forEach((p: any) => push(p?.foto_url))
  ;(d?.reference_photos || []).forEach(push)
  return [...new Set(out)]
}

function DSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  )
}

function SubmissionDetail({ sub, onChanged }: { sub: SchemaSubmission; onChanged: () => void }) {
  const d = sub.data ?? {}
  const v = d.vehiculo ?? {}
  const photos = gatherPhotos(d)
  const comps = sortedComponents(d.components)
  const [busy, setBusy] = useState(false)

  async function markScanPublished() {
    setBusy(true)
    const { error } = await supabase.from('schema_submissions' as any).update({ scan_3d_status: 'published' } as any).eq('id', sub.id)
    setBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success('Escaneo 3D marcado como subido')
    onChanged()
  }

  return (
    <>
      <dl style={dlGrid}>
        <Info k="Marca" v={d.brand || v.marca} /><Info k="Modelo" v={d.model || v.modelo} />
        <Info k="Año" v={d.year || v.anios} /><Info k="Motorización" v={d.engine || v.motorizacion} />
        {v.combustible ? <Info k="Combustible" v={v.combustible} /> : null}
        {sub.route ? <Info k="Ruta" v={sub.route} /> : null}
        {sub.case_code ? <Info k="Código de caso" v={sub.case_code} /> : null}
      </dl>
      {(d.note || d.notas) && <p style={{ fontSize: 13, color: '#3A3A3C', margin: '8px 0' }}>{d.note || d.notas}</p>}

      {/* Ruta A */}
      {d.componente && (
        <DSection title="Componente y fuentes">
          <div style={{ fontSize: 13, color: '#1D1D1F' }}><strong>{d.componente.tipo || '—'}</strong> · ref. {d.componente.ref_oem || '—'}</div>
          {(d.fuentes || []).map((f: any, i: number) => (
            <div key={i} style={{ fontSize: 12, color: '#86868B', marginTop: 4 }}>
              Fuente {i + 1}: {f.nombre || '—'} {f.url ? <a href={f.url} target="_blank" rel="noreferrer" style={{ color: '#0071E3' }}>{f.url}</a> : ''}
            </div>
          ))}
        </DSection>
      )}

      {/* B-F1 */}
      {d.desmontaje && (
        <DSection title="Desmontaje">
          {d.desmontaje.video_url && <div style={{ fontSize: 12 }}><a href={d.desmontaje.video_url} target="_blank" rel="noreferrer" style={{ color: '#0071E3' }}>Vídeo del desmontaje</a></div>}
          {d.desmontaje.indicaciones && <p style={{ fontSize: 13, color: '#3A3A3C', whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{d.desmontaje.indicaciones}</p>}
        </DSection>
      )}

      {/* B-F2 */}
      {Array.isArray(d.piezas) && d.piezas.length > 0 && (
        <DSection title={`Piezas (${d.piezas.length})`}>
          {d.piezas.map((p: any, i: number) => (
            <div key={i} style={{ fontSize: 13, color: '#1D1D1F' }}><strong>{p.nombre || `Pieza ${i + 1}`}</strong> — ref. {p.referencia || '—'}{p.notas ? <span style={{ color: '#86868B' }}> · {p.notas}</span> : null}</div>
          ))}
        </DSection>
      )}

      {/* B-F3 */}
      {d.sistema && (
        <DSection title="Sistema fabricado">
          <div style={{ fontSize: 13, color: '#1D1D1F' }}>Diámetro principal: {d.sistema.diametro_principal || '—'}</div>
          {d.sistema.material_necesario && <p style={{ fontSize: 13, color: '#3A3A3C', whiteSpace: 'pre-wrap', margin: '6px 0' }}>{d.sistema.material_necesario}</p>}
          <div style={{ fontSize: 12, color: '#86868B' }}>
            {[['codos', 'codos'], ['tramos', 'tramos'], ['bridas', 'bridas'], ['silenciadores', 'silenciadores'], ['valvulas', 'válvulas'], ['sondas', 'sondas'], ['flexibles', 'flexibles']]
              .map(([k, lbl]) => `${(d.sistema[k] || []).length} ${lbl}`).join(' · ')}
          </div>
        </DSection>
      )}

      {/* Componentes (legacy) */}
      {comps.length > 0 && (
        <DSection title={`Componentes (${comps.length})`}>
          {comps.map((c) => (
            <div key={c.id} style={{ fontSize: 13, color: '#1D1D1F' }}>
              <strong>{c.name}</strong>{c.material ? ` — ${c.material}` : ''}{c.temp ? ` · ${c.temp}` : ''}
              {c.description ? <div style={{ color: '#86868B', fontSize: 12 }}>{c.description}</div> : null}
            </div>
          ))}
        </DSection>
      )}

      {/* Escaneo 3D suministrado */}
      {sub.scan_3d_url && (
        <div style={{ marginTop: 12, padding: 12, background: '#F0F7FF', border: '1px solid #CFE4FF', borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>Escaneo 3D suministrado {sub.scan_3d_format ? `(${sub.scan_3d_format})` : ''}</div>
          <a href={sub.scan_3d_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0071E3' }}>{sub.scan_3d_url}</a>
          <div style={{ marginTop: 8 }}>
            {sub.scan_3d_status === 'published' ? (
              <span style={{ fontSize: 12, color: '#1A8C1A', fontWeight: 600 }}>✓ Subido a Diseños 3D</span>
            ) : (
              <button disabled={busy} onClick={markScanPublished} style={openBtn}>
                {busy ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null} Marcar como subido a 3D
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#86868B', margin: '6px 0 0' }}>Descarga el archivo, verifícalo y súbelo en la sección Diseños 3D; luego marca aquí que está subido.</p>
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {photos.map((u, i) => (
            <img key={i} src={u} alt="" style={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E5EA' }} />
          ))}
        </div>
      )}
    </>
  )
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const map = {
    pending: { bg: '#FFF3CD', fg: '#8A6D00', icon: <Clock size={12} />, label: 'Pendiente' },
    approved: { bg: '#D1F7D1', fg: '#1A8C1A', icon: <CheckCircle2 size={12} />, label: 'Aprobado' },
    rejected: { bg: '#FEE2E2', fg: '#B91C1C', icon: <XCircle size={12} />, label: 'Rechazado' },
  } as const
  const c = map[status] ?? map.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: c.bg, color: c.fg, borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {c.icon} {c.label}
    </span>
  )
}

function tabStyle(active: boolean): React.CSSProperties {
  return { padding: '7px 14px', borderRadius: 20, border: '1px solid ' + (active ? '#0071E3' : '#E5E5EA'), background: active ? '#0071E3' : '#fff', color: active ? '#fff' : '#3A3A3C', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
}
const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: 40, color: '#86868B', fontSize: 13, background: '#fff', borderRadius: 12, border: '1px solid #E5E5EA' }
const rowCard: React.CSSProperties = { background: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, padding: 14 }
const chevBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#86868B', display: 'inline-flex', padding: 2 }
const dlGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, margin: 0 }
const approveBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1A8C1A', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const rejectBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const openBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F5F5F7', color: '#0071E3', border: '1px solid #E5E5EA', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }
