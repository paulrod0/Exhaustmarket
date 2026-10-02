// scripts/add-product-specs-3d-processing.mjs
// Solicitud nº3 — campos nuevos (P2):
//  - professional_products: MEDIDAS del producto (silenciosos SPE y similares): diámetro de entrada y
//    salida, sección (redonda Ø / ovalada o rectangular ancho×alto), largo, volumen, material, tipo de silencioso.
//  - design_3d.processing_status: estado de procesado del archivo 3D
//    (escaneo_bruto → en_proceso → procesado). Los existentes ya están publicados → 'procesado'.
// Idempotente.   node scripts/add-product-specs-3d-processing.mjs
import { readFileSync } from 'node:fs'
import { Pool } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const url = (env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) throw new Error('DATABASE_URL no encontrada')
const pool = new Pool({ connectionString: url })
const q = (s, p) => pool.query(s, p)

const cols = [
  ['spec_inlet_mm', 'numeric'],          // diámetro de entrada (mm)
  ['spec_outlet_mm', 'numeric'],         // diámetro de salida (mm)
  ['spec_outlet_count', 'integer'],      // nº de salidas (1, 2…)
  ['spec_section', 'text'],              // redonda | ovalada | rectangular
  ['spec_body_diameter_mm', 'numeric'],  // sección redonda: Ø del cuerpo
  ['spec_body_width_mm', 'numeric'],     // sección ovalada/rectangular: ancho
  ['spec_body_height_mm', 'numeric'],    // sección ovalada/rectangular: alto
  ['spec_length_mm', 'numeric'],         // largo del cuerpo
  ['spec_total_length_mm', 'numeric'],   // largo total (con tubos)
  ['spec_volume_l', 'numeric'],          // volumen (litros)
  ['spec_material', 'text'],             // inox 304, inox 409, aluminizado, titanio…
  ['spec_muffler_type', 'text'],         // absorcion | camaras | resonador | mixto | recto
]
for (const [c, t] of cols) await q(`ALTER TABLE public.professional_products ADD COLUMN IF NOT EXISTS ${c} ${t}`)
const chk = async (name, sql) => {
  if (!(await q(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [name])).rows.length) await q(sql)
}
await chk('pp_spec_section_chk', `ALTER TABLE public.professional_products ADD CONSTRAINT pp_spec_section_chk CHECK (spec_section IS NULL OR spec_section IN ('redonda','ovalada','rectangular'))`)
await chk('pp_spec_muffler_type_chk', `ALTER TABLE public.professional_products ADD CONSTRAINT pp_spec_muffler_type_chk CHECK (spec_muffler_type IS NULL OR spec_muffler_type IN ('absorcion','camaras','resonador','mixto','recto'))`)
await chk('pp_spec_positive_chk', `ALTER TABLE public.professional_products ADD CONSTRAINT pp_spec_positive_chk CHECK (
  coalesce(spec_inlet_mm, 1) > 0 AND coalesce(spec_outlet_mm, 1) > 0 AND coalesce(spec_outlet_count, 1) > 0 AND coalesce(spec_body_diameter_mm, 1) > 0
  AND coalesce(spec_body_width_mm, 1) > 0 AND coalesce(spec_body_height_mm, 1) > 0 AND coalesce(spec_length_mm, 1) > 0
  AND coalesce(spec_total_length_mm, 1) > 0 AND coalesce(spec_volume_l, 1) > 0)`)

await q(`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'procesado'`)
await chk('design_3d_processing_chk', `ALTER TABLE public.design_3d ADD CONSTRAINT design_3d_processing_chk CHECK (processing_status IN ('escaneo_bruto','en_proceso','procesado'))`)

const n = (await q(`SELECT count(*)::int n FROM information_schema.columns WHERE table_name = 'professional_products' AND column_name LIKE 'spec_%'`)).rows[0].n
const d = (await q(`SELECT processing_status, count(*)::int n FROM design_3d GROUP BY 1`)).rows
console.log(`professional_products: ${n} columnas spec_*; design_3d.processing_status:`, JSON.stringify(d))
await pool.end()
