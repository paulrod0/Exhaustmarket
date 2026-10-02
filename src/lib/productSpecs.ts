/**
 * Medidas de producto del marketplace (silenciosos SPE, tubos, colas…). Columnas spec_* de
 * professional_products. Un solo sitio para etiquetas, formato y el resumen de una línea que se
 * ve en las tarjetas (ficha del esquema, marketplace).
 */
export interface ProductSpecs {
  spec_inlet_mm?: number | null
  spec_outlet_mm?: number | null
  spec_outlet_count?: number | null
  spec_section?: string | null
  spec_body_diameter_mm?: number | null
  spec_body_width_mm?: number | null
  spec_body_height_mm?: number | null
  spec_length_mm?: number | null
  spec_total_length_mm?: number | null
  spec_volume_l?: number | null
  spec_material?: string | null
  spec_muffler_type?: string | null
}

export const SPEC_COLUMNS = [
  'spec_inlet_mm', 'spec_outlet_mm', 'spec_outlet_count', 'spec_section', 'spec_body_diameter_mm', 'spec_body_width_mm',
  'spec_body_height_mm', 'spec_length_mm', 'spec_total_length_mm', 'spec_volume_l', 'spec_material', 'spec_muffler_type',
] as const
export type SpecColumn = (typeof SPEC_COLUMNS)[number]
export const SPEC_SELECT = SPEC_COLUMNS.join(', ')

export const SECTION_LABEL: Record<string, string> = { redonda: 'Redonda', ovalada: 'Ovalada', rectangular: 'Rectangular' }
export const MUFFLER_TYPE_LABEL: Record<string, string> = {
  absorcion: 'Absorción', camaras: 'De cámaras', resonador: 'Resonador', mixto: 'Mixto (cámaras + absorción)', recto: 'Recto (straight-through)',
}
export const MATERIAL_SUGGESTIONS = ['Acero inoxidable 304', 'Acero inoxidable 409', 'Acero aluminizado', 'Titanio', 'Acero al carbono']

const n = (v: unknown): number | null => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
const num = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 1 })

export function hasSpecs(p: ProductSpecs | null | undefined): boolean {
  if (!p) return false
  return SPEC_COLUMNS.some((c) => p[c] != null && p[c] !== '')
}

/** Filas [etiqueta, valor] para la tabla de medidas (solo las que tienen dato). */
export function specRows(p: ProductSpecs): [string, string][] {
  const rows: [string, string][] = []
  const inlet = n(p.spec_inlet_mm), outlet = n(p.spec_outlet_mm), count = n(p.spec_outlet_count)
  if (inlet) rows.push(['Diámetro de entrada', `Ø ${num(inlet)} mm`])
  if (outlet) rows.push(['Diámetro de salida', `${count && count > 1 ? `${count} × ` : ''}Ø ${num(outlet)} mm`])
  else if (count) rows.push(['Salidas', String(count)])
  const sec = p.spec_section ?? null
  const d = n(p.spec_body_diameter_mm), w = n(p.spec_body_width_mm), h = n(p.spec_body_height_mm)
  if (sec === 'redonda' || (!sec && d)) { if (d) rows.push(['Sección del cuerpo', `Redonda · Ø ${num(d)} mm`]) }
  else if (sec || w || h) rows.push(['Sección del cuerpo', `${sec ? SECTION_LABEL[sec] ?? sec : ''}${w && h ? `${sec ? ' · ' : ''}${num(w)} × ${num(h)} mm` : ''}`.trim()])
  const len = n(p.spec_length_mm), total = n(p.spec_total_length_mm), vol = n(p.spec_volume_l)
  if (len) rows.push(['Largo del cuerpo', `${num(len)} mm`])
  if (total) rows.push(['Largo total', `${num(total)} mm`])
  if (vol) rows.push(['Volumen', `${num(vol)} l`])
  if (p.spec_material) rows.push(['Material', p.spec_material])
  if (p.spec_muffler_type) rows.push(['Tipo de silencioso', MUFFLER_TYPE_LABEL[p.spec_muffler_type] ?? p.spec_muffler_type])
  return rows
}

/** Resumen corto para tarjetas: «Ø63,5 → 2×Ø76 · 450 mm · 14 l». */
export function specSummary(p: ProductSpecs | null | undefined): string | null {
  if (!p || !hasSpecs(p)) return null
  const parts: string[] = []
  const inlet = n(p.spec_inlet_mm), outlet = n(p.spec_outlet_mm), count = n(p.spec_outlet_count)
  if (inlet || outlet) parts.push(`${inlet ? `Ø${num(inlet)}` : '?'} → ${count && count > 1 ? `${count}×` : ''}${outlet ? `Ø${num(outlet)}` : '?'}`)
  const len = n(p.spec_length_mm) ?? n(p.spec_total_length_mm)
  if (len) parts.push(`${num(len)} mm`)
  const vol = n(p.spec_volume_l)
  if (vol) parts.push(`${num(vol)} l`)
  if (!parts.length && p.spec_material) parts.push(p.spec_material)
  return parts.join(' · ') || null
}

/** Normaliza lo que viene de un formulario (strings) a lo que se guarda (number | null). */
export function cleanSpecs(form: Record<string, unknown>): ProductSpecs {
  const out: Record<string, unknown> = {}
  for (const c of SPEC_COLUMNS) {
    const v = form[c]
    if (c === 'spec_section' || c === 'spec_material' || c === 'spec_muffler_type') out[c] = typeof v === 'string' && v.trim() ? v.trim() : null
    else {
      const x = typeof v === 'string' ? Number(v.replace(',', '.')) : v
      out[c] = typeof x === 'number' && Number.isFinite(x) && x > 0 ? (c === 'spec_outlet_count' ? Math.round(x) : x) : null
    }
  }
  return out as ProductSpecs
}
