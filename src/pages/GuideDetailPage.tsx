import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Calendar, Loader2, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import {
  ARTICLE_CATEGORY_LABEL,
  canViewTiers,
  type Article,
} from '../lib/contentTypes'
import { MarkdownRenderer } from '../lib/markdown'
import TierBadge from '../components/TierBadge'
import UpgradeCallout from '../components/UpgradeCallout'
import VideoEmbed from '../components/VideoEmbed'
import ThreeDViewer from '../components/ThreeDViewer'

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user, profile } = useAuthStore()
  const [article, setArticle] = useState<Article | null>(null)
  const [related, setRelated] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setNotFound(false)
      setRelated([])

      const { data, error } = await supabase
        .from('articles' as any)
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle()
      if (cancelled) return
      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const art = data as unknown as Article
      setArticle(art)

      // Artículos relacionados por tags compartidos o misma categoría
      if (art.tags.length > 0) {
        const { data: rel } = await supabase
          .from('articles' as any)
          .select('*')
          .eq('is_published', true)
          .neq('id', art.id)
          .overlaps('tags', art.tags)
          .order('published_at', { ascending: false })
          .limit(3)
        if (!cancelled) setRelated((rel ?? []) as unknown as Article[])
      } else {
        // Fallback: misma categoría
        const { data: rel } = await supabase
          .from('articles' as any)
          .select('*')
          .eq('is_published', true)
          .eq('category', art.category)
          .neq('id', art.id)
          .order('published_at', { ascending: false })
          .limit(3)
        if (!cancelled) setRelated((rel ?? []) as unknown as Article[])
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
          <TierBadge
            allowedTiers={article.allowed_tiers ?? []}
            locked={!canViewTiers(article.allowed_tiers, profile?.user_type, profile?.is_admin)}
          />
        </div>
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

      {(() => {
        const authorized = canViewTiers(article.allowed_tiers, profile?.user_type, profile?.is_admin)
        if (!authorized) {
          return (
            <>
              {article.excerpt && (
                <p style={{ fontSize: 17, color: '#1D1D1F', lineHeight: 1.6, margin: '0 0 16px' }}>
                  {article.excerpt}
                </p>
              )}
              <UpgradeCallout
                allowedTiers={article.allowed_tiers ?? []}
                isAuthenticated={!!user}
              />
            </>
          )
        }
        return (
          <>
            {article.video_url && <VideoEmbed url={article.video_url} />}
            <MarkdownRenderer source={article.content_md} />
            {article.attachment_url && (
              <div style={{ marginTop: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', margin: '0 0 10px' }}>
                  Archivo adjunto
                </h3>
                <ThreeDViewer
                  url={article.attachment_url}
                  filename={`${article.slug}.${article.attachment_url.split('.').pop() ?? 'bin'}`}
                />
              </div>
            )}
          </>
        )
      })()}

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

      {related.length > 0 && (
        <section style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #F2F2F7' }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#86868B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 16px',
            }}
          >
            Te puede interesar
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {related.map((r) => (
              <Link
                key={r.id}
                to={`/guias/${r.slug}`}
                style={{
                  backgroundColor: '#FAFAFA',
                  borderRadius: 12,
                  padding: 14,
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F2F2F7' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: 'white',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {r.cover_url ? (
                    <img src={r.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <BookOpen size={18} style={{ color: '#C7C7CC' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#0071E3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {ARTICLE_CATEGORY_LABEL[r.category]}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F', lineHeight: 1.3, marginTop: 2 }}>
                    {r.title}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
