/**
 * Definiciones centralizadas de los layouts de escape.
 * Tanto el panel admin como la página pública usan estas definiciones para
 * saber qué componentes debe tener cada tipo de motor.
 */

// Antes era una unión cerrada; ahora es abierta para cubrir todas las
// arquitecturas de motor del mercado. Los componentes son editables por esquema.
export type Layout = string

export interface ComponentField {
  id: string
  label: string
  /** Ejemplo sugerido para el nombre del componente */
  defaultName: string
}

export interface LayoutDefinition {
  id: Layout
  label: string
  description: string
  components: ComponentField[]
}

/**
 * Qué componentes usa cada layout. Los IDs deben coincidir con los usados
 * en los diagramas SVG de ExhaustSchemasPage.tsx.
 */
export const LAYOUTS: LayoutDefinition[] = [
  {
    id: 'v8tt',
    label: 'V8 Biturbo',
    description: 'V8 con 2 turbos, cats, X-pipe, silenciador y salidas',
    components: [
      { id: 'manifold_l', label: 'Colector Izq.', defaultName: 'Colector Izq.' },
      { id: 'manifold_r', label: 'Colector Der.', defaultName: 'Colector Der.' },
      { id: 'turbo_l', label: 'Turbo Izq.', defaultName: 'Turbo Izq.' },
      { id: 'turbo_r', label: 'Turbo Der.', defaultName: 'Turbo Der.' },
      { id: 'cat_l', label: 'Catalizador Izq.', defaultName: 'Cat. Izq.' },
      { id: 'cat_r', label: 'Catalizador Der.', defaultName: 'Cat. Der.' },
      { id: 'xpipe', label: 'X-Pipe', defaultName: 'X-Pipe' },
      { id: 'muffler', label: 'Silenciador', defaultName: 'Silenciador' },
      { id: 'tips', label: 'Salidas', defaultName: 'Salidas' },
    ],
  },
  {
    id: 'v8na',
    label: 'V8 Atmosférico',
    description: 'V8 NA con colectores, cats, X-pipe, silenciador y salidas',
    components: [
      { id: 'manifold_l', label: 'Colector Izq.', defaultName: 'Colector Izq.' },
      { id: 'manifold_r', label: 'Colector Der.', defaultName: 'Colector Der.' },
      { id: 'cat_l', label: 'Catalizador Izq.', defaultName: 'Cat. Izq.' },
      { id: 'cat_r', label: 'Catalizador Der.', defaultName: 'Cat. Der.' },
      { id: 'xpipe', label: 'X-Pipe', defaultName: 'X-Pipe' },
      { id: 'muffler', label: 'Silenciador', defaultName: 'Silenciador' },
      { id: 'tips', label: 'Salidas', defaultName: 'Salidas' },
    ],
  },
  {
    id: 'v10na',
    label: 'V10 Atmosférico',
    description: 'V10 NA con colectores 5-1, cats, X-pipe y salidas',
    components: [
      { id: 'manifold_l', label: 'Colector Izq. (5-1)', defaultName: 'Colector Izq.' },
      { id: 'manifold_r', label: 'Colector Der. (5-1)', defaultName: 'Colector Der.' },
      { id: 'cat_l', label: 'Catalizador Izq.', defaultName: 'Cat. Izq.' },
      { id: 'cat_r', label: 'Catalizador Der.', defaultName: 'Cat. Der.' },
      { id: 'xpipe', label: 'X-Pipe', defaultName: 'X-Pipe' },
      { id: 'muffler', label: 'Silenciador', defaultName: 'Silenciador' },
      { id: 'tips', label: 'Salidas', defaultName: 'Salidas' },
    ],
  },
  {
    id: 'v12na',
    label: 'V12 (NA o Biturbo)',
    description: 'V12 con colectores 6-1, cats, X-pipe, silenciador y salidas',
    components: [
      { id: 'manifold_l', label: 'Colector Izq. (6-1)', defaultName: 'Colector Izq.' },
      { id: 'manifold_r', label: 'Colector Der. (6-1)', defaultName: 'Colector Der.' },
      { id: 'cat_l', label: 'Catalizador Izq.', defaultName: 'Cat. Izq.' },
      { id: 'cat_r', label: 'Catalizador Der.', defaultName: 'Cat. Der.' },
      { id: 'xpipe', label: 'X-Pipe', defaultName: 'X-Pipe' },
      { id: 'muffler', label: 'Silenciador', defaultName: 'Silenciador' },
      { id: 'tips', label: 'Salidas', defaultName: 'Salidas' },
    ],
  },
  {
    id: 'flat6na',
    label: 'Flat-6 Atmosférico',
    description: 'Flat-6 NA tipo Porsche 911 GT3',
    components: [
      { id: 'manifold_l', label: 'Colector Izq.', defaultName: 'Colector Izq.' },
      { id: 'manifold_r', label: 'Colector Der.', defaultName: 'Colector Der.' },
      { id: 'cat_l', label: 'Catalizador Izq.', defaultName: 'Cat. Izq.' },
      { id: 'cat_r', label: 'Catalizador Der.', defaultName: 'Cat. Der.' },
      { id: 'xpipe', label: 'X-Pipe', defaultName: 'X-Pipe' },
      { id: 'muffler', label: 'Silenciador', defaultName: 'Silenciador' },
      { id: 'tips', label: 'Salidas', defaultName: 'Salidas' },
    ],
  },
  {
    id: 'flat6tt',
    label: 'Flat-6 Biturbo',
    description: 'Flat-6 turbo tipo Porsche 911 Turbo / GT2',
    components: [
      { id: 'manifold_l', label: 'Colector + Turbo Izq.', defaultName: 'Colector + Turbo Izq.' },
      { id: 'manifold_r', label: 'Colector + Turbo Der.', defaultName: 'Colector + Turbo Der.' },
      { id: 'downpipe_l', label: 'Downpipe Izq.', defaultName: 'Downpipe Izq.' },
      { id: 'downpipe_r', label: 'Downpipe Der.', defaultName: 'Downpipe Der.' },
      { id: 'muffler', label: 'Silenciador', defaultName: 'Silenciador' },
      { id: 'tips', label: 'Salidas', defaultName: 'Salidas' },
    ],
  },
  {
    id: 'i6tt',
    label: 'Inline-6 / 4 / V6 Turbo',
    description: 'Motor en línea o V6 con turbo, downpipe, silenciador y salidas',
    components: [
      { id: 'manifold', label: 'Colector + Turbo', defaultName: 'Colector + Turbo' },
      { id: 'downpipe', label: 'Downpipe', defaultName: 'Downpipe' },
      { id: 'muffler', label: 'Silenciador', defaultName: 'Silenciador' },
      { id: 'tips', label: 'Salidas', defaultName: 'Salidas' },
    ],
  },
  // ── En línea (atmosféricos) ──
  ...['I3', 'I4', 'I5', 'I6'].map((n) => layoutNA(`${n.toLowerCase()}na`, `${n} Atmosférico`, `Motor ${n} atmosférico: colector, catalizador, silencioso y salidas`)),
  // ── En línea (turbo) ──
  ...['I3', 'I4', 'I5'].map((n) => layoutTurbo(`${n.toLowerCase()}tt`, `${n} Turbo`, `Motor ${n} turbo: colector+turbo, downpipe, catalizador, silencioso y salidas`)),
  // ── V (nuevos, además de V8/V10/V12 ya existentes) ──
  layoutDualNA('v6na', 'V6 Atmosférico', 'V6 NA: colectores, catalizadores, X-pipe y salidas'),
  layoutDualTurbo('v6tt', 'V6 Turbo / Biturbo', 'V6 turbo: colectores+turbo, downpipes, catalizadores, silencioso y salidas'),
  // ── VR / W ──
  layoutTurbo('vr6', 'VR6', 'VR6 de ángulo estrecho (una bancada): colector, catalizador, silencioso y salidas'),
  layoutDualNA('w12', 'W12', 'W12: dos bancadas, catalizadores, silencioso y salidas'),
  layoutDualTurbo('w16tt', 'W16 Quad-Turbo', 'W16 con 4 turbos: colectores+turbo, downpipes, catalizadores y salidas'),
  // ── Bóxer / Flat ──
  layoutDualNA('flat4na', 'Bóxer/Flat-4 Atmosférico', 'Flat-4 NA: colectores, catalizador, silencioso y salidas'),
  layoutTurbo('flat4tt', 'Bóxer/Flat-4 Turbo', 'Flat-4 turbo tipo Subaru/Toyota GR: colector+turbo, downpipe, catalizador, silencioso y salidas'),
  layoutDualNA('flat12', 'Flat-12', 'Flat-12 clásico/superdeportivo: dos bancadas, catalizadores, silencioso y salidas'),
  // ── Rotativo / alternativos ──
  layoutNA('rotary', 'Rotativo / Wankel', 'Motor rotativo Wankel: colector, catalizador, silencioso y salidas'),
  layoutNA('h2ice', 'Hidrógeno combustión', 'Motor térmico de hidrógeno: colector, catalizador (NOx), silencioso y salidas'),
  { id: 'electric', label: 'Eléctrico (sin escape)', description: 'Vehículo eléctrico: sin sistema de escape. Mostrar accesorios/servicios.', components: [] },
  { id: 'fcev', label: 'Hidrógeno FCEV (sin escape)', description: 'Pila de combustible: sin escape térmico convencional; salida de agua/vapor.', components: [] },
]

