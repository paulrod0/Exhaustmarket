/**
 * Esquema 2D propio del sistema de escape (dossier v3): dibuja las piezas de un
 * coche como iconos geométricos clicables sobre una línea de escape simplificada.
 * NO usa imágenes OEM. Se alimenta de exhaust_parts (part_type + position_number).
 */

export interface SchematicPart {
  id: string
  part_type: string
  name: string
  position_number: number | null
  is_active?: boolean
}

interface Props {
  parts: SchematicPart[]
  selectedId: string | null
  onSelect: (id: string) => void
}

type Shape = 'manifold' | 'pipe' | 'box' | 'muffler' | 'tips' | 'sensor'

/** Mapea el tipo de pieza a una forma/color propios (iconografía ExhaustMarket). */
function categoryOf(partType: string): { shape: Shape; color: string; label: string } {
  const t = (partType || '').toLowerCase()
  if (t.includes('colector') || t.includes('manifold') || t.includes('turbo')) return { shape: 'manifold', color: '#0071E3', label: partType }
  if (t.includes('downpipe') || t.includes('bajante')) return { shape: 'pipe', color: '#0071E3', label: partType }
  if (t.includes('cataliz') || t.includes('cat') || t.includes('dpf') || t.includes('gpf') || t.includes('fap') || t.includes('opf') || t.includes('scr')) return { shape: 'box', color: '#34C759', label: partType }
  if (t.includes('silenci') || t.includes('muffler') || t.includes('resonador') || t.includes('resonator')) return { shape: 'muffler', color: '#5AC8FA', label: partType }
  if (t.includes('salida') || t.includes('cola') || t.includes('tip')) return { shape: 'tips', color: '#FF9F0A', label: partType }
  if (t.includes('sensor') || t.includes('sonda') || t.includes('lambda')) return { shape: 'sensor', color: '#AF52DE', label: partType }
  return { shape: 'pipe', color: '#8E8E93', label: partType || 'pieza' }
}

export default function ExhaustSchematic({ parts, selectedId, onSelect }: Props) {
  const active = parts
    .filter((p) => p.is_active !== false)
    .sort((a, b) => {
      const pa = a.position_number ?? 9999
      const pb = b.position_number ?? 9999
      return pa - pb
    })

  if (active.length === 0) return null

  const W = 820
  const H = 190
  const x0 = 96
  const x1 = 748
  const y = 96
  const n = active.length
  const xAt = (i: number) => (n > 1 ? x0 + ((x1 - x0) * i) / (n - 1) : (x0 + x1) / 2)

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: '#0F1115', borderRadius: 14, padding: '8px 4px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 560, height: 'auto', display: 'block' }}>
        {/* suelo */}
        <line x1={16} y1={y + 52} x2={W - 16} y2={y + 52} stroke="#26282E" strokeWidth={1} />
        {/* línea principal del escape */}
        <path d={`M${x0 - 20} ${y} H${x1 + 16}`} stroke="#5A5E66" strokeWidth={6} fill="none" strokeLinecap="round" />
        {/* motor */}
        <rect x={30} y={y - 26} width={50} height={50} rx={7} fill="#2B2F36" stroke="#3C4048" />
        <text x={55} y={y + 44} fill="#6B7280" fontSize={11} textAnchor="middle">motor</text>

        {active.map((p, i) => {
          const x = xAt(i)
          const cat = categoryOf(p.part_type)
          const isSel = p.id === selectedId
          const stroke = isSel ? '#FFFFFF' : 'rgba(255,255,255,0.15)'
          const strokeW = isSel ? 3 : 1.5
          const halo = isSel ? <circle cx={x} cy={y} r={26} fill={cat.color} opacity={0.18} /> : null
          return (
            <g key={p.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(p.id)}>
              {halo}
              {cat.shape === 'box' ? (
                <rect x={x - 26} y={y - 15} width={52} height={30} rx={6} fill={cat.color} stroke={stroke} strokeWidth={strokeW} />
              ) : cat.shape === 'muffler' ? (
                <ellipse cx={x} cy={y} rx={34} ry={16} fill={cat.color} stroke={stroke} strokeWidth={strokeW} />
              ) : cat.shape === 'tips' ? (
                <g>
                  <rect x={x - 4} y={y - 12} width={26} height={9} rx={3} fill={cat.color} stroke={stroke} strokeWidth={strokeW} />
                  <rect x={x - 4} y={y + 3} width={26} height={9} rx={3} fill={cat.color} stroke={stroke} strokeWidth={strokeW} />
                </g>
              ) : cat.shape === 'sensor' ? (
                <circle cx={x} cy={y} r={11} fill={cat.color} stroke={stroke} strokeWidth={strokeW} />
              ) : (
                <circle cx={x} cy={y} r={17} fill={cat.color} stroke={stroke} strokeWidth={strokeW} />
              )}
              {/* número */}
              {p.position_number != null && cat.shape !== 'tips' && (
                <text x={x} y={y + 4} fill="#FFFFFF" fontSize={11} fontWeight={600} textAnchor="middle" pointerEvents="none">
                  {p.position_number}
                </text>
              )}
              {/* etiqueta */}
              <text x={x} y={y + 40} fill={isSel ? '#FFFFFF' : '#9AA4B2'} fontSize={11} textAnchor="middle" pointerEvents="none">
                {truncate(p.name || cat.label, 16)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
