// scripts/add-import-export-f4fields.mjs
// Solicitud nº3 — punto 3 (importación/exportación) + campos del punto 6 para componentes OEM:
//  - exhaust_parts.source_url_2 ("Fuente 2 (URL)" separada). Hoy las dos fuentes van en
//    source_url separadas por " | " → se migran partiendo por ese separador.
//  - exhaust_parts.verification_status (candidato | verificado | descatalogado), INDEPENDIENTE de
//    confidence. Backfill: 'verificado' si el QA ya lo aprobó, 'candidato' en el resto.
//  - exhaust_parts.variant ("Condición/variante": norma, cambio, fechas…).
//  - data_exports: registro de exportaciones (nocturnas y manuales) guardadas en R2.
// Idempotente.   node scripts/add-import-export-f4fields.mjs
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

const before = (await q(`SELECT count(*) FILTER (WHERE source_url LIKE '% | %')::int n FROM exhaust_parts`)).rows[0].n

await q(`ALTER TABLE public.exhaust_parts ADD COLUMN IF NOT EXISTS source_url_2 text`)
await q(`ALTER TABLE public.exhaust_parts ADD COLUMN IF NOT EXISTS verification_status text`)
await q(`ALTER TABLE public.exhaust_parts ADD COLUMN IF NOT EXISTS variant text`)

// Separar "fuente1 | fuente2" (solo donde aún no se hizo). La trigger de updated_at se desactiva
// para esta corrección estructural (no es una modificación de contenido).
await q(`ALTER TABLE public.exhaust_parts DISABLE TRIGGER em_touch_updated_at`)
await q(`UPDATE public.exhaust_parts
  SET source_url_2 = NULLIF(trim(split_part(source_url, ' | ', 2)), ''),
      source_url   = NULLIF(trim(split_part(source_url, ' | ', 1)), '')
  WHERE source_url LIKE '% | %' AND source_url_2 IS NULL`)
await q(`UPDATE public.exhaust_parts
  SET verification_status = CASE WHEN status = 'approved' THEN 'verificado' ELSE 'candidato' END
  WHERE verification_status IS NULL`)
await q(`ALTER TABLE public.exhaust_parts ENABLE TRIGGER em_touch_updated_at`)

await q(`ALTER TABLE public.exhaust_parts ALTER COLUMN verification_status SET DEFAULT 'candidato'`)
await q(`ALTER TABLE public.exhaust_parts DROP CONSTRAINT IF EXISTS exhaust_parts_verification_chk`)
await q(`ALTER TABLE public.exhaust_parts ADD CONSTRAINT exhaust_parts_verification_chk CHECK (verification_status IS NULL OR verification_status IN ('candidato','verificado','descatalogado'))`)

await q(`CREATE TABLE IF NOT EXISTS public.data_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,              -- nightly | manual
  export_date date NOT NULL,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{entity, key, rows, bytes}]
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
)`)
await q(`CREATE INDEX IF NOT EXISTS ix_data_exports_date ON public.data_exports (export_date DESC)`)

const after = (await q(`SELECT
  count(*) FILTER (WHERE source_url LIKE '% | %')::int still_joined,
  count(*) FILTER (WHERE source_url_2 IS NOT NULL)::int with_src2,
  count(*) FILTER (WHERE verification_status = 'verificado')::int verificado,
  count(*) FILTER (WHERE verification_status = 'candidato')::int candidato
  FROM exhaust_parts`)).rows[0]
console.log(`fuentes unidas antes=${before} → ahora=${after.still_joined} · con fuente 2=${after.with_src2}`)
console.log(`verificación: verificado=${after.verificado} · candidato=${after.candidato}`)
console.log('data_exports: OK')
await pool.end()
