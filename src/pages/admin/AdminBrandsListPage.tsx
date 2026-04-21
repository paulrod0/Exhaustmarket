import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, Factory } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  type AftermarketBrand,
  PRICE_TIER_LABEL,
} from '../../lib/contentTypes'

export default function AdminBrandsListPage() {
  const [brands, setBrands] = useState<AftermarketBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('aftermarket_brands' as any)
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
    setBrands((data ?? []) as unknown as AftermarketBrand[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return brands
    const q = search.toLowerCase()
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.country?.toLowerCase().includes(q) ||
        b.specialties.join(' ').toLowerCase().includes(q),
    )
  }, [brands, search])

  async function toggleActive(brand: AftermarketBrand) {
    const { error } = await supabase
      .from('aftermarket_brands' as any)
      .update({ is_active: !brand.is_active } as any)
      .eq('id', brand.id)
    if (error) {
      alert(error.message)
      return
    }
    await load()
  }

  async function remove(brand: AftermarketBrand) {
    if (!window.confirm(`¿Borrar la marca "${brand.name}"?`)) return
    const { error } = await supabase
      .from('aftermarket_brands' as any)
      .delete()
      .eq('id', brand.id)
    if (error) {
      alert(error.message)
      return
    }
    await load()
  }

  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
            Marcas aftermarket
          </h1>
          <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0' }}>
            {brands.length} marcas en catálogo
          </p>
        </div>
        <Link
          to="/admin/marcas/nuevo"
          style={{
            backgroundColor: '#0071E3',
            color: 'white',
            padding: '9px 16px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={15} />
          Añadir marca
        </Link>
      </header>

      <div style={{ position: 'relative', maxWidth: 380, marginBottom: 16 }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#86868B',
          }}
        />
        <input
          type="text"
          placeholder="Buscar por nombre, país o especialidad…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '9px 12px 9px 34px',
            borderRadius: 8,
            border: '1px solid #E5E5EA',
            fontSize: 13,
            outline: 'none',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#86868B' }}>Cargando…</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map((b) => (
            <div
              key={b.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E5EA',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  borderRadius: 10,
                  overflow: 'hidden',
                  backgroundColor: '#F5F5F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {b.logo_url ? (
                  <img src={b.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Factory size={22} style={{ color: '#C7C7CC' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#1D1D1F', fontSize: 14 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: '#86868B', marginTop: 2 }}>
                  {b.country}{b.founded_year ? ` · ${b.founded_year}` : ''}
                </div>
                {b.price_tier && (
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: 10,
                      fontWeight: 500,
                      marginTop: 4,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: '#F5F5F7',
                      color: '#1D1D1F',
                    }}
                  >
                    {PRICE_TIER_LABEL[b.price_tier]}
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    marginTop: 10,
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={() => toggleActive(b)}
                    title={b.is_active ? 'Publicada' : 'Oculta'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: b.is_active ? '#34C759' : '#86868B',
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    {b.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                    {b.is_active ? 'Activa' : 'Oculta'}
                  </button>
                  <div style={{ flex: 1 }} />
                  <Link
                    to={`/admin/marcas/${b.id}`}
                    title="Editar"
                    style={actionBtn}
                  >
                    <Edit2 size={12} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    title="Eliminar"
                    style={{ ...actionBtn, color: '#D70015' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const actionBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: '1px solid #E5E5EA',
  backgroundColor: '#FFFFFF',
  color: '#1D1D1F',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
}
