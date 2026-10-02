import { Pool } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

/**
 * /api/csv — Importación y exportación de datos (Solicitud nº3, punto 3). Self-contained.
 *
 * IMPORTACIÓN (admin):
 *   GET  ?op=schema&entity=E          → definición de columnas (para documentar la plantilla)
 *   GET  ?op=template&entity=E        → plantilla CSV descargable (cabecera + fila de ejemplo)
 *   POST ?op=validate&entity=E  {rows} → validación previa: errores/avisos POR FILA, sin escribir
 *   POST ?op=commit&entity=E    {rows} → si no hay errores, TODO entra 'pendiente_revision' en un
 *                                         lote_id aprobable en bloque. Si hay 1 error → no importa nada.
 *   Idempotencia: (origen='importacion', id_externo). Reimportar el mismo id_externo no duplica:
 *   si estaba pendiente se actualiza; si ya estaba publicado, los cambios quedan como "cambios
 *   propuestos" (pending_changes) hasta aprobarlos en la Bandeja.
 *   Entidades: vehicles · engines (motorizaciones) · components (componentes OEM) · relations.
 *
 * EXPORTACIÓN:
 *   GET  ?table=T&format=csv|json      → descarga directa (admin) — ruta antigua, se mantiene
 *   POST ?op=export_now                → genera una exportación completa ahora (admin)
 *   GET  ?op=exports                   → lista de exportaciones guardadas (admin)
 *   GET  ?op=download_export&id=&entity= → descarga un fichero guardado (admin)
 *   GET  ?op=cron_export               → exportación NOCTURNA completa (Vercel Cron). Idempotente
 *                                         por día: llamarla de más no hace nada.
 * Las exportaciones se guardan en R2 bajo una ruta aleatoria NO adivinable y solo se descargan por
 * aquí (admin); /api/img no las sirve.
 *
 * RUTA ANTIGUA de importación (POST ?table=vehicles&conflict=internal_id, cuerpo CSV) → pasa por
 * la misma validación y nace pendiente (internal_id hace de id_externo si no viene).
 */

// ───────────────────────── definición de entidades importables ─────────────────────────
type FT = 'text' | 'int' | 'num' | 'bool' | 'uuid' | 'url' | 'enum' | 'urls'
interface F {
  col: string; type: FT; req?: boolean; values?: string[]; syn?: Record<string, string>
  aliases?: string[]; help: string; example: string; virtual?: boolean; def?: unknown
}
interface ImportEntity { key: string; table: string; label: string; qa: boolean; fields: F[]; needsOneOf?: string[] }

const PART_TYPES = ['colector', 'downpipe', 'catalizador', 'dpf', 'gpf', 'flexible', 'tubo_intermedio', 'resonador',
  'silenciador_central', 'silenciador_trasero', 'silenciador', 'valvula', 'tip', 'x-pipe', 'h-pipe', 'turbo', 'tubo', 'otro']
