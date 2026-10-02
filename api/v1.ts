import { Pool } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createHash, createHmac, randomBytes } from 'node:crypto'

/**
 * /api/v1 — API de datos de ExhaustMarket (Solicitud nº3, F2) + webhooks (F3). Self-contained.
 * vercel.json reescribe /api/v1/<ruta> → /api/v1?path=<ruta>.
 *
 * Reglas innegociables (PDF): clave por integración · todo lo externo nace PENDIENTE · idempotencia
 * por id_externo · trazabilidad de origen (origen = api:<nombre de la clave>).
 *
 * Público:   GET /api/v1 · GET /api/v1/openapi.json
 * Con clave (Authorization: Bearer emk_…):
 *   GET    /{entidad}            listado (filtros + paginación)       entidades: vehicles, engines,
 *   GET    /{entidad}/{id}       un registro                            components, diagrams, schemas,
 *   POST   /{entidad}            alta 1 o lote (≤200) [read_write]       guides, manuals, designs3d,
 *   PATCH  /{entidad}/{id}       cambio parcial [read_write]            relations, products (lectura)
 *   DELETE /relations/{id}       quitar una relación [read_write]
 *   GET    /search/vehicles?q=   búsqueda/normalización (golf 7 2.0 tdi 2015)
 *   POST   /uploads              URL firmada para subir un archivo a R2 [read_write]
 * Admin (token de Clerk de un admin): /_admin/keys, /_admin/logs, /_admin/webhooks, /_admin/deliveries
 * Cron (Vercel, cada minuto): /_cron/webhooks — entrega/reintenta los webhooks pendientes.
 */

// ───────────────────────── vocabularios cerrados (espejo de api/csv.ts) ─────────────────────────
const PART_TYPES = ['colector', 'downpipe', 'catalizador', 'dpf', 'gpf', 'flexible', 'tubo_intermedio', 'resonador',
  'silenciador_central', 'silenciador_trasero', 'silenciador', 'valvula', 'tip', 'x-pipe', 'h-pipe', 'turbo', 'tubo', 'otro']
const PART_SYN: Record<string, string> = {
  colas: 'tip', cola: 'tip', salidas: 'tip', salida: 'tip', puntas: 'tip', tips: 'tip', fap: 'dpf', fap_dpf: 'dpf', fap_dpf_gpf: 'dpf',
  filtro_de_particulas: 'dpf', opf: 'gpf', silencioso: 'silenciador', silencioso_trasero: 'silenciador_trasero', silencioso_central: 'silenciador_central',
  muffler: 'silenciador', valvulas: 'valvula', otros: 'otro', xpipe: 'x-pipe', x_pipe: 'x-pipe', hpipe: 'h-pipe', h_pipe: 'h-pipe',
  intermedio: 'tubo_intermedio', manifold: 'colector', header: 'colector', headers: 'colector', cat: 'catalizador', catalizadores: 'catalizador',
}
const PART_LABEL: Record<string, string> = {
  colector: 'Colector', downpipe: 'Downpipe', catalizador: 'Catalizador', dpf: 'FAP / DPF', gpf: 'GPF / OPF', flexible: 'Flexible',
  tubo_intermedio: 'Tubo intermedio', resonador: 'Resonador', silenciador_central: 'Silenciador central', silenciador_trasero: 'Silenciador trasero',
  silenciador: 'Silenciador', valvula: 'Válvula', tip: 'Salidas', 'x-pipe': 'X-Pipe', 'h-pipe': 'H-Pipe', turbo: 'Turbo', tubo: 'Tubo', otro: 'Otro',
}
const FUEL = ['gasolina', 'diesel', 'electrico', 'hibrido', 'hibrido_enchufable', 'glp', 'gnc', 'hidrogeno']
const FUEL_SYN: Record<string, string> = { gasoil: 'diesel', gasoleo: 'diesel', petrol: 'gasolina', gasoline: 'gasolina', electric: 'electrico', ev: 'electrico', hev: 'hibrido', phev: 'hibrido_enchufable', hybrid: 'hibrido' }
const BODY = ['hatchback', 'sedan', 'suv', 'coupe', 'station_wagon', 'convertible', 'pickup', 'van', 'roadster', 'targa', 'otro']
const BODY_SYN: Record<string, string> = { berlina: 'sedan', compacto: 'hatchback', familiar: 'station_wagon', ranchera: 'station_wagon', cabrio: 'convertible', descapotable: 'convertible', monovolumen: 'van', furgoneta: 'van', todoterreno: 'suv' }
const D3_TYPES = ['colector', 'downpipe', 'catalizador', 'fap_dpf', 'flexible', 'tubo_intermedio', 'silencioso', 'valvulas', 'colas', 'otros']
const EVENTS = ['file.uploaded', 'record.created', 'record.approved', 'record.rejected', 'batch.created', 'submission.created', 'test.ping']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BATCH = 200
const RATE_PER_HOUR = 2000

