/**
 * Helpers compartidos por los formularios admin del catálogo relacional v2.
 * Listas enumeradas según el dossier metodológico del cliente.
 */

/* ─── ESTADOS QA ─── */

export const QA_STATES = [
  { value: 'draft', label: 'Borrador' },
  { value: 'in_research', label: 'En investigación' },
  { value: 'submitted', label: 'Enviado a revisión' },
  { value: 'needs_changes', label: 'Necesita cambios' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'duplicate', label: 'Duplicado' },
  { value: 'legacy_imported', label: 'Legacy (migrado)' },
] as const

export const QA_BADGE_COLOR: Record<string, string> = {
  draft: '#86868B',
  in_research: '#0071E3',
  submitted: '#FF9500',
  needs_changes: '#FF3B30',
  approved: '#34C759',
  rejected: '#D70015',
  duplicate: '#AF52DE',
  legacy_imported: '#5856D6',
}

/* ─── VEHÍCULO: carrocería ─── */

export const BODY_TYPES = [
  { value: 'sedan', label: 'Sedán / 4 puertas' },
  { value: 'hatchback', label: 'Hatchback / utilitario' },
  { value: 'coupe', label: 'Coupé' },
  { value: 'convertible', label: 'Convertible / cabrio' },
  { value: 'roadster', label: 'Roadster' },
  { value: 'station_wagon', label: 'Familiar / station wagon' },
  { value: 'shooting_brake', label: 'Shooting brake' },
  { value: 'fastback', label: 'Fastback' },
  { value: 'liftback', label: 'Liftback' },
  { value: 'suv', label: 'SUV / crossover' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'van', label: 'Furgoneta / van' },
  { value: 'minivan', label: 'Monovolumen / minivan' },
  { value: 'targa', label: 'Targa' },
  { value: 'speedster', label: 'Speedster' },
  { value: 'gt', label: 'Gran Turismo (GT)' },
  { value: 'supercar', label: 'Supercar' },
  { value: 'hypercar', label: 'Hypercar' },
  { value: 'race_car', label: 'Coche de competición' },
  { value: 'other', label: 'Otro' },
] as const

/* ─── MOTOR: combustible ─── */

export const FUEL_OPTIONS = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'diesel', label: 'Diésel' },
  { value: 'hibrido', label: 'Híbrido (HEV)' },
  { value: 'hibrido_enchufable', label: 'Híbrido enchufable (PHEV)' },
  { value: 'electrico', label: 'Eléctrico (BEV)' },
  { value: 'gnc', label: 'GNC (gas natural)' },
  { value: 'glp', label: 'GLP / autogás' },
  { value: 'e85', label: 'Etanol E85 / flex-fuel' },
  { value: 'hidrogeno', label: 'Hidrógeno' },
  { value: 'metanol', label: 'Metanol' },
] as const

/* ─── MOTOR: layout / arquitectura ─── */

export const ENGINE_LAYOUTS = [
  // En línea
  { value: 'i3na', label: 'I3 NA (3 cilindros atmosférico)' },
  { value: 'i3tt', label: 'I3 Turbo' },
  { value: 'i4na', label: 'I4 NA (4 cilindros atmosférico)' },
  { value: 'i4tt', label: 'I4 Turbo' },
  { value: 'i4bt', label: 'I4 Bi-Turbo' },
  { value: 'i5na', label: 'I5 NA (5 cilindros atmosférico)' },
  { value: 'i5tt', label: 'I5 Turbo' },
  { value: 'i6na', label: 'I6 NA (6 en línea atmosférico)' },
  { value: 'i6tt', label: 'I6 Turbo' },
  { value: 'i6bt', label: 'I6 Bi-Turbo' },
  // V
  { value: 'v6na', label: 'V6 NA' },
  { value: 'v6tt', label: 'V6 Turbo' },
  { value: 'v6bt', label: 'V6 Bi-Turbo' },
  { value: 'v8na', label: 'V8 NA' },
  { value: 'v8tt', label: 'V8 Twin-Turbo' },
  { value: 'v10na', label: 'V10 NA' },
  { value: 'v10tt', label: 'V10 Twin-Turbo' },
  { value: 'v12na', label: 'V12 NA' },
  { value: 'v12tt', label: 'V12 Twin-Turbo' },
  // W
  { value: 'w8', label: 'W8' },
  { value: 'w12na', label: 'W12 NA' },
  { value: 'w12tt', label: 'W12 Twin-Turbo' },
  { value: 'w16qt', label: 'W16 Quad-Turbo' },
  // Bóxer
  { value: 'flat4na', label: 'Flat-4 / Bóxer NA' },
  { value: 'flat4tt', label: 'Flat-4 / Bóxer Turbo' },
  { value: 'flat6na', label: 'Flat-6 / Bóxer NA' },
  { value: 'flat6tt', label: 'Flat-6 / Bóxer Twin-Turbo' },
  // Otros
  { value: 'rotary', label: 'Rotativo / Wankel' },
  { value: 'electric', label: 'Eléctrico (sin escape)' },
  { value: 'hybrid', label: 'Híbrido (configuración mixta)' },
  { value: 'unknown', label: 'Desconocido / por confirmar' },
] as const

