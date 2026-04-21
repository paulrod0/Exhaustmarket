import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Factory, Layers, Loader2, MapPin, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  PRICE_TIER_LABEL,
  type AftermarketBrand,
  type PriceTier,
} from '../lib/contentTypes'

interface SchemaRef {
  id: string
  brand: string
  model: string
  year: string
  engine: string
  power: string
  layout: string
  color: string
  cover_url: string | null
  is_active: boolean
}

interface SuggestionJoin {
  note: string | null
  exhaust_schemas: SchemaRef | null
}

export default function BrandDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [brand, setBrand] = useState<AftermarketBrand | null>(null)
  const [schemas, setSchemas] = useState<SuggestionJoin[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setNotFound(false)
      const { data: brandData } = await supabase
        .from('aftermarket_brands' as any)
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (cancelled) return
      if (!brandData) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const b = brandData as unknown as AftermarketBrand
      setBrand(b)

      const { data: sugData } = await supabase
        .from('schema_brand_suggestions' as any)
        .select('note, exhaust_schemas(id, brand, model, year, engine, power, layout, color, cover_url, is_active)')
        .eq('brand_id', b.id)

      if (cancelled) return
      setSchemas((sugData ?? []) as unknown as SuggestionJoin[])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const activeSchemas = useMemo(
    () =>
      schemas
        .map((s) => s.exhaust_schemas)
        .filter((s): s is SchemaRef => s != null && s.is_active),
    [schemas],
  )

  if (loading) {
    return (
      <div className="content-width" style={{ paddingTop: 60, textAlign: 'center' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} />
        <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
      </div>
    )
  }

  if (notFound || !brand) {
    return (
      <div className="content-width" style={{ paddingTop: 60, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>
          Marca no encontrada
        </h1>
        <Link
          to="/marcas"
          style={{
            backgroundColor: '#0071E3',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Ver todas las marcas
        </Link>
      </div>
    )
  }

  return (
    <div
      className="content-width"
      style={{ paddingTop: 32, paddingBottom: 60, maxWidth: 960, margin: '0 auto' }}
    >
      <Link
        to="/marcas"
        style={{
          color: '#86868B',
          textDecoration: 'none',
          fontSize: 13,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={14} />
        Todas las marcas
      </Link>

      <header
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          gap: 24,
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
        className="brand-detail-header"
      >
        <div
          style={{
            aspectRatio: '1 / 1',
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#F5F5F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <Factory size={40} style={{ color: '#C7C7CC' }} />
          )}
        </div>

        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#1D1D1F',
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}
          >
            {brand.name}
          </h1>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              fontSize: 13,
              color: '#86868B',
              marginBottom: 14,
            }}
          >
            {brand.country && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} />
                {brand.country}
              </span>
            )}
            {brand.founded_year && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={13} />
                Fundada en {brand.founded_year}
              </span>
            )}
            {brand.price_tier && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 980,
                  backgroundColor: tierBg(brand.price_tier),
                  color: tierFg(brand.price_tier),
                }}
              >
                {PRICE_TIER_LABEL[brand.price_tier]}
              </span>
            )}
          </div>
          {brand.description && (
            <p style={{ fontSize: 15, color: '#1D1D1F', lineHeight: 1.6, margin: '0 0 14px' }}>
              {brand.description}
            </p>
          )}
          {brand.specialties.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {brand.specialties.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 12,
                    backgroundColor: '#F5F5F7',
                    color: '#1D1D1F',
                    padding: '4px 10px',
                    borderRadius: 980,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {brand.website && (
            <a
              href={brand.website}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                backgroundColor: '#0071E3',
                color: 'white',
                padding: '9px 16px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Visitar {brand.name}
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </header>

      <section>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', margin: '0 0 16px' }}>
          Modelos recomendados para {brand.name}
        </h2>
        {activeSchemas.length === 0 ? (
          <p style={{ color: '#86868B', fontSize: 14 }}>
            Todavía no hemos asociado modelos a esta marca. Pronto.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {activeSchemas.map((s) => (
              <Link
                key={s.id}
                to="/esquemas"
                state={{ preselectId: s.id }}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #F2F2F7',
                  borderRadius: 14,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  const t = e.currentTarget
                  t.style.transform = 'translateY(-2px)'
                  t.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'
                }}
                onMouseLeave={(e) => {
                  const t = e.currentTarget
                  t.style.transform = 'translateY(0)'
                  t.style.boxShadow = 'none'
                }}
              >
                <div
                  style={{
                    aspectRatio: '16 / 10',
                    backgroundColor: '#F5F5F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {s.cover_url ? (
                    <img src={s.cover_url} alt={`${s.brand} ${s.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Layers size={24} style={{ color: '#C7C7CC' }} />
                  )}
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }}>
                    <span style={{ color: s.color }}>●</span> {s.brand} {s.model}
                  </div>
                  <div style={{ fontSize: 11, color: '#86868B', marginTop: 2 }}>
                    {s.year} · {s.engine} · {s.power}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style>{`
        @media (max-width: 600px) {
          .brand-detail-header { grid-template-columns: 1fr !important; }
          .brand-detail-header > div:first-child { max-width: 160px; }
        }
      `}</style>
    </div>
  )
}

function tierBg(t: PriceTier): string {
  switch (t) {
    case 'ultra-premium': return '#FFE5D1'
    case 'premium': return '#D1EAFE'
    case 'mid': return '#D1F7D1'
    case 'budget': return '#F5F5F7'
  }
}
function tierFg(t: PriceTier): string {
  switch (t) {
    case 'ultra-premium': return '#B25400'
    case 'premium': return '#0060C0'
    case 'mid': return '#1A8C1A'
    case 'budget': return '#86868B'
  }
}