/* Helpers para generar los sets de componentes por defecto (todos editables luego). */
function comp(id: string, name: string): ComponentField {
  return { id, label: name, defaultName: name }
}
function layoutNA(id: string, label: string, description: string): LayoutDefinition {
  return { id, label, description, components: [comp('colector', 'Colector'), comp('catalizador', 'Catalizador'), comp('silenciador', 'Silenciador'), comp('salidas', 'Salidas')] }
}
function layoutTurbo(id: string, label: string, description: string): LayoutDefinition {
  return { id, label, description, components: [comp('colector_turbo', 'Colector + Turbo'), comp('downpipe', 'Downpipe'), comp('catalizador', 'Catalizador'), comp('silenciador', 'Silenciador'), comp('salidas', 'Salidas')] }
}
function layoutDualNA(id: string, label: string, description: string): LayoutDefinition {
  return { id, label, description, components: [comp('colector_l', 'Colector Izq.'), comp('colector_r', 'Colector Der.'), comp('cat_l', 'Catalizador Izq.'), comp('cat_r', 'Catalizador Der.'), comp('xpipe', 'X-Pipe'), comp('silenciador', 'Silenciador'), comp('salidas', 'Salidas')] }
}
function layoutDualTurbo(id: string, label: string, description: string): LayoutDefinition {
  return { id, label, description, components: [comp('colector_turbo_l', 'Colector + Turbo Izq.'), comp('colector_turbo_r', 'Colector + Turbo Der.'), comp('downpipe_l', 'Downpipe Izq.'), comp('downpipe_r', 'Downpipe Der.'), comp('cat_l', 'Catalizador Izq.'), comp('cat_r', 'Catalizador Der.'), comp('silenciador', 'Silenciador'), comp('salidas', 'Salidas')] }
}

