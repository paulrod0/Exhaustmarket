import { useEffect, useState } from 'react'
import { Plus, X, Factory, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { AftermarketBrand } from '../../lib/contentTypes'

interface Suggestion {
  id?: string
  brand_id: string
  note: string | null
}

interface Props {
  schemaId: string | null
  /** Se llama cuando el admin guarda cambios (el padre sabe si ya tiene schemaId) */
  onDirty?: () => void
}

/**
 * Picker de marcas recomendadas asociadas a un esquema.
 * Guarda / borra directamente contra schema_brand_suggestions.
 * Si el esquema aún no existe (es "nuevo"), muestra un aviso.
 */
export default function BrandSuggestionsPicker({ schemaId, onDirty }: Props) {
  const [brands, setBrands] = useState<AftermarketBrand[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [brandsRes, sugRes] = await Promise.all([
        supabase
          .from('aftermarket_brands' as any)
          .select('*')
          .eq('is_active', true)
          .order('display_order')
          .order('name'),
        schemaId
          ? supabase
              .from('schema_brand_suggestions' as any)
              .select('*')
              .eq('schema_id', schemaId)
          : Promise.resolve({ data: [] }),
      ])
      if (cancelled) return
      setBrands((brandsRes.data ?? []) as unknown as AftermarketBrand[])
      setSuggestions((sugRes.data ?? []) as unknown as Suggestion[])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [schemaId])

  async function add() {
    if (!schemaId || !selectedBrandId) return
    // Evitar duplicados
    if (suggestions.some((s) => s.brand_id === selectedBrandId)) {
      alert('Esa marca ya está añadida.')
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('schema_brand_suggestions' as any)
      .insert({
        schema_id: schemaId,
        brand_id: selectedBrandId,
        note: note.trim() || null,
        component_id: null,
      } as any)
      .select('*')
      .single()
    setSaving(false)
    if (error) {
      alert(error.message)
      return
    }
    setSuggestions([...suggestions, data as unknown as Suggestion])
    setSelectedBrandId('')
    setNote('')
    onDirty?.()
  }

  async function remove(s: Suggestion) {
    if (!s.id) return
    const { error } = await supabase
      .from('schema_brand_suggestions' as any)
      .delete()
      .eq('id', s.id)
    if (error) {
      alert(error.message)
      return
    }
    setSuggestions(suggestions.filter((x) => x.id !== s.id))
    onDirty?.()
  }

  if (!schemaId) {
    return (
      <div
        style={{
          padding: 16,
          fontSize: 13,
          color: '#86868B',
          backgroundColor: '#F5F5F7',
          borderRadius: 10,
        }}
      >
        Guarda el esquema primero para poder añadir marcas recomendadas.
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 20, color: '#86868B' }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} />
      </div>
    )
  }

  const unusedBrands = brands.filter(
    (b) => !suggestions.some((s) => s.brand_id === b.id),
  )

  return (
    <div>
      {suggestions.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {suggestions.map((s) => {
            const brand = brands.find((b) => b.id === s.brand_id)
            if (!brand) return null
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  backgroundColor: '#F5F5F7',
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Factory size={16} style={{ color: '#C7C7CC' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>{brand.name}</div>
                  {s.note && (
                    <div style={{ fontSize: 11, color: '#86868B' }}>{s.note}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  style={{
                    width: 26,
                    height: 26,
                    border: 'none',
                    borderRadius: 6,
                    backgroundColor: '#FFFFFF',
                    color: '#D70015',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {unusedBrands.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            style={inputStyle}
          >
            <option value="">— Selecciona marca —</option>
            {unusedBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional): ej. 'Sistema Evolution con valvulas'"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={add}
            disabled={!selectedBrandId || saving}
            style={{
              backgroundColor: selectedBrandId ? '#0071E3' : '#C7C7CC',
              color: 'white',
              border: 'none',
              padding: '9px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: selectedBrandId ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={14} />
            Añadir
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#86868B' }}>
          Todas las marcas disponibles ya están añadidas a este esquema.
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #E5E5EA',
  fontSize: 13,
  outline: 'none',
  backgroundColor: 'white',
  fontFamily: 'inherit',
}