const PART_SYN: Record<string, string> = {
  colas: 'tip', cola: 'tip', salidas: 'tip', salida: 'tip', puntas: 'tip', tips: 'tip',
  fap: 'dpf', fap_dpf: 'dpf', fap_dpf_gpf: 'dpf', filtro_de_particulas: 'dpf', opf: 'gpf',
  silencioso: 'silenciador', silencioso_trasero: 'silenciador_trasero', silencioso_central: 'silenciador_central',
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
const BODY_SYN: Record<string, string> = { berlina: 'sedan', compacto: 'hatchback', familiar: 'station_wagon', ranchera: 'station_wagon', cabrio: 'convertible', descapotable: 'convertible', monovolumen: 'van', furgoneta: 'van', todoterreno: 'suv', 'pick_up': 'pickup' }
const YES = new Set(['si', 'true', '1', 'x', 'yes', 'y', 's'])
const NO = new Set(['no', 'false', '0', 'n'])

export const ENTITIES: Record<string, ImportEntity> = {
  vehicles: {
    key: 'vehicles', table: 'vehicles', label: 'Vehículos', qa: true,
    fields: [
      { col: 'id_externo', type: 'text', req: true, aliases: ['id_ext', 'external_id', 'idexterno'], help: 'Identificador único en tu sistema. Reimportar el mismo id_externo no duplica.', example: 'VW-GOLF7-2013' },
      { col: 'brand', type: 'text', req: true, aliases: ['marca'], help: 'Marca', example: 'Volkswagen' },
      { col: 'model', type: 'text', req: true, aliases: ['modelo'], help: 'Modelo', example: 'Golf' },
      { col: 'generation', type: 'text', aliases: ['generacion', 'chasis', 'chassis'], help: 'Generación / chasis', example: 'VII (5G)' },
      { col: 'year_from', type: 'int', req: true, aliases: ['ano_desde', 'anio_desde', 'desde', 'year_start', 'ano_inicio'], help: 'Año de inicio', example: '2013' },
      { col: 'year_to', type: 'int', aliases: ['ano_hasta', 'anio_hasta', 'hasta', 'year_end', 'ano_fin'], help: 'Año de fin (vacío = sigue a la venta)', example: '2020' },
      { col: 'body', type: 'enum', values: BODY, syn: BODY_SYN, aliases: ['carroceria'], help: `Carrocería: ${BODY.join(', ')}`, example: 'hatchback' },
      { col: 'doors', type: 'int', aliases: ['puertas'], help: 'Nº de puertas', example: '5' },
      { col: 'internal_id', type: 'text', aliases: ['id_interno'], help: 'Id interno del catálogo (opcional)', example: '' },
      { col: 'notes', type: 'text', aliases: ['notas'], help: 'Notas', example: '' },
    ],
  },
  engines: {
    key: 'engines', table: 'engines', label: 'Motorizaciones', qa: true,
    needsOneOf: ['vehicle_id', 'vehicle_id_externo', 'vehicle_internal_id'],
    fields: [
      { col: 'id_externo', type: 'text', req: true, aliases: ['id_ext', 'external_id'], help: 'Identificador único en tu sistema.', example: 'VW-GOLF7-20TDI-150' },
      { col: 'vehicle_id', type: 'uuid', aliases: ['vehiculo_id'], help: 'Vehículo (id de ExhaustMarket). O usa vehicle_id_externo / vehicle_internal_id.', example: '' },
      { col: 'vehicle_id_externo', type: 'text', virtual: true, aliases: ['vehiculo_id_externo'], help: 'id_externo del vehículo (importado antes)', example: 'VW-GOLF7-2013' },
      { col: 'vehicle_internal_id', type: 'text', virtual: true, aliases: ['vehiculo_id_interno'], help: 'internal_id del vehículo', example: '' },
      { col: 'version', type: 'text', req: true, aliases: ['motorizacion', 'version_motor'], help: 'Versión / motorización', example: '2.0 TDI 150 CV' },
      { col: 'engine_code', type: 'text', aliases: ['codigo_motor', 'codigo'], help: 'Código de motor', example: 'CRBC' },
      { col: 'fuel', type: 'enum', req: true, values: FUEL, syn: FUEL_SYN, aliases: ['combustible'], help: `Combustible: ${FUEL.join(', ')}`, example: 'diesel' },
      { col: 'displacement_l', type: 'num', aliases: ['cilindrada_l', 'cilindrada'], help: 'Cilindrada (litros)', example: '2.0' },
      { col: 'power_cv', type: 'int', aliases: ['potencia_cv', 'cv'], help: 'Potencia (CV)', example: '150' },
      { col: 'power_kw', type: 'int', aliases: ['potencia_kw', 'kw'], help: 'Potencia (kW)', example: '110' },
      { col: 'emissions', type: 'text', aliases: ['norma_euro', 'normativa', 'emisiones'], help: 'Norma Euro', example: 'Euro 6' },
      { col: 'drive', type: 'text', aliases: ['traccion'], help: 'Tracción', example: 'delantera' },
      { col: 'gearbox', type: 'text', aliases: ['cambio', 'caja'], help: 'Cambio', example: 'manual 6v' },
      { col: 'internal_id', type: 'text', aliases: ['id_interno'], help: 'Id interno (opcional)', example: '' },
    ],
  },
  components: {
    key: 'components', table: 'exhaust_parts', label: 'Componentes OEM', qa: true,
    needsOneOf: ['diagram_id', 'engine_id', 'engine_id_externo'],
    fields: [
      { col: 'id_externo', type: 'text', req: true, aliases: ['id_ext', 'external_id'], help: 'Identificador único en tu sistema.', example: 'OEM-5G0253059' },
      { col: 'engine_id', type: 'uuid', virtual: true, aliases: ['motorizacion_id'], help: 'Motorización (id de ExhaustMarket). O usa engine_id_externo / diagram_id.', example: '' },
      { col: 'engine_id_externo', type: 'text', virtual: true, aliases: ['motorizacion_id_externo'], help: 'id_externo de la motorización', example: 'VW-GOLF7-20TDI-150' },
      { col: 'diagram_id', type: 'uuid', aliases: ['diagrama_id'], help: 'Diagrama concreto (opcional)', example: '' },
      { col: 'part_type', type: 'enum', req: true, values: PART_TYPES, syn: PART_SYN, aliases: ['tramo', 'tipo', 'tipo_componente', 'tipo_de_pieza'],
        help: 'Tramo (lista cerrada): colector, downpipe, catalizador, FAP/DPF, GPF, flexible, tubo intermedio, resonador, silencioso central/trasero, válvula, colas, otro…', example: 'silenciador_trasero' },
      { col: 'name', type: 'text', aliases: ['nombre'], help: 'Nombre (vacío = el del tramo)', example: 'Silenciador trasero' },
      { col: 'oem_ref', type: 'text', aliases: ['referencia_oem', 'ref_oem', 'referencia'], help: 'Referencia OEM', example: '5G0253609' },
      { col: 'oem_not_found', type: 'bool', aliases: ['oem_no_encontrada'], help: 'sí/no — la referencia OEM no se encontró', example: 'no' },
      { col: 'variant', type: 'text', aliases: ['condicion', 'variante', 'condicion_variante'], help: 'Condición / variante (norma, cambio, fechas…)', example: 'hasta 11/2016, DSG' },
      { col: 'source_url', type: 'url', aliases: ['fuente_1', 'fuente1', 'url_fuente_1'], help: 'Fuente 1 (URL del catálogo oficial)', example: 'https://parts.vw.com/…' },
      { col: 'source_url_2', type: 'url', aliases: ['fuente_2', 'fuente2', 'url_fuente_2'], help: 'Fuente 2 (URL) — sin ella el dato queda como candidato', example: '' },
      { col: 'confidence', type: 'enum', values: ['alta', 'media', 'baja'], aliases: ['confianza'], help: 'Confianza: alta, media, baja', example: 'alta', def: 'media' },
      { col: 'verification_status', type: 'enum', values: ['candidato', 'verificado', 'descatalogado'], aliases: ['estado_verificacion', 'verificacion'], help: 'Estado de verificación: candidato, verificado, descatalogado', example: 'candidato', def: 'candidato' },
      { col: 'position_number', type: 'int', aliases: ['posicion', 'numero'], help: 'Nº de posición en el diagrama', example: '5' },
      { col: 'description', type: 'text', aliases: ['descripcion'], help: 'Descripción', example: '' },
      { col: 'material', type: 'text', help: 'Material', example: 'Acero inox 409' },
      { col: 'diameter_mm', type: 'num', aliases: ['diametro_mm', 'diametro'], help: 'Diámetro (mm)', example: '63.5' },
      { col: 'thickness_mm', type: 'num', aliases: ['espesor_mm', 'espesor'], help: 'Espesor (mm)', example: '1.5' },
      { col: 'homologation', type: 'text', aliases: ['homologacion'], help: 'Homologación', example: '' },
      { col: 'has_sensor', type: 'bool', aliases: ['sensor', 'lleva_sensor'], help: 'sí/no — lleva sonda/sensor', example: 'no' },
      { col: 'images', type: 'urls', aliases: ['fotos', 'imagenes'], help: 'URLs de fotos separadas por |', example: '' },
      { col: 'notes', type: 'text', aliases: ['notas'], help: 'Notas', example: '' },
    ],
  },
  relations: {
    key: 'relations', table: 'schema_manual_links', label: 'Relaciones contenido ↔ esquema', qa: false,
    fields: [
      { col: 'id_externo', type: 'text', req: true, aliases: ['id_ext', 'external_id'], help: 'Identificador único de la relación', example: 'REL-0001' },
      { col: 'schema_id', type: 'uuid', req: true, aliases: ['esquema_id'], help: 'Esquema (motorización) de ExhaustMarket', example: '' },
      { col: 'content_type', type: 'enum', req: true, virtual: true, values: ['guia', 'manual', '3d'],
        syn: { articulo: 'guia', guide: 'guia', tutorial: 'guia', diseno_3d: '3d', design_3d: '3d', escaneo_3d: '3d', modelo_3d: '3d', archivo_3d: '3d' },
        aliases: ['tipo_contenido', 'tipo'], help: 'guia, manual o 3d', example: 'manual' },
      { col: 'content_id', type: 'uuid', req: true, virtual: true, aliases: ['contenido_id', 'id_contenido'], help: 'Id de la guía / manual / archivo 3D', example: '' },
    ],
  },
}
const LEGACY_TABLE_TO_ENTITY: Record<string, string> = { vehicles: 'vehicles', engines: 'engines', exhaust_parts: 'components' }
const REL_TABLE: Record<string, { table: string; col: string; target: string }> = {
  guia: { table: 'schema_article_links', col: 'article_id', target: 'articles' },
  manual: { table: 'schema_manual_links', col: 'manual_id', target: 'manuals' },
  '3d': { table: 'schema_3d_links', col: 'design_3d_id', target: 'design_3d' },
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Tablas que se pueden exportar (todo el catálogo + contenido + relaciones + productos).
const EXPORT_TABLES = ['vehicles', 'engines', 'exhaust_diagrams', 'exhaust_parts', 'exhaust_aftermarket_products', 'compatibilities',
  'exhaust_schemas', 'articles', 'manuals', 'design_3d', 'schema_article_links', 'schema_manual_links', 'schema_3d_links',
  'professional_products', 'aftermarket_brands', 'exhaust_architectures']
const READABLE = new Set([...EXPORT_TABLES, 'subscription_tiers'])

// ───────────────────────── handlers ─────────────────────────
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const op = url.searchParams.get('op')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    if (op === 'cron_export') return json(await runExport(pool, 'nightly', 'cron'))
    const admin = await getAdmin(req, pool)
    if (!admin) return json({ error: 'forbidden' }, 403)

    if (op === 'schema' || op === 'template') {
      const ent = ENTITIES[url.searchParams.get('entity') ?? '']
      if (!ent) return json({ error: 'entidad desconocida' }, 400)
      if (op === 'schema') {
        return json({ entity: ent.key, label: ent.label, needsOneOf: ent.needsOneOf ?? null,
          fields: ent.fields.map((f) => ({ col: f.col, type: f.type, required: !!f.req, values: f.values ?? null, aliases: f.aliases ?? [], help: f.help, example: f.example })) })
      }
      const header = ent.fields.map((f) => f.col)
      const example = ent.fields.map((f) => f.example)
      const csv = '﻿' + [header, example].map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
      return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="plantilla-${ent.key}.csv"` } })
    }

    if (op === 'exports') {
      const rows = (await pool.query(`SELECT id, kind, export_date, files, created_by, created_at FROM data_exports ORDER BY created_at DESC LIMIT 30`)).rows
      // No exponemos las keys de R2 al cliente: solo entidad/filas/tamaño.
      return json({ items: rows.map((r) => ({ ...r, files: (r.files as { entity: string; rows: number; bytes: number }[]).map((f) => ({ entity: f.entity, rows: f.rows, bytes: f.bytes })) })) })
    }

    if (op === 'download_export') {
      const id = url.searchParams.get('id') ?? ''
      const entity = url.searchParams.get('entity') ?? ''
      if (!UUID_RE.test(id)) return json({ error: 'id inválido' }, 400)
      const rec = (await pool.query(`SELECT export_date, files FROM data_exports WHERE id = $1`, [id])).rows[0]
      const file = (rec?.files as { entity: string; key: string }[] | undefined)?.find((f) => f.entity === entity)
      if (!file) return json({ error: 'no encontrado' }, 404)
      const s3 = r2()
      const obj = await s3.client.send(new GetObjectCommand({ Bucket: s3.bucket, Key: file.key }))
      const body = await obj.Body?.transformToByteArray()
      return new Response(body as unknown as BodyInit, { headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="${entity}-${String(rec.export_date).slice(0, 10)}.json"` } })
    }

    // Exportación directa (ruta antigua): ?table=T&format=csv|json[&status=]
    const table = url.searchParams.get('table') ?? ''
    const format = (url.searchParams.get('format') ?? 'csv').toLowerCase()
    const statusFilter = url.searchParams.get('status')
    if (!READABLE.has(table)) return text(`unknown table: ${table}`, 400)
    const where = statusFilter ? ` WHERE status = $1` : ''
    const rows = (await pool.query(`SELECT * FROM public.${table}${where}`, statusFilter ? [statusFilter] : [])).rows as Record<string, unknown>[]
    if (format === 'json') {
      return new Response(JSON.stringify(rows, null, 2), { headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="${table}-${stamp()}.json"` } })
    }
    if (!rows.length) return new Response('', { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${table}-${stamp()}.csv"` } })
    const cols = Object.keys(rows[0])
    const lines = [cols.map(csvCell).join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))]
    return new Response('﻿' + lines.join('\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${table}-${stamp()}.csv"` } })
  } catch (e) {
    console.error('csv GET error', e)
    return json({ error: (e as Error).message }, 500)
  } finally {
    await pool.end().catch(() => {})
  }
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const op = url.searchParams.get('op')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const admin = await getAdmin(req, pool)
    if (!admin) return json({ error: 'forbidden' }, 403)

    if (op === 'export_now') return json(await runExport(pool, 'manual', admin.label))

    let ent: ImportEntity | undefined
    let rows: string[][]
    let legacy = false
    if (op === 'validate' || op === 'commit') {
      ent = ENTITIES[url.searchParams.get('entity') ?? '']
      const body = (await req.json()) as { rows?: unknown }
      rows = Array.isArray(body.rows) ? (body.rows as unknown[]).map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? '' : String(c))) : [])) : []
    } else {
      // Ruta antigua: ?table=…&conflict=internal_id con cuerpo CSV.
      legacy = true
      ent = ENTITIES[LEGACY_TABLE_TO_ENTITY[url.searchParams.get('table') ?? ''] ?? '']
      rows = parseCsv(await req.text())
    }
    if (!ent) return json({ error: 'entidad desconocida (vehicles, engines, components, relations)' }, 400)
    if (rows.length < 2) return json({ error: 'El fichero necesita cabecera y al menos una fila.' }, 400)
    if (rows.length - 1 > 5000) return json({ error: 'Máximo 5000 filas por importación.' }, 400)

    const v = await validate(pool, ent, rows, legacy)
    if (op === 'validate') {
      return json({ ok: v.errors.length === 0, entity: ent.key, total: v.records.length, errors: v.errors, warnings: v.warnings, plan: v.plan, preview: v.records.slice(0, 5).map((r) => r.values) })
    }
    if (v.errors.length) {
      // Todo o nada: con un solo error bloqueante no se importa ninguna fila.
      const payload = { ok: false, imported: 0, errors: v.errors, warnings: v.warnings }
      return json(legacy ? { ...payload, inserted: 0 } : payload, 422)
    }
    const r = await commit(pool, ent, v.records, admin, url.searchParams.get('file') ?? null)
    return json(legacy ? { ...r, inserted: r.created + r.updated + r.proposed, errors: [] } : r)
  } catch (e) {
    console.error('csv POST error', e)
    return json({ error: (e as Error).message }, 500)
  } finally {
    await pool.end().catch(() => {})
  }
}

