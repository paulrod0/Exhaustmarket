// scripts/add-collaborator-form.mjs
// Formulario de colaboradores (deadline Daniel, semana 7-sep-2026):
//   1) user_profiles.is_collaborator (bool) → quién puede acceder al formulario.
//   2) tabla schema_submissions → borradores que envía un COLABORADOR (no admin),
//      guardados como 'pending' hasta que un admin los revisa/publica.
// Idempotente.  Uso:  node scripts/add-collaborator-form.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) {
  try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ }
}
const url = (env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) throw new Error('DATABASE_URL no encontrada en .env.new / .env')
const sql = neon(url)

// 1) Rol colaborador
await sql`ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_collaborator boolean NOT NULL DEFAULT false`

// 2) Envíos de esquemas de colaboradores. Guardamos el formulario completo en un
//    único blob jsonb `data` (misma forma que exhaust_schemas) para no acoplarnos a
//    los tipos exactos de columna; el admin lo promociona a exhaust_schemas al aprobar.
await sql`
  CREATE TABLE IF NOT EXISTS public.schema_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending',          -- pending | approved | rejected
    title text,                                       -- "Porsche 911 GT3" (para la lista)
    data jsonb NOT NULL DEFAULT '{}'::jsonb,          -- payload completo del esquema
    reviewed_by uuid REFERENCES public.user_profiles(id),
    reviewed_at timestamptz,
    review_notes text,
    published_schema_id uuid,                          -- id en exhaust_schemas si se publicó
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`
await sql`CREATE INDEX IF NOT EXISTS idx_schema_submissions_submitted_by ON public.schema_submissions (submitted_by)`
await sql`CREATE INDEX IF NOT EXISTS idx_schema_submissions_status ON public.schema_submissions (status)`

const colParent = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='is_collaborator'`
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='schema_submissions' ORDER BY ordinal_position`
console.log('user_profiles.is_collaborator:', colParent.length ? 'OK' : 'FALTA')
console.log('schema_submissions cols:', cols.map((c) => c.column_name).join(', '))