export const LAYOUT_BY_ID: Record<Layout, LayoutDefinition> = Object.fromEntries(
  LAYOUTS.map((l) => [l.id, l]),
) as Record<Layout, LayoutDefinition>

export interface ExhaustComponent {
  id: string
  name: string
  /** Orden explícito (jsonb NO conserva el orden de claves del objeto). */
  order?: number
  material: string
  temp: string
  description: string
  tip?: string
  // Campos técnicos para profesionales (todos opcionales)
  oem_ref?: string                       // Ej: "60666107"
  diameter_mm?: number                   // Ej: 63.5
  thickness_mm?: number                  // Ej: 1.5
  fabrication_hours?: number             // Ej: 3.5
  material_cost?: number                 // €
  total_cost?: number                    // €
  difficulty?: 'baja' | 'media' | 'alta'
  fabricable?: boolean                   // si es fabricable o solo OEM/aftermarket
  /** Foto del componente (opcional, 1 por componente). Se guarda dentro del jsonb `components`. */
  image_url?: string
}

export interface DespieceItem {
  element: string                        // "Cuerpo silenciador"
  material: string                       // "Acero inox 304"
  specification: string                  // "chapa 1.5 mm"
  quantity: string                       // "1 ud"
  process: string                        // "Corte y plegado"
}