// ───────────────────────── validación ─────────────────────────
interface RowMsg { row: number; field?: string; message: string }
interface Prepared { row: number; id_externo: string; values: Record<string, unknown>; refs: Record<string, unknown> }

function normKey(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export async function validate(pool: Pool, ent: ImportEntity, rows: string[][], legacy: boolean) {
  const errors: RowMsg[] = []
  const warnings: RowMsg[] = []
  // Cabecera → columna (acepta el nombre de columna o sus alias en español).
  const byAlias = new Map<string, F>()
  for (const f of ent.fields) { byAlias.set(normKey(f.col), f); for (const a of f.aliases ?? []) byAlias.set(normKey(a), f) }
  const header = rows[0].map((h) => byAlias.get(normKey(h)) ?? null)
  rows[0].forEach((h, i) => { if (!header[i] && h.trim()) warnings.push({ row: 1, field: h, message: `Columna desconocida «${h}»: se ignora.` }) })
  const present = new Set(header.filter(Boolean).map((f) => f!.col))
  if (legacy && !present.has('id_externo') && present.has('internal_id')) present.add('id_externo')
  for (const f of ent.fields) if (f.req && !present.has(f.col)) errors.push({ row: 1, field: f.col, message: `Falta la columna obligatoria «${f.col}».` })
  if (ent.needsOneOf && !ent.needsOneOf.some((c) => present.has(c))) errors.push({ row: 1, message: `Falta una referencia: incluye una de estas columnas: ${ent.needsOneOf.join(', ')}.` })
  if (errors.length) return { records: [] as Prepared[], errors, warnings, plan: null }

  const records: Prepared[] = []
  const seenExt = new Map<string, number>()
  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i]
    if (!raw || raw.every((c) => !String(c ?? '').trim())) continue
    const rowNum = i + 1 // número de fila como en la hoja (la cabecera es la 1)
    const values: Record<string, unknown> = {}
    const refs: Record<string, unknown> = {}
    let rowOk = true
    const badFields = new Set<string>() // campos con error de formato (para no repetir "es obligatorio")
    header.forEach((f, idx) => {
      if (!f) return
      const cell = String(raw[idx] ?? '').trim()
      if (cell === '') return
      const conv = convert(f, cell)
      if ('error' in conv) { errors.push({ row: rowNum, field: f.col, message: conv.error }); badFields.add(f.col); rowOk = false; return }
      if (f.virtual) refs[f.col] = conv.value
      else values[f.col] = conv.value
    })
    if (legacy && values.id_externo == null && values.internal_id != null) values.id_externo = String(values.internal_id)
    for (const f of ent.fields) {
      const has = f.virtual ? refs[f.col] != null : values[f.col] != null
      if (f.req && !has && !badFields.has(f.col)) { errors.push({ row: rowNum, field: f.col, message: `«${f.col}» es obligatorio.` }); rowOk = false }
      if (!has && f.def !== undefined && !f.virtual) values[f.col] = f.def
    }
    if (ent.needsOneOf && !ent.needsOneOf.some((c) => values[c] != null || refs[c] != null)) {
      errors.push({ row: rowNum, message: `Falta la referencia (${ent.needsOneOf.join(' / ')}).` }); rowOk = false
    }
    if (ent.key === 'vehicles' && typeof values.year_from === 'number' && typeof values.year_to === 'number' && values.year_to < values.year_from) {
      errors.push({ row: rowNum, field: 'year_to', message: 'year_to es anterior a year_from.' }); rowOk = false
    }
    const ext = values.id_externo as string | undefined
    if (ext) {
      if (seenExt.has(ext)) { errors.push({ row: rowNum, field: 'id_externo', message: `id_externo «${ext}» repetido (ya está en la fila ${seenExt.get(ext)}).` }); rowOk = false }
      else seenExt.set(ext, rowNum)
    }
    delete values.id_externo
    if (rowOk && ext) records.push({ row: rowNum, id_externo: ext, values, refs })
  }

  // Resolución de referencias en bloque (sin N consultas).
  await resolveRefs(pool, ent, records, errors, warnings)
  const okRecords = records.filter((r) => !errors.some((e) => e.row === r.row))

  // Plan: qué pasará con cada fila (nuevo / actualiza pendiente / propone cambios a publicado).
  let plan: { nuevos: number; actualiza_pendientes: number; cambios_propuestos: number; sin_cambios: number; omitidos: number } | null = null
  if (okRecords.length) {
    const table = ent.key === 'relations' ? null : ent.table
    let existing = new Map<string, Record<string, unknown>>()
    if (table) {
      const r = (await pool.query(`SELECT * FROM ${table} WHERE origen = 'importacion' AND id_externo = ANY($1)`, [okRecords.map((x) => x.id_externo)])).rows
      existing = new Map(r.map((x: Record<string, unknown>) => [String(x.id_externo), x]))
    }
    plan = { nuevos: 0, actualiza_pendientes: 0, cambios_propuestos: 0, sin_cambios: 0, omitidos: okRecords.filter((r) => r.refs._skip).length }
    for (const r of okRecords) {
      if (r.refs._skip) continue
      const cur = existing.get(r.id_externo)
      if (!cur) plan.nuevos++
      else if (cur.pub_status === 'aprobado') { if (Object.keys(diffValues(cur, r.values)).length) plan.cambios_propuestos++; else plan.sin_cambios++ }
      else plan.actualiza_pendientes++
    }
  }
  return { records: okRecords, errors, warnings, plan }
}

