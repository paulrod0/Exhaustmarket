import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Copy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { StatusBadge, sectionTitleStyle, inputStyle, labelStyle } from '../../lib/dataAdmin'

type RecordType = 'vehicle' | 'engine' | 'exhaust_diagram' | 'exhaust_part' | 'exhaust_aftermarket_product'

interface PendingRecord {
  id: string
  record_type: RecordType
  status: string
  display_label: string
  created_by: string | null
  updated_at: string
}

const TABLE_MAP: Record<RecordType, string> = {
  vehicle: 'vehicles',
  engine: 'engines',
  exhaust_diagram: 'exhaust_diagrams',
  exhaust_part: 'exhaust_parts',
  exhaust_aftermarket_product: 'exhaust_aftermarket_products',
}

const TYPE_LABEL: Record<RecordType, string> = {
  vehicle: 'Vehículo',
  engine: 'Motor',
  exhaust_diagram: 'Esquema',
  exhaust_part: 'Pieza',
  exhaust_aftermarket_product: 'Producto aftermarket',
}

/** Panel QA — Formulario D del dossier. */
export default function AdminQAPanelPage() {
  const [items, setItems] = useState<PendingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'submitted' | 'needs_changes' | 'all_pending'>('submitted')
  const [comments, setComments] = useState<Record<string, string>>({})

  const refresh = async () => {
    setLoading(true)
    const all: PendingRecord[] = []

    const statusFilter = filter === 'all_pending'
      ? ['submitted', 'needs_changes']
      : [filter]

    for (const [type, table] of Object.entries(TABLE_MAP) as [RecordType, string][]) {
      const { data } = await supabase.from(table).select('*').in('status', statusFilter).limit(100)
      const rows = (data as Record<string, unknown>[]) ?? []
      for (const r of rows) {
        all.push({
          id: r.id as string,
          record_type: type,
          status: r.status as string,
          display_label: labelFor(type, r),
          created_by: r.created_by as string | null,
          updated_at: r.updated_at as string,
        })
      }
    }

    all.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    setItems(all)
    setLoading(false)
  }

  useEffect(() => { refresh() }, [filter])

  const doAction = async (rec: PendingRecord, action: 'approved' | 'needs_changes' | 'rejected' | 'duplicate') => {
    const table = TABLE_MAP[rec.record_type]
    const newStatus = action
    const { error: e } = await supabase.from(table).update({ status: newStatus }).eq('id', rec.id)
    if (e) { alert(e.message); return }
    await supabase.from('qa_reviews').insert({
      record_type: rec.record_type, record_id: rec.id,
      action: action, comments: comments[rec.id] ?? null,
    })
    setComments({ ...comments, [rec.id]: '' })
    refresh()
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Panel QA</h1>
        <p style={{ color: '#86868B', marginTop: 4 }}>
          Formulario D — Revisión de registros enviados. {items.length} pendientes.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['submitted', 'needs_changes', 'all_pending'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '8px 14px',
            backgroundColor: filter === s ? '#0071E3' : '#F2F2F7',
            color: filter === s ? 'white' : '#1D1D1F',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            {s === 'submitted' ? 'Enviados' : s === 'needs_changes' ? 'Necesitan cambios' : 'Todos pendientes'}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#86868B' }}>Cargando…</p>
      ) : items.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#86868B' }}>
          <CheckCircle2 size={48} style={{ color: '#34C759', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 16 }}>Nada pendiente.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>No hay registros en estado de revisión.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((rec) => (
            <div key={`${rec.record_type}-${rec.id}`} style={{
              padding: 16,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E5EA',
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      padding: '2px 8px', backgroundColor: '#F2F2F7', borderRadius: 4,
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                    }}>
                      {TYPE_LABEL[rec.record_type]}
                    </span>
                    <StatusBadge status={rec.status} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: '4px 0' }}>{rec.display_label}</h3>
                  <p style={{ fontSize: 12, color: '#86868B', margin: 0 }}>
                    Última edición: {new Date(rec.updated_at).toLocaleString('es-ES')}
                    {rec.created_by && ` · por ${rec.created_by.slice(0, 12)}…`}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Comentarios para el investigador</label>
                <textarea
                  value={comments[rec.id] ?? ''}
                  onChange={(e) => setComments({ ...comments, [rec.id]: e.target.value })}
                  placeholder="Opcional. Sólo necesario si se pide cambios o rechazo."
                  rows={2}
                  style={{ ...inputStyle, minHeight: 50, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button onClick={() => doAction(rec, 'approved')} style={btnApprove}>
                  <CheckCircle2 size={14} /> Aprobar
                </button>
                <button onClick={() => doAction(rec, 'needs_changes')} style={btnWarn}>
                  <AlertTriangle size={14} /> Pedir cambios
                </button>
                <button onClick={() => doAction(rec, 'duplicate')} style={btnSecondary}>
                  <Copy size={14} /> Marcar duplicado
                </button>
                <button onClick={() => doAction(rec, 'rejected')} style={btnDanger}>
                  <XCircle size={14} /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function labelFor(type: RecordType, r: Record<string, unknown>): string {
  switch (type) {
    case 'vehicle':
      return `${r.brand} ${r.model}${r.generation ? ` (${r.generation})` : ''} · ${r.year_from}${r.year_to ? `-${r.year_to}` : '+'}`
    case 'engine':
      return `${r.version}${r.engine_code ? ` (${r.engine_code})` : ''} · ${r.power_cv ?? '?'} CV`
    case 'exhaust_diagram':
      return `Diagrama ${r.layout} · ${r.parts_count ?? 0} piezas`
    case 'exhaust_part':
      return `${r.part_type} · ${r.name}${r.oem_ref ? ` (OEM ${r.oem_ref})` : ''}`
    case 'exhaust_aftermarket_product':
      return `${r.brand_name ?? '?'} · ${r.product_name} (${r.reference})`
  }
}

const baseBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
}
const btnApprove: React.CSSProperties = { ...baseBtn, backgroundColor: '#34C759', color: 'white' }
const btnWarn: React.CSSProperties = { ...baseBtn, backgroundColor: '#FF9500', color: 'white' }
const btnDanger: React.CSSProperties = { ...baseBtn, backgroundColor: '#FF3B30', color: 'white' }
const btnSecondary: React.CSSProperties = { ...baseBtn, backgroundColor: '#F2F2F7', color: '#1D1D1F' }