/* ─── MOTOR: normativa de emisiones ─── */

export const EMISSIONS_NORMS = [
  'Euro 1', 'Euro 2', 'Euro 3', 'Euro 4',
  'Euro 5', 'Euro 5b', 'Euro 5b+',
  'Euro 6', 'Euro 6b', 'Euro 6c', 'Euro 6d-TEMP', 'Euro 6d', 'Euro 6e',
  'Euro 7',
  'EPA Tier 2', 'EPA Tier 3', 'EPA Tier 4',
  'CARB LEV3', 'CARB ULEV', 'CARB SULEV', 'CARB ZEV',
  'Pre-Euro / sin normativa',
  'Desconocido',
] as const

/* ─── MOTOR: tracción ─── */

export const DRIVE_TYPES = [
  { value: 'rwd', label: 'Trasera (RWD)' },
  { value: 'fwd', label: 'Delantera (FWD)' },
  { value: 'awd', label: 'Total (AWD)' },
  { value: 'awd_quattro', label: 'Quattro (Audi)' },
  { value: 'awd_xdrive', label: 'xDrive (BMW)' },
  { value: '4matic', label: '4Matic (Mercedes)' },
  { value: 'awd_4wd', label: '4WD (Subaru / Toyota / Mitsubishi)' },
  { value: 'mr', label: 'Trasera central (mid-engine)' },
  { value: 'rr', label: 'Trasera (motor trasero)' },
] as const

/* ─── MOTOR: caja de cambios ─── */

export const GEARBOX_TYPES = [
  { value: 'manual_5', label: 'Manual 5 velocidades' },
  { value: 'manual_6', label: 'Manual 6 velocidades' },
  { value: 'manual_7', label: 'Manual 7 velocidades' },
  { value: 'auto_torque', label: 'Automática (convertidor de par)' },
  { value: 'auto_6', label: 'Automática 6 velocidades' },
  { value: 'auto_8', label: 'Automática 8 velocidades' },
  { value: 'auto_9', label: 'Automática 9 velocidades' },
  { value: 'auto_10', label: 'Automática 10 velocidades' },
  { value: 'dct', label: 'DCT / doble embrague' },
  { value: 'dct_7', label: 'DCT 7v (DSG / S-tronic / PDK)' },
  { value: 'dct_8', label: 'DCT 8 velocidades' },
  { value: 'cvt', label: 'CVT (variador continuo)' },
  { value: 'amt', label: 'AMT / robotizada' },
  { value: 'single_speed', label: 'Reductora simple (EV)' },
  { value: 'tiptronic', label: 'Tiptronic / paddle shift' },
  { value: 'semi_auto', label: 'Semi-automática secuencial' },
] as const

/* ─── PIEZA OEM: tipo ─── */

export const PART_TYPES = [
  { value: 'colector', label: 'Colector (manifold)' },
  { value: 'turbo', label: 'Turbocompresor' },
  { value: 'downpipe', label: 'Downpipe' },
  { value: 'catalizador', label: 'Catalizador (TWC)' },
  { value: 'dpf', label: 'Filtro de partículas (DPF/FAP)' },
  { value: 'gpf', label: 'Filtro partículas gasolina (GPF/OPF)' },
  { value: 'scr', label: 'SCR / inyector AdBlue' },
  { value: 'egr', label: 'Válvula EGR' },
  { value: 'x-pipe', label: 'X-pipe' },
  { value: 'h-pipe', label: 'H-pipe' },
  { value: 'y-pipe', label: 'Y-pipe' },
  { value: 'resonator', label: 'Resonador' },
  { value: 'tubo_intermedio', label: 'Tubo intermedio (mid-pipe)' },
  { value: 'tubo', label: 'Tubo / conducto' },
  { value: 'silenciador_central', label: 'Silenciador central' },
  { value: 'silenciador_trasero', label: 'Silenciador trasero' },
  { value: 'silenciador', label: 'Silenciador (genérico)' },
  { value: 'tip', label: 'Salida / cola (tip)' },
  { value: 'valvula', label: 'Válvula de escape activa' },
  { value: 'sensor_lambda', label: 'Sensor lambda (O2)' },
  { value: 'sensor_nox', label: 'Sensor NOx' },
  { value: 'sensor_temp', label: 'Sensor de temperatura' },
  { value: 'sensor_presion', label: 'Sensor de presión diferencial' },
  { value: 'junta', label: 'Junta / gasket' },
  { value: 'abrazadera', label: 'Abrazadera / clamp' },
  { value: 'soporte', label: 'Soporte / colgador (hanger)' },
  { value: 'flexible', label: 'Tubo flexible (flex pipe)' },
  { value: 'pantalla_termica', label: 'Pantalla térmica / heat shield' },
  { value: 'otro', label: 'Otro' },
] as const

