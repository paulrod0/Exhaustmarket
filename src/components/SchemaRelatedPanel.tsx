import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Factory, BookOpen, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  ARTICLE_CATEGORY_LABEL,
  type AftermarketBrand,
  type Article,
} from '../lib/contentTypes'

interface Props {
  schemaId: string
  schemaBrand: string
  schemaLayout: string
}

/**
 * Panel que se muestra debajo del esquema interactivo con:
 * - Marcas aftermarket recomendadas por el admin para ese modelo concreto.
 * - Artículos relacionados (match por tags con la marca del coche o layout).
 */
export default function SchemaRelatedPanel({
  schemaId,
  schemaBrand,
  schemaLayout,
}: Props) {
  const [brands, setBrands] = useState<AftermarketBrand[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)

      const sugPromise = supabase
        .from('schema_brand_suggestions' as any)
        .select('brand_id, aftermarket_brands(*)')
        .eq('schema_id', schemaId)

      // 1) Artículos enlazados directamente (asociados por admin)
      const directLinksPromise = supabase
        .from('schema_article_links' as any)
        .select('article_id, kind, articles(*)')
        .eq('schema_id', schemaId)

      // 2) Fallback: tags match
      const brandLc = schemaBrand.toLowerCase()
      const layoutLc = schemaLayout.toLowerCase()
      const tagMatchPromise = supabase
        .from('articles' as any)
        .select('*')
        .eq('is_published', true)
        .or(`tags.cs.{${brandLc}},tags.cs.{${layoutLc}}`)
        .order('published_at', { ascending: false })
        .limit(3)

      const [sugRes, directRes, tagRes] = await Promise.all([
        sugPromise,
        directLinksPromise,
        tagMatchPromise,
      ])
      if (cancelled) return

      const suggestedBrands = (sugRes.data ?? [])
        .map((row: any) => row.aftermarket_brands as AftermarketBrand)
        .filter((b: AftermarketBrand | null): b is AftermarketBrand => b != null && b.is_active)

      // Combinar directos (prioridad) + tag-match, sin duplicar
      const directArticles = (directRes.data ?? [])
        .map((row: any) => row.articles as Article)
        .filter((a: Article | null): a is Article => a != null && a.is_published)

      const directIds = new Set(directArticles.map((a) => a.id))
      const tagMatched = (tagRes.data ?? [])
        .filter((a: any) => !directIds.has(a.id)) as unknown as Article[]

      const combined = [...directArticles, ...tagMatched].slice(0, 4)

      setBrands(suggestedBrands)
      setArticles(combined)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [schemaId, schemaBrand, schemaLayout])

  if (loading) return null
  if (brands.length === 0 && articles.length === 0) return null

  return (
    <section
      style={{
        marginTop: 24,
        display: 'grid',
        gridTemplateColumns: brands.length > 0 && articles.length > 0 ? '1fr 1fr' : '1fr',
        gap: 16,
      }}
      className="schema-related-panel"
    >
      {brands.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #F2F2F7',
            borderRadius: 14,
            padding: 18,
          }}
        >
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#86868B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 12px',
            }}
          >
            Marcas recomendadas para este modelo
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brands.map((b) => (
              <Link
                key={b.id}
                to={`/marcas/${b.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  backgroundColor: '#FAFAFA',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F2F2F7'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FAFAFA'
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Factory size={16} style={{ color: '#C7C7CC' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#86868B' }}>
                    {b.country}{b.founded_year ? ` · ${b.founded_year}` : ''}
                  </div>
                </div>
                <ExternalLink size={13} style={{ color: '#86868B', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {articles.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #F2F2F7',
            borderRadius: 14,
            padding: 18,
          }}
        >
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#86868B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 12px',
            }}
          >
            Tutoriales y guías
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {articles.map((a) => (
              <Link
                key={a.id}
                to={`/guias/${a.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  backgroundColor: '#FAFAFA',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F2F2F7'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FAFAFA'
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {a.cover_url ? (
                    <img src={a.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <BookOpen size={16} style={{ color: '#C7C7CC' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#0071E3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {ARTICLE_CATEGORY_LABEL[a.category]}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#1D1D1F',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {a.title}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .schema-related-panel { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