// ───────────────────────── entidades ─────────────────────────
type FT = 'text' | 'int' | 'num' | 'bool' | 'uuid' | 'url' | 'enum' | 'urls' | 'json' | 'texts'
// nn = columna NOT NULL en la BD (no admite null explícito aunque no sea obligatoria al crear).
interface AF { col: string; type: FT; req?: boolean; nn?: boolean; values?: string[]; syn?: Record<string, string>; virtual?: boolean; def?: unknown; desc: string }
interface AE {
  name: string; table: string; label: string; writable: boolean; qa: boolean
  pubCol: string | null; pending: string; approved: string; rejected: string
  from: string; extra: string; fields: AF[]; needsOneOf?: string[]
  filters: Record<string, { sql: string; type?: 'int' | 'uuid' | 'text' | 'like' }>
  ownerCol?: string
  /** Condición extra para ser público además de estar aprobado (activo / publicado / público). */
  activeCond?: string
}
const STD = { pubCol: 'pub_status', pending: 'pendiente_revision', approved: 'aprobado', rejected: 'rechazado' }
const JV = 'LEFT JOIN vehicles v ON v.id = x.vehicle_id'
const JPART = 'LEFT JOIN exhaust_diagrams d ON d.id = x.diagram_id LEFT JOIN engines e ON e.id = d.engine_id LEFT JOIN vehicles v ON v.id = e.vehicle_id'
const ENT: Record<string, AE> = {
  vehicles: {
    name: 'vehicles', table: 'vehicles', label: 'Vehículo', writable: true, qa: true, ...STD, from: 'vehicles x', extra: '',
    fields: [
      { col: 'brand', type: 'text', req: true, desc: 'Marca' }, { col: 'model', type: 'text', req: true, desc: 'Modelo' },
      { col: 'generation', type: 'text', desc: 'Generación / chasis' }, { col: 'year_from', type: 'int', req: true, desc: 'Año de inicio' },
      { col: 'year_to', type: 'int', desc: 'Año de fin' }, { col: 'body', type: 'enum', values: BODY, syn: BODY_SYN, desc: 'Carrocería' },
      { col: 'doors', type: 'int', desc: 'Puertas' }, { col: 'internal_id', type: 'text', desc: 'Id interno' }, { col: 'notes', type: 'text', desc: 'Notas' },
    ],
    filters: { brand: { sql: 'x.brand', type: 'like' }, model: { sql: 'x.model', type: 'like' }, year: { sql: 'YEAR', type: 'int' } },
  },
  engines: {
    name: 'engines', table: 'engines', label: 'Motorización', writable: true, qa: true, ...STD, from: `engines x ${JV}`,
    extra: ', v.brand AS _vehicle_brand, v.model AS _vehicle_model, v.generation AS _vehicle_generation',
    needsOneOf: ['vehicle_id', 'vehicle_id_externo'],
    fields: [
      { col: 'vehicle_id', type: 'uuid', desc: 'Vehículo (id)' }, { col: 'vehicle_id_externo', type: 'text', virtual: true, desc: 'id_externo del vehículo' },
      { col: 'version', type: 'text', req: true, desc: 'Versión / motorización' }, { col: 'engine_code', type: 'text', desc: 'Código de motor' },
      { col: 'fuel', type: 'enum', req: true, values: FUEL, syn: FUEL_SYN, desc: 'Combustible' }, { col: 'displacement_l', type: 'num', desc: 'Cilindrada (l)' },
      { col: 'power_cv', type: 'int', desc: 'Potencia (CV)' }, { col: 'power_kw', type: 'int', desc: 'Potencia (kW)' },
      { col: 'emissions', type: 'text', desc: 'Norma Euro' }, { col: 'drive', type: 'text', desc: 'Tracción' }, { col: 'gearbox', type: 'text', desc: 'Cambio' },
      { col: 'internal_id', type: 'text', desc: 'Id interno' },
    ],
    filters: { vehicle_id: { sql: 'x.vehicle_id', type: 'uuid' }, brand: { sql: 'v.brand', type: 'like' }, model: { sql: 'v.model', type: 'like' }, engine_code: { sql: 'x.engine_code', type: 'like' }, fuel: { sql: 'x.fuel' } },
  },
  components: {
    name: 'components', table: 'exhaust_parts', label: 'Componente OEM', writable: true, qa: true, ...STD, from: `exhaust_parts x ${JPART}`,
    extra: ', d.engine_id AS _engine_id, e.version AS _engine_version, e.engine_code AS _engine_code, v.id AS _vehicle_id, v.brand AS _vehicle_brand, v.model AS _vehicle_model',
    needsOneOf: ['diagram_id', 'engine_id', 'engine_id_externo'],
    fields: [
      { col: 'diagram_id', type: 'uuid', desc: 'Diagrama (id)' }, { col: 'engine_id', type: 'uuid', virtual: true, desc: 'Motorización (id)' },
      { col: 'engine_id_externo', type: 'text', virtual: true, desc: 'id_externo de la motorización' },
      { col: 'part_type', type: 'enum', req: true, values: PART_TYPES, syn: PART_SYN, desc: 'Tramo (lista cerrada)' },
      { col: 'name', type: 'text', nn: true, desc: 'Nombre (vacío = el del tramo)' }, { col: 'oem_ref', type: 'text', desc: 'Referencia OEM' },
      { col: 'oem_not_found', type: 'bool', nn: true, desc: 'La referencia OEM no se encontró' }, { col: 'variant', type: 'text', desc: 'Condición / variante' },
      { col: 'source_url', type: 'url', desc: 'Fuente 1 (URL)' }, { col: 'source_url_2', type: 'url', desc: 'Fuente 2 (URL)' },
      { col: 'confidence', type: 'enum', nn: true, values: ['alta', 'media', 'baja'], def: 'media', desc: 'Confianza' },
      { col: 'verification_status', type: 'enum', values: ['candidato', 'verificado', 'descatalogado'], def: 'candidato', desc: 'Estado de verificación' },
      { col: 'position_number', type: 'int', desc: 'Posición en el diagrama' }, { col: 'description', type: 'text', desc: 'Descripción' },
      { col: 'material', type: 'text', desc: 'Material' }, { col: 'diameter_mm', type: 'num', desc: 'Diámetro (mm)' }, { col: 'thickness_mm', type: 'num', desc: 'Espesor (mm)' },
      { col: 'homologation', type: 'text', desc: 'Homologación' }, { col: 'has_sensor', type: 'bool', desc: 'Lleva sonda/sensor' },
      { col: 'images', type: 'urls', nn: true, desc: 'Fotos (URLs)' }, { col: 'notes', type: 'text', desc: 'Notas' },
    ],
    filters: {
      engine_id: { sql: 'd.engine_id', type: 'uuid' }, diagram_id: { sql: 'x.diagram_id', type: 'uuid' }, brand: { sql: 'v.brand', type: 'like' },
      model: { sql: 'v.model', type: 'like' }, part_type: { sql: 'x.part_type' }, oem_ref: { sql: 'x.oem_ref', type: 'like' }, verification_status: { sql: 'x.verification_status' },
    },
    activeCond: 'x.is_active = true',
  },
  diagrams: {
    name: 'diagrams', table: 'exhaust_diagrams', label: 'Diagrama', writable: false, qa: true, ...STD,
    from: 'exhaust_diagrams x LEFT JOIN engines e ON e.id = x.engine_id LEFT JOIN vehicles v ON v.id = e.vehicle_id',
    extra: ', e.version AS _engine_version, v.brand AS _vehicle_brand, v.model AS _vehicle_model', fields: [],
    filters: { engine_id: { sql: 'x.engine_id', type: 'uuid' }, brand: { sql: 'v.brand', type: 'like' }, model: { sql: 'v.model', type: 'like' } },
  },
  schemas: {
    name: 'schemas', table: 'exhaust_schemas', label: 'Esquema', writable: false, qa: false, ...STD, from: 'exhaust_schemas x', extra: '', fields: [],
    filters: { brand: { sql: 'x.brand', type: 'like' }, model: { sql: 'x.model', type: 'like' }, engine: { sql: 'x.engine', type: 'like' } },
    activeCond: 'x.is_active = true',
  },
  guides: {
    name: 'guides', table: 'articles', label: 'Guía', writable: true, qa: false, ...STD, from: 'articles x', extra: '',
    fields: [
      { col: 'slug', type: 'text', req: true, desc: 'Slug único (url)' }, { col: 'title', type: 'text', req: true, desc: 'Título' },
      { col: 'subtitle', type: 'text', desc: 'Subtítulo' }, { col: 'category', type: 'enum', nn: true, values: ['guide', 'tutorial', 'review', 'comparison'], def: 'guide', desc: 'Categoría' },
      { col: 'excerpt', type: 'text', desc: 'Resumen' }, { col: 'content_md', type: 'text', nn: true, desc: 'Contenido (Markdown)' }, { col: 'cover_url', type: 'url', desc: 'Imagen de portada' },
      { col: 'tags', type: 'texts', desc: 'Etiquetas' }, { col: 'reading_minutes', type: 'int', desc: 'Minutos de lectura' },
      { col: 'video_url', type: 'url', desc: 'Vídeo' }, { col: 'attachment_url', type: 'url', desc: 'Adjunto' },
    ],
    filters: { category: { sql: 'x.category' }, q: { sql: 'x.title', type: 'like' } },
    activeCond: 'x.is_published = true',
  },
  manuals: {
    name: 'manuals', table: 'manuals', label: 'Manual', writable: true, qa: false, ...STD, from: 'manuals x', extra: '',
    fields: [
      { col: 'title', type: 'text', req: true, desc: 'Título' }, { col: 'description', type: 'text', nn: true, def: '', desc: 'Descripción' },
      { col: 'car_brand', type: 'text', req: true, desc: 'Marca' }, { col: 'car_model', type: 'text', req: true, desc: 'Modelo' },
      { col: 'manual_type', type: 'enum', nn: true, values: ['car_manual', 'exhaust_installation', 'maintenance', 'other'], def: 'exhaust_installation', desc: 'Tipo' },
      { col: 'file_url', type: 'url', req: true, desc: 'Archivo (URL; usa /uploads para subirlo)' }, { col: 'file_size', type: 'int', nn: true, desc: 'Tamaño (bytes)' },
      { col: 'thumbnail_url', type: 'url', desc: 'Portada' }, { col: 'required_tier', type: 'enum', nn: true, values: ['standard', 'workshop', 'professional', 'premium'], def: 'standard', desc: 'Tier mínimo' },
    ],
    filters: { brand: { sql: 'x.car_brand', type: 'like' }, model: { sql: 'x.car_model', type: 'like' }, manual_type: { sql: 'x.manual_type' } },
  },
  designs3d: {
    name: 'designs3d', table: 'design_3d', label: 'Archivo 3D', writable: true, qa: false,
    pubCol: 'status', pending: 'pending', approved: 'approved', rejected: 'rejected', from: 'design_3d x', extra: '', ownerCol: 'uploaded_by',
    fields: [
      { col: 'title', type: 'text', req: true, desc: 'Título' }, { col: 'description', type: 'text', desc: 'Descripción' },
      { col: 'part_type', type: 'enum', values: D3_TYPES, desc: 'Tipo de pieza' }, { col: 'file_url', type: 'url', req: true, desc: 'Archivo 3D (URL)' },
      { col: 'files', type: 'json', nn: true, desc: 'Lista de archivos [{url,name,size}]' }, { col: 'thumbnail_url', type: 'url', desc: 'Imagen' },
      { col: 'file_size', type: 'int', desc: 'Tamaño (bytes)' }, { col: 'is_public', type: 'bool', def: true, desc: 'Público (tras aprobación)' },
      { col: 'processing_status', type: 'enum', nn: true, values: ['escaneo_bruto', 'en_proceso', 'procesado'], desc: 'Estado de procesado (por defecto procesado)' },
    ],
    filters: { part_type: { sql: 'x.part_type' }, q: { sql: 'x.title', type: 'like' } },
    activeCond: 'x.is_public = true',
  },
  products: {
    name: 'products', table: 'professional_products', label: 'Producto marketplace', writable: false, qa: false,
    pubCol: null, pending: '', approved: '', rejected: '', from: 'professional_products x', extra: '', fields: [],
    filters: { category: { sql: 'x.category', type: 'like' }, q: { sql: 'x.product_name', type: 'like' }, external_ref: { sql: 'x.external_ref', type: 'like' } },
  },
}
const REL: Record<string, { table: string; col: string; target: string; label: string }> = {
  guia: { table: 'schema_article_links', col: 'article_id', target: 'articles', label: 'guía' },
  manual: { table: 'schema_manual_links', col: 'manual_id', target: 'manuals', label: 'manual' },
  '3d': { table: 'schema_3d_links', col: 'design_3d_id', target: 'design_3d', label: 'archivo 3D' },
}
// Columnas internas que solo ve el ORIGEN del registro (su propia integración).
const INTERNAL = ['pending_changes', 'review_note', 'reviewed_at', 'lote_id', 'qa_issues']
// Datos personales / ids de usuarios internos: no salen nunca por la API.
const HIDDEN = ['investigator_name', 'investigator_email', 'investigator_country', 'investigator_date', 'created_by', 'uploaded_by', 'reviewed_by']

// ───────────────────────── entrada ─────────────────────────
type Key = { id: string; name: string; scope: string; profile: string | null }
type Res = { status: number; body: unknown; entity?: string; records?: number }

export async function GET(req: Request) { return handle(req, 'GET') }
export async function POST(req: Request) { return handle(req, 'POST') }
export async function PATCH(req: Request) { return handle(req, 'PATCH') }
export async function DELETE(req: Request) { return handle(req, 'DELETE') }

