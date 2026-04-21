import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  LAYOUTS,
  LAYOUT_BY_ID,
  blankComponentsForLayout,
  type ExhaustComponent,
  type ExhaustSchemaRecord,
  type Layout,
} from '../../lib/schemaDefinitions'
import PhotoUploader from '../../components/admin/PhotoUploader'
import BrandSuggestionsPicker from '../../components/admin/BrandSuggestionsPicker'
import TierSelector from '../../components/admin/TierSelector'

interface FormState {
  brand: string
  model: string
  year: string
  engine: string
  power: string
  layout: Layout
  color: string
  note: string
  components: Record<string, ExhaustComponent>
  cover_url: string | null
  gallery_urls: string[]
  is_active: boolean
  allowed_tiers: string[]
}

const DEFAULT_LAYOUT: Layout = 'v8tt'

const emptyState = (): FormState => ({
  brand: '',
  model: '',
  year: '',
  engine: '',
  power: '',
  layout: DEFAULT_LAYOUT,
  color: '#0071E3',
  note: '',
  components: blankComponentsForLayout(DEFAULT_LAYOUT),
  cover_url: null,
  gallery_urls: [],
  is_active: true,
  allowed_tiers: [],
})

export default function AdminSchemaEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'nuevo'

  const [form, setForm] = useState<FormState>(emptyState)
  // Para poder subir fotos antes de guardar por primera vez, pre-generamos un ID estable
  const [tempId] = useState<string>(() =>
    'tmp-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
  )
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('exhaust_schemas' as any)
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setError(error.message)
      } else if (data) {
        const row = data as unknown as ExhaustSchemaRecord
        setForm({
          brand: row.brand,
          model: row.model,
          year: row.year ?? '',
          engine: row.engine ?? '',
          power: row.power ?? '',
          layout: row.layout,
          color: row.color ?? '#0071E3',
          note: row.note ?? '',
          components: row.components ?? blankComponentsForLayout(row.layout),
          cover_url: row.cover_url,
          gallery_urls: row.gallery_urls ?? [],
          is_active: row.is_active,
          allowed_tiers: row.allowed_tiers ?? [],
        })
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  const layoutDef = useMemo(() => LAYOUT_BY_ID[form.layout], [form.layout])

  function changeLayout(next: Layout) {
    setForm((prev) => {
      // Mantener componentes existentes que también existen en el nuevo layout
      const newComponents = blankComponentsForLayout(next)
      for (const cid of Object.keys(newComponents)) {
        if (prev.components[cid]) {
          newComponents[cid] = { ...prev.components[cid], id: cid }
        }
      }
      return { ...prev, layout: next, components: newComponents }
    })
  }

  function updateComponent(cid: string, patch: Partial<ExhaustComponent>) {
    setForm((prev) => ({
      ...prev,
      components: {
        ...prev.components,
        [cid]: { ...prev.components[cid], ...patch, id: cid },
      },
    }))
  }

  async function save() {
    setError(null)
    if (!form.brand.trim() || !form.model.trim()) {
      setError('Marca y modelo son obligatorios.')
      return
    }
    setSaving(true)
    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: form.year.trim(),
      engine: form.engine.trim(),
      power: form.power.trim(),
      layout: form.layout,
      color: form.color,
      note: form.note.trim() || null,
      components: form.components,
      cover_url: form.cover_url,
      gallery_urls: form.gallery_urls,
      is_active: form.is_active,
      allowed_tiers: form.allowed_tiers,
    }

    if (isNew) {
      const { data, error } = await supabase
        .from('exhaust_schemas' as any)
        .insert(payload as any)
        .select('id')
        .single()
      setSaving(false)
      if (error) {
        setError(error.message)
        return
      }
      navigate(`/admin/esquemas/${(data as any).id}`, { replace: true })
    } else {
      const { error } = await supabase
        .from('exhaust_schemas' as any)
        .update(payload as any)
        .eq('id', id!)
      setSaving(false)
      if (error) {
        setError(error.message)
        return
      }
    }
  }

  async function remove() {
    if (isNew || !id) return
    if (!window.confirm(`¿Borrar "${form.brand} ${form.model}" permanentemente?`)) return
    const { error } = await supabase
      .from('exhaust_schemas' as any)
      .delete()
      .eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/admin/esquemas')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#86868B' }}>
        <Loader2
          size={20}
          style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }}
        />
        <p style={{ marginTop: 8, fontSize: 13 }}>Cargando esquema…</p>
        <style>{`@keyframes spin { from {transform:rotate(0)} to {transform:rotate(360deg)} }`}</style>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/admin/esquemas"
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
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
            {isNew ? 'Nuevo esquema' : `${form.brand} ${form.model}`}
          </h1>
          <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0' }}>
            {layoutDef.label} · {layoutDef.components.length} componentes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && (
            <button
              onClick={remove}
              disabled={saving}
              style={{
                backgroundColor: '#FFFFFF',
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
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Save size={14} />
            )}
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

      {/* Sección 1: Datos generales */}
      <Section title="Datos generales">
        <Grid>
          <Field label="Marca *">
            <input
              style={inputStyle}
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="Ferrari"
            />
          </Field>
          <Field label="Modelo *">
            <input
              style={inputStyle}
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="296 GTB"
            />
          </Field>
          <Field label="Año">
            <input
              style={inputStyle}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="2021–present"
            />
          </Field>
          <Field label="Motor">
            <input
              style={inputStyle}
              value={form.engine}
              onChange={(e) => setForm({ ...form, engine: e.target.value })}
              placeholder="V6 Biturbo 3.0L"
            />
          </Field>
          <Field label="Potencia">
            <input
              style={inputStyle}
              value={form.power}
              onChange={(e) => setForm({ ...form, power: e.target.value })}
              placeholder="830 CV"
            />
          </Field>
          <Field label="Layout (arquitectura)">
            <select
              style={inputStyle}
              value={form.layout}
              onChange={(e) => changeLayout(e.target.value as Layout)}
            >
              {LAYOUTS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label} — {l.description}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Color de la marca">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                style={{
                  width: 44,
                  height: 36,
                  padding: 2,
                  border: '1px solid #E5E5EA',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              />
              <input
                style={inputStyle}
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#FF2800"
              />
            </div>
          </Field>
          <Field label="Estado">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span style={{ fontSize: 13 }}>
                {form.is_active
                  ? 'Publicado — visible en la web'
                  : 'Oculto — solo visible para admins'}
              </span>
            </label>
          </Field>
        </Grid>
        <Field label="Nota descriptiva (opcional)">
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Hypercar icónica con V12 atmosférico…"
          />
        </Field>
      </Section>

      {/* Sección 2: Fotos */}
      <Section title="Fotos del modelo">
        <PhotoUploader
          schemaId={id && id !== 'nuevo' ? id : tempId}
          coverUrl={form.cover_url}
          galleryUrls={form.gallery_urls}
          onChange={({ coverUrl, galleryUrls }) =>
            setForm((prev) => ({
              ...prev,
              cover_url: coverUrl,
              gallery_urls: galleryUrls,
            }))
          }
        />
      </Section>

      {/* Sección 2b: Marcas recomendadas */}
      <Section
        title="Marcas aftermarket recomendadas"
        subtitle="Marcas con sistemas verificados o compatibles para este modelo. Se mostrarán al usuario en la ficha pública."
      >
        <BrandSuggestionsPicker schemaId={id && id !== 'nuevo' ? id : null} />
      </Section>

      {/* Sección 2c: Acceso por suscripción */}
      <Section
        title="Acceso por suscripción"
        subtitle="Controla qué tipos de usuario pueden ver este esquema. Si dejas 'Público' todos los visitantes podrán verlo gratis."
      >
        <TierSelector
          value={form.allowed_tiers}
          onChange={(next) => setForm({ ...form, allowed_tiers: next })}
          helpText="Los admins siempre pueden ver todo. Los visitantes sin cuenta ven un callout de 'crear cuenta'."
        />
      </Section>

      {/* Sección 3: Componentes */}
      <Section
        title="Componentes del escape"
        subtitle={`Layout: ${layoutDef.label}. Rellena cada componente que corresponda.`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {layoutDef.components.map((c) => {
            const comp = form.components[c.id] ?? {
              id: c.id,
              name: c.defaultName,
              material: '',
              temp: '',
              description: '',
              tip: '',
            }
            return (
              <details
                key={c.id}
                style={{
                  border: '1px solid #E5E5EA',
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                }}
              >
                <summary
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: 14,
                    color: '#1D1D1F',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    listStyle: 'none',
                  }}
                >
                  <span>{c.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: comp.material ? '#34C759' : '#C7C7CC',
                      fontWeight: 500,
                    }}
                  >
                    {comp.material ? '✓ completado' : 'vacío'}
                  </span>
                </summary>
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F2F2F7' }}>
                  <Grid>
                    <Field label="Nombre mostrado">
                      <input
                        style={inputStyle}
                        value={comp.name}
                        onChange={(e) => updateComponent(c.id, { name: e.target.value })}
                        placeholder={c.defaultName}
                      />
                    </Field>
                    <Field label="Material">
                      <input
                        style={inputStyle}
                        value={comp.material}
                        onChange={(e) =>
                          updateComponent(c.id, { material: e.target.value })
                        }
                        placeholder="Inconel, Titanio, Acero inox 321…"
                      />
                    </Field>
                    <Field label="Temperatura operativa">
                      <input
                        style={inputStyle}
                        value={comp.temp}
                        onChange={(e) => updateComponent(c.id, { temp: e.target.value })}
                        placeholder="850°C"
                      />
                    </Field>
                  </Grid>
                  <Field label="Descripción técnica">
                    <textarea
                      style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                      value={comp.description}
                      onChange={(e) =>
                        updateComponent(c.id, { description: e.target.value })
                      }
                      placeholder="Colector de 6-1 en Inconel. El calor extremo del V12 exige…"
                    />
                  </Field>
                  <Field label="Consejo / tip (opcional)">
                    <textarea
                      style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                      value={comp.tip ?? ''}
                      onChange={(e) => updateComponent(c.id, { tip: e.target.value })}
                      placeholder="Akrapovic es el proveedor OEM de Lamborghini…"
                    />
                  </Field>
                </div>
              </details>
            )
          })}
        </div>
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            backgroundColor: '#0071E3',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Save size={14} />
          )}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ─── Helpers de UI ─────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E5EA',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', margin: 0 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 12, color: '#86868B', margin: '4px 0 0' }}>{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #E5E5EA',
  fontSize: 13,
  color: '#1D1D1F',
  outline: 'none',
  backgroundColor: '#FFFFFF',
  fontFamily: 'inherit',
}
