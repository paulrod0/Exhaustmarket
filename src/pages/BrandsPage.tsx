import { useEffect, useMemo, useState } from 'react'
import { Factory, ExternalLink, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  PRICE_TIER_LABEL,
  type AftermarketBrand,
  type PriceTier,
} from '../lib/contentTypes'

export default function BrandsPage() {
  const [brands, setBrands] = useState<AftermarketBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<PriceTier | 'all'>('all')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('aftermarket_brands' as any)
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })
      setBrands((data ?? []) as unknown as AftermarketBrand[])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    let list = brands
    if (tier !== 'all') list = list.filter((b) => b.price_tier === tier)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.country?.toLowerCase().includes(q) ||
          b.specialties.join(' ').toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q),
      )
    }
    return list
  }, [brands, search, tier])

  return (
    <div className="content-width" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#1D1D1F',
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          Marcas aftermarket de escape
        </h1>
        <p
          style={{
            fontSize: 16,
            color: '#86868B',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 560,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {brands.length} fabricantes de referencia, desde sistemas de pista hasta cat-backs de calle.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24, justifyContent: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
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
              padding: '10px 12px 10px 34px',
              borderRadius: 10,
              border: '1px solid #E5E5EA',
              fontSize: 14,
              outline: 'none',
              backgroundColor: '#FAFAFA',
            }}
          />
        </div>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as PriceTier | 'all')}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #E5E5EA',
            fontSize: 14,
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="all">Todas las gamas</option>
          {(Object.keys(PRICE_TIER_LABEL) as PriceTier[]).map((k) => (
            <option key={k} value={k}>
              Gama: {PRICE_TIER_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#86868B' }}>Cargando…</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}
        >
          {filtered.map((b) => (
            <article
              key={b.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #F2F2F7',
                borderRadius: 14,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
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
                    <Factory size={20} style={{ color: '#C7C7CC' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#1D1D1F', fontSize: 15 }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#86868B' }}>
                    {b.country}{b.founded_year ? ` · ${b.founded_year}` : ''}
                  </div>
                </div>
                {b.price_tier && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '3px 8px',
                      borderRadius: 4,
                      backgroundColor: tierBgColor(b.price_tier),
                      color: tierTextColor(b.price_tier),
                    }}
                  >
                    {PRICE_TIER_LABEL[b.price_tier]}
                  </span>
                )}
              </div>

              {b.description && (
                <p style={{ fontSize: 13, color: '#1D1D1F', lineHeight: 1.5, margin: 0 }}>
                  {b.description}
                </p>
              )}

              {b.specialties.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {b.specialties.map((s, si) => (
                    <span
                      key={si}
                      style={{
                        fontSize: 10,
                        backgroundColor: '#F5F5F7',
                        color: '#1D1D1F',
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {b.website && (
                <a
                  href={b.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{
                    fontSize: 12,
                    color: '#0071E3',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 'auto',
                  }}
                >
                  Visitar web
                  <ExternalLink size={11} />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function tierBgColor(t: PriceTier): string {
  switch (t) {
    case 'ultra-premium':
      return '#FFE5D1'
    case 'premium':
      return '#D1EAFE'
    case 'mid':
      return '#D1F7D1'
    case 'budget':
      return '#F5F5F7'
  }
}

function tierTextColor(t: PriceTier): string {
  switch (t) {
    case 'ultra-premium':
      return '#B25400'
    case 'premium':
      return '#0060C0'
    case 'mid':
      return '#1A8C1A'
    case 'budget':
      return '#86868B'
  }
}
