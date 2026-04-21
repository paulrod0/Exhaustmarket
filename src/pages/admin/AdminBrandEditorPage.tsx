import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  type AftermarketBrand,
  type PriceTier,
  PRICE_TIER_LABEL,
} from '../../lib/contentTypes'
import ImagePicker from '../../components/admin/ImagePicker'

interface FormState {
  slug: string
  name: string
  country: string
  founded_year: string
  description: string
  website: string
  logo_url: string | null
  specialties: string
  price_tier: PriceTier | ''
  is_active: boolean
  display_order: string
}

const empty = (): FormState => ({
  slug: '',
  name: '',
  country: '',
  founded_year: '',
  description: '',
  website: '',
  logo_url: null,
  specialties: '',
  price_tier: '',
  is_active: true,
  display_order: '99',
})

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminBrandEditorPage() {
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
        .from('aftermarket_brands' as any)
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setError(error.message)
      } else if (data) {
        const b = data as unknown as AftermarketBrand
        setForm({
          slug: b.slug,
          name: b.name,
          country: b.country ?? '',
          founded_year: b.founded_year?.toString() ?? '',
          description: b.description ?? '',
          website: b.website ?? '',
          logo_url: b.logo_url,
          specialties: b.specialties.join(', '),
          price_tier: b.price_tier ?? '',
          is_active: b.is_active,
          display_order: b.display_order.toString(),
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
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    const slug = form.slug.trim() || slugify(form.name)
    setSaving(true)
    const payload = {
      slug,
      name: form.name.trim(),
      country: form.country.trim() || null,
      founded_year: form.founded_year ? parseInt(form.founded_year, 10) : null,
      description: form.description.trim() || null,
      website: form.website.trim() || null,
      logo_url: form.logo_url,
      specialties: form.specialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      price_tier: form.price_tier || null,
      is_active: form.is_active,
      display_order: parseInt(form.display_order, 10) || 99,
    }

    if (isNew) {
      const { data, error } = await supabase
        .from('aftermarket_brands' as any)
        .insert(payload as any)
        .select('id')
        .single()
      setSaving(false)
      if (error) {
        setError(error.message)
        return
      }
      navigate(`/admin/marcas/${(data as any).id}`, { replace: true })
    } else {
      const { error } = await supabase
        .from('aftermarket_brands' as any)
        .update(payload as any)
        .eq('id', id!)
      setSaving(false)
      if (error) setError(error.message)
    }
  }

  async function remove() {
    if (isNew || !id) return
    if (!window.confirm(`¿Borrar la marca "${form.name}"?`)) return
    const { error } = await supabase
      .from('aftermarket_brands' as any)
      .delete()
      .eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/admin/marcas')
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
        to="/admin/marcas"
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
          {isNew ? 'Nueva marca aftermarket' : form.name}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
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
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 260px',
          gap: 16,
        }}
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
          <Grid>
            <Field label="Nombre *">
              <input
                style={input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Akrapovic"
              />
            </Field>
            <Field label="Slug (URL)">
              <input
                style={input}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder={slugify(form.name) || 'akrapovic'}
              />
            </Field>
            <Field label="País">
              <input
                style={input}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Eslovenia"
              />
            </Field>
            <Field label="Fundada">
              <input
                type="number"
                style={input}
                value={form.founded_year}
                onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
                placeholder="1990"
              />
            </Field>
            <Field label="Website">
              <input
                style={input}
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://www.akrapovic.com"
              />
            </Field>
            <Field label="Gama de precio">
              <select
                style={input}
                value={form.price_tier}
                onChange={(e) => setForm({ ...form, price_tier: e.target.value as PriceTier | '' })}
              >
                <option value="">(sin categoría)</option>
                {(Object.keys(PRICE_TIER_LABEL) as PriceTier[]).map((k) => (
                  <option key={k} value={k}>
                    {PRICE_TIER_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Orden de aparición">
              <input
                type="number"
                style={input}
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: e.target.value })}
              />
            </Field>
            <Field label="Estado">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span style={{ fontSize: 13 }}>
                  {form.is_active ? 'Visible en la web' : 'Oculta'}
                </span>
              </label>
            </Field>
          </Grid>

          <Field label="Descripción">
            <textarea
              style={{ ...input, minHeight: 110, resize: 'vertical' }}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Fabricante esloveno referencia mundial. Proveedor OEM de…"
            />
          </Field>

          <Field label="Especialidades (separadas por coma)">
            <input
              style={input}
              value={form.specialties}
              onChange={(e) => setForm({ ...form, specialties: e.target.value })}
              placeholder="titanio, OEM, supercars, motos"
            />
          </Field>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #E5E5EA',
            borderRadius: 12,
            padding: 20,
            height: 'fit-content',
          }}
        >
          <ImagePicker
            label="Logo de la marca"
            value={form.logo_url}
            onChange={(url) => setForm({ ...form, logo_url: url })}
            prefix="brands"
            aspect="1 / 1"
          />
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
        marginBottom: 12,
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
