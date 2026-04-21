import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Loader2, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  ARTICLE_CATEGORY_LABEL,
  type Article,
  type ArticleCategory,
} from '../../lib/contentTypes'
import ImagePicker from '../../components/admin/ImagePicker'
import FilePicker from '../../components/admin/FilePicker'
import TierSelector from '../../components/admin/TierSelector'
import SchemaArticleLinksPicker from '../../components/admin/SchemaArticleLinksPicker'
import { toast } from '../../lib/toast'

interface FormState {
  slug: string
  title: string
  subtitle: string
  category: ArticleCategory
  excerpt: string
  content_md: string
  cover_url: string | null
  tags: string
  reading_minutes: string
  is_published: boolean
  allowed_tiers: string[]
  video_url: string
  attachment_url: string | null
  attachment_type: string | null
}

const empty = (): FormState => ({
  slug: '',
  title: '',
  subtitle: '',
  category: 'guide',
  excerpt: '',
  content_md: '',
  cover_url: null,
  tags: '',
  reading_minutes: '5',
  is_published: false,
  allowed_tiers: [],
  video_url: '',
  attachment_url: null,
  attachment_type: null,
})

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminArticleEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'nuevo'

  const [form, setForm] = useState<FormState>(empty)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('articles' as any)
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setError(error.message)
      } else if (data) {
        const a = data as unknown as Article
        setForm({
          slug: a.slug,
          title: a.title,
          subtitle: a.subtitle ?? '',
          category: a.category,
          excerpt: a.excerpt ?? '',
          content_md: a.content_md,
          cover_url: a.cover_url,
          tags: a.tags.join(', '),
          reading_minutes: a.reading_minutes.toString(),
          is_published: a.is_published,
          allowed_tiers: a.allowed_tiers ?? [],
          video_url: a.video_url ?? '',
          attachment_url: a.attachment_url,
          attachment_type: a.attachment_type,
        })
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  async function save() {
    setError(null)
    if (!form.title.trim()) {
      setError('El título es obligatorio.')
      return
    }
    const slug = form.slug.trim() || slugify(form.title)
    setSaving(true)
    const payload = {
      slug,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      category: form.category,
      excerpt: form.excerpt.trim() || null,
      content_md: form.content_md,
      cover_url: form.cover_url,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      reading_minutes: parseInt(form.reading_minutes, 10) || 5,
      is_published: form.is_published,
      published_at: form.is_published ? new Date().toISOString() : null,
      allowed_tiers: form.allowed_tiers,
      video_url: form.video_url.trim() || null,
      attachment_url: form.attachment_url,
      attachment_type: form.attachment_type,
    }

    if (isNew) {
      const { data, error } = await supabase
        .from('articles' as any)
        .insert(payload as any)
        .select('id')
        .single()
      setSaving(false)
      if (error) {
        setError(error.message)
        toast.error('No se pudo crear: ' + error.message)
        return
      }
      toast.success('Artículo creado')
      navigate(`/admin/articulos/${(data as any).id}`, { replace: true })
    } else {
      const { error } = await supabase
        .from('articles' as any)
        .update(payload as any)
        .eq('id', id!)
      setSaving(false)
      if (error) {
        setError(error.message)
        toast.error('Error al guardar: ' + error.message)
      } else {
        toast.success('Cambios guardados')
      }
    }
  }

  async function remove() {
    if (isNew || !id) return
    if (!window.confirm(`¿Borrar "${form.title}"?`)) return
    const { error } = await supabase
      .from('articles' as any)
      .delete()
      .eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Artículo borrado')
    navigate('/admin/articulos')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#86868B' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} />
        <style>{`@keyframes spin {from{transform:rotate(0)} to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/admin/articulos"
        style={{
          color: '#86868B',
          textDecoration: 'none',
          fontSize: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 8,
        }}
      >
        <ArrowLeft size={13} />
        Volver al listado
      </Link>

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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
          {isNew ? 'Nuevo artículo' : form.title || '(sin título)'}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && form.is_published && (
            <a
              href={`/guias/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: 'white',
                color: '#1D1D1F',
                border: '1px solid #E5E5EA',
                padding: '9px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Eye size={14} />
              Ver en web
            </a>
          )}
          {!isNew && (
            <button
              onClick={remove}
              disabled={saving}
              style={{
                backgroundColor: 'white',
                color: '#D70015',
                border: '1px solid #D70015',
                padding: '9px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Trash2 size={14} />
              Borrar
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{
              backgroundColor: '#0071E3',
              color: 'white',
              border: 'none',
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </header>

      {error && (
        <div
          style={{
            padding: 12,
            backgroundColor: '#FFE5E7',
            color: '#D70015',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}
        className="editor-grid"
      >
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #E5E5EA',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <Field label="Título *">
            <input
              style={input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Guía completa de materiales de escape"
            />
          </Field>
          <Field label="Subtítulo">
            <input
              style={input}
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="Acero 304, 321, Titanio, Inconel"
            />
          </Field>

          <Grid>
            <Field label="Slug (URL)">
              <input
                style={input}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder={slugify(form.title) || 'guia-materiales-escape'}
              />
            </Field>
            <Field label="Categoría">
              <select
                style={input}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ArticleCategory })}
              >
                {(Object.keys(ARTICLE_CATEGORY_LABEL) as ArticleCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {ARTICLE_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Minutos de lectura">
              <input
                type="number"
                style={input}
                value={form.reading_minutes}
                onChange={(e) => setForm({ ...form, reading_minutes: e.target.value })}
              />
            </Field>
          </Grid>

          <Field label="Extracto (aparece en el listado)">
            <textarea
              style={{ ...input, minHeight: 60, resize: 'vertical' }}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Resumen de 1-2 líneas que se muestra como preview del artículo."
            />
          </Field>

          <Field label="Contenido (Markdown)">
            <textarea
              style={{ ...input, minHeight: 380, resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}
              value={form.content_md}
              onChange={(e) => setForm({ ...form, content_md: e.target.value })}
              placeholder={`# Título principal\n\nPárrafo de introducción.\n\n## Sección\n\n- Punto 1\n- Punto 2\n\n**Negrita**, *cursiva*, [link](https://...)`}
            />
          </Field>

          <Field label="Tags (separados por coma)">
            <input
              style={input}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="materiales, titanio, guia basica"
            />
          </Field>

          <Field label="Estado de publicación">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              <span style={{ fontSize: 13 }}>
                {form.is_published
                  ? 'Publicado — visible en /guias'
                  : 'Borrador — solo admins lo ven'}
              </span>
            </label>
          </Field>

          {/* Vídeo embebido */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #F2F2F7',
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px' }}>
              Vídeo tutorial (opcional)
            </h3>
            <p style={{ fontSize: 12, color: '#86868B', margin: '0 0 12px' }}>
              Pega una URL de YouTube o Vimeo para incrustarla encima del contenido.
            </p>
            <Field label="URL del vídeo">
              <input
                style={input}
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </Field>
          </div>

          {/* Archivo adjunto (3D, PDF, ...) */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #F2F2F7',
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px' }}>
              Archivo descargable / modelo 3D (opcional)
            </h3>
            <p style={{ fontSize: 12, color: '#86868B', margin: '0 0 12px' }}>
              Sube un PDF del manual, o un modelo 3D (GLB / GLTF se renderizan en la web;
              STL / OBJ se ofrecen como descarga).
            </p>
            <FilePicker
              prefix={`articles/${form.slug || 'draft'}`}
              value={form.attachment_url}
              onChange={(url, type) =>
                setForm({ ...form, attachment_url: url, attachment_type: type })
              }
            />
          </div>

          {/* Control de acceso por suscripción */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #F2F2F7',
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px' }}>
              Acceso por suscripción
            </h3>
            <p style={{ fontSize: 12, color: '#86868B', margin: '0 0 12px' }}>
              Selecciona qué tipo de usuario puede ver este artículo. Los usuarios sin
              acceso verán un callout para crear cuenta o actualizar su plan.
            </p>
            <TierSelector
              value={form.allowed_tiers}
              onChange={(next) => setForm({ ...form, allowed_tiers: next })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              backgroundColor: 'white',
              border: '1px solid #E5E5EA',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <ImagePicker
              label="Imagen de portada"
              value={form.cover_url}
              onChange={(url) => setForm({ ...form, cover_url: url })}
              prefix="articles"
              aspect="16 / 9"
            />
          </div>

          <div
            style={{
              backgroundColor: 'white',
              border: '1px solid #E5E5EA',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px' }}>
              Esquemas asociados
            </h3>
            <p style={{ fontSize: 12, color: '#86868B', margin: '0 0 12px' }}>
              Este artículo aparecerá en la ficha pública de los esquemas elegidos.
            </p>
            <SchemaArticleLinksPicker
              mode={{ kind: 'for-article', articleId: id && id !== 'nuevo' ? id : null }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .editor-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}
    >
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: '#86868B',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          display: 'block',
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #E5E5EA',
  fontSize: 13,
  color: '#1D1D1F',
  outline: 'none',
  backgroundColor: 'white',
  fontFamily: 'inherit',
}
