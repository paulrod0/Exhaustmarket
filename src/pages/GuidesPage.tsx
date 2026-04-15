import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Clock, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  ARTICLE_CATEGORY_LABEL,
  type Article,
  type ArticleCategory,
} from '../lib/contentTypes'

export default function GuidesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ArticleCategory | 'all'>('all')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('articles' as any)
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
      setArticles((data ?? []) as unknown as Article[])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    let list = articles
    if (category !== 'all') list = list.filter((a) => a.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt?.toLowerCase().includes(q) ||
          a.tags.join(' ').toLowerCase().includes(q),
      )
    }
    return list
  }, [articles, search, category])

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
          Guías, reviews y comparativas
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
          Todo lo que necesitas saber antes de instalar un escape aftermarket.
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
            placeholder="Buscar guías por título, tag o tema…"
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
          value={category}
          onChange={(e) => setCategory(e.target.value as ArticleCategory | 'all')}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #E5E5EA',
            fontSize: 14,
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="all">Todas las categorías</option>
          {(Object.keys(ARTICLE_CATEGORY_LABEL) as ArticleCategory[]).map((c) => (
            <option key={c} value={c}>
              {ARTICLE_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#86868B' }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#86868B' }}>
          No hay guías que coincidan con tu búsqueda.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((a) => (
            <Link
              key={a.id}
              to={`/guias/${a.slug}`}
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
                t.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={(e) => {
                const t = e.currentTarget
                t.style.transform = 'translateY(0)'
                t.style.boxShadow = 'none'
              }}
            >
              <div
                style={{
                  aspectRatio: '16 / 9',
                  backgroundColor: '#F5F5F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {a.cover_url ? (
                  <img
                    src={a.cover_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  <BookOpen size={28} style={{ color: '#C7C7CC' }} />
                )}
              </div>
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#0071E3',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {ARTICLE_CATEGORY_LABEL[a.category]}
                </span>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: '#1D1D1F',
                    margin: '6px 0 4px',
                    lineHeight: 1.3,
                  }}
                >
                  {a.title}
                </h2>
                {a.excerpt && (
                  <p
                    style={{
                      fontSize: 13,
                      color: '#86868B',
                      margin: 0,
                      lineHeight: 1.5,
                      flex: 1,
                    }}
                  >
                    {a.excerpt}
                  </p>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: '#86868B',
                    marginTop: 10,
                  }}
                >
                  <Clock size={11} />
                  {a.reading_minutes} min de lectura
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
