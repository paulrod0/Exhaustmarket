import { useState } from 'react'
import { ChevronDown, ChevronRight, Ruler } from 'lucide-react'
import { MATERIAL_SUGGESTIONS, MUFFLER_TYPE_LABEL, SECTION_LABEL, SPEC_COLUMNS, type ProductSpecs, type SpecColumn } from '../lib/productSpecs'

export type SpecForm = Record<SpecColumn, string>

export function emptySpecForm(): SpecForm {
  return Object.fromEntries(SPEC_COLUMNS.map((c) => [c, ''])) as SpecForm
}
export function specFormFrom(p: ProductSpecs | null | undefined): SpecForm {
  const f = emptySpecForm()
  if (!p) return f
  for (const c of SPEC_COLUMNS) { const v = p[c]; f[c] = v == null ? '' : String(v) }
  return f
}

/**
 * Bloque «Medidas» del formulario de producto (silenciosos, tubos, colas…). Todo opcional;
 * se despliega solo si el vendedor quiere rellenarlo o si ya hay datos.
 */
export default function ProductSpecsFields({ value, onChange }: { value: SpecForm; onChange: (v: SpecForm) => void }) {
  const filled = SPEC_COLUMNS.some((c) => value[c] !== '')
  const [open, setOpen] = useState(filled)
  const set = (c: SpecColumn, v: string) => onChange({ ...value, [c]: v })
  const round = value.spec_section === 'redonda'
  const box: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }
  const lbl: React.CSSProperties = { display: 'block', marginBottom: 4, fontSize: 12.5, fontWeight: 500, color: '#3A3A3C' }
  const numInput = (c: SpecColumn, label: string, unit: string) => (
    <div>
      <label style={lbl}>{label} <span style={{ color: '#86868B', fontWeight: 400 }}>({unit})</span></label>
      <input type="text" inputMode="decimal" className="input-apple" value={value[c]} placeholder="—"
        onChange={(e) => set(c, e.target.value.replace(/[^0-9.,]/g, ''))} />
    </div>
  )
  return (
    <div style={{ border: '1px solid #E5E5EA', borderRadius: 12, padding: open ? 14 : 0 }}>
      <button type="button" onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: open ? 0 : 12, marginBottom: open ? 12 : 0,
        border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#1D1D1F', textAlign: 'left',
      }}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <Ruler size={15} style={{ color: '#86868B' }} /> Medidas
        <span style={{ fontSize: 12, color: '#86868B', fontWeight: 400 }}>(silenciosos, tubos, colas… opcional)</span>
      </button>
      {open && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={box}>
            {numInput('spec_inlet_mm', 'Ø entrada', 'mm')}
            {numInput('spec_outlet_mm', 'Ø salida', 'mm')}
            {numInput('spec_outlet_count', 'Nº de salidas', 'ud')}
          </div>
          <div style={box}>
            <div>
              <label style={lbl}>Sección del cuerpo</label>
              <select className="input-apple" value={value.spec_section} onChange={(e) => set('spec_section', e.target.value)}>
                <option value="">—</option>
                {Object.entries(SECTION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            {round ? numInput('spec_body_diameter_mm', 'Ø del cuerpo', 'mm') : <>
              {numInput('spec_body_width_mm', 'Ancho', 'mm')}
              {numInput('spec_body_height_mm', 'Alto', 'mm')}
            </>}
          </div>
          <div style={box}>
            {numInput('spec_length_mm', 'Largo del cuerpo', 'mm')}
            {numInput('spec_total_length_mm', 'Largo total', 'mm')}
            {numInput('spec_volume_l', 'Volumen', 'l')}
          </div>
          <div style={box}>
            <div>
              <label style={lbl}>Material</label>
              <input className="input-apple" list="em-spec-materials" value={value.spec_material} placeholder="p. ej. Acero inoxidable 304"
                onChange={(e) => set('spec_material', e.target.value)} />
              <datalist id="em-spec-materials">{MATERIAL_SUGGESTIONS.map((m) => <option key={m} value={m} />)}</datalist>
            </div>
            <div>
              <label style={lbl}>Tipo de silencioso</label>
              <select className="input-apple" value={value.spec_muffler_type} onChange={(e) => set('spec_muffler_type', e.target.value)}>
                <option value="">— (no es un silencioso)</option>
                {Object.entries(MUFFLER_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
