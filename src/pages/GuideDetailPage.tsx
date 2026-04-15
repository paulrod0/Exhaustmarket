import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Calendar, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ARTICLE_CATEGORY_LABEL, type Article } from '../lib/contentTypes'
import { MarkdownRenderer } from '../lib/markdown'

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setNotFound(false)
      const { data, error } = await supabase
        .from('articles' as any)
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle()
      if (cancelled) return
      if (error || !data) {
        setNotFound(true)
      } else {
        setArticle(data as unknown as Article)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="content-width" style={{ paddingTop: 60, paddingBottom: 60, textAlign: 'center', color: '#86868B' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} />
        <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="content-width" style={{ paddingTop: 60, paddingBottom: 60, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: '0 0 12px' }}>
          Guía no encontrada
        </h1>
        <p style={{ color: '#86868B', marginBottom: 20 }}>
          La guía que buscas no existe o ha sido despublicada.
        </p>
        <Link
          to="/guias"
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
          Ver todas las guías
        </Link>
      </div>
    )
  }

  return (
    <div
      className="content-width"
      style={{ paddingTop: 32, paddingBottom: 60, maxWidth: 740, margin: '0 auto' }}
    >
      <Link
        to="/guias"
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
        Todas las guías
      </Link>

      <div style={{ marginBottom: 24 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#0071E3',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {ARTICLE_CATEGORY_LABEL[article.category]}
        </span>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: '#1D1D1F',
            margin: '8px 0 8px',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {article.title}
        </h1>
        {article.subtitle && (
          <p
            style={{
              fontSize: 18,
              color: '#86868B',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {article.subtitle}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 12,
            fontSize: 12,
            color: '#86868B',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} />
            {article.reading_minutes} min de lectura
          </span>
          {article.published_at && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} />
              {new Date(article.published_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      {article.cover_url && (
        <div
          style={{
            aspectRatio: '16 / 9',
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 32,
            backgroundColor: '#F5F5F7',
          }}
        >
          <img
            src={article.cover_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      <MarkdownRenderer source={article.content_md} />

      {article.tags.length > 0 && (
        <div
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: '1px solid #F2F2F7',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {article.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 12,
                backgroundColor: '#F5F5F7',
                color: '#1D1D1F',
                padding: '4px 10px',
                borderRadius: 980,
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
