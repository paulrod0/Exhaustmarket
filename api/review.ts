import { Pool } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'

/**
 * /api/review — Bandeja de revisión (Solicitud nº3, P1). SOLO ADMIN. Self-contained (sin _lib).
 *
 *  GET  ?op=counts                                         → pendientes por cola y por entidad
 *  GET  ?op=list&entity=&origen=&lote=&q=&from=&to=&limit= → cola de PUBLICACIÓN unificada
 *  GET  ?op=detail&table=&id=                              → registro + contexto + auditoría + QA
 *  GET  ?op=audit&limit=                                   → últimas acciones de revisión
 *  POST {op:'approve', items:[{table,id}] } | {op:'approve', lote_id}
 *  POST {op:'reject',  items:[{table,id}], note } | {op:'reject', lote_id, note}
 *
 * Aprobar: pendiente → aprobado (visible). Si el registro ya estaba aprobado y tiene cambios
 * propuestos por API (pending_changes), aprobar los APLICA; rechazar los DESCARTA (sigue visible
 * tal cual). Todo queda en review_audit (quién, cuándo, estado anterior y nuevo, motivo).
 */

interface Ent {
  table: string; label: string
  pubCol: string; pending: string; approved: string; rejected: string
  from: string; title: string; brand: string; model: string
  qaType?: string
}
const STD = { pubCol: 'pub_status', pending: 'pendiente_revision', approved: 'aprobado', rejected: 'rechazado' }
const JOIN_PART = 'LEFT JOIN exhaust_diagrams d ON d.id = x.diagram_id LEFT JOIN engines e ON e.id = d.engine_id LEFT JOIN vehicles v ON v.id = e.vehicle_id'
// Config FIJA del servidor (nunca viene del cliente): seguro interpolarla en el SQL.
const ENTITIES: Ent[] = [
  { table: 'vehicles', label: 'Vehículo', ...STD, qaType: 'vehicle', from: 'vehicles x',
    title: `concat_ws(' ', x.brand, x.model, x.generation, '(' || coalesce(x.year_from::text,'?') || '–' || coalesce(x.year_to::text,'') || ')')`, brand: 'x.brand', model: 'x.model' },
  { table: 'engines', label: 'Motorización', ...STD, qaType: 'engine', from: 'engines x LEFT JOIN vehicles v ON v.id = x.vehicle_id',
    title: `concat_ws(' ', v.brand, v.model, '·', x.version, x.engine_code, CASE WHEN x.power_cv IS NOT NULL THEN x.power_cv || ' CV' END)`, brand: 'v.brand', model: 'v.model' },
  { table: 'exhaust_diagrams', label: 'Diagrama', ...STD, qaType: 'exhaust_diagram', from: 'exhaust_diagrams x LEFT JOIN engines e ON e.id = x.engine_id LEFT JOIN vehicles v ON v.id = e.vehicle_id',
    title: `concat_ws(' ', 'Diagrama', v.brand, v.model, e.version)`, brand: 'v.brand', model: 'v.model' },
  { table: 'exhaust_parts', label: 'Componente OEM', ...STD, qaType: 'exhaust_part', from: `exhaust_parts x ${JOIN_PART}`,
    title: `concat_ws(' ', coalesce(x.name, x.part_type), CASE WHEN x.oem_ref IS NOT NULL THEN '· ref ' || x.oem_ref END, '—', v.brand, v.model, e.version)`, brand: 'v.brand', model: 'v.model' },
  { table: 'exhaust_aftermarket_products', label: 'Producto aftermarket', ...STD, qaType: 'exhaust_aftermarket_product', from: 'exhaust_aftermarket_products x',
    title: `concat_ws(' ', x.brand_name, x.product_name, x.reference)`, brand: 'x.brand_name', model: 'NULL::text' },
  { table: 'compatibilities', label: 'Compatibilidad', ...STD, from: 'compatibilities x',
    title: `concat_ws(' ', x.source_type, '→', x.target_type)`, brand: 'NULL::text', model: 'NULL::text' },
  { table: 'exhaust_schemas', label: 'Esquema', ...STD, from: 'exhaust_schemas x',
    title: `concat_ws(' ', x.brand, x.model, x.engine)`, brand: 'x.brand', model: 'x.model' },
  { table: 'articles', label: 'Guía', ...STD, from: 'articles x', title: 'x.title', brand: 'NULL::text', model: 'NULL::text' },
  { table: 'manuals', label: 'Manual', ...STD, from: 'manuals x',
    title: `concat_ws(' ', x.title, '—', x.car_brand, x.car_model)`, brand: 'x.car_brand', model: 'x.car_model' },
  { table: 'schema_article_links', label: 'Relación guía ↔ esquema', ...STD,
    from: 'schema_article_links x LEFT JOIN exhaust_schemas s ON s.id = x.schema_id LEFT JOIN articles a ON a.id = x.article_id',
    title: `concat_ws(' ', 'Guía «' || coalesce(a.title,'?') || '» ↔', s.brand, s.model, s.engine)`, brand: 's.brand', model: 's.model' },
  { table: 'schema_manual_links', label: 'Relación manual ↔ esquema', ...STD,
    from: 'schema_manual_links x LEFT JOIN exhaust_schemas s ON s.id = x.schema_id LEFT JOIN manuals m ON m.id = x.manual_id',
    title: `concat_ws(' ', 'Manual «' || coalesce(m.title,'?') || '» ↔', s.brand, s.model, s.engine)`, brand: 's.brand', model: 's.model' },
  { table: 'schema_3d_links', label: 'Relación 3D ↔ esquema', ...STD,
    from: 'schema_3d_links x LEFT JOIN exhaust_schemas s ON s.id = x.schema_id LEFT JOIN design_3d d3 ON d3.id = x.design_3d_id',
    title: `concat_ws(' ', '3D «' || coalesce(d3.title,'?') || '» ↔', s.brand, s.model, s.engine)`, brand: 's.brand', model: 's.model' },
  { table: 'design_3d', label: 'Archivo 3D', pubCol: 'status', pending: 'pending', approved: 'approved', rejected: 'rejected', from: 'design_3d x',
    title: `concat_ws(' ', x.title, CASE WHEN x.part_type IS NOT NULL THEN '(' || x.part_type || ')' END)`, brand: 'NULL::text', model: 'NULL::text' },
]
const BY_TABLE = new Map(ENTITIES.map((e) => [e.table, e]))
const QA_TABLES = ['vehicles', 'engines', 'exhaust_diagrams', 'exhaust_parts', 'exhaust_aftermarket_products']
// Columnas que NUNCA se aplican desde pending_changes (identidad, trazabilidad, revisión).
const NEVER_APPLY = new Set(['id', 'created_at', 'updated_at', 'pub_status', 'status', 'origen', 'id_externo', 'lote_id',
  'review_note', 'reviewed_by', 'reviewed_at', 'pending_changes', 'created_by', 'uploaded_by', 'professional_id'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function pendingWhere(e: Ent): string {
  return `(x.${e.pubCol} = '${e.pending}' OR x.pending_changes IS NOT NULL)`
}

export async function GET(req: Request): Promise<Response> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const admin = await getAdmin(req, pool)
    if (!admin) return json({ error: 'forbidden' }, 403)
    const url = new URL(req.url)
    const op = url.searchParams.get('op') ?? 'list'

    if (op === 'counts') {
      const pubSql = ENTITIES.map((e) => `SELECT '${e.table}'::text AS entity, count(*)::int AS n FROM ${e.table} x WHERE ${pendingWhere(e)}`).join(' UNION ALL ')
      const pub = (await pool.query(pubSql)).rows as { entity: string; n: number }[]
      const qaSql = QA_TABLES.map((t) => `SELECT '${t}'::text AS entity, count(*)::int AS n FROM ${t} WHERE status IN ('submitted','needs_changes')`).join(' UNION ALL ')
      const qa = (await pool.query(qaSql)).rows as { entity: string; n: number }[]
      const envios = (await pool.query(`SELECT count(*)::int AS n FROM schema_submissions WHERE status = 'pending'`)).rows[0]?.n ?? 0
      const byEntity: Record<string, number> = {}
      for (const r of pub) if (r.n) byEntity[r.entity] = r.n
      return json({
        publicacion: pub.reduce((s, r) => s + r.n, 0),
        qa: qa.reduce((s, r) => s + r.n, 0),
        envios,
        by_entity: byEntity,
        qa_by_entity: Object.fromEntries(qa.filter((r) => r.n).map((r) => [r.entity, r.n])),
      })
    }

    if (op === 'list') {
      const entity = url.searchParams.get('entity')
      const ents = entity ? ENTITIES.filter((e) => e.table === entity) : ENTITIES
      if (!ents.length) return json({ error: 'entidad desconocida' }, 400)
      const origen = url.searchParams.get('origen')
      const lote = url.searchParams.get('lote')
      const qtext = url.searchParams.get('q')
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 300) || 300, 1), 1000)
      const union = ents.map((e) => `SELECT '${e.table}'::text AS entity, x.id, ${e.title} AS title, ${e.brand} AS brand, ${e.model} AS model,
          x.${e.pubCol}::text AS pub_status, x.origen, x.lote_id, x.created_at, (x.pending_changes IS NOT NULL) AS has_changes
        FROM ${e.from} WHERE ${pendingWhere(e)}`).join(' UNION ALL ')
      const sql = `SELECT * FROM (${union}) u
        WHERE ($1::text IS NULL OR u.origen ILIKE $1)
          AND ($2::uuid IS NULL OR u.lote_id = $2)
          AND ($3::text IS NULL OR u.title ILIKE $3 OR u.brand ILIKE $3 OR u.model ILIKE $3)
          AND ($4::timestamptz IS NULL OR u.created_at >= $4)
          AND ($5::timestamptz IS NULL OR u.created_at <= $5)
        ORDER BY u.created_at DESC LIMIT $6`
      const params = [
        origen ? `${origen}%` : null,
        lote && UUID_RE.test(lote) ? lote : null,
        qtext ? `%${qtext}%` : null,
        from || null,
        to ? `${to}T23:59:59Z` : null,
        limit,
      ]
      const rows = (await pool.query(sql, params)).rows
      const labels = Object.fromEntries(ENTITIES.map((e) => [e.table, e.label]))
      return json({ items: rows.map((r) => ({ ...r, entity_label: labels[r.entity] })) })
    }

    if (op === 'detail') {
      const table = url.searchParams.get('table') ?? ''
      const id = url.searchParams.get('id') ?? ''
      const e = BY_TABLE.get(table)
      if (!e || !UUID_RE.test(id)) return json({ error: 'parámetros inválidos' }, 400)
      const rec = (await pool.query(`SELECT x.*, ${e.title} AS _title FROM ${e.from} WHERE x.id = $1`, [id])).rows[0]
      if (!rec) return json({ error: 'no encontrado' }, 404)
      const audit = (await pool.query(`SELECT * FROM review_audit WHERE table_name = $1 AND record_id = $2 ORDER BY created_at DESC LIMIT 50`, [table, id])).rows
      const qa = e.qaType
        ? (await pool.query(`SELECT * FROM qa_reviews WHERE record_type = $1 AND record_id = $2 ORDER BY created_at DESC LIMIT 20`, [e.qaType, id])).rows
        : []
      const batch = rec.lote_id ? (await pool.query(`SELECT * FROM ingest_batches WHERE id = $1`, [rec.lote_id])).rows[0] ?? null : null
      return json({ entity: table, entity_label: e.label, record: rec, audit, qa, batch, pub_col: e.pubCol })
    }

    if (op === 'audit') {
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 100) || 100, 500)
      const rows = (await pool.query(`SELECT * FROM review_audit ORDER BY created_at DESC LIMIT $1`, [limit])).rows
      return json({ items: rows })
    }

    return json({ error: `op desconocida: ${op}` }, 400)
  } catch (e) {
    console.error('review GET error', e)
    return json({ error: (e as Error).message }, 500)
  } finally {
    await pool.end().catch(() => {})
  }
}