async function handle(req: Request, method: string): Promise<Response> {
  const url = new URL(req.url)
  const path = (url.searchParams.get('path') ?? '').replace(/^\/+|\/+$/g, '')
  const seg = path ? path.split('/') : []
  const t0 = Date.now()
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    if (seg.length === 0) return json(indexDoc(url.origin))
    if (seg[0] === 'openapi.json') return json(openapi(url.origin))
    if (seg[0] === '_cron' && seg[1] === 'webhooks') return json(await dispatchWebhooks(pool))
    if (seg[0] === '_admin') { const r = await adminRoute(req, method, seg.slice(1), url, pool); return json(r.body, r.status) }

    const key = await authKey(req, pool)
    if (!key) return json(apiErr('unauthorized', 'Falta o no es válida la clave de API (cabecera Authorization: Bearer emk_…).'), 401)
    const over = await rateBump(pool, key.id)
    let res: Res
    if (over) res = { status: 429, body: apiErr('rate_limited', `Límite de ${RATE_PER_HOUR} peticiones/hora alcanzado para esta clave.`) }
    else {
      try { res = await route(req, method, seg, url, pool, key) }
      catch (e) { console.error('v1 error', e); res = { status: 500, body: apiErr('internal', (e as Error).message) } }
    }
    const qs = new URLSearchParams(url.searchParams); qs.delete('path')
    await pool.query(`INSERT INTO api_call_log (key_id, method, path, entity, records, status, error, duration_ms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [key.id, method, (`/${path}` + (qs.toString() ? `?${qs}` : '')).slice(0, 300), res.entity ?? null, res.records ?? 0, res.status,
        res.status >= 400 ? JSON.stringify(res.body).slice(0, 500) : null, Date.now() - t0]).catch(() => {})
    await pool.query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [key.id]).catch(() => {})
    return json(res.body, res.status)
  } catch (e) {
    console.error('v1 fatal', e)
    return json(apiErr('internal', (e as Error).message), 500)
  } finally {
    await pool.end().catch(() => {})
  }
}

async function route(req: Request, method: string, seg: string[], url: URL, pool: Pool, key: Key): Promise<Res> {
  const [s0, s1] = seg
  if (s0 === 'search' && s1 === 'vehicles' && method === 'GET') return searchVehicles(pool, url.searchParams.get('q') ?? '', key)
  if (s0 === 'uploads' && method === 'POST') {
    if (key.scope !== 'read_write') return { status: 403, body: apiErr('forbidden', 'Esta clave es de solo lectura.') }
    return presignUpload(req, url, key)
  }
  if (s0 === 'relations') return relationsRoute(req, method, s1, url, pool, key)
  const ent = ENT[s0]
  if (!ent) return { status: 404, body: apiErr('not_found', `Entidad desconocida «${s0}». Ver /api/v1/openapi.json`) }
  if (method === 'GET' && !s1) return list(pool, ent, url, key)
  if (method === 'GET' && s1) return getOne(pool, ent, s1, key)
  if (!ent.writable) return { status: 405, body: apiErr('read_only', `«${ent.name}» es de solo lectura.`), entity: ent.name }
  if (key.scope !== 'read_write') return { status: 403, body: apiErr('forbidden', 'Esta clave es de solo lectura.'), entity: ent.name }
  if (method === 'POST' && !s1) return createBatch(req, pool, ent, key)
  if (method === 'PATCH' && s1) return patchOne(req, pool, ent, s1, key)
  return { status: 405, body: apiErr('method_not_allowed', `${method} no soportado aquí.`), entity: ent.name }
}

// ───────────────────────── lectura ─────────────────────────
function visibility(ent: AE, estado: string | null, key: Key, vals: unknown[]): string {
  if (!ent.pubCol) return `x.is_active = true`
  const own = `api:${key.name}`
  const p = (v: unknown) => { vals.push(v); return `$${vals.length}` }
  // Por defecto solo lo PÚBLICO (aprobado y activo/publicado). Lo pendiente/rechazado solo es visible
  // para la integración que lo envió (su propio origen), nunca el de otras integraciones.
  const pub = () => `(x.${ent.pubCol} = ${p(ent.approved)}${ent.activeCond ? ` AND ${ent.activeCond}` : ''})`
  if (estado === 'pendiente_revision' || estado === 'pendiente') return `(x.${ent.pubCol} = ${p(ent.pending)} AND x.origen = ${p(own)})`
  if (estado === 'rechazado') return `(x.${ent.pubCol} = ${p(ent.rejected)} AND x.origen = ${p(own)})`
  if (estado === 'todos') return `(${pub()} OR x.origen = ${p(own)})`
  return pub()
}

function shape(row: Record<string, unknown>, key: Key): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  const own = out.origen === `api:${key.name}`
  if (!own) for (const c of INTERNAL) delete out[c]
  for (const c of HIDDEN) delete out[c]
  delete out.total_count
  return out
}

async function list(pool: Pool, ent: AE, url: URL, key: Key): Promise<Res> {
  const sp = url.searchParams
  const vals: unknown[] = []
  const where: string[] = [visibility(ent, sp.get('estado'), key, vals)]
  for (const [param, f] of Object.entries(ent.filters)) {
    const v = sp.get(param)
    if (v == null || v === '') continue
    if (f.sql === 'YEAR') {
      const y = Number(v); if (!Number.isInteger(y)) continue
      vals.push(y); where.push(`(x.year_from <= $${vals.length} AND (x.year_to IS NULL OR x.year_to >= $${vals.length}))`)
    } else if (f.type === 'uuid') {
      if (!UUID_RE.test(v)) return { status: 400, body: apiErr('bad_request', `«${param}» no es un uuid.`), entity: ent.name }
      vals.push(v); where.push(`${f.sql} = $${vals.length}`)
    } else if (f.type === 'like') {
      vals.push(`%${v}%`); where.push(`${f.sql} ILIKE $${vals.length}`)
    } else { vals.push(v); where.push(`${f.sql} = $${vals.length}`) }
  }
  const origen = sp.get('origen')
  if (origen && ent.pubCol) { vals.push(`${origen}%`); where.push(`x.origen ILIKE $${vals.length}`) }
  const since = sp.get('updated_since')
  if (since) { if (Number.isNaN(Date.parse(since))) return { status: 400, body: apiErr('bad_request', 'updated_since debe ser una fecha ISO 8601.') }; vals.push(since); where.push(`x.updated_at >= $${vals.length}`) }
  const limit = Math.min(Math.max(Number(sp.get('limit') ?? 50) || 50, 1), MAX_BATCH)
  const offset = Math.max(Number(sp.get('offset') ?? 0) || 0, 0)
  vals.push(limit, offset)
  const rows = (await pool.query(`SELECT x.*${ent.extra}, count(*) OVER() AS total_count FROM ${ent.from} WHERE ${where.join(' AND ')}
    ORDER BY x.updated_at DESC NULLS LAST, x.id LIMIT $${vals.length - 1} OFFSET $${vals.length}`, vals)).rows as Record<string, unknown>[]
  const total = rows.length ? Number(rows[0].total_count) : 0
  return {
    status: 200, entity: ent.name, records: rows.length,
    body: { data: rows.map((r) => shape(r, key)), pagination: { limit, offset, total, next_offset: offset + rows.length < total ? offset + rows.length : null } },
  }
}

async function getOne(pool: Pool, ent: AE, id: string, key: Key): Promise<Res> {
  if (!UUID_RE.test(id)) return { status: 400, body: apiErr('bad_request', 'id no válido (uuid).'), entity: ent.name }
  const vals: unknown[] = [id]
  const vis = visibility(ent, 'todos', key, vals)
  const row = (await pool.query(`SELECT x.*${ent.extra} FROM ${ent.from} WHERE x.id = $1 AND ${vis}`, vals)).rows[0]
  if (!row) return { status: 404, body: apiErr('not_found', 'No existe (o no es visible para esta clave).'), entity: ent.name }
  return { status: 200, body: { data: shape(row, key) }, entity: ent.name, records: 1 }
}

// ───────────────────────── escritura ─────────────────────────
interface Item { index: number; id_externo: string; values: Record<string, unknown>; refs: Record<string, unknown>; errors: string[]; warning?: string; dupId?: string }

function normKey(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

/** Convierte/valida un valor JSON según su tipo. Devuelve {value} o {error}. */
function conv(f: AF, v: unknown): { value: unknown } | { error: string } {
  if (v === null) return (f.req || f.nn) && !f.virtual ? { error: `${f.col}: no puede ser null` } : { value: null }
  switch (f.type) {
    case 'text': return typeof v === 'string' || typeof v === 'number' ? { value: String(v).trim() } : { error: `${f.col}: debe ser texto` }
    case 'int': { const n = typeof v === 'string' ? Number(v) : v; return typeof n === 'number' && Number.isInteger(n) ? { value: n } : { error: `${f.col}: debe ser entero` } }
    case 'num': { const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v; return typeof n === 'number' && Number.isFinite(n) ? { value: n } : { error: `${f.col}: debe ser número` } }
    case 'bool': return typeof v === 'boolean' ? { value: v } : { error: `${f.col}: debe ser true/false` }
    case 'uuid': return typeof v === 'string' && UUID_RE.test(v) ? { value: v.toLowerCase() } : { error: `${f.col}: uuid no válido` }
    case 'url': return typeof v === 'string' && /^https?:\/\/\S+$/i.test(v) ? { value: v } : { error: `${f.col}: URL http(s) no válida` }
    case 'urls': return Array.isArray(v) && v.every((u) => typeof u === 'string' && /^https?:\/\/\S+$/i.test(u)) ? { value: v } : { error: `${f.col}: lista de URLs no válida` }
    case 'texts': return Array.isArray(v) && v.every((u) => typeof u === 'string') ? { value: v } : { error: `${f.col}: lista de textos no válida` }
    case 'json': return typeof v === 'object' ? { value: JSON.stringify(v) } : { error: `${f.col}: debe ser JSON` }
    case 'enum': {
      if (typeof v !== 'string') return { error: `${f.col}: debe ser texto` }
      const k = normKey(v)
      const vals = f.values ?? []
      const direct = vals.find((x) => normKey(x) === k)
      const mapped = direct ?? (f.syn?.[k] && vals.includes(f.syn[k]) ? f.syn[k] : undefined)
      return mapped ? { value: mapped } : { error: `${f.col}: «${v}» no válido (${vals.join(', ')})` }
    }
  }
}

function parseItem(ent: AE, raw: unknown, index: number, partial: boolean): Item {
  const it: Item = { index, id_externo: '', values: {}, refs: {}, errors: [] }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { it.errors.push('El registro debe ser un objeto JSON.'); return it }
  const obj = raw as Record<string, unknown>
  if (!partial) {
    if (typeof obj.id_externo !== 'string' || !obj.id_externo.trim()) it.errors.push('id_externo es obligatorio (texto único por integración).')
    else it.id_externo = obj.id_externo.trim().slice(0, 200)
  }
  const known = new Set(ent.fields.map((f) => f.col).concat(['id_externo']))
  for (const k of Object.keys(obj)) if (!known.has(k)) it.errors.push(`Campo desconocido «${k}».`)
  for (const f of ent.fields) {
    if (!(f.col in obj)) { if (!partial && f.def !== undefined && !f.virtual) it.values[f.col] = f.def; continue }
    const c = conv(f, obj[f.col])
    if ('error' in c) { it.errors.push(c.error); continue }
    if (f.virtual) it.refs[f.col] = c.value; else it.values[f.col] = c.value
  }
  if (!partial) {
    for (const f of ent.fields) if (f.req && (f.virtual ? it.refs[f.col] == null : it.values[f.col] == null)) it.errors.push(`${f.col} es obligatorio.`)
    if (ent.needsOneOf && !ent.needsOneOf.some((c) => it.values[c] != null || it.refs[c] != null)) it.errors.push(`Falta la referencia: ${ent.needsOneOf.join(' / ')}.`)
  }
  if (typeof it.values.year_from === 'number' && typeof it.values.year_to === 'number' && it.values.year_to < it.values.year_from) it.errors.push('year_to es anterior a year_from.')
  return it
}

// Las referencias por id_externo se resuelven dentro del MISMO origen (los ids externos de esta integración).
async function resolveItems(pool: Pool, ent: AE, items: Item[], own: string) {
  const ok = items.filter((i) => !i.errors.length)
  const uniq = (xs: unknown[]) => [...new Set(xs.filter((x) => x != null))] as string[]
  if (ent.name === 'engines') {
    const ids = uniq(ok.map((i) => i.values.vehicle_id)); const exts = uniq(ok.map((i) => i.refs.vehicle_id_externo))
    const byId = new Set(ids.length ? (await pool.query(`SELECT id FROM vehicles WHERE id = ANY($1)`, [ids])).rows.map((r: { id: string }) => r.id) : [])
    const byExt = new Map<string, string[]>()
    if (exts.length) for (const r of (await pool.query(`SELECT id, id_externo FROM vehicles WHERE origen = $2 AND id_externo = ANY($1)`, [exts, own])).rows) byExt.set(r.id_externo, [...(byExt.get(r.id_externo) ?? []), r.id])
    for (const i of ok) {
      if (i.values.vehicle_id) { if (!byId.has(i.values.vehicle_id as string)) i.errors.push('vehicle_id: el vehículo no existe.'); continue }
      const m = byExt.get(i.refs.vehicle_id_externo as string) ?? []
      if (m.length === 1) i.values.vehicle_id = m[0]
      else i.errors.push(m.length ? 'vehicle_id_externo ambiguo: usa vehicle_id.' : 'vehicle_id_externo: no existe ese vehículo (créalo antes).')
    }
  }
  if (ent.name === 'components') {
    const dIds = uniq(ok.map((i) => i.values.diagram_id)); const eIds = uniq(ok.map((i) => i.refs.engine_id)); const eExts = uniq(ok.map((i) => i.refs.engine_id_externo))
    const dOk = new Set(dIds.length ? (await pool.query(`SELECT id FROM exhaust_diagrams WHERE id = ANY($1)`, [dIds])).rows.map((r: { id: string }) => r.id) : [])
    const eOk = new Set(eIds.length ? (await pool.query(`SELECT id FROM engines WHERE id = ANY($1)`, [eIds])).rows.map((r: { id: string }) => r.id) : [])
    const eByExt = new Map<string, string[]>()
    if (eExts.length) for (const r of (await pool.query(`SELECT id, id_externo FROM engines WHERE origen = $2 AND id_externo = ANY($1)`, [eExts, own])).rows) eByExt.set(r.id_externo, [...(eByExt.get(r.id_externo) ?? []), r.id])
    for (const i of ok) {
      if (i.values.diagram_id) { if (!dOk.has(i.values.diagram_id as string)) i.errors.push('diagram_id: el diagrama no existe.'); continue }
      if (i.refs.engine_id) { if (eOk.has(i.refs.engine_id as string)) i.refs._engine = i.refs.engine_id; else i.errors.push('engine_id: la motorización no existe.'); continue }
      const m = eByExt.get(i.refs.engine_id_externo as string) ?? []
      if (m.length === 1) i.refs._engine = m[0]
      else i.errors.push(m.length ? 'engine_id_externo ambiguo: usa engine_id.' : 'engine_id_externo: no existe esa motorización.')
    }
    const engs = uniq(ok.map((i) => i.refs._engine))
    const dByE = new Map<string, string>()
    if (engs.length) for (const r of (await pool.query(`SELECT DISTINCT ON (engine_id) id, engine_id FROM exhaust_diagrams WHERE engine_id = ANY($1) ORDER BY engine_id, created_at`, [engs])).rows) dByE.set(r.engine_id, r.id)
    for (const i of ok) {
      if (!i.values.diagram_id && i.refs._engine && dByE.has(i.refs._engine as string)) i.values.diagram_id = dByE.get(i.refs._engine as string)
      if (!i.values.name && i.values.part_type) i.values.name = PART_LABEL[i.values.part_type as string] ?? i.values.part_type
    }
  }
}

async function createBatch(req: Request, pool: Pool, ent: AE, key: Key): Promise<Res> {
  let body: unknown
  try { body = await req.json() } catch { return { status: 400, body: apiErr('bad_json', 'El cuerpo no es JSON válido.'), entity: ent.name } }
  const arr = Array.isArray(body) ? body : [body]
  if (!arr.length) return { status: 400, body: apiErr('bad_request', 'Lote vacío.'), entity: ent.name }
  if (arr.length > MAX_BATCH) return { status: 413, body: apiErr('too_large', `Máximo ${MAX_BATCH} registros por llamada.`), entity: ent.name }
  const items = arr.map((r, i) => parseItem(ent, r, i, false))
  const seen = new Map<string, number>()
  for (const it of items) if (it.id_externo) { if (seen.has(it.id_externo)) it.errors.push(`id_externo repetido en el lote (índice ${seen.get(it.id_externo)}).`); else seen.set(it.id_externo, it.index) }
  await resolveItems(pool, ent, items, `api:${key.name}`)
  // Duplicados de vehículos: misma marca + modelo + generación + año de inicio que OTRO registro.
  if (ent.name === 'vehicles') {
    const wr = items.filter((i) => !i.errors.length)
    if (wr.length) {
      const dup = (await pool.query(`SELECT v.id, lower(v.brand) AS b, lower(v.model) AS m, lower(coalesce(v.generation, '')) AS g, v.year_from AS y, v.origen, v.id_externo
        FROM vehicles v JOIN unnest($1::text[], $2::text[], $3::text[], $4::int[]) AS k(b, m, g, y)
          ON lower(v.brand) = lower(k.b) AND lower(v.model) = lower(k.m) AND lower(coalesce(v.generation, '')) = lower(coalesce(k.g, '')) AND v.year_from = k.y`,
      [wr.map((i) => i.values.brand), wr.map((i) => i.values.model), wr.map((i) => i.values.generation ?? null), wr.map((i) => i.values.year_from)])).rows as { id: string; b: string; m: string; g: string; y: number; origen: string; id_externo: string }[]
      for (const i of wr) {
        const d = dup.find((x) => x.b === String(i.values.brand).toLowerCase() && x.m === String(i.values.model).toLowerCase()
          && x.g === String(i.values.generation ?? '').toLowerCase() && x.y === i.values.year_from && !(x.origen === `api:${key.name}` && x.id_externo === i.id_externo))
        if (d) { i.dupId = d.id; i.warning = 'Ya existe ese vehículo (marca, modelo, generación y año de inicio): no se crea otro; usa su id.' }
      }
    }
  }
  // Duplicados de componentes: misma motorización (diagrama) + tramo + ref OEM de OTRO registro.
  if (ent.name === 'components') {
    const wr = items.filter((i) => !i.errors.length && i.values.diagram_id && i.values.oem_ref)
    if (wr.length) {
      const dup = (await pool.query(`SELECT p.id, p.diagram_id, p.part_type, p.oem_ref, p.origen, p.id_externo FROM exhaust_parts p
        JOIN unnest($1::uuid[], $2::text[], $3::text[]) AS k(d, t, o) ON p.diagram_id = k.d AND p.part_type = k.t AND upper(p.oem_ref) = upper(k.o)`,
      [wr.map((i) => i.values.diagram_id), wr.map((i) => i.values.part_type), wr.map((i) => i.values.oem_ref)])).rows
      for (const i of wr) {
        const d = dup.find((x: { diagram_id: string; part_type: string; oem_ref: string; origen: string; id_externo: string }) => x.diagram_id === i.values.diagram_id && x.part_type === i.values.part_type
          && String(x.oem_ref).toUpperCase() === String(i.values.oem_ref).toUpperCase() && !(x.origen === `api:${key.name}` && x.id_externo === i.id_externo))
        if (d) { i.dupId = d.id; i.warning = 'Ya existe un componente con la misma motorización, tramo y referencia OEM: no se crea otro.' }
      }
    }
  }

  const origen = `api:${key.name}`
  const results: Record<string, unknown>[] = []
  const summary = { created: 0, updated: 0, pending_changes: 0, unchanged: 0, duplicate: 0, error: 0 }
  const created: { id: string; id_externo: string }[] = []
  const client = await pool.connect()
  let lote: string | null = null
  try {
    await client.query('BEGIN')
    lote = (await client.query(`INSERT INTO ingest_batches (origen, entity, total, created_by) VALUES ($1, $2, $3, $4) RETURNING id`, [origen, ent.name, items.length, origen])).rows[0].id
    const newDiagram = new Map<string, string>()
    for (const it of items) {
      if (it.errors.length) { summary.error++; results.push({ index: it.index, id_externo: it.id_externo || null, status: 'error', errors: it.errors }); continue }
      if (it.dupId) { summary.duplicate++; results.push({ index: it.index, id_externo: it.id_externo, status: 'duplicate', id: it.dupId, warning: it.warning }); continue }
      await client.query('SAVEPOINT r')
      try {
        const values = { ...it.values }
        if (ent.name === 'components' && !values.diagram_id) {
          const eng = it.refs._engine as string
          if (!newDiagram.has(eng)) {
            const d = (await client.query(`INSERT INTO exhaust_diagrams (engine_id, status, pub_status, origen, lote_id, created_by) VALUES ($1,'submitted','pendiente_revision',$2,$3,$2) RETURNING id`, [eng, origen, lote])).rows[0].id
            newDiagram.set(eng, d)
            await audit(client, 'exhaust_diagrams', d, 'create', null, 'pendiente_revision', origen, lote, null, null)
          }
          values.diagram_id = newDiagram.get(eng)
        }
        const pc = ent.pubCol!
        const cur = (await client.query(`SELECT id, ${pc} AS st, pending_changes FROM ${ent.table} WHERE origen = $1 AND id_externo = $2 FOR UPDATE`, [origen, it.id_externo])).rows[0]
        if (!cur) {
          const cols = Object.keys(values); const vals: unknown[] = cols.map((c) => values[c])
          cols.push(pc, 'origen', 'id_externo', 'lote_id'); vals.push(ent.pending, origen, it.id_externo, lote)
          if (ent.qa) { cols.push('status', 'created_by'); vals.push('submitted', origen) }
          if (ent.ownerCol) { cols.push(ent.ownerCol); vals.push(key.profile) }
          if (ent.name === 'guides') { cols.push('is_published'); vals.push(true) }
          const id = (await client.query(`INSERT INTO ${ent.table} (${cols.map(qi).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`, vals)).rows[0].id
          await audit(client, ent.table, id, 'create', null, ent.pending, origen, lote, null, null)
          summary.created++; created.push({ id, id_externo: it.id_externo })
          results.push({ index: it.index, id_externo: it.id_externo, status: 'created', id, estado: ent.pending })
        } else if (cur.st === ent.approved) {
          // Publicado: solo se proponen las columnas que cambian de verdad (reenviar lo mismo no genera revisión).
          const full = (await client.query(`SELECT * FROM ${ent.table} WHERE id = $1`, [cur.id])).rows[0] as Record<string, unknown>
          const diff = diffValues(full, values)
          if (!Object.keys(diff).length) {
            summary.unchanged++
            results.push({ index: it.index, id_externo: it.id_externo, status: 'unchanged', id: cur.id, estado: ent.approved })
          } else {
            const merged = { ...(cur.pending_changes ?? {}), ...diff }
            await client.query(`UPDATE ${ent.table} SET pending_changes = $1, lote_id = $2 WHERE id = $3`, [JSON.stringify(merged), lote, cur.id])
            await audit(client, ent.table, cur.id, 'changes_proposed', ent.approved, ent.approved, origen, lote, null, diff)
            summary.pending_changes++
            results.push({ index: it.index, id_externo: it.id_externo, status: 'pending_changes', id: cur.id, estado: ent.approved, changed: Object.keys(diff), info: 'Ya estaba publicado: los cambios quedan pendientes de revisión.' })
          }
        } else {
          const cols = Object.keys(values)
          const vals: unknown[] = cols.map((c) => values[c])
          vals.push(ent.pending, lote, cur.id)
          await client.query(`UPDATE ${ent.table} SET ${cols.map((c, i) => `${qi(c)} = $${i + 1}`).join(', ')}${cols.length ? ',' : ''} ${pc} = $${vals.length - 2}, review_note = NULL, lote_id = $${vals.length - 1} WHERE id = $${vals.length}`, vals)
          await audit(client, ent.table, cur.id, 'update', cur.st, ent.pending, origen, lote, null, values)
          summary.updated++
          results.push({ index: it.index, id_externo: it.id_externo, status: 'updated', id: cur.id, estado: ent.pending })
        }
        await client.query('RELEASE SAVEPOINT r')
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT r')
        summary.error++
        results.push({ index: it.index, id_externo: it.id_externo, status: 'error', errors: [friendlyDbError(e)] })
      }
    }
    if (summary.created + summary.updated + summary.pending_changes === 0) await client.query(`DELETE FROM ingest_batches WHERE id = $1`, [lote])
    else {
      await client.query(`UPDATE ingest_batches SET total = $1 WHERE id = $2`, [summary.created + summary.updated + summary.pending_changes, lote])
      for (const c of created) await emitEvent(client, 'record.created', { entity: ent.name, table: ent.table, id: c.id, id_externo: c.id_externo, origen, lote_id: lote })
      await emitEvent(client, 'batch.created', { entity: ent.name, origen, lote_id: lote, ...summary })
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally { client.release() }
  const anyOk = summary.created + summary.updated + summary.pending_changes + summary.unchanged + summary.duplicate > 0
  return { status: anyOk ? 200 : 422, entity: ent.name, records: items.length,
    body: { lote_id: summary.created + summary.updated + summary.pending_changes ? lote : null, summary, results } }
}

async function patchOne(req: Request, pool: Pool, ent: AE, id: string, key: Key): Promise<Res> {
  if (!UUID_RE.test(id)) return { status: 400, body: apiErr('bad_request', 'id no válido (uuid).'), entity: ent.name }
  let body: unknown
  try { body = await req.json() } catch { return { status: 400, body: apiErr('bad_json', 'El cuerpo no es JSON válido.'), entity: ent.name } }
  if (body && typeof body === 'object' && 'id_externo' in (body as object)) return { status: 400, body: apiErr('bad_request', 'id_externo no se puede cambiar.'), entity: ent.name }
  const it = parseItem(ent, body, 0, true)
  for (const v of ent.needsOneOf ?? []) if (it.refs[v] != null) it.errors.push(`«${v}» no se puede cambiar por PATCH (usa diagram_id/vehicle_id).`)
  if (it.errors.length) return { status: 422, body: { error: { code: 'validation', message: 'Datos no válidos.', details: it.errors } }, entity: ent.name }
  if (!Object.keys(it.values).length) return { status: 400, body: apiErr('bad_request', 'Nada que cambiar.'), entity: ent.name }
  const origen = `api:${key.name}`
  const pc = ent.pubCol!
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Solo lo que esta clave puede ver: lo público, o lo pendiente/rechazado de su propio origen.
    const vals: unknown[] = [id]
    const vis = visibility(ent, 'todos', key, vals)
    const cur = (await client.query(`SELECT x.id, x.${pc} AS st, x.pending_changes FROM ${ent.table} x WHERE x.id = $1 AND ${vis} FOR UPDATE`, vals)).rows[0]
    if (!cur) { await client.query('ROLLBACK'); return { status: 404, body: apiErr('not_found', 'No existe (o no es visible para esta clave).'), entity: ent.name } }
    let result: Record<string, unknown>
    if (cur.st === ent.approved) {
      // Publicado: el cambio NO sale al público sin revisión → "cambios propuestos" (solo lo que cambia).
      const full = (await client.query(`SELECT * FROM ${ent.table} WHERE id = $1`, [id])).rows[0] as Record<string, unknown>
      const diff = diffValues(full, it.values)
      if (!Object.keys(diff).length) {
        result = { id, status: 'unchanged', estado: ent.approved }
      } else {
        const merged = { ...(cur.pending_changes ?? {}), ...diff }
        await client.query(`UPDATE ${ent.table} SET pending_changes = $1 WHERE id = $2`, [JSON.stringify(merged), id])
        await audit(client, ent.table, id, 'changes_proposed', cur.st, cur.st, origen, null, null, diff)
        result = { id, status: 'pending_changes', estado: ent.approved, changed: Object.keys(diff), info: 'Registro publicado: los cambios quedan pendientes de revisión en la Bandeja.' }
      }
    } else {
      const cols = Object.keys(it.values)
      const vals: unknown[] = cols.map((c) => it.values[c])
      vals.push(ent.pending, id)
      await client.query(`UPDATE ${ent.table} SET ${cols.map((c, i) => `${qi(c)} = $${i + 1}`).join(', ')}, ${pc} = $${vals.length - 1}, review_note = NULL WHERE id = $${vals.length}`, vals)
      await audit(client, ent.table, id, 'update', cur.st, ent.pending, origen, null, null, it.values)
      result = { id, status: 'updated', estado: ent.pending }
    }
    await client.query('COMMIT')
    return { status: 200, body: result, entity: ent.name, records: 1 }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    return { status: 422, body: apiErr('db_error', friendlyDbError(e)), entity: ent.name }
  } finally { client.release() }
}

// ───────────────────────── relaciones N:N ─────────────────────────
async function relationsRoute(req: Request, method: string, id: string | undefined, url: URL, pool: Pool, key: Key): Promise<Res> {
  const own = `api:${key.name}`
  if (method === 'GET') {
    const sp = url.searchParams
    const parts: string[] = []
    const vals: unknown[] = [own]
    for (const [type, r] of Object.entries(REL)) {
      if (sp.get('content_type') && sp.get('content_type') !== type) continue
      const conds = [`(x.pub_status = 'aprobado' OR x.origen = $1)`]
      if (sp.get('schema_id')) { if (!UUID_RE.test(sp.get('schema_id')!)) return { status: 400, body: apiErr('bad_request', 'schema_id no válido.') }; vals.push(sp.get('schema_id')); conds.push(`x.schema_id = $${vals.length}`) }
      if (sp.get('content_id')) { if (!UUID_RE.test(sp.get('content_id')!)) return { status: 400, body: apiErr('bad_request', 'content_id no válido.') }; vals.push(sp.get('content_id')); conds.push(`x.${r.col} = $${vals.length}`) }
      parts.push(`SELECT x.id, '${type}'::text AS content_type, x.schema_id, x.${r.col} AS content_id, x.scope, x.pub_status AS estado, x.origen, x.id_externo, x.created_at FROM ${r.table} x WHERE ${conds.join(' AND ')}`)
    }
    if (!parts.length) return { status: 400, body: apiErr('bad_request', 'content_type debe ser guia, manual o 3d.') }
    const rows = (await pool.query(`${parts.join(' UNION ALL ')} ORDER BY created_at DESC LIMIT 500`, vals)).rows
    return { status: 200, entity: 'relations', records: rows.length, body: { data: rows } }
  }
  if (key.scope !== 'read_write') return { status: 403, body: apiErr('forbidden', 'Esta clave es de solo lectura.'), entity: 'relations' }
  if (method === 'DELETE' && id) {
    if (!UUID_RE.test(id)) return { status: 400, body: apiErr('bad_request', 'id no válido.') }
    for (const r of Object.values(REL)) {
      const cur = (await pool.query(`SELECT id, pub_status, origen FROM ${r.table} WHERE id = $1`, [id])).rows[0]
      if (!cur) continue
      if (cur.pub_status !== 'aprobado') {
        if (cur.origen !== own) return { status: 403, body: apiErr('forbidden', 'Solo puedes borrar relaciones pendientes creadas por esta integración.'), entity: 'relations' }
        await pool.query(`DELETE FROM ${r.table} WHERE id = $1`, [id])
        await audit(pool, r.table, id, 'delete', cur.pub_status, null, own, null, null, null)
        return { status: 200, body: { id, status: 'deleted' }, entity: 'relations', records: 1 }
      }
      // Relación publicada: quitarla también pasa por revisión.
      await pool.query(`UPDATE ${r.table} SET pending_changes = '{"_delete": true}'::jsonb WHERE id = $1`, [id])
      await audit(pool, r.table, id, 'changes_proposed', 'aprobado', 'aprobado', own, null, 'Propone eliminar la relación', { _delete: true })
      return { status: 200, body: { id, status: 'pending_delete', info: 'La relación está publicada: su eliminación queda pendiente de revisión.' }, entity: 'relations', records: 1 }
    }
    return { status: 404, body: apiErr('not_found', 'No existe esa relación.'), entity: 'relations' }
  }
  if (method !== 'POST' || id) return { status: 405, body: apiErr('method_not_allowed', 'Usa GET, POST o DELETE /relations/{id}.') }
  let body: unknown
  try { body = await req.json() } catch { return { status: 400, body: apiErr('bad_json', 'El cuerpo no es JSON válido.') } }
  const arr = Array.isArray(body) ? body : [body]
  if (arr.length > MAX_BATCH) return { status: 413, body: apiErr('too_large', `Máximo ${MAX_BATCH} relaciones por llamada.`) }
  const results: Record<string, unknown>[] = []
  const client = await pool.connect()
  let lote: string | null = null
  let createdN = 0
  try {
    await client.query('BEGIN')
    lote = (await client.query(`INSERT INTO ingest_batches (origen, entity, total, created_by) VALUES ($1, 'relations', $2, $1) RETURNING id`, [own, arr.length])).rows[0].id
    for (let i = 0; i < arr.length; i++) {
      const o = (arr[i] ?? {}) as Record<string, unknown>
      const errs: string[] = []
      const ext = typeof o.id_externo === 'string' ? o.id_externo.trim() : ''
      if (!ext) errs.push('id_externo es obligatorio.')
      const type = typeof o.content_type === 'string' ? normKey(o.content_type).replace(/^diseno_3d|design_3d|archivo_3d|escaneo_3d$/, '3d').replace(/^articulo|guide|tutorial$/, 'guia') : ''
      const r = REL[type]
      if (!r) errs.push('content_type debe ser guia, manual o 3d.')
      if (typeof o.schema_id !== 'string' || !UUID_RE.test(o.schema_id)) errs.push('schema_id: uuid no válido.')
      if (typeof o.content_id !== 'string' || !UUID_RE.test(o.content_id)) errs.push('content_id: uuid no válido.')
      const scope = o.scope == null ? 'schema' : String(o.scope)
      if (!['schema', 'modelo'].includes(scope)) errs.push('scope debe ser "schema" (esa motorización) o "modelo" (todas las motorizaciones del modelo).')
      if (errs.length) { results.push({ index: i, id_externo: ext || null, status: 'error', errors: errs }); continue }
      const sOk = (await client.query(`SELECT 1 FROM exhaust_schemas WHERE id = $1`, [o.schema_id])).rows.length
      const cOk = (await client.query(`SELECT 1 FROM ${r.target} WHERE id = $1`, [o.content_id])).rows.length
      if (!sOk || !cOk) { results.push({ index: i, id_externo: ext, status: 'error', errors: [!sOk ? 'El esquema no existe.' : `No existe ese ${r.label}.`] }); continue }
      const ex = (await client.query(`SELECT id, pub_status FROM ${r.table} WHERE schema_id = $1 AND ${r.col} = $2 LIMIT 1`, [o.schema_id, o.content_id])).rows[0]
      if (ex) { results.push({ index: i, id_externo: ext, status: 'exists', id: ex.id, estado: ex.pub_status }); continue }
      const cols = ['schema_id', r.col, 'scope', 'pub_status', 'origen', 'id_externo', 'lote_id']
      const vals: unknown[] = [o.schema_id, o.content_id, scope, 'pendiente_revision', own, ext, lote]
      if (r.table === 'schema_article_links') { cols.push('kind'); vals.push('related') }
      await client.query('SAVEPOINT r')
      try {
        const newId = (await client.query(`INSERT INTO ${r.table} (${cols.join(',')}) VALUES (${cols.map((_, k) => `$${k + 1}`).join(',')}) RETURNING id`, vals)).rows[0].id
        await client.query('RELEASE SAVEPOINT r')
        await audit(client, r.table, newId, 'create', null, 'pendiente_revision', own, lote, null, null)
        await emitEvent(client, 'record.created', { entity: 'relations', table: r.table, id: newId, id_externo: ext, origen: own, lote_id: lote })
        createdN++
        results.push({ index: i, id_externo: ext, status: 'created', id: newId, estado: 'pendiente_revision' })
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT r')
        results.push({ index: i, id_externo: ext, status: 'error', errors: [friendlyDbError(e)] })
      }
    }
    if (!createdN) await client.query(`DELETE FROM ingest_batches WHERE id = $1`, [lote])
    else await client.query(`UPDATE ingest_batches SET total = $1 WHERE id = $2`, [createdN, lote])
    await client.query('COMMIT')
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e } finally { client.release() }
  return { status: 200, entity: 'relations', records: arr.length, body: { lote_id: createdN ? lote : null, results } }
}

// ───────────────────────── búsqueda / normalización ─────────────────────────
const ROMAN: Record<string, string> = { '1': 'i', '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v', '6': 'vi', '7': 'vii', '8': 'viii', '9': 'ix', '10': 'x', '11': 'xi', '12': 'xii' }
const BRAND_ALIAS: Record<string, string> = { vw: 'volkswagen', merc: 'mercedes', mb: 'mercedes', benz: 'mercedes', amg: 'mercedes', alfa: 'alfa', rr: 'rolls', mini: 'mini' }
const DIESEL_HINTS = new Set(['diesel', 'gasoil', 'tdi', 'cdi', 'hdi', 'dci', 'crdi', 'tdci', 'jtd', 'jtdm', 'bluehdi', 'tdv6', 'sd', 'xd'])
const PETROL_HINTS = new Set(['gasolina', 'petrol', 'tsi', 'tfsi', 'fsi', 'gti', 'tce', 'puretech', 'ecoboost', 'vtec', 'turbo'])
async function searchVehicles(pool: Pool, q: string, key: Key): Promise<Res> {
  // La cilindrada ("2.0", "1,6") se saca antes de normalizar para no confundirla con otros números.
  const DISP = /(?<![\d.,])(\d)[.,](\d)(?![\d.,])/g
  const disp = [...q.matchAll(DISP)].map((m) => `${m[1]}.${m[2]}`)
  const toks = [...disp, ...normKey(q.replace(DISP, ' ')).split('_').filter(Boolean).map((t) => BRAND_ALIAS[t] ?? t)]
  if (!toks.length) return { status: 400, body: apiErr('bad_request', 'Falta q (p. ej. ?q=golf 7 2.0 tdi 2015).'), entity: 'search' }
  const own = `api:${key.name}`
  const rows = (await pool.query(`SELECT v.id AS vid, v.brand, v.model, v.generation, v.year_from, v.year_to,
      e.id AS eid, e.version, e.engine_code, e.displacement_l, e.power_cv, e.fuel
    FROM vehicles v LEFT JOIN engines e ON e.vehicle_id = v.id AND (e.pub_status = 'aprobado' OR e.origen = $1)
    WHERE v.pub_status = 'aprobado' OR v.origen = $1`, [own])).rows as Record<string, any>[]
  const scored = rows.map((r) => {
    const brand = normKey(r.brand ?? '').split('_'), model = normKey(r.model ?? '').split('_'), gen = normKey(r.generation ?? '').split('_').filter(Boolean)
    const ver = normKey(r.version ?? '').split('_'), code = normKey(r.engine_code ?? '')
    const genLike = [...model, ...gen]
    let s = 0; const why: string[] = []
    for (const t of toks) {
      if (/^(19[5-9]\d|20[0-3]\d)$/.test(t)) {
        const y = Number(t)
        if (r.year_from && y >= r.year_from && (!r.year_to || y <= r.year_to)) { s += 2; why.push(`año ${y}`) } else s -= 1
        continue
      }
      if (/^\d\.\d$/.test(t)) {
        if (r.displacement_l != null && Math.abs(Number(r.displacement_l) - Number(t)) < 0.06) { s += 2; why.push(`${t} l`) }
        else if (r.displacement_l != null) s -= 1
        continue
      }
      const pw = /^(\d{2,4})(cv|hp|ps)$/.exec(t)
      if (pw || (/^\d{2,4}$/.test(t) && Number(t) >= 50)) {
        const n = Number(pw ? pw[1] : t)
        if (r.power_cv != null && Math.abs(Number(r.power_cv) - n) <= 2) { s += 2; why.push(`${n} CV`); continue }
        if (pw) continue
      }
      if (brand.includes(t)) { s += 4; why.push('marca'); continue }
      if (model.includes(t)) { s += 4; why.push('modelo'); continue }
      if (genLike.includes(t) || genLike.includes(`mk${t}`) || (ROMAN[t] && genLike.includes(ROMAN[t]))) { s += 2; why.push('generación'); continue }
      if (ver.includes(t) || code === t) { s += 1.5; why.push(t); continue }
      if (DIESEL_HINTS.has(t) || PETROL_HINTS.has(t)) {
        const want = DIESEL_HINTS.has(t) ? 'diesel' : 'gasolina'
        if (r.fuel === want) { s += 1; why.push(want) } else if (r.fuel) s -= 1
        continue
      }
      if (t.length >= 3 && (model.some((m) => m.startsWith(t)) || brand.some((b) => b.startsWith(t)))) s += 1
    }
    return { r, s, why }
  }).filter((x) => x.s > 3).sort((a, b) => b.s - a.s).slice(0, 10)
  return {
    status: 200, entity: 'search', records: scored.length,
    body: {
      query: q, data: scored.map(({ r, s, why }) => ({
        score: Math.round(s * 10) / 10, match: why,
        vehicle_id: r.vid, engine_id: r.eid,
        label: [r.brand, r.model, r.generation, r.version].filter(Boolean).join(' ') + (r.year_from ? ` (${r.year_from}–${r.year_to ?? ''})` : ''),
        vehicle: { brand: r.brand, model: r.model, generation: r.generation, year_from: r.year_from, year_to: r.year_to },
        engine: r.eid ? { version: r.version, engine_code: r.engine_code, displacement_l: r.displacement_l, power_cv: r.power_cv, fuel: r.fuel } : null,
      })),
    },
  }
}

// ───────────────────────── subidas (URL firmada a R2) ─────────────────────────
const UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf', 'model/stl', 'model/step',
  'model/obj', 'application/sla', 'application/step', 'application/vnd.ms-pki.stl', 'application/octet-stream', 'video/mp4', 'video/quicktime',
  'application/zip', 'application/x-zip-compressed'])
async function presignUpload(req: Request, url: URL, key: Key): Promise<Res> {
  let body: Record<string, unknown>
  try { body = (await req.json()) as Record<string, unknown> } catch { return { status: 400, body: apiErr('bad_json', 'JSON no válido.') } }
  const filename = String(body.filename ?? '').slice(0, 120)
  const contentType = String(body.content_type ?? 'application/octet-stream').slice(0, 100).toLowerCase()
  const kind = String(body.kind ?? 'photo')
  if (!filename) return { status: 400, body: apiErr('bad_request', 'filename es obligatorio.') }
  // Solo fotos, PDF, 3D, vídeo y comprimidos: nada que el navegador pueda ejecutar (html, svg, js…).
  if (!UPLOAD_TYPES.has(contentType)) return { status: 400, body: apiErr('bad_request', `content_type no permitido. Usa uno de: ${[...UPLOAD_TYPES].join(', ')}`) }
  const bucket = kind === 'photo' ? 'content-media' : 'tutorial-files'
  if (!['photo', 'manual', '3d'].includes(kind)) return { status: 400, body: apiErr('bad_request', 'kind debe ser photo, manual o 3d.') }
  const ACCOUNT_ID = process.env.R2_ACCOUNT_ID, AK = process.env.R2_ACCESS_KEY_ID, SK = process.env.R2_SECRET_ACCESS_KEY
  if (!ACCOUNT_ID || !AK || !SK) return { status: 500, body: apiErr('internal', 'Almacenamiento no configurado.') }
  const s3 = new S3Client({ region: 'auto', endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: AK, secretAccessKey: SK } })
  const clean = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9.-]+/g, '-').replace(/-+/g, '-').toLowerCase()
  const keyPath = `${bucket}/api-${key.name}/${randomBytes(6).toString('hex')}-${clean(filename)}`
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: process.env.R2_BUCKET ?? 'exhaustmarket-media', Key: keyPath, ContentType: contentType, CacheControl: 'public, max-age=31536000' }), { expiresIn: 3600 })
  return { status: 200, entity: 'uploads', records: 1, body: { upload_url: uploadUrl, method: 'PUT', headers: { 'content-type': contentType }, public_url: `${url.origin}/api/img/${keyPath}`, expires_in: 3600 } }
}

// ───────────────────────── admin (token de Clerk) ─────────────────────────
async function adminRoute(req: Request, method: string, seg: string[], url: URL, pool: Pool): Promise<{ status: number; body: unknown }> {
  const admin = await getAdmin(req, pool)
  if (!admin) return { status: 403, body: apiErr('forbidden', 'Solo administradores.') }
  const [s0, s1, s2] = seg
  if (s0 === 'keys') {
    if (method === 'GET') {
      const rows = (await pool.query(`SELECT k.id, k.name, k.key_prefix, k.scope, k.created_by, k.created_at, k.revoked_at, k.last_used_at,
        (SELECT count(*)::int FROM api_call_log l WHERE l.key_id = k.id AND l.created_at > now() - interval '24 hours') AS calls_24h,
        (SELECT count(*)::int FROM api_call_log l WHERE l.key_id = k.id AND l.status >= 400 AND l.created_at > now() - interval '24 hours') AS errors_24h
        FROM api_keys k ORDER BY k.revoked_at NULLS FIRST, k.created_at DESC`)).rows
      return { status: 200, body: { items: rows } }
    }
    if (method === 'POST' && !s1) {
      const b = (await req.json().catch(() => ({}))) as { name?: string; scope?: string }
      const name = normKey(String(b.name ?? '')).replace(/_/g, '-').slice(0, 40)
      if (!/^[a-z0-9][a-z0-9_-]{1,40}$/.test(name)) return { status: 400, body: apiErr('bad_request', 'Nombre no válido (minúsculas, números y guiones; p. ej. "verificacion-oem").') }
      const scope = b.scope === 'read_write' ? 'read_write' : 'read'
      const exists = (await pool.query(`SELECT 1 FROM api_keys WHERE name = $1 AND revoked_at IS NULL`, [name])).rows.length
      if (exists) return { status: 409, body: apiErr('conflict', 'Ya hay una clave activa con ese nombre: revócala antes o usa otro.') }
      const plain = `emk_${randomBytes(24).toString('hex')}`
      const row = (await pool.query(`INSERT INTO api_keys (name, key_prefix, key_hash, scope, created_by, created_by_profile) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, key_prefix, scope, created_at`,
        [name, plain.slice(0, 12), sha256(plain), scope, admin.label, admin.profileId])).rows[0]
      return { status: 201, body: { ...row, key: plain, warning: 'Guarda esta clave ahora: no se volverá a mostrar.' } }
    }
    if (method === 'POST' && s1 && s2 === 'revoke') {
      if (!UUID_RE.test(s1)) return { status: 400, body: apiErr('bad_request', 'id no válido.') }
      await pool.query(`UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [s1])
      return { status: 200, body: { ok: true } }
    }
  }
  if (s0 === 'logs' && method === 'GET') {
    const kid = url.searchParams.get('key_id')
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 100) || 100, 500)
    const rows = kid && UUID_RE.test(kid)
      ? (await pool.query(`SELECT l.*, k.name AS key_name FROM api_call_log l LEFT JOIN api_keys k ON k.id = l.key_id WHERE l.key_id = $1 ORDER BY l.created_at DESC LIMIT $2`, [kid, limit])).rows
      : (await pool.query(`SELECT l.*, k.name AS key_name FROM api_call_log l LEFT JOIN api_keys k ON k.id = l.key_id ORDER BY l.created_at DESC LIMIT $1`, [limit])).rows
    return { status: 200, body: { items: rows } }
  }
  if (s0 === 'webhooks') {
    if (method === 'GET') {
      const rows = (await pool.query(`SELECT id, name, url, events, active, created_by, created_at, last_delivery_at, last_status,
        (SELECT count(*)::int FROM webhook_deliveries d WHERE d.webhook_id = w.id AND d.status = 'pending') AS pending,
        (SELECT count(*)::int FROM webhook_deliveries d WHERE d.webhook_id = w.id AND d.status = 'failed') AS failed
        FROM webhooks w ORDER BY created_at DESC`)).rows
      return { status: 200, body: { items: rows, events: EVENTS } }
    }
    if (method === 'POST' && !s1) {
      const b = (await req.json().catch(() => ({}))) as { name?: string; url?: string; events?: string[] }
      const target = String(b.url ?? '').trim()
      if (!isSafeWebhookUrl(target)) return { status: 400, body: apiErr('bad_request', 'URL no válida (https pública).') }
      const events = Array.isArray(b.events) ? b.events.filter((e) => EVENTS.includes(e)) : []
      const secret = `whsec_${randomBytes(24).toString('hex')}`
      const row = (await pool.query(`INSERT INTO webhooks (name, url, secret, events, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, url, events, active, created_at`,
        [String(b.name ?? 'webhook').slice(0, 60), target, secret, events, admin.label])).rows[0]
      return { status: 201, body: { ...row, secret, warning: 'Guarda el secreto: sirve para verificar la firma y no se volverá a mostrar.' } }
    }
    if (s1 && UUID_RE.test(s1)) {
      if (method === 'PATCH') {
        const b = (await req.json().catch(() => ({}))) as { active?: boolean; events?: string[]; url?: string; name?: string }
        if (b.url != null && !isSafeWebhookUrl(String(b.url))) return { status: 400, body: apiErr('bad_request', 'URL no válida.') }
        await pool.query(`UPDATE webhooks SET active = COALESCE($1, active), events = COALESCE($2, events), url = COALESCE($3, url), name = COALESCE($4, name) WHERE id = $5`,
          [typeof b.active === 'boolean' ? b.active : null, Array.isArray(b.events) ? b.events.filter((e) => EVENTS.includes(e)) : null, b.url ?? null, b.name ?? null, s1])
        return { status: 200, body: { ok: true } }
      }
      if (method === 'DELETE') { await pool.query(`DELETE FROM webhooks WHERE id = $1`, [s1]); return { status: 200, body: { ok: true } } }
      if (method === 'POST' && s2 === 'test') {
        const h = (await pool.query(`SELECT id FROM webhooks WHERE id = $1`, [s1])).rows[0]
        if (!h) return { status: 404, body: apiErr('not_found', 'No existe.') }
        const payload = { event: 'test.ping', occurred_at: new Date().toISOString(), data: { message: 'Prueba de webhook de ExhaustMarket', by: admin.label } }
        await pool.query(`INSERT INTO webhook_deliveries (webhook_id, event, payload) VALUES ($1, 'test.ping', $2)`, [s1, JSON.stringify(payload)])
        const r = await dispatchWebhooks(pool)
        return { status: 200, body: { ok: true, dispatch: r } }
      }
    }
  }
  if (s0 === 'deliveries' && method === 'GET') {
    const wid = url.searchParams.get('webhook_id')
    const rows = wid && UUID_RE.test(wid)
      ? (await pool.query(`SELECT id, webhook_id, event, status, attempts, next_attempt_at, last_response_code, last_error, created_at, delivered_at FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT 100`, [wid])).rows
      : (await pool.query(`SELECT id, webhook_id, event, status, attempts, next_attempt_at, last_response_code, last_error, created_at, delivered_at FROM webhook_deliveries ORDER BY created_at DESC LIMIT 100`)).rows
    return { status: 200, body: { items: rows } }
  }
  return { status: 404, body: apiErr('not_found', 'Ruta de administración desconocida.') }
}

