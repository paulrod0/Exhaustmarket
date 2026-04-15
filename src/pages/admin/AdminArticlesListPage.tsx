import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  ARTICLE_CATEGORY_LABEL,
  type Article,
  type ArticleCategory,
} from '../../lib/contentTypes'

export default function AdminArticlesListPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ArticleCategory | 'all'>('all')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('articles' as any)
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    setArticles((data ?? []) as unknown as Article[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    let list = articles
    if (category !== 'all') list = list.filter((a) => a.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          a.tags.join(' ').toLowerCase().includes(q),
      )
    }
    return list
  }, [articles, search, category])

  async function togglePublish(a: Article) {
    const next = !a.is_published
    const { error } = await supabase
      .from('articles' as any)
      .update({
        is_published: next,
        published_at: next ? a.published_at ?? new Date().toISOString() : a.published_at,
      } as any)
      .eq('id', a.id)
    if (error) {
      alert(error.message)
      return
    }
    await load()
  }

  async function remove(a: Article) {
    if (!window.confirm(`¿Borrar "${a.title}"?`)) return
    const { error } = await supabase
      .from('articles' as any)
      .delete()
      .eq('id', a.id)
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
            Artículos
          </h1>
          <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0' }}>
            {articles.length} entradas · {articles.filter((a) => a.is_published).length} publicadas
          </p>
        </div>
        <Link
          to="/admin/articulos/nuevo"
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
          Nuevo artículo
        </Link>
      </header>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
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
            placeholder="Buscar por título, slug o tag…"
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
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ArticleCategory | 'all')}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid #E5E5EA',
            fontSize: 13,
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
        <div style={{ padding: 40, textAlign: 'center', color: '#86868B' }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: '#86868B',
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E5E5EA',
          }}
        >
          No hay artículos para esos filtros.
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5EA',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {filtered.map((a, idx) => (
            <div
              key={a.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 110px 90px 160px',
                gap: 12,
                padding: '12px 16px',
                borderTop: idx === 0 ? 'none' : '1px solid #F2F2F7',
                alignItems: 'center',
                fontSize: 13,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: '#F5F5F7',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {a.cover_url ? (
                  <img src={a.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <FileText size={16} style={{ color: '#C7C7CC' }} />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 500, color: '#1D1D1F' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: '#86868B' }}>
                  /{a.slug} · {a.reading_minutes} min lectura
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#86868B' }}>
                {ARTICLE_CATEGORY_LABEL[a.category]}
              </div>
              <button
                onClick={() => togglePublish(a)}
                title={a.is_published ? 'Ocultar' : 'Publicar'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: a.is_published ? '#34C759' : '#86868B',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {a.is_published ? <Eye size={13} /> : <EyeOff size={13} />}
                {a.is_published ? 'Publicado' : 'Borrador'}
              </button>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Link to={`/admin/articulos/${a.id}`} title="Editar" style={action}>
                  <Edit2 size={13} />
                </Link>
                <button type="button" onClick={() => remove(a)} title="Eliminar" style={{ ...action, color: '#D70015' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const action: React.CSSProperties = {
  width: 30,
  height: 30,
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