export async function POST(req: Request): Promise<Response> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const admin = await getAdmin(req, pool)
    if (!admin) return json({ error: 'forbidden' }, 403)
    const body = (await req.json()) as ReviewBody
    const r = await processReview(pool, admin, body)
    return json(r.body, r.status)
  } catch (e) {
    console.error('review POST error', e)
    return json({ error: (e as Error).message }, 500)
  } finally {
    await pool.end().catch(() => {})
  }
}

type ReviewBody = { op?: string; items?: { table: string; id: string }[]; lote_id?: string; note?: string }

/** Lógica de aprobar/rechazar (separada del handler para poder probarla sin token de Clerk). */
export async function processReview(
  pool: Pool, admin: { profileId: string; label: string }, body: ReviewBody,
): Promise<{ status: number; body: unknown }> {
  {
    const op = body.op
    if (op !== 'approve' && op !== 'reject') return { status: 400, body: { error: 'op debe ser approve | reject' } }
    const note = (body.note ?? '').trim()
    if (op === 'reject' && !note) return { status: 400, body: { error: 'El rechazo necesita un motivo.' } }

    // Resolver los elementos: lista explícita o lote completo.
    let items: { table: string; id: string }[] = []
    if (body.lote_id) {
      if (!UUID_RE.test(body.lote_id)) return { status: 400, body: { error: 'lote_id inválido' } }
      for (const e of ENTITIES) {
        const r = (await pool.query(`SELECT x.id FROM ${e.table} x WHERE x.lote_id = $1 AND ${pendingWhere(e)}`, [body.lote_id])).rows
        for (const row of r) items.push({ table: e.table, id: row.id })
      }
    } else {
      items = (body.items ?? []).filter((it) => BY_TABLE.has(it?.table) && UUID_RE.test(it?.id ?? ''))
    }
    if (!items.length) return { status: 400, body: { error: 'Nada que procesar.' } }
    if (items.length > 500) return { status: 400, body: { error: 'Máximo 500 elementos por acción.' } }

    const colTypes = new Map<string, Map<string, string>>()
    const typesFor = async (table: string) => {
      if (!colTypes.has(table)) {
        const r = (await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table])).rows
        colTypes.set(table, new Map(r.map((c: { column_name: string; data_type: string }) => [c.column_name, c.data_type])))
      }
      return colTypes.get(table)!
    }

    const client = await pool.connect()
    const results: { table: string; id: string; result: string; error?: string }[] = []
    try {
      await client.query('BEGIN')
      for (const it of items) {
        const e = BY_TABLE.get(it.table)!
        const cur = (await client.query(`SELECT x.${e.pubCol}::text AS st, x.pending_changes AS pc, x.lote_id FROM ${e.table} x WHERE x.id = $1 FOR UPDATE`, [it.id])).rows[0]
        if (!cur) { results.push({ ...it, result: 'no_encontrado' }); continue }
        const hasPc = cur.pc && typeof cur.pc === 'object' && Object.keys(cur.pc).length > 0

        if (op === 'approve') {
          if (hasPc && (cur.pc as Record<string, unknown>)._delete === true) {
            // Eliminación propuesta (p. ej. una relación quitada por API): aprobar = borrar.
            await client.query(`DELETE FROM ${e.table} WHERE id = $1`, [it.id])
            await audit(client, e.table, it.id, 'delete_approved', cur.st, null, admin, cur.lote_id, null, cur.pc)
            results.push({ ...it, result: 'eliminado' })
          } else if (hasPc) {
            // Aplicar cambios propuestos (solo columnas reales y permitidas, con su tipo).
            const types = await typesFor(e.table)
            const sets: string[] = []
            const vals: unknown[] = []
            for (const [k, v] of Object.entries(cur.pc as Record<string, unknown>)) {
              if (NEVER_APPLY.has(k) || !types.has(k) || !/^[a-z_][a-z0-9_]*$/.test(k)) continue
              const t = types.get(k)
              vals.push(t === 'jsonb' || t === 'json' ? JSON.stringify(v) : t === 'ARRAY' ? (Array.isArray(v) ? v : v == null ? null : [v]) : v)
              sets.push(`"${k}" = $${vals.length}`)
            }
            vals.push(admin.profileId); sets.push(`reviewed_by = $${vals.length}`)
            sets.push(`reviewed_at = now()`, `pending_changes = NULL`)
            if (cur.st === e.pending || cur.st === e.rejected) { vals.push(e.approved); sets.push(`${e.pubCol} = $${vals.length}`) }
            vals.push(it.id)
            await client.query(`UPDATE ${e.table} SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals)
            await audit(client, e.table, it.id, 'changes_approved', cur.st, e.approved, admin, cur.lote_id, null, cur.pc)
            results.push({ ...it, result: 'cambios_aplicados' })
          } else if (cur.st !== e.approved) {
            await client.query(`UPDATE ${e.table} SET ${e.pubCol} = $1, reviewed_by = $2, reviewed_at = now(), review_note = NULL WHERE id = $3`, [e.approved, admin.profileId, it.id])
            await audit(client, e.table, it.id, 'approve', cur.st, e.approved, admin, cur.lote_id, null, null)
            results.push({ ...it, result: 'aprobado' })
          } else {
            results.push({ ...it, result: 'ya_aprobado' })
          }
        } else {
          if (cur.st === e.approved && hasPc) {
            // Registro publicado con cambios propuestos: se descartan los cambios, sigue visible.
            await client.query(`UPDATE ${e.table} SET pending_changes = NULL, review_note = $1, reviewed_by = $2, reviewed_at = now() WHERE id = $3`, [note, admin.profileId, it.id])
            await audit(client, e.table, it.id, 'changes_rejected', cur.st, cur.st, admin, cur.lote_id, note, cur.pc)
            results.push({ ...it, result: 'cambios_descartados' })
          } else if (cur.st !== e.rejected) {
            await client.query(`UPDATE ${e.table} SET ${e.pubCol} = $1, review_note = $2, reviewed_by = $3, reviewed_at = now(), pending_changes = NULL WHERE id = $4`, [e.rejected, note, admin.profileId, it.id])
            await audit(client, e.table, it.id, 'reject', cur.st, e.rejected, admin, cur.lote_id, note, null)
            results.push({ ...it, result: 'rechazado' })
          } else {
            results.push({ ...it, result: 'ya_rechazado' })
          }
        }
      }
      // Una guía aprobada sale con fecha de publicación (si no la tenía).
      const approvedArticles = results.filter((r) => r.table === 'articles' && (r.result === 'aprobado' || r.result === 'cambios_aplicados')).map((r) => r.id)
      if (approvedArticles.length) await client.query(`UPDATE articles SET published_at = COALESCE(published_at, now()) WHERE id = ANY($1) AND is_published = true`, [approvedArticles])
      // Webhooks: record.approved / record.rejected (se encolan en la misma transacción).
      for (const r of results) {
        const ev = r.result === 'aprobado' || r.result === 'cambios_aplicados' || r.result === 'eliminado' ? 'record.approved'
          : r.result === 'rechazado' || r.result === 'cambios_descartados' ? 'record.rejected' : null
        if (ev) await emitEvent(client, ev, { table: r.table, id: r.id, result: r.result, note: op === 'reject' ? note : null, by: admin.label })
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    } finally {
      client.release()
    }
    const done = results.filter((r) => !r.result.startsWith('ya_') && r.result !== 'no_encontrado').length
    return { status: 200, body: { ok: true, processed: done, total: results.length, results } }
  }
}

/** Encola un aviso para cada webhook activo suscrito al evento (lo entrega el cron de /api/v1). */
async function emitEvent(db: { query: (s: string, p?: unknown[]) => Promise<{ rows: any[] }> }, event: string, data: Record<string, unknown>) {
  const hooks = (await db.query(`SELECT id, events FROM webhooks WHERE active = true`)).rows as { id: string; events: string[] | null }[]
  if (!hooks.length) return
  const payload = JSON.stringify({ event, occurred_at: new Date().toISOString(), data })
  for (const h of hooks) {
    if (h.events?.length && !h.events.includes(event)) continue
    await db.query(`INSERT INTO webhook_deliveries (webhook_id, event, payload) VALUES ($1, $2, $3)`, [h.id, event, payload])
  }
}

async function audit(
  client: { query: (s: string, p?: unknown[]) => Promise<unknown> },
  table: string, id: string, action: string, prev: string | null, next: string | null,
  admin: { profileId: string; label: string }, loteId: string | null, note: string | null, changes: unknown,
) {
  await client.query(
    `INSERT INTO review_audit (table_name, record_id, action, prev_status, new_status, actor_profile_id, actor_label, lote_id, note, changes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [table, id, action, prev, next, admin.profileId, admin.label, loteId, note, changes == null ? null : JSON.stringify(changes)],
  )
}

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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
