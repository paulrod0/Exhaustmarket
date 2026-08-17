import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  LAYOUTS,
  LAYOUT_BY_ID,
  blankComponentsForLayout,
  sortedComponents,
  reindexComponents,
  type ExhaustComponent,
  type ExhaustSchemaRecord,
  type Layout,
  type DespieceItem,
  type CostBreakdown,
} from '../../lib/schemaDefinitions'
import PhotoUploader from '../../components/admin/PhotoUploader'
import BrandSuggestionsPicker from '../../components/admin/BrandSuggestionsPicker'
import TierSelector from '../../components/admin/TierSelector'
import SchemaArticleLinksPicker from '../../components/admin/SchemaArticleLinksPicker'
import { toast } from '../../lib/toast'
import { Copy } from 'lucide-react'

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
  // Dossier técnico
  despiece: DespieceItem[]
  cost_breakdown: CostBreakdown
  reference_photos: string[]
  related_video_url: string
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
  despiece: [],
  cost_breakdown: {},
  reference_photos: [],
  related_video_url: '',
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
          components: reindexComponents(sortedComponents(row.components ?? blankComponentsForLayout(row.layout))),
          cover_url: row.cover_url,
          gallery_urls: row.gallery_urls ?? [],
          is_active: row.is_active,
          allowed_tiers: row.allowed_tiers ?? [],
          despiece: row.despiece ?? [],
          cost_breakdown: row.cost_breakdown ?? {},
          reference_photos: row.reference_photos ?? [],
          related_video_url: row.related_video_url ?? '',
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
      // Carga los componentes por defecto de la arquitectura base elegida,
      // conservando lo ya rellenado en ids que coinciden y los añadidos a mano.
      const merged = blankComponentsForLayout(next)
      for (const cid of Object.keys(merged)) {
        if (prev.components[cid]) merged[cid] = { ...prev.components[cid], id: cid }
      }
      for (const [cid, c] of Object.entries(prev.components)) {
        if (cid.startsWith('custom_')) merged[cid] = c
      }
      return { ...prev, layout: next, components: reindexComponents(sortedComponents(merged)) }
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

  function addComponent() {
    const cid = 'custom_' + Math.random().toString(36).slice(2, 9)
    setForm((prev) => {
      const ordered = sortedComponents(prev.components)
      ordered.push({ id: cid, name: 'Nuevo componente', order: ordered.length, material: '', temp: '', description: '', tip: '' })
      return { ...prev, components: reindexComponents(ordered) }
    })
  }

  function removeComponent(cid: string) {
    if (!window.confirm('¿Quitar este componente del esquema?')) return
    setForm((prev) => {
      const next = { ...prev.components }
      delete next[cid]
      return { ...prev, components: next }
    })
  }

  // Reordena los componentes vía el campo `order` (jsonb NO conserva el orden
  // de claves del objeto, por eso persistía mal). El orden se refleja en el esquema.
  function moveComponent(cid: string, dir: 'up' | 'down') {
    setForm((prev) => {
      const arr = sortedComponents(prev.components)
      const i = arr.findIndex((c) => c.id === cid)
      const j = dir === 'up' ? i - 1 : i + 1
      if (i === -1 || j < 0 || j >= arr.length) return prev
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...prev, components: reindexComponents(arr) }
    })
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
      // Columnas jsonb: hay que serializar (el driver convertiría un array JS
      // en array-literal de Postgres y fallaría con "invalid input syntax for type json").
      components: JSON.stringify(form.components),
      cover_url: form.cover_url,
      gallery_urls: form.gallery_urls, // text[] → va como array
      is_active: form.is_active,
      allowed_tiers: form.allowed_tiers, // text[]
      despiece: JSON.stringify(form.despiece), // jsonb
      cost_breakdown: JSON.stringify(form.cost_breakdown), // jsonb
      reference_photos: form.reference_photos, // text[]
      related_video_url: form.related_video_url.trim() || null,
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
        toast.error('No se pudo crear: ' + error.message)
        return
      }
      toast.success('Esquema creado')
      navigate(`/admin/esquemas/${(data as any).id}`, { replace: true })
    } else {
      const { error } = await supabase
        .from('exhaust_schemas' as any)
        .update(payload as any)
        .eq('id', id!)
      setSaving(false)
      if (error) {
        setError(error.message)
        toast.error('Error al guardar: ' + error.message)
        return
      }
      toast.success('Cambios guardados')
    }
  }

  /** Clona todos los campos de otro esquema existente (excepto fotos e id). */
  async function cloneFrom() {
    const input = window.prompt(
      'Pega el ID del esquema a clonar, o busca "ferrari-296" para buscarlo por texto.\n\nO simplemente deja vacío y cancela.',
    )
    if (!input || !input.trim()) return
    const { data: sources } = await supabase
      .from('exhaust_schemas' as any)
      .select('*')
      .or(`id.eq.${input.trim()},brand.ilike.%${input.trim()}%,model.ilike.%${input.trim()}%`)
      .limit(1)
    const src = (sources ?? [])[0] as any
    if (!src) {
      toast.error('No se encontró ningún esquema con ese criterio.')
      return
    }
    setForm({
      brand: src.brand,
      model: src.model + ' (clonado)',
      year: src.year ?? '',
      engine: src.engine ?? '',
      power: src.power ?? '',
      layout: src.layout,
      color: src.color ?? '#0071E3',
      note: src.note ?? '',
      components: src.components ?? blankComponentsForLayout(src.layout),
      cover_url: null, // no copiamos fotos
      gallery_urls: [],
      is_active: false, // empieza como borrador
      allowed_tiers: src.allowed_tiers ?? [],
      despiece: src.despiece ?? [],
      cost_breakdown: src.cost_breakdown ?? {},
      reference_photos: src.reference_photos ?? [],
      related_video_url: src.related_video_url ?? '',
    })
    toast.success(`Plantilla de ${src.brand} ${src.model} aplicada. Cambia el modelo y guarda.`)
  }

  async function remove() {
    if (isNew || !id) return
    if (!window.confirm(`¿Borrar "${form.brand} ${form.model}" permanentemente?`)) return
    const { error } = await supabase
      .from('exhaust_schemas' as any)
      .delete()
      .eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Esquema borrado')
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
            {layoutDef?.label ?? form.layout} · {Object.keys(form.components).length} componentes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isNew && (
            <button
              onClick={cloneFrom}
              disabled={saving}
              title="Rellena todos los campos copiándolos de otro esquema"
              style={{
                backgroundColor: 'white',
                color: '#0071E3',
                border: '1px solid #0071E3',
                padding: '9px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Copy size={14} />
              Clonar de otro
            </button>
          )}
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

      {/* Sección 2d: Guías y tutoriales asociados */}
      <Section
        title="Guías y tutoriales relacionados"
        subtitle="Asocia artículos del blog con este modelo. Aparecerán automáticamente en la ficha pública como 'Tutoriales para este coche'."
      >
        <SchemaArticleLinksPicker
          mode={{ kind: 'for-schema', schemaId: id && id !== 'nuevo' ? id : null }}
        />
      </Section>

      {/* Sección 3: Componentes */}
      <Section
        title="Componentes del escape"
        subtitle={`Arquitectura base: ${layoutDef?.label ?? form.layout}. Renombra, añade o quita los componentes que correspondan a este coche.`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sortedComponents(form.components).map((comp, idx, arr) => {
            return (
              <details
                key={comp.id}
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
                    gap: 12,
                  }}
                >
                  <span style={{ flex: 1, color: '#86868B', fontSize: 11 }}>{idx + 1}.</span>
                  <span style={{ flex: 6 }}>{comp.name || 'Componente'}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: comp.material ? '#34C759' : '#C7C7CC',
                      fontWeight: 500,
                    }}
                  >
                    {comp.material ? '✓ completado' : 'vacío'}
                  </span>
                  <button
                    type="button"
                    title="Subir (orden del flujo de gases)"
                    disabled={idx === 0}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveComponent(comp.id, 'up') }}
                    style={{ border: 'none', background: 'transparent', color: idx === 0 ? '#D2D2D7' : '#0071E3', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 15, lineHeight: 1, padding: '0 2px' }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Bajar"
                    disabled={idx === arr.length - 1}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveComponent(comp.id, 'down') }}
                    style={{ border: 'none', background: 'transparent', color: idx === arr.length - 1 ? '#D2D2D7' : '#0071E3', cursor: idx === arr.length - 1 ? 'default' : 'pointer', fontSize: 15, lineHeight: 1, padding: '0 2px' }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    title="Quitar componente"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeComponent(comp.id) }}
                    style={{ border: 'none', background: 'transparent', color: '#FF3B30', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
                  >
                    ✕
                  </button>
                </summary>
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F2F2F7' }}>
                  <Grid>
                    <Field label="Nombre mostrado">
                      <input
                        style={inputStyle}
                        value={comp.name}
                        onChange={(e) => updateComponent(comp.id, { name: e.target.value })}
                        placeholder="Nombre del componente"
                      />
                    </Field>
                    <Field label="Material">
                      <input
                        style={inputStyle}
                        value={comp.material}
                        onChange={(e) =>
                          updateComponent(comp.id, { material: e.target.value })
                        }
                        placeholder="Inconel, Titanio, Acero inox 321…"
                      />
                    </Field>
                    <Field label="Temperatura operativa">
                      <input
                        style={inputStyle}
                        value={comp.temp}
                        onChange={(e) => updateComponent(comp.id, { temp: e.target.value })}
                        placeholder="850°C"
                      />
                    </Field>
                  </Grid>
                  <Field label="Descripción técnica">
                    <textarea
                      style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                      value={comp.description}
                      onChange={(e) =>
                        updateComponent(comp.id, { description: e.target.value })
                      }
                      placeholder="Colector de 6-1 en Inconel. El calor extremo del V12 exige…"
                    />
                  </Field>
                  <Field label="Consejo / tip (opcional)">
                    <textarea
                      style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                      value={comp.tip ?? ''}
                      onChange={(e) => updateComponent(comp.id, { tip: e.target.value })}
                      placeholder="Akrapovic es el proveedor OEM de Lamborghini…"
                    />
                  </Field>

                  {/* Datos técnicos para profesionales */}
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: '#FAFAFA',
                      borderRadius: 8,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#86868B',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        margin: '0 0 10px',
                      }}
                    >
                      Datos técnicos para profesionales
                    </p>
                    <Grid>
                      <Field label="Referencia OEM">
                        <input
                          style={inputStyle}
                          value={comp.oem_ref ?? ''}
                          onChange={(e) => updateComponent(comp.id, { oem_ref: e.target.value })}
                          placeholder="60666107"
                        />
                      </Field>
                      <Field label="Diámetro tubo (mm)">
                        <input
                          type="number"
                          step="0.1"
                          style={inputStyle}
                          value={comp.diameter_mm ?? ''}
                          onChange={(e) =>
                            updateComponent(comp.id, {
                              diameter_mm: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="63.5"
                        />
                      </Field>
                      <Field label="Espesor (mm)">
                        <input
                          type="number"
                          step="0.1"
                          style={inputStyle}
                          value={comp.thickness_mm ?? ''}
                          onChange={(e) =>
                            updateComponent(comp.id, {
                              thickness_mm: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="1.5"
                        />
                      </Field>
                      <Field label="Tiempo fabricación (h)">
                        <input
                          type="number"
                          step="0.25"
                          style={inputStyle}
                          value={comp.fabrication_hours ?? ''}
                          onChange={(e) =>
                            updateComponent(comp.id, {
                              fabrication_hours: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="3.5"
                        />
                      </Field>
                      <Field label="Coste material (€)">
                        <input
                          type="number"
                          step="0.01"
                          style={inputStyle}
                          value={comp.material_cost ?? ''}
                          onChange={(e) =>
                            updateComponent(comp.id, {
                              material_cost: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="148"
                        />
                      </Field>
                      <Field label="Coste total estimado (€)">
                        <input
                          type="number"
                          step="0.01"
                          style={inputStyle}
                          value={comp.total_cost ?? ''}
                          onChange={(e) =>
                            updateComponent(comp.id, {
                              total_cost: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="322"
                        />
                      </Field>
                      <Field label="Dificultad">
                        <select
                          style={inputStyle}
                          value={comp.difficulty ?? ''}
                          onChange={(e) =>
                            updateComponent(comp.id, {
                              difficulty: (e.target.value || undefined) as 'baja' | 'media' | 'alta' | undefined,
                            })
                          }
                        >
                          <option value="">(sin definir)</option>
                          <option value="baja">Baja</option>
                          <option value="media">Media</option>
                          <option value="alta">Alta</option>
                        </select>
                      </Field>
                      <Field label="¿Es fabricable?">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 0' }}>
                          <input
                            type="checkbox"
                            checked={comp.fabricable ?? false}
                            onChange={(e) => updateComponent(comp.id, { fabricable: e.target.checked })}
                          />
                          <span style={{ fontSize: 13 }}>
                            {comp.fabricable ? 'Sí, fabricable' : 'No (solo OEM/aftermarket)'}
                          </span>
                        </label>
                      </Field>
                    </Grid>
                  </div>
                </div>
              </details>
            )
          })}
          <button
            type="button"
            onClick={addComponent}
            style={{
              marginTop: 4, padding: '12px 16px', border: '2px dashed #0071E3', borderRadius: 10,
              background: '#F0F7FF', color: '#0071E3', fontWeight: 500, fontSize: 14, cursor: 'pointer',
            }}
          >
            + Añadir componente
          </button>
        </div>
      </Section>

      {/* Sección 4: Despiece (tabla A) */}
      <Section
        title="A. Despiece / Material necesario"
        subtitle="Lista detallada de elementos a fabricar (cuerpos, tubos, soportes…). Aparece como tabla en la ficha pública."
      >
        <DespieceEditor
          items={form.despiece}
          onChange={(next) => setForm({ ...form, despiece: next })}
        />
      </Section>

      {/* Sección 5: Estimación de costes (sección B) */}
      <Section
        title="B. Estimación de costes y horas"
        subtitle="Resumen de coste total del sistema. Puede dejarse en blanco si los componentes ya tienen sus costes individuales."
      >
        <Grid>
          <Field label="Materiales (€)">
            <input
              type="number"
              step="0.01"
              style={inputStyle}
              value={form.cost_breakdown.materials ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  cost_breakdown: {
                    ...form.cost_breakdown,
                    materials: e.target.value ? parseFloat(e.target.value) : undefined,
                  },
                })
              }
              placeholder="148"
            />
          </Field>
          <Field label="Consumibles (€)">
            <input
              type="number"
              step="0.01"
              style={inputStyle}
              value={form.cost_breakdown.consumables ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  cost_breakdown: {
                    ...form.cost_breakdown,
                    consumables: e.target.value ? parseFloat(e.target.value) : undefined,
                  },
                })
              }
              placeholder="24"
            />
          </Field>
          <Field label="Mano de obra (€)">
            <input
              type="number"
              step="0.01"
              style={inputStyle}
              value={form.cost_breakdown.labor ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  cost_breakdown: {
                    ...form.cost_breakdown,
                    labor: e.target.value ? parseFloat(e.target.value) : undefined,
                  },
                })
              }
              placeholder="150"
            />
          </Field>
          <Field label="Horas estimadas">
            <input
              type="number"
              step="0.25"
              style={inputStyle}
              value={form.cost_breakdown.hours ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  cost_breakdown: {
                    ...form.cost_breakdown,
                    hours: e.target.value ? parseFloat(e.target.value) : undefined,
                  },
                })
              }
              placeholder="3.5"
            />
          </Field>
        </Grid>
      </Section>

      {/* Sección 6: Vídeo y fotos técnicas */}
      <Section
        title="D + E. Fotos técnicas y vídeo"
        subtitle="Imágenes del montaje real (sección D) y URL de YouTube/Vimeo del tutorial (sección E)."
      >
        <Field label="URL de vídeo (YouTube / Vimeo)">
          <input
            style={inputStyle}
            value={form.related_video_url}
            onChange={(e) => setForm({ ...form, related_video_url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </Field>
        <Field label="Fotos técnicas (URLs separadas por línea)">
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
            value={(form.reference_photos ?? []).join('\n')}
            onChange={(e) =>
              setForm({
                ...form,
                reference_photos: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder={'https://imagen-1.jpg\nhttps://imagen-2.jpg'}
          />
        </Field>
        <p style={{ fontSize: 11, color: '#86868B', margin: '6px 0 0' }}>
          Las fotos técnicas son adicionales a la galería principal. Pega las URLs públicas (Supabase Storage,
          Cloudinary, Google Drive con permiso público, etc.).
        </p>
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

// ─── DespieceEditor ──────────────────────────────────────────────────────────

function DespieceEditor({
  items,
  onChange,
}: {
  items: DespieceItem[]
  onChange: (next: DespieceItem[]) => void
}) {
  function update(i: number, patch: Partial<DespieceItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }
  function add() {
    onChange([
      ...items,
      { element: '', material: '', specification: '', quantity: '', process: '' },
    ])
  }

  return (
    <div>
      {items.length === 0 && (
        <p style={{ fontSize: 12, color: '#86868B', margin: '4px 0 12px' }}>
          Añade los elementos a fabricar (cuerpos, tubos, soportes…). Cada fila es un material o pieza
          necesaria para construir el sistema.
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr) 32px',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <input
              style={{ ...inputStyle, fontSize: 12 }}
              value={it.element}
              onChange={(e) => update(i, { element: e.target.value })}
              placeholder="Cuerpo silenciador"
            />
            <input
              style={{ ...inputStyle, fontSize: 12 }}
              value={it.material}
              onChange={(e) => update(i, { material: e.target.value })}
              placeholder="Acero inox 304"
            />
            <input
              style={{ ...inputStyle, fontSize: 12 }}
              value={it.specification}
              onChange={(e) => update(i, { specification: e.target.value })}
              placeholder="chapa 1.5 mm"
            />
            <input
              style={{ ...inputStyle, fontSize: 12 }}
              value={it.quantity}
              onChange={(e) => update(i, { quantity: e.target.value })}
              placeholder="1 ud"
            />
            <input
              style={{ ...inputStyle, fontSize: 12 }}
              value={it.process}
              onChange={(e) => update(i, { process: e.target.value })}
              placeholder="Corte y plegado"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#FFE5E7',
                color: '#D70015',
                cursor: 'pointer',
                fontSize: 14,
              }}
              aria-label="Eliminar fila"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        style={{
          marginTop: 10,
          padding: '8px 14px',
          backgroundColor: '#FFFFFF',
          border: '1.5px dashed #D2D2D7',
          borderRadius: 8,
          color: '#0071E3',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        + Añadir fila
      </button>
      {items.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr) 32px',
            gap: 6,
            fontSize: 10,
            fontWeight: 600,
            color: '#86868B',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            padding: '0 4px',
          }}
        >
          <span>Elemento</span>
          <span>Material</span>
          <span>Especificación</span>
          <span>Cantidad</span>
          <span>Proceso</span>
          <span />
        </div>
      )}
    </div>
  )
}