function convert(f: F, cell: string): { value: unknown } | { error: string } {
  switch (f.type) {
    case 'text': return { value: cell }
    case 'int': {
      const n = Number(cell.replace(/\s/g, ''))
      return Number.isInteger(n) ? { value: n } : { error: `«${cell}» no es un número entero.` }
    }
    case 'num': {
      const n = Number(cell.replace(/\s/g, '').replace(',', '.'))
      return Number.isFinite(n) ? { value: n } : { error: `«${cell}» no es un número.` }
    }
    case 'bool': {
      const k = normKey(cell)
      if (YES.has(k)) return { value: true }
      if (NO.has(k)) return { value: false }
      return { error: `«${cell}» no es sí/no.` }
    }
    case 'uuid': return UUID_RE.test(cell) ? { value: cell.toLowerCase() } : { error: `«${cell}» no es un id válido (uuid).` }
    case 'url': return /^https?:\/\/\S+$/i.test(cell) ? { value: cell } : { error: `«${cell}» no es una URL (http/https).` }
    case 'urls': {
      const parts = cell.split(/\s*[|;]\s*/).filter(Boolean)
      const bad = parts.find((p) => !/^https?:\/\/\S+$/i.test(p))
      return bad ? { error: `«${bad}» no es una URL.` } : { value: parts }
    }
    case 'enum': {
      const k = normKey(cell)
      const values = f.values ?? []
      const direct = values.find((v) => normKey(v) === k)
      const mapped = direct ?? (f.syn?.[k] && values.includes(f.syn[k]) ? f.syn[k] : undefined)
      return mapped ? { value: mapped } : { error: `«${cell}» no es válido. Valores: ${values.join(', ')}.` }
    }
  }
}

