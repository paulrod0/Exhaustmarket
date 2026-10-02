import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../../lib/toast'

export type LinkScope = 'schema' | 'modelo'

/**
 * Alcance de un enlace contenido ↔ esquema: solo esta motorización, o TODAS las motorizaciones
 * del modelo (misma marca + modelo). Lo leen SchemaRelatedPanel y la API (/api/v1/relations).
 */
export default function LinkScopeToggle({ table, linkId, scope, onChange }: {
  table: 'schema_article_links' | 'schema_manual_links' | 'schema_3d_links'
  linkId: string
  scope: LinkScope | null | undefined
  onChange: (s: LinkScope) => void
}) {
  const [busy, setBusy] = useState(false)
  const current: LinkScope = scope === 'modelo' ? 'modelo' : 'schema'
  async function toggle() {
    const next: LinkScope = current === 'modelo' ? 'schema' : 'modelo'
    setBusy(true)
    const { error } = await supabase.from(table as any).update({ scope: next } as any).eq('id', linkId)
    setBusy(false)
    if (error) { toast.error(error.message); return }
    onChange(next)
    toast.success(next === 'modelo' ? 'Ahora vale para todas las motorizaciones del modelo' : 'Ahora solo para esta motorización')
  }
  return (
    <button type="button" onClick={toggle} disabled={busy}
      title="Cambiar alcance: solo esta motorización / todas las motorizaciones del modelo"
      style={{
        padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', cursor: busy ? 'wait' : 'pointer',
        border: `1px solid ${current === 'modelo' ? '#0071E3' : '#D2D2D7'}`,
        background: current === 'modelo' ? '#E8F2FF' : '#FFFFFF', color: current === 'modelo' ? '#0058B0' : '#6E6E73',
      }}>
      {current === 'modelo' ? 'Todo el modelo' : 'Solo esta motorización'}
    </button>
  )
}
