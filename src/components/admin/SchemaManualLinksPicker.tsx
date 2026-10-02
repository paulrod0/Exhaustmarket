import { useEffect, useMemo, useState } from 'react'
import { Plus, X, Loader2, FileText, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../../lib/toast'
import LinkScopeToggle, { type LinkScope } from './LinkScopeToggle'

interface ManualLink { id: string; schema_id: string; manual_id: string; display_order: number; scope?: LinkScope }
interface ManualOption { id: string; label: string; sub?: string }

/**
 * Asocia uno o varios MANUALES a un esquema (muchos-a-muchos), espejo de
 * SchemaArticleLinksPicker pero para manuales. El facade Neon no soporta selects
 * anidados, así que la etiqueta se resuelve desde la lista de opciones (columnas explícitas).
 */
export default function SchemaManualLinksPicker({ schemaId }: { schemaId: string | null }) {
  const [links, setLinks] = useState<ManualLink[]>([])
  const [options, setOptions] = useState<ManualOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!schemaId) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [linksRes, optRes] = await Promise.all([
        supabase.from('schema_manual_links' as any).select('id, schema_id, manual_id, display_order, scope').eq('schema_id', schemaId),
        supabase.from('manuals' as any).select('id, title, car_brand, car_model, manual_type').order('title'),
      ])
      if (cancelled) return
      setLinks((linksRes.data ?? []) as unknown as ManualLink[])
      setOptions(((optRes.data ?? []) as any[]).map((m) => ({
        id: m.id,
        label: m.title,
        sub: [m.car_brand, m.car_model].filter(Boolean).join(' '),
      })))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [schemaId])

  const takenIds = new Set(links.map((l) => l.manual_id))
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return options
      .filter((o) => !takenIds.has(o.id))
      .filter((o) => !q || o.label.toLowerCase().includes(q) || (o.sub ?? '').toLowerCase().includes(q))
      .slice(0, 6)
  }, [options, search, takenIds])

  async function addLink(manualId: string) {
    if (!schemaId) return
    setAdding(true)
    const { data, error } = await supabase
      .from('schema_manual_links' as any)
      .insert({ schema_id: schemaId, manual_id: manualId, display_order: links.length } as any)
      .select('id, schema_id, manual_id, display_order, scope')
      .single()
    setAdding(false)
    if (error) { toast.error(error.message); return }
    setLinks([...links, data as unknown as ManualLink])
    setSearch('')
    toast.success('Manual asociado')
  }

  async function removeLink(link: ManualLink) {
    const { error } = await supabase.from('schema_manual_links' as any).delete().eq('id', link.id)
    if (error) { toast.error(error.message); return }
    setLinks(links.filter((l) => l.id !== link.id))
    toast.success('Manual desasociado')
  }

  if (!schemaId) {
    return <div style={{ padding: 16, fontSize: 13, color: '#86868B', backgroundColor: '#F5F5F7', borderRadius: 10 }}>Guarda primero para poder asociar manuales.</div>
  }
  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center', color: '#86868B' }}><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /></div>
  }

  return (
    <div>
      {links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {links.map((l) => {
            const opt = options.find((o) => o.id === l.manual_id)
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, backgroundColor: '#F5F5F7', borderRadius: 10 }}>
                <FileText size={14} style={{ color: '#86868B', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>{opt?.label ?? '(manual borrado)'}</div>
                  {opt?.sub && <div style={{ fontSize: 11, color: '#86868B' }}>{opt.sub}</div>}
                </div>
                <LinkScopeToggle table="schema_manual_links" linkId={l.id} scope={l.scope}
                  onChange={(s) => setLinks((prev) => prev.map((x) => (x.id === l.id ? { ...x, scope: s } : x)))} />
                <button type="button" onClick={() => removeLink(l)}
                  style={{ width: 26, height: 26, border: 'none', borderRadius: 6, backgroundColor: 'white', color: '#D70015', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar manual para asociar…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', borderRadius: 8, border: '1px solid #E5E5EA', fontSize: 13, outline: 'none', backgroundColor: 'white' }} />
      </div>

      {search.trim() && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, backgroundColor: 'white', border: '1px solid #E5E5EA', borderRadius: 10, padding: 6 }}>
          {filtered.map((o) => (
            <button key={o.id} type="button" onClick={() => addLink(o.id)} disabled={adding}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', background: 'none', cursor: adding ? 'not-allowed' : 'pointer', borderRadius: 6, textAlign: 'left' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F5F5F7' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
              <Plus size={14} style={{ color: '#0071E3' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#1D1D1F' }}>{o.label}</div>
                {o.sub && <div style={{ fontSize: 11, color: '#86868B' }}>{o.sub}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
