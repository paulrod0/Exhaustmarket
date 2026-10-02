// scripts/add-review-queue-f1.mjs
// Solicitud nº3 — F1: cola de revisión obligatoria + trazabilidad.
//  - pub_status (pendiente_revision | aprobado | rechazado) en TODAS las tablas de contenido.
//    La visibilidad pública se deriva de él (el facade solo sirve 'aprobado' a no-admins).
//    TODO LO EXISTENTE queda 'aprobado' (DEFAULT) → no cambia la visibilidad de nada publicado
//    (decisión del 7-sep: el catálogo V2 se corrige sin ocultarlo).
//  - origen (admin | api:<clave> | importacion | colaborador:<id> | migracion) + id_externo,
//    con UNIQUE (origen, id_externo) para la idempotencia por integración.
//  - lote_id (lote de API/importación aprobable en bloque), review_note (motivo de rechazo),
//    reviewed_by/at, pending_changes (cambios propuestos por API sobre un registro ya aprobado:
//    no salen al público hasta aprobarse).
//  - updated_at + trigger en todas (filtro "fecha de modificación" de la API y la exportación).
//  - review_audit (quién aprobó/rechazó qué, cuándo, estado anterior/nuevo) e ingest_batches (lotes).
// design_3d ya tenía su propio estado (status pending/approved/rejected): se reutiliza tal cual.
// Idempotente.   node scripts/add-review-queue-f1.mjs
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

// Tablas con su propio pub_status (todas menos design_3d).
const PUB = [
  'vehicles', 'engines', 'exhaust_diagrams', 'exhaust_parts', 'exhaust_aftermarket_products',
  'compatibilities', 'exhaust_schemas', 'articles', 'manuals',
  'schema_article_links', 'schema_manual_links', 'schema_3d_links',
]
// Tablas v2 con status de QA: los legacy_imported pasan a origen = migracion.
const HAS_QA_STATUS = new Set(['vehicles', 'engines', 'exhaust_diagrams', 'exhaust_parts', 'exhaust_aftermarket_products'])

await q(`CREATE OR REPLACE FUNCTION public.em_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql`)

const before = {}
for (const t of [...PUB, 'design_3d']) before[t] = (await q(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n

for (const t of PUB) {
  await q(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS pub_status text NOT NULL DEFAULT 'aprobado'`)
  await q(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS origen text`)
  await q(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS id_externo text`)
  await q(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS lote_id uuid`)
  await q(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS review_note text`)
  await q(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS reviewed_by uuid`)
  await q(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS reviewed_at timestamptz`)
  await q(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS pending_changes jsonb`)
  await q(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`)
  await q(`ALTER TABLE public.${t} DROP CONSTRAINT IF EXISTS ${t}_pub_status_chk`)
  await q(`ALTER TABLE public.${t} ADD CONSTRAINT ${t}_pub_status_chk CHECK (pub_status IN ('pendiente_revision','aprobado','rechazado'))`)
  if (HAS_QA_STATUS.has(t)) {
    await q(`UPDATE public.${t} SET origen = CASE WHEN status = 'legacy_imported' THEN 'migracion' ELSE 'admin' END WHERE origen IS NULL`)
  } else {
    await q(`UPDATE public.${t} SET origen = 'admin' WHERE origen IS NULL`)
  }
  await q(`CREATE UNIQUE INDEX IF NOT EXISTS ux_${t}_origen_idext ON public.${t} (origen, id_externo) WHERE id_externo IS NOT NULL`)
  await q(`CREATE INDEX IF NOT EXISTS ix_${t}_pub_pending ON public.${t} (pub_status) WHERE pub_status <> 'aprobado'`)
  await q(`CREATE INDEX IF NOT EXISTS ix_${t}_lote ON public.${t} (lote_id) WHERE lote_id IS NOT NULL`)
  await q(`DROP TRIGGER IF EXISTS em_touch_updated_at ON public.${t}`)
  await q(`CREATE TRIGGER em_touch_updated_at BEFORE UPDATE ON public.${t} FOR EACH ROW EXECUTE FUNCTION public.em_touch_updated_at()`)
}

// design_3d: estado propio (status). Solo trazabilidad + updated_at.
await q(`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS origen text`)
await q(`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS id_externo text`)
await q(`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS lote_id uuid`)
await q(`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS review_note text`)
await q(`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS pending_changes jsonb`)
await q(`ALTER TABLE public.design_3d ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`)
await q(`UPDATE public.design_3d SET origen = 'admin' WHERE origen IS NULL`)
await q(`CREATE UNIQUE INDEX IF NOT EXISTS ux_design_3d_origen_idext ON public.design_3d (origen, id_externo) WHERE id_externo IS NOT NULL`)
await q(`DROP TRIGGER IF EXISTS em_touch_updated_at ON public.design_3d`)
await q(`CREATE TRIGGER em_touch_updated_at BEFORE UPDATE ON public.design_3d FOR EACH ROW EXECUTE FUNCTION public.em_touch_updated_at()`)

// Auditoría de la revisión.
await q(`CREATE TABLE IF NOT EXISTS public.review_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,            -- create | update | approve | reject | changes_proposed | changes_approved | changes_rejected
  prev_status text,
  new_status text,
  actor_profile_id uuid,
  actor_label text,                -- admin:<email> | api:<clave> | importacion | colaborador:<id>
  lote_id uuid,
  note text,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
)`)
await q(`CREATE INDEX IF NOT EXISTS ix_review_audit_record ON public.review_audit (table_name, record_id)`)
await q(`CREATE INDEX IF NOT EXISTS ix_review_audit_created ON public.review_audit (created_at DESC)`)

// Lotes de ingesta (API / importación), aprobables en bloque.
await q(`CREATE TABLE IF NOT EXISTS public.ingest_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origen text NOT NULL,
  entity text,
  total int NOT NULL DEFAULT 0,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
)`)

// Verificación: mismos recuentos y todo lo existente aprobado.
for (const t of PUB) {
  const r = (await q(`SELECT count(*)::int n, count(*) FILTER (WHERE pub_status = 'aprobado')::int ap,
    count(*) FILTER (WHERE origen = 'migracion')::int mig FROM public.${t}`)).rows[0]
  const ok = r.n === before[t] && r.ap === r.n
  console.log(`${ok ? 'OK ' : 'XX '} ${t.padEnd(30)} filas=${r.n} aprobado=${r.ap} migracion=${r.mig}`)
}
const d = (await q(`SELECT count(*)::int n FROM public.design_3d`)).rows[0]
console.log(`OK  design_3d                      filas=${d.n} (usa su propio status)`)
await pool.end()