function isSafeWebhookUrl(u: string): boolean {
  try {
    const p = new URL(u)
    if (p.protocol !== 'https:' && p.protocol !== 'http:') return false
    const h = p.hostname.toLowerCase()
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === '::1' || h.startsWith('[')) return false
    return true
  } catch { return false }
}

// ───────────────────────── webhooks: encolar y entregar ─────────────────────────
type Q = { query: (s: string, p?: unknown[]) => Promise<{ rows: any[] }> }
async function emitEvent(db: Q, event: string, data: Record<string, unknown>) {
  const hooks = (await db.query(`SELECT id, events FROM webhooks WHERE active = true`)).rows as { id: string; events: string[] }[]
  const payload = JSON.stringify({ event, occurred_at: new Date().toISOString(), data })
  for (const h of hooks) {
    if (h.events?.length && !h.events.includes(event)) continue
    await db.query(`INSERT INTO webhook_deliveries (webhook_id, event, payload) VALUES ($1, $2, $3)`, [h.id, event, payload])
  }
}

async function dispatchWebhooks(pool: Pool) {
  // Reclama (lease 5 min) hasta 50 entregas vencidas; SKIP LOCKED evita entregas dobles si
  // coinciden dos ejecuciones del cron.
  const due = (await pool.query(`UPDATE webhook_deliveries SET next_attempt_at = now() + interval '5 minutes'
    WHERE id IN (SELECT id FROM webhook_deliveries WHERE status = 'pending' AND next_attempt_at <= now() ORDER BY next_attempt_at LIMIT 50 FOR UPDATE SKIP LOCKED)
    RETURNING id, webhook_id, event, payload, attempts`)).rows as { id: string; webhook_id: string; event: string; payload: unknown; attempts: number }[]
  if (!due.length) return { processed: 0 }
  const hooks = new Map(((await pool.query(`SELECT id, url, secret, active FROM webhooks WHERE id = ANY($1)`, [[...new Set(due.map((d) => d.webhook_id))]])).rows as { id: string; url: string; secret: string; active: boolean }[]).map((h) => [h.id, h]))
  let delivered = 0
  await Promise.all(due.map(async (d) => {
    const h = hooks.get(d.webhook_id)
    const attempts = d.attempts + 1
    if (!h || !h.active) {
      await pool.query(`UPDATE webhook_deliveries SET status = 'failed', attempts = $1, last_error = 'webhook inactivo o borrado' WHERE id = $2`, [attempts, d.id])
      return
    }
    const body = typeof d.payload === 'string' ? d.payload : JSON.stringify(d.payload)
    const ts = Math.floor(Date.now() / 1000).toString()
    const sig = createHmac('sha256', h.secret).update(`${ts}.${body}`).digest('hex')
    let code = 0, err: string | null = null
    try {
      const r = await fetch(h.url, {
        method: 'POST', body, signal: AbortSignal.timeout(8000),
        headers: { 'content-type': 'application/json', 'user-agent': 'ExhaustMarket-Webhooks/1.0', 'x-exhaustmarket-event': d.event, 'x-exhaustmarket-delivery': d.id, 'x-exhaustmarket-timestamp': ts, 'x-exhaustmarket-signature': `sha256=${sig}` },
      })
      code = r.status
      if (!r.ok) err = `HTTP ${r.status}`
    } catch (e) { err = (e as Error).message.slice(0, 300) }
    if (!err) {
      delivered++
      await pool.query(`UPDATE webhook_deliveries SET status = 'delivered', attempts = $1, last_response_code = $2, last_error = NULL, delivered_at = now() WHERE id = $3`, [attempts, code, d.id])
    } else if (attempts >= 8) {
      await pool.query(`UPDATE webhook_deliveries SET status = 'failed', attempts = $1, last_response_code = $2, last_error = $3 WHERE id = $4`, [attempts, code || null, err, d.id])
    } else {
      // Reintento con espera creciente: 1, 2, 4, 8, 16, 32, 64 min.
      await pool.query(`UPDATE webhook_deliveries SET attempts = $1, last_response_code = $2, last_error = $3, next_attempt_at = now() + ($4 || ' minutes')::interval WHERE id = $5`,
        [attempts, code || null, err, String(2 ** (attempts - 1)), d.id])
    }
    await pool.query(`UPDATE webhooks SET last_delivery_at = now(), last_status = $1 WHERE id = $2`, [code || null, h.id])
  }))
  return { processed: due.length, delivered }
}