async function resolveRefs(pool: Pool, ent: ImportEntity, records: Prepared[], errors: RowMsg[], warnings: RowMsg[]) {
  if (!records.length) return
  const uniq = (xs: unknown[]) => [...new Set(xs.filter((x) => x != null))] as string[]

  if (ent.key === 'vehicles') {
    // Mismo vehículo (marca+modelo+generación+año) ya existente de OTRO origen → aviso y se omite
    // (la BD tiene UNIQUE sobre esas columnas; mejor decirlo que saltarlo en silencio).
    const dup = (await pool.query(
      `SELECT v.id, v.brand, v.model, v.generation, v.year_from, v.origen, v.id_externo FROM vehicles v
       JOIN unnest($1::text[], $2::text[], $3::text[], $4::int[]) AS k(b, m, g, y)
         ON v.brand = k.b AND v.model = k.m AND v.generation IS NOT DISTINCT FROM k.g AND v.year_from = k.y`,
      [records.map((r) => r.values.brand), records.map((r) => r.values.model), records.map((r) => r.values.generation ?? null), records.map((r) => r.values.year_from)],
    )).rows
    for (const r of records) {
      const d = dup.find((x: { brand: string; model: string; generation: string | null; year_from: number; origen: string; id_externo: string }) =>
        x.brand === r.values.brand && x.model === r.values.model && (x.generation ?? null) === (r.values.generation ?? null) && x.year_from === r.values.year_from
        && !(x.origen === 'importacion' && x.id_externo === r.id_externo))
      if (d) { r.refs._skip = d.id; warnings.push({ row: r.row, message: `Ya existe este vehículo (${String(d.id).slice(0, 8)}…). Se omite.` }) }
    }
  }

  if (ent.key === 'engines') {
    const ids = uniq(records.map((r) => r.values.vehicle_id))
    const exts = uniq(records.map((r) => r.refs.vehicle_id_externo))
    const ints = uniq(records.map((r) => r.refs.vehicle_internal_id))
    const byId = new Set(ids.length ? (await pool.query(`SELECT id FROM vehicles WHERE id = ANY($1)`, [ids])).rows.map((x: { id: string }) => x.id) : [])
    const byExt = new Map<string, string[]>()
    if (exts.length) for (const x of (await pool.query(`SELECT id, id_externo FROM vehicles WHERE id_externo = ANY($1)`, [exts])).rows) byExt.set(x.id_externo, [...(byExt.get(x.id_externo) ?? []), x.id])
    const byInt = new Map<string, string>()
    if (ints.length) for (const x of (await pool.query(`SELECT id, internal_id FROM vehicles WHERE internal_id = ANY($1)`, [ints])).rows) byInt.set(x.internal_id, x.id)
    for (const r of records) {
      if (r.values.vehicle_id) { if (!byId.has(r.values.vehicle_id as string)) errors.push({ row: r.row, field: 'vehicle_id', message: 'El vehículo no existe.' }); continue }
      if (r.refs.vehicle_id_externo) {
        const m = byExt.get(r.refs.vehicle_id_externo as string) ?? []
        if (m.length === 1) r.values.vehicle_id = m[0]
        else errors.push({ row: r.row, field: 'vehicle_id_externo', message: m.length ? 'id_externo ambiguo (varios vehículos): usa vehicle_id.' : 'No hay ningún vehículo con ese id_externo (impórtalo antes).' })
        continue
      }
      const v = byInt.get(r.refs.vehicle_internal_id as string)
      if (v) r.values.vehicle_id = v
      else errors.push({ row: r.row, field: 'vehicle_internal_id', message: 'No hay ningún vehículo con ese internal_id.' })
    }
  }

  if (ent.key === 'components') {
    const dIds = uniq(records.map((r) => r.values.diagram_id))
    const eIds = uniq(records.map((r) => r.refs.engine_id))
    const eExts = uniq(records.map((r) => r.refs.engine_id_externo))
    const diagOk = new Set(dIds.length ? (await pool.query(`SELECT id FROM exhaust_diagrams WHERE id = ANY($1)`, [dIds])).rows.map((x: { id: string }) => x.id) : [])
    const engOk = new Set(eIds.length ? (await pool.query(`SELECT id FROM engines WHERE id = ANY($1)`, [eIds])).rows.map((x: { id: string }) => x.id) : [])
    const engByExt = new Map<string, string[]>()
    if (eExts.length) for (const x of (await pool.query(`SELECT id, id_externo FROM engines WHERE id_externo = ANY($1)`, [eExts])).rows) engByExt.set(x.id_externo, [...(engByExt.get(x.id_externo) ?? []), x.id])
    for (const r of records) {
      if (r.values.diagram_id) { if (!diagOk.has(r.values.diagram_id as string)) errors.push({ row: r.row, field: 'diagram_id', message: 'El diagrama no existe.' }); continue }
      if (r.refs.engine_id) { if (engOk.has(r.refs.engine_id as string)) r.refs._engine = r.refs.engine_id; else errors.push({ row: r.row, field: 'engine_id', message: 'La motorización no existe.' }); continue }
      const m = engByExt.get(r.refs.engine_id_externo as string) ?? []
      if (m.length === 1) r.refs._engine = m[0]
      else errors.push({ row: r.row, field: 'engine_id_externo', message: m.length ? 'id_externo ambiguo: usa engine_id.' : 'No hay ninguna motorización con ese id_externo (impórtala antes).' })
    }
    // Diagrama por motorización (si no hay, se creará uno pendiente en el commit).
    const engs = uniq(records.map((r) => r.refs._engine))
    const diagByEng = new Map<string, string>()
    if (engs.length) for (const x of (await pool.query(`SELECT DISTINCT ON (engine_id) id, engine_id FROM exhaust_diagrams WHERE engine_id = ANY($1) ORDER BY engine_id, created_at`, [engs])).rows) diagByEng.set(x.engine_id, x.id)
    for (const r of records) if (!r.values.diagram_id && r.refs._engine && diagByEng.has(r.refs._engine as string)) r.values.diagram_id = diagByEng.get(r.refs._engine as string)
    // Nombre por defecto = el del tramo.
    for (const r of records) if (!r.values.name) r.values.name = PART_LABEL[r.values.part_type as string] ?? String(r.values.part_type)
    // Duplicados: misma motorización (diagrama) + tramo + referencia OEM ya existente de OTRO origen.
    const withRef = records.filter((r) => r.values.diagram_id && r.values.oem_ref)
    if (withRef.length) {
      const dup = (await pool.query(
        `SELECT p.id, p.diagram_id, p.part_type, p.oem_ref, p.origen, p.id_externo FROM exhaust_parts p
         JOIN unnest($1::uuid[], $2::text[], $3::text[]) AS k(d, t, o) ON p.diagram_id = k.d AND p.part_type = k.t AND upper(p.oem_ref) = upper(k.o)`,
        [withRef.map((r) => r.values.diagram_id), withRef.map((r) => r.values.part_type), withRef.map((r) => r.values.oem_ref)],
      )).rows
      for (const r of withRef) {
        const d = dup.find((x: { diagram_id: string; part_type: string; oem_ref: string; origen: string; id_externo: string }) =>
          x.diagram_id === r.values.diagram_id && x.part_type === r.values.part_type && String(x.oem_ref).toUpperCase() === String(r.values.oem_ref).toUpperCase()
          && !(x.origen === 'importacion' && x.id_externo === r.id_externo))
        if (d) { r.refs._skip = d.id; warnings.push({ row: r.row, field: 'oem_ref', message: `Duplicado: ya existe este componente (${String(d.id).slice(0, 8)}…). Se omite.` }) }
      }
    }
  }

  if (ent.key === 'relations') {
    const sIds = uniq(records.map((r) => r.values.schema_id))
    const sOk = new Set(sIds.length ? (await pool.query(`SELECT id FROM exhaust_schemas WHERE id = ANY($1)`, [sIds])).rows.map((x: { id: string }) => x.id) : [])
    for (const t of Object.keys(REL_TABLE)) {
      const rs = records.filter((r) => r.refs.content_type === t)
      if (!rs.length) continue
      const ok = new Set((await pool.query(`SELECT id FROM ${REL_TABLE[t].target} WHERE id = ANY($1)`, [uniq(rs.map((r) => r.refs.content_id))])).rows.map((x: { id: string }) => x.id))
      for (const r of rs) if (!ok.has(r.refs.content_id as string)) errors.push({ row: r.row, field: 'content_id', message: `No existe ese ${t === '3d' ? 'archivo 3D' : t}.` })
    }
    for (const r of records) if (!sOk.has(r.values.schema_id as string)) errors.push({ row: r.row, field: 'schema_id', message: 'El esquema no existe.' })
  }
}