/* ─── PIEZA: material ─── */

export const PART_MATERIALS = [
  { value: 'inox_304', label: 'Acero inoxidable 304 (T304)' },
  { value: 'inox_316', label: 'Acero inoxidable 316' },
  { value: 'inox_321', label: 'Acero inoxidable 321 (alta temp.)' },
  { value: 'inox_409', label: 'Acero inoxidable 409' },
  { value: 'inox_441', label: 'Acero inoxidable 441' },
  { value: 'titanio_g1', label: 'Titanio Grado 1' },
  { value: 'titanio_g2', label: 'Titanio Grado 2' },
  { value: 'titanio_g5', label: 'Titanio Grado 5 (Ti-6Al-4V)' },
  { value: 'titanio_g9', label: 'Titanio Grado 9' },
  { value: 'inconel_625', label: 'Inconel 625' },
  { value: 'inconel_718', label: 'Inconel 718' },
  { value: 'hastelloy', label: 'Hastelloy' },
  { value: 'acero_aluminizado', label: 'Acero aluminizado' },
  { value: 'acero_carbono', label: 'Acero al carbono' },
  { value: 'fundicion', label: 'Hierro fundido' },
  { value: 'cermet', label: 'Cermet (catalizador)' },
  { value: 'sic', label: 'SiC (DPF)' },
  { value: 'cordierita', label: 'Cordierita (DPF/cat.)' },
  { value: 'fibra_carbono', label: 'Fibra de carbono (tips)' },
  { value: 'otro', label: 'Otro' },
] as const

/* ─── Confianza, homologación, dificultad ─── */

export const CONFIDENCE = [
  { value: 'alta', label: 'Alta — varias fuentes fiables' },
  { value: 'media', label: 'Media — una fuente fiable' },
  { value: 'baja', label: 'Baja — sin confirmar' },
] as const

export const HOMOLOGATION = [
  { value: 'ECE', label: 'ECE (Europa)' },
  { value: 'EU_CE', label: 'CE (UE)' },
  { value: 'TUV', label: 'TÜV (Alemania)' },
  { value: 'ITV_ES', label: 'Homologada ITV (España)' },
  { value: 'EPA', label: 'EPA (EEUU)' },
  { value: 'CARB', label: 'CARB (California)' },
  { value: 'JIS', label: 'JIS (Japón)' },
  { value: 'no_homologado', label: 'No homologado (uso pista)' },
  { value: 'pendiente', label: 'Pendiente de homologación' },
  { value: 'desconocido', label: 'Desconocido' },
] as const

export const PRODUCT_TYPE = [
  { value: 'oem_original', label: 'OEM original (recambio idéntico)' },
  { value: 'oem_equivalente', label: 'OEM equivalente (mismo fabricante OE)' },
  { value: 'repuesto_equivalente', label: 'Repuesto equivalente / aftermarket genérico' },
  { value: 'deportivo_homologado', label: 'Deportivo homologado calle' },
  { value: 'competicion', label: 'Competición / track-only' },
  { value: 'rally', label: 'Rally / WRC spec' },
  { value: 'show', label: 'Show / estético' },
  { value: 'universal', label: 'Universal' },
  { value: 'custom', label: 'Custom / artesanal' },
] as const

export const DIFFICULTY = [
  { value: 'baja', label: 'Baja — pieza estándar' },
  { value: 'media', label: 'Media — requiere taller' },
  { value: 'alta', label: 'Alta — fabricación a medida' },
] as const

export const COUNTRIES = [
  'ES', 'PT', 'FR', 'DE', 'IT', 'UK', 'AT', 'CH', 'NL', 'BE',
  'PL', 'CZ', 'SE', 'NO', 'FI', 'DK', 'GR', 'IE',
  'US', 'CA', 'MX', 'BR', 'AR',
  'JP', 'KR', 'CN', 'TW', 'HK', 'SG', 'AU', 'NZ',
  'AE', 'SA', 'IL',
] as const

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'BRL', 'MXN'] as const

/* ─── ID interno + estilos ─── */

export function buildInternalId(parts: (string | number | null | undefined)[]): string {
  return parts
    .filter((p) => p !== null && p !== undefined && p !== '')
    .map((p) => String(p))
    .join('-')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #D2D2D7',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  backgroundColor: '#FFFFFF',
}

export const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#1D1D1F',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  display: 'block',
  marginBottom: 6,
}

export const fieldGroupStyle: React.CSSProperties = {
  marginBottom: 16,
}

export const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  margin: '24px 0 16px',
  paddingBottom: 8,
  borderBottom: '1px solid #E5E5EA',
}

export function StatusBadge({ status }: { status: string }): JSX.Element {
  const color = QA_BADGE_COLOR[status] ?? '#86868B'
  const label = QA_STATES.find((s) => s.value === status)?.label ?? status
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        backgroundColor: `${color}20`,
        color,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
  )
}