// ───────────────────────── utilidades ─────────────────────────
async function authKey(req: Request, pool: Pool): Promise<Key | null> {
  const h = req.headers.get('authorization') ?? ''
  const m = /^Bearer\s+(emk_[0-9a-f]{48})$/i.exec(h.trim())
  if (!m) return null
  const r = (await pool.query(`SELECT id, name, scope, created_by_profile FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`, [sha256(m[1])])).rows[0]
  return r ? { id: r.id, name: r.name, scope: r.scope, profile: r.created_by_profile } : null
}
async function rateBump(pool: Pool, keyId: string): Promise<boolean> {
  try {
    const r = (await pool.query(`INSERT INTO rate_limits (bucket, reqs, rows, reset_at) VALUES ($1, 1, 0, now() + interval '1 hour')
      ON CONFLICT (bucket) DO UPDATE SET reqs = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.reqs + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at < now() THEN now() + interval '1 hour' ELSE rate_limits.reset_at END
      RETURNING reqs`, [`key:${keyId}`])).rows[0]
    return !!r && r.reqs > RATE_PER_HOUR
  } catch { return false }
}
async function getAdmin(req: Request, pool: Pool): Promise<{ profileId: string; label: string } | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ') || header.includes('emk_')) return null
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return null
  try {
    const payload = (await verifyToken(header.slice(7), { secretKey: secret })) as { sub: string }
    const r = (await pool.query(`SELECT id, is_admin, email, full_name FROM public.user_profiles WHERE clerk_user_id = $1 LIMIT 1`, [payload.sub])).rows[0]
    if (!r?.is_admin) return null
    return { profileId: r.id, label: `admin:${r.email || r.full_name || r.id}` }
  } catch { return null }
}
async function audit(db: Q, table: string, id: string, action: string, prev: string | null, next: string | null, actor: string, lote: string | null, note: string | null, changes: unknown) {
  await db.query(`INSERT INTO review_audit (table_name, record_id, action, prev_status, new_status, actor_label, lote_id, note, changes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [table, id, action, prev, next, actor, lote, note, changes == null ? null : JSON.stringify(changes)])
}
function friendlyDbError(e: unknown): string {
  const m = (e as { message?: string; code?: string; detail?: string })
  if (m.code === '23505') return `Duplicado: ${m.detail ?? 'ya existe un registro con esos datos únicos.'}`
  if (m.code === '23503') return 'Referencia a un registro que no existe.'
  if (m.code === '23514') return `Valor no permitido (${m.message ?? ''}).`
  return m.message ?? 'Error de base de datos'
}
/** Columnas de `next` cuyo valor difiere del registro actual (numeric de PG llega como texto). */
function diffValues(cur: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(next)) if (!sameValue(cur[k], v)) out[k] = v
  return out
}
function sameValue(cur: unknown, next: unknown): boolean {
  const empty = (x: unknown) => x == null || x === '' || (Array.isArray(x) && x.length === 0)
  if (empty(cur) && empty(next)) return true
  if (Array.isArray(cur) || Array.isArray(next)) return JSON.stringify(cur ?? []) === JSON.stringify(next ?? [])
  if (typeof next === 'number' || typeof cur === 'number') return Number(cur) === Number(next)
  if (typeof next === 'boolean' || typeof cur === 'boolean') return String(cur) === String(next)
  if (cur && typeof cur === 'object') return JSON.stringify(cur) === (typeof next === 'string' ? next : JSON.stringify(next))
  return String(cur) === String(next)
}
function sha256(s: string): string { return createHash('sha256').update(s).digest('hex') }
function qi(name: string): string { if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`bad identifier ${name}`); return `"${name}"` }
function apiErr(code: string, message: string) { return { error: { code, message } } }
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}

// ───────────────────────── documentación ─────────────────────────
function indexDoc(origin: string) {
  return {
    name: 'ExhaustMarket API', version: '1.0',
    docs: `${origin}/api/v1/openapi.json`,
    auth: 'Authorization: Bearer emk_… (clave por integración, se crea en el admin → API y webhooks)',
    rules: ['Todo lo que entra por la API nace pendiente_revision y no es público hasta que se aprueba en la Bandeja de revisión.',
      'Idempotencia: cada registro lleva id_externo (único por integración). Reenviarlo no duplica: actualiza o propone cambios.',
      'Cada registro guarda su origen = api:<nombre de la clave>.'],
    limits: { max_batch: MAX_BATCH, requests_per_hour_per_key: RATE_PER_HOUR, max_request_body: '≈4.5 MB (los archivos van por /uploads, directos a R2)', max_request_time_s: 60, max_file_upload: '≈2 GB por archivo vía URL firmada' },
    entities: Object.values(ENT).map((e) => ({ name: e.name, label: e.label, writable: e.writable })).concat([{ name: 'relations', label: 'Relaciones contenido ↔ esquema', writable: true }]),
  }
}

function openapi(origin: string) {
  const typeOf = (f: AF): Record<string, unknown> => {
    const base: Record<string, Record<string, unknown>> = {
      text: { type: 'string' }, int: { type: 'integer' }, num: { type: 'number' }, bool: { type: 'boolean' }, uuid: { type: 'string', format: 'uuid' },
      url: { type: 'string', format: 'uri' }, urls: { type: 'array', items: { type: 'string', format: 'uri' } }, texts: { type: 'array', items: { type: 'string' } },
      json: { type: 'array', items: { type: 'object' } }, enum: { type: 'string', enum: f.values ?? [] },
    }
    return { ...base[f.type], description: f.desc + (f.syn ? ` (acepta sinónimos: ${Object.keys(f.syn).slice(0, 8).join(', ')}…)` : '') }
  }
  const schemas: Record<string, unknown> = {
    Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
    BatchResult: { type: 'object', properties: { lote_id: { type: 'string', format: 'uuid', nullable: true }, summary: { type: 'object' }, results: { type: 'array', items: { type: 'object', properties: { index: { type: 'integer' }, id_externo: { type: 'string' }, status: { type: 'string', enum: ['created', 'updated', 'pending_changes', 'unchanged', 'duplicate', 'exists', 'error'] }, id: { type: 'string', format: 'uuid' }, errors: { type: 'array', items: { type: 'string' } } } } } } },
  }
  const paths: Record<string, unknown> = {}
  const listParams = (e: AE) => [
    ...Object.keys(e.filters).map((p) => ({ name: p, in: 'query', schema: { type: 'string' } })),
    { name: 'estado', in: 'query', schema: { type: 'string', enum: ['aprobado', 'pendiente_revision', 'rechazado', 'todos'] }, description: 'Por defecto solo aprobado. Lo pendiente/rechazado solo de tu propia integración.' },
    { name: 'origen', in: 'query', schema: { type: 'string' } }, { name: 'updated_since', in: 'query', schema: { type: 'string', format: 'date-time' } },
    { name: 'limit', in: 'query', schema: { type: 'integer', maximum: MAX_BATCH, default: 50 } }, { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
  ]
  for (const e of Object.values(ENT)) {
    if (e.fields.length) schemas[`${e.name}_in`] = { type: 'object', required: ['id_externo', ...e.fields.filter((f) => f.req).map((f) => f.col)],
      properties: { id_externo: { type: 'string', description: 'Id único en tu sistema (idempotencia)' }, ...Object.fromEntries(e.fields.map((f) => [f.col, typeOf(f)])) } }
    paths[`/${e.name}`] = {
      get: { summary: `Listar ${e.label.toLowerCase()}s`, parameters: listParams(e), responses: { 200: { description: 'OK' } } },
      ...(e.writable ? { post: { summary: `Crear o actualizar ${e.label.toLowerCase()} (1 o lote ≤${MAX_BATCH}). Nace pendiente_revision.`,
        requestBody: { content: { 'application/json': { schema: { oneOf: [{ $ref: `#/components/schemas/${e.name}_in` }, { type: 'array', maxItems: MAX_BATCH, items: { $ref: `#/components/schemas/${e.name}_in` } }] } } } },
        responses: { 200: { description: 'Resultado por registro', content: { 'application/json': { schema: { $ref: '#/components/schemas/BatchResult' } } } } } } } : {}),
    }
    paths[`/${e.name}/{id}`] = {
      get: { summary: `${e.label} por id`, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'OK' }, 404: { description: 'No existe' } } },
      ...(e.writable ? { patch: { summary: 'Cambio parcial. Si está publicado, queda como "cambios propuestos" hasta revisarlo.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'updated | pending_changes' } } } } : {}),
    }
  }
  paths['/relations'] = {
    get: { summary: 'Listar relaciones contenido ↔ esquema', parameters: ['schema_id', 'content_type', 'content_id'].map((n) => ({ name: n, in: 'query', schema: { type: 'string' } })), responses: { 200: { description: 'OK' } } },
    post: { summary: 'Crear relaciones (1 o lote). scope="modelo" = todas las motorizaciones del modelo.', requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['id_externo', 'schema_id', 'content_type', 'content_id'],
      properties: { id_externo: { type: 'string' }, schema_id: { type: 'string', format: 'uuid' }, content_type: { type: 'string', enum: ['guia', 'manual', '3d'] }, content_id: { type: 'string', format: 'uuid' }, scope: { type: 'string', enum: ['schema', 'modelo'], default: 'schema' } } } } } }, responses: { 200: { description: 'Resultado por relación' } } },
  }
  paths['/relations/{id}'] = { delete: { summary: 'Quitar una relación (si está publicada, la eliminación pasa por revisión)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'deleted | pending_delete' } } } }
  paths['/search/vehicles'] = { get: { summary: 'Búsqueda/normalización de vehículo y motorización por texto', parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' }, example: 'golf 7 2.0 tdi 2015' }], responses: { 200: { description: 'Candidatos con vehicle_id/engine_id y puntuación' } } } }
  paths['/uploads'] = { post: { summary: 'URL firmada para subir un archivo (foto, manual o 3D) directo a R2', requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['filename'], properties: { filename: { type: 'string' }, content_type: { type: 'string' }, kind: { type: 'string', enum: ['photo', 'manual', '3d'] } } } } } }, responses: { 200: { description: 'upload_url (PUT) + public_url' } } } }
  return {
    openapi: '3.0.3',
    info: { title: 'ExhaustMarket API', version: '1.0', description: 'API de datos. Todo lo creado o modificado por API nace pendiente_revision y no es público hasta aprobarse en la Bandeja de revisión del admin. Idempotencia por id_externo; trazabilidad origen = api:<clave>. Webhooks: firma HMAC-SHA256 en x-exhaustmarket-signature = sha256=hex(HMAC(secreto, timestamp + "." + cuerpo)), con x-exhaustmarket-timestamp.' },
    servers: [{ url: `${origin}/api/v1` }],
    components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'emk_…' } }, schemas },
    security: [{ bearer: [] }],
    paths,
  }
}
