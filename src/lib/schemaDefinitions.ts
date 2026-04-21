/**
 * Definiciones centralizadas de los layouts de escape.
 * Tanto el panel admin como la página pública usan estas definiciones para
 * saber qué componentes debe tener cada tipo de motor.
 */

export type Layout =
  | 'v8tt'
  | 'v8na'
  | 'v10na'
  | 'v12na'
  | 'flat6na'
  | 'flat6tt'
  | 'i6tt'

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
]

export const LAYOUT_BY_ID: Record<Layout, LayoutDefinition> = Object.fromEntries(
  LAYOUTS.map((l) => [l.id, l]),
) as Record<Layout, LayoutDefinition>

export interface ExhaustComponent {
  id: string
  name: string
  material: string
  temp: string
  description: string
  tip?: string
}

export interface ExhaustSchemaRecord {
  id: string
  brand: string
  model: string
  year: string
  engine: string
  power: string
  layout: Layout
  color: string
  note: string | null
  components: Record<string, ExhaustComponent>
  cover_url: string | null
  gallery_urls: string[]
  is_active: boolean
  /** Array vacío = público. Si tiene valores, solo esos tiers tienen acceso completo. */
  allowed_tiers: string[]
  created_at: string
}

/** Crea un esqueleto vacío de componentes para un layout */
export function blankComponentsForLayout(
  layout: Layout,
): Record<string, ExhaustComponent> {
  const def = LAYOUT_BY_ID[layout]
  const out: Record<string, ExhaustComponent> = {}
  for (const c of def.components) {
    out[c.id] = {
      id: c.id,
      name: c.defaultName,
      material: '',
      temp: '',
      description: '',
      tip: '',
    }
  }
  return out
}
