import { useEffect, useMemo, useState } from 'react'
import { Plus, X, Loader2, BookOpen, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../../lib/toast'
import {
  ARTICLE_CATEGORY_LABEL,
  SCHEMA_ARTICLE_KIND_LABEL,
  type Article,
  type SchemaArticleKind,
  type SchemaArticleLink,
} from '../../lib/contentTypes'

interface LinkWithArticle extends SchemaArticleLink {
  articles: Article | null
}

interface Props {
  /** Si es null, mostramos aviso "guarda primero" */
  mode:
    | { kind: 'for-schema'; schemaId: string | null }
    | { kind: 'for-article'; articleId: string | null }
}

/**
 * Editor bidireccional de enlaces entre esquemas y artículos.
 * - Si mode='for-schema', lista artículos ya asociados a ese esquema.
 * - Si mode='for-article', lista esquemas ya asociados a ese artículo.
 * En ambos permite añadir/quitar rápidamente.
 */
export default function SchemaArticleLinksPicker({ mode }: Props) {
  const [links, setLinks] = useState<LinkWithArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [allOptions, setAllOptions] = useState<Array<{ id: string; label: string; sub?: string }>>([])
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<SchemaArticleKind>(
    mode.kind === 'for-schema' ? 'tutorial' : 'related',
  )

  const parentId =
    mode.kind === 'for-schema' ? mode.schemaId : mode.articleId

  useEffect(() => {
    if (!parentId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [linksRes, optionsRes] =
        mode.kind === 'for-schema'
          ? await Promise.all([
              supabase
                .from('schema_article_links' as any)
                .select('*, articles(*)')
                .eq('schema_id', parentId),
              supabase
                .from('articles' as any)
                .select('id, title, category')
                .order('title'),
            ])
          : await Promise.all([
              supabase
                .from('schema_article_links' as any)
                .select('*, exhaust_schemas(id, brand, model, year)')
                .eq('article_id', parentId),
              supabase
                .from('exhaust_schemas' as any)
                .select('id, brand, model, year')
                .order('brand')
                .order('model'),
            ])
      if (cancelled) return

      setLinks((linksRes.data ?? []) as unknown as LinkWithArticle[])

      const opts = ((optionsRes.data ?? []) as any[]).map((r: any) => {
        if (mode.kind === 'for-schema') {
          return {
            id: r.id,
            label: r.title,
            sub: ARTICLE_CATEGORY_LABEL[r.category as keyof typeof ARTICLE_CATEGORY_LABEL],
          }
        }
        return {
          id: r.id,
          label: `${r.brand} ${r.model}`,
          sub: r.year,
        }
      })
      setAllOptions(opts)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [mode, parentId])

  const takenIds = new Set(
    links.map((l) => (mode.kind === 'for-schema' ? l.article_id : l.schema_id)),
  )
  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allOptions
      .filter((o) => !takenIds.has(o.id))
      .filter((o) => !q || o.label.toLowerCase().includes(q))
      .slice(0, 6)
  }, [allOptions, search, takenIds])

  async function addLink(targetId: string) {
    if (!parentId) return
    setAdding(true)
    const payload =
      mode.kind === 'for-schema'
        ? { schema_id: parentId, article_id: targetId, kind }
        : { schema_id: targetId, article_id: parentId, kind }
    const { data, error } = await supabase
      .from('schema_article_links' as any)
      .insert(payload as any)
      .select('*')
      .single()
    setAdding(false)
    if (error) {
      toast.error(error.message)
      return
    }
    // Recargamos para traer el join
    const reloadQuery =
      mode.kind === 'for-schema'
        ? supabase
            .from('schema_article_links' as any)
            .select('*, articles(*)')
            .eq('id', (data as any).id)
            .single()
        : supabase
            .from('schema_article_links' as any)
            .select('*, exhaust_schemas(id, brand, model, year)')
            .eq('id', (data as any).id)
            .single()
    const { data: full } = await reloadQuery
    setLinks([...links, full as unknown as LinkWithArticle])
    setSearch('')
    toast.success('Relación añadida')
  }

  async function removeLink(link: LinkWithArticle) {
    const { error } = await supabase
      .from('schema_article_links' as any)
      .delete()
      .eq('id', link.id)
    if (error) {
      toast.error(error.message)
      return
    }
    setLinks(links.filter((l) => l.id !== link.id))
    toast.success('Relación eliminada')
  }

  if (!parentId) {
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
        Guarda primero para poder asociar {mode.kind === 'for-schema' ? 'guías' : 'esquemas'}.
      </div>
    )
  }
  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#86868B' }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div>
      {links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {links.map((l) => {
            const label =
              mode.kind === 'for-schema'
                ? l.articles?.title ?? '(artículo borrado)'
                : (l as any).exhaust_schemas
                  ? `${(l as any).exhaust_schemas.brand} ${(l as any).exhaust_schemas.model}`
                  : '(esquema borrado)'
            return (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  backgroundColor: '#F5F5F7',
                  borderRadius: 10,
                }}
              >
                <BookOpen size={14} style={{ color: '#86868B', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#86868B' }}>
                    {SCHEMA_ARTICLE_KIND_LABEL[l.kind]}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeLink(l)}
                  style={{
                    width: 26,
                    height: 26,
                    border: 'none',
                    borderRadius: 6,
                    backgroundColor: 'white',
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              mode.kind === 'for-schema' ? 'Buscar guía para asociar…' : 'Buscar esquema para asociar…'
            }
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 12px 9px 34px',
              borderRadius: 8,
              border: '1px solid #E5E5EA',
              fontSize: 13,
              outline: 'none',
              backgroundColor: 'white',
            }}
          />
        </div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as SchemaArticleKind)}
          style={{
            padding: '9px 10px',
            borderRadius: 8,
            border: '1px solid #E5E5EA',
            fontSize: 12,
            backgroundColor: 'white',
          }}
        >
          <option value="tutorial">Tutorial</option>
          <option value="install_guide">Guía instalación</option>
          <option value="review">Review</option>
          <option value="related">Relacionado</option>
        </select>
      </div>

      {search.trim() && filteredOptions.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            backgroundColor: 'white',
            border: '1px solid #E5E5EA',
            borderRadius: 10,
            padding: 6,
          }}
        >
          {filteredOptions.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => addLink(o.id)}
              disabled={adding}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                border: 'none',
                background: 'none',
                cursor: adding ? 'not-allowed' : 'pointer',
                borderRadius: 6,
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F5F5F7' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <Plus size={14} style={{ color: '#0071E3' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#1D1D1F' }}>{o.label}</div>
                {o.sub && <div style={{ fontSize: 11, color: '#86868B' }}>{o.sub}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