export interface CostBreakdown {
  materials?: number
  consumables?: number
  labor?: number
  hours?: number
  currency?: string                      // "EUR" por defecto
}

/** Normativas Euro para el badge del esquema (label con año de entrada en vigor).
 *  '' = "No aplica/Desconocida" (default). */
export const EURO_NORMS = [
  'Pre-Euro',
  'Euro 1 (1992)', 'Euro 2 (1996)', 'Euro 3 (2000)', 'Euro 4 (2005)',
  'Euro 5a (2009)', 'Euro 5b (2011)',
  'Euro 6 (2014)', 'Euro 6c (2017)', 'Euro 6d-TEMP (2017)', 'Euro 6d (2020)', 'Euro 6e (2024)',
  'Euro 7 (2026-27)',
] as const

/** Texto compacto para el badge (quita el año): 'Euro 4 (2005)' → 'Euro 4'. null si no debe pintarse. */
export function emissionsBadgeLabel(value?: string | null): string | null {
  if (!value || value === 'No aplica/Desconocida') return null
  return value.replace(/\s*\(.*\)\s*$/, '')
}

export interface ExhaustSchemaRecord {
  id: string
  brand: string
  model: string
  year: string
  engine: string
  power: string
  emissions: string | null
  layout: Layout
  color: string
  note: string | null
  components: Record<string, ExhaustComponent>
  cover_url: string | null
  gallery_urls: string[]
  is_active: boolean
  /** Array vacío = público. Si tiene valores, solo esos tiers tienen acceso completo. */
  allowed_tiers: string[]
  // Campos del dossier técnico
  despiece: DespieceItem[]
  cost_breakdown: CostBreakdown
  reference_photos: string[]
  related_video_url: string | null
  total_estimated_hours: number | null
  total_estimated_cost: number | null
  total_materials_count: number | null
  created_at: string
}

/** Crea un esqueleto vacío de componentes para un layout */
export function blankComponentsForLayout(
  layout: Layout,
): Record<string, ExhaustComponent> {
  const def = LAYOUT_BY_ID[layout]
  const out: Record<string, ExhaustComponent> = {}
  def.components.forEach((c, idx) => {
    out[c.id] = {
      id: c.id,
      name: c.defaultName,
      order: idx,
      material: '',
      temp: '',
      description: '',
      tip: '',
    }
  })
  return out
}

/**
 * Devuelve los componentes ORDENADOS por su campo `order`.
 * Fallback: si a alguno le falta `order` (datos antiguos), respeta el orden de
 * inserción actual. Úsalo SIEMPRE para renderizar/pintar el esquema.
 */
export function sortedComponents(
  components: Record<string, ExhaustComponent> | null | undefined,
): ExhaustComponent[] {
  const arr = Object.values(components ?? {})
  return arr
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const ao = a.c.order ?? 1000 + a.i
      const bo = b.c.order ?? 1000 + b.i
      return ao - bo
    })
    .map((x) => x.c)
}

/** Reasigna `order` = índice según un array ya ordenado de componentes. */
export function reindexComponents(
  ordered: ExhaustComponent[],
): Record<string, ExhaustComponent> {
  const out: Record<string, ExhaustComponent> = {}
  ordered.forEach((c, idx) => { out[c.id] = { ...c, order: idx } })
  return out
}