// ───────────────────────── commit ─────────────────────────
export async function commit(pool: Pool, ent: ImportEntity, records: Prepared[], admin: { profileId: string; label: string }, fileName: string | null) {
  const client = await pool.connect()
  let created = 0, updated = 0, proposed = 0, skipped = 0, unchanged = 0
  try {
    await client.query('BEGIN')
    const lote = (await client.query(`INSERT INTO ingest_batches (origen, entity, total, note, created_by) VALUES ('importacion', $1, $2, $3, $4) RETURNING id`,
      [ent.key, records.length, fileName, admin.label])).rows[0].id as string
    const actor = `importacion (${admin.label})`
    const newDiagram = new Map<string, string>()

    for (const r of records) {
      if (r.refs._skip) { skipped++; continue }
      let table = ent.table
      const values = { ...r.values }
      if (ent.key === 'relations') {
        const rel = REL_TABLE[r.refs.content_type as string]
        table = rel.table
        values[rel.col] = r.refs.content_id
        if (table === 'schema_article_links') values.kind = 'related'
      }
      if (ent.key === 'components' && !values.diagram_id) {
        const eng = r.refs._engine as string
        if (!newDiagram.has(eng)) {
          const d = (await client.query(`INSERT INTO exhaust_diagrams (engine_id, status, pub_status, origen, lote_id, created_by) VALUES ($1, 'submitted', 'pendiente_revision', 'importacion', $2, $3) RETURNING id`, [eng, lote, admin.label])).rows[0].id
          newDiagram.set(eng, d)
          await auditRow(client, 'exhaust_diagrams', d, 'create', null, 'pendiente_revision', admin.profileId, actor, lote, 'Diagrama creado para alojar componentes importados', null)
        }
        values.diagram_id = newDiagram.get(eng)
      }
      const cur = (await client.query(`SELECT id, pub_status, pending_changes FROM ${table} WHERE origen = 'importacion' AND id_externo = $1 FOR UPDATE`, [r.id_externo])).rows[0]
      if (!cur) {
        const cols = Object.keys(values)
        const vals = cols.map((c) => fmtVal(values[c]))
        cols.push('pub_status', 'origen', 'id_externo', 'lote_id'); vals.push('pendiente_revision', 'importacion', r.id_externo, lote)
        if (ent.qa) { cols.push('status', 'created_by'); vals.push('submitted', admin.label) }
        const id = (await client.query(`INSERT INTO ${table} (${cols.map(q).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')})
          ON CONFLICT DO NOTHING RETURNING id`, vals)).rows[0]?.id
        if (!id) { skipped++; continue } // p. ej. relación ya existente (UNIQUE esquema+contenido)
        await auditRow(client, table, id, 'create', null, 'pendiente_revision', admin.profileId, actor, lote, null, null)
        created++
      } else if (cur.pub_status === 'aprobado') {
        // Publicado: los cambios NO salen al público hasta aprobarlos (cambios propuestos). Solo las
        // columnas que de verdad cambian: reimportar el mismo fichero no llena la Bandeja de ruido.
        const full = (await client.query(`SELECT * FROM ${table} WHERE id = $1`, [cur.id])).rows[0] as Record<string, unknown>
        const diff = diffValues(full, values)
        if (!Object.keys(diff).length) { unchanged++; continue }
        const merged = { ...(cur.pending_changes ?? {}), ...diff }
        await client.query(`UPDATE ${table} SET pending_changes = $1, lote_id = $2 WHERE id = $3`, [JSON.stringify(merged), lote, cur.id])
        await auditRow(client, table, cur.id, 'changes_proposed', 'aprobado', 'aprobado', admin.profileId, actor, lote, null, diff)
        proposed++
      } else {
        const cols = Object.keys(values)
        const sets = cols.map((c, i) => `${q(c)} = $${i + 1}`)
        const vals = cols.map((c) => fmtVal(values[c]))
        vals.push(lote, cur.id)
        await client.query(`UPDATE ${table} SET ${sets.join(', ')}${sets.length ? ',' : ''} pub_status = 'pendiente_revision', review_note = NULL, lote_id = $${vals.length - 1} WHERE id = $${vals.length}`, vals)
        await auditRow(client, table, cur.id, 'update', cur.pub_status, 'pendiente_revision', admin.profileId, actor, lote, null, values)
        updated++
      }
    }
    if (created + updated + proposed === 0) {
      // Nada nuevo que revisar (todo duplicado o sin cambios): no se deja un lote vacío.
      await client.query('ROLLBACK')
      return { ok: true, lote_id: null, created, updated, proposed, skipped, unchanged }
    }
    await client.query('UPDATE ingest_batches SET total = $1 WHERE id = $2', [created + updated + proposed, lote])
    // Webhook batch.created (un aviso por lote, no por fila: una importación puede traer miles).
    const hooks = (await client.query(`SELECT id, events FROM webhooks WHERE active = true`)).rows as { id: string; events: string[] | null }[]
    const payload = JSON.stringify({ event: 'batch.created', occurred_at: new Date().toISOString(),
      data: { entity: ent.key, origen: 'importacion', lote_id: lote, file: fileName, created, updated, pending_changes: proposed, duplicate: skipped, by: actor } })
    for (const h of hooks) {
      if (h.events?.length && !h.events.includes('batch.created')) continue
      await client.query(`INSERT INTO webhook_deliveries (webhook_id, event, payload) VALUES ($1, 'batch.created', $2)`, [h.id, payload])
    }
    await client.query('COMMIT')
    return { ok: true, lote_id: lote, created, updated, proposed, skipped, unchanged }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}

/** Columnas de `next` cuyo valor difiere del registro actual (numeric de PG llega como texto). */
export function diffValues(cur: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
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

function fmtVal(v: unknown): unknown {
  // Los arrays (images) van como array de Postgres (text[]); el resto tal cual.
  return v
}

async function auditRow(client: { query: (s: string, p?: unknown[]) => Promise<unknown> }, table: string, id: string, action: string,
  prev: string | null, next: string | null, actorId: string, actorLabel: string, lote: string, note: string | null, changes: unknown) {
  await client.query(`INSERT INTO review_audit (table_name, record_id, action, prev_status, new_status, actor_profile_id, actor_label, lote_id, note, changes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [table, id, action, prev, next, actorId, actorLabel, lote, note, changes == null ? null : JSON.stringify(changes)])
}

// ───────────────────────── exportación ─────────────────────────
function r2(): { client: S3Client; bucket: string } {
  const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
  const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
  const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) throw new Error('Faltan las variables de R2')
  return {
    client: new S3Client({ region: 'auto', endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY } }),
    bucket: process.env.R2_BUCKET ?? 'exhaustmarket-media',
  }
}

async function runExport(pool: Pool, kind: 'nightly' | 'manual', by: string) {
  const date = new Date().toISOString().slice(0, 10)
  if (kind === 'nightly') {
    // Idempotente por día (el endpoint del cron no lleva token: llamarlo de más no hace nada).
    const done = (await pool.query(`SELECT id FROM data_exports WHERE kind = 'nightly' AND export_date = $1 LIMIT 1`, [date])).rows[0]
    if (done) return { ok: true, skipped: true, reason: 'ya existe la exportación de hoy', id: done.id }
  }
  const s3 = r2()
  const token = crypto.randomUUID().replace(/-/g, '')
  const files: { entity: string; key: string; rows: number; bytes: number }[] = []
  for (const t of EXPORT_TABLES) {
    const rows = (await pool.query(`SELECT * FROM public.${t}`)).rows
    const body = JSON.stringify({ entity: t, exported_at: new Date().toISOString(), count: rows.length, rows })
    const key = `exports/${token}/${date}/${t}.json`
    await s3.client.send(new PutObjectCommand({ Bucket: s3.bucket, Key: key, Body: body, ContentType: 'application/json' }))
    files.push({ entity: t, key, rows: rows.length, bytes: Buffer.byteLength(body) })
  }
  const id = (await pool.query(`INSERT INTO data_exports (kind, export_date, files, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
    [kind, date, JSON.stringify(files), by])).rows[0].id
  return { ok: true, id, date, files: files.map((f) => ({ entity: f.entity, rows: f.rows, bytes: f.bytes })) }
}

// ───────────────────────── utilidades ─────────────────────────
/** CSV robusto: comillas, saltos de línea dentro de celdas y separador , ; o tab (Excel en español usa ;). */
function parseCsv(input: string): string[][] {
  const textIn = input.replace(/^﻿/, '')
  const firstLine = textIn.split(/\r?\n/, 1)[0] ?? ''
  const counts = { ',': (firstLine.match(/,/g) ?? []).length, ';': (firstLine.match(/;/g) ?? []).length, '\t': (firstLine.match(/\t/g) ?? []).length }
  const sep = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0) > 0 ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ','
  const out: string[][] = []
  let row: string[] = [], cell = '', inQ = false
  for (let i = 0; i < textIn.length; i++) {
    const c = textIn[i]
    if (inQ) {
      if (c === '"') { if (textIn[i + 1] === '"') { cell += '"'; i++ } else inQ = false }
      else cell += c
      continue
    }
    if (c === '"') { inQ = true; continue }
    if (c === sep) { row.push(cell); cell = ''; continue }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && textIn[i + 1] === '\n') i++
      row.push(cell); out.push(row); row = []; cell = ''; continue
    }
    cell += c
  }
  if (cell || row.length) { row.push(cell); out.push(row) }
  return out
}

function q(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`bad identifier: ${name}`)
  return `"${name}"`
}
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`
  const s = String(v)
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function stamp(): string { return new Date().toISOString().slice(0, 10) }
function text(s: string, status = 200): Response { return new Response(s, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } }) }
function json(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }) }

async function getAdmin(req: Request, pool: Pool): Promise<{ profileId: string; label: string } | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return null
  try {
    const payload = (await verifyToken(header.slice(7), { secretKey: secret })) as { sub: string }
    const r = (await pool.query(`SELECT id, is_admin, email, full_name FROM public.user_profiles WHERE clerk_user_id = $1 LIMIT 1`, [payload.sub])).rows[0]
    if (!r?.is_admin) return null
    return { profileId: r.id, label: `admin:${r.email || r.full_name || r.id}` }
  } catch {
    return null
  }
}
