// scripts/add-quote-visit-fases2-4.mjs
// Módulo de visita de diagnóstico — FASES 2-4 (PDF ExhaustMarket_modulo_visita_diagnostico.pdf).
//  - diagnostic_visits: propuesta del taller (motivo, duración, gratis/pago/descontable, franjas,
//    condiciones), aceptación del cliente, cita, visita realizada / cliente no presentado, reclamación.
//  - final_quotes: presupuesto final tras la visita (diagnóstico, solución, materiales, mano de obra,
//    precio, descuento automático de la visita, garantía, fotos, condiciones) + decisión del cliente.
//  - quote_messages (preguntar / aclaraciones), quote_events (historial: fechas, importes, condiciones),
//    workshop_ratings (solo tras visita real o trabajo contratado), notifications (avisos in-app).
//  - quote_requests.status con los estados del PDF (CHECK) + vehicle_id/engine_id del catálogo.
//  - user_profiles.offers_free_visit (etiqueta «Visita de diagnóstico gratuita disponible»).
// Idempotente.   node scripts/add-quote-visit-fases2-4.mjs
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
const chk = async (name, sql) => { if (!(await q(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [name])).rows.length) await q(sql) }

// ── quote_requests ──
await q(`ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS vehicle_id uuid`)
await q(`ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS engine_id uuid`)
await q(`ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS closed_reason text`)
await q(`UPDATE public.quote_requests SET status = 'contracted' WHERE status = 'accepted'`)
await q(`UPDATE public.quote_requests SET status = 'pending' WHERE status IS NULL`)
await q(`ALTER TABLE public.quote_requests ALTER COLUMN status SET DEFAULT 'pending'`)
await q(`ALTER TABLE public.quote_requests ALTER COLUMN status SET NOT NULL`)
await chk('quote_requests_status_chk', `ALTER TABLE public.quote_requests ADD CONSTRAINT quote_requests_status_chk CHECK (status IN (
  'pending','info_requested','quoted','visit_requested','visit_accepted','visit_rejected','visit_scheduled','client_no_show',
  'visit_done','final_sent','contracted','final_rejected','rejected','closed','cancelled'))`)
await q(`CREATE INDEX IF NOT EXISTS ix_quote_requests_user ON public.quote_requests (user_id, created_at DESC)`)
await q(`CREATE INDEX IF NOT EXISTS ix_quote_requests_target ON public.quote_requests (target_user_id, created_at DESC)`)

await q(`ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS offers_free_visit boolean NOT NULL DEFAULT false`)

// ── visitas ──
await q(`CREATE TABLE IF NOT EXISTS public.diagnostic_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL UNIQUE REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL,
  client_id uuid NOT NULL,
  reasons text[] NOT NULL DEFAULT '{}',
  reason_other text,
  explanation text NOT NULL,
  duration_min int NOT NULL CHECK (duration_min BETWEEN 5 AND 480),
  pricing text NOT NULL DEFAULT 'descontable' CHECK (pricing IN ('gratis','pago','descontable')),
  fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditions text,
  status text NOT NULL DEFAULT 'propuesta' CHECK (status IN ('propuesta','aceptada','rechazada','programada','realizada','cliente_no_presentado','cancelada')),
  conditions_accepted_at timestamptz,
  rejected_reason text,
  scheduled_at timestamptz,
  reminder_sent_at timestamptz,
  reschedule_count int NOT NULL DEFAULT 0,
  fee_status text NOT NULL DEFAULT 'no_aplica' CHECK (fee_status IN ('no_aplica','pendiente','cobrado','devuelto')),
  done_at timestamptz,
  done_notes text,
  done_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  no_show_at timestamptz,
  claim_status text CHECK (claim_status IN ('abierta','resuelta')),
  claim_reason text,
  claim_opened_at timestamptz,
  claim_resolution text,
  claim_refund boolean,
  claim_resolved_at timestamptz,
  claim_resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diagnostic_visits_fee_chk CHECK ((pricing = 'gratis' AND fee = 0) OR (pricing <> 'gratis' AND fee > 0))
)`)
await q(`CREATE INDEX IF NOT EXISTS ix_diagnostic_visits_sched ON public.diagnostic_visits (scheduled_at) WHERE status = 'programada'`)
await q(`CREATE INDEX IF NOT EXISTS ix_diagnostic_visits_claim ON public.diagnostic_visits (claim_status) WHERE claim_status IS NOT NULL`)

// ── presupuesto final ──
await q(`CREATE TABLE IF NOT EXISTS public.final_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL UNIQUE REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.diagnostic_visits(id) ON DELETE SET NULL,
  workshop_id uuid NOT NULL,
  client_id uuid NOT NULL,
  diagnosis text NOT NULL,
  solution text NOT NULL,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  labor_hours numeric(7,2) CHECK (labor_hours IS NULL OR labor_hours >= 0),
  labor_price numeric(10,2) CHECK (labor_price IS NULL OR labor_price >= 0),
  materials_price numeric(10,2) CHECK (materials_price IS NULL OR materials_price >= 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price > 0),
  visit_discount numeric(10,2) NOT NULL DEFAULT 0 CHECK (visit_discount >= 0),
  amount_due numeric(10,2) NOT NULL CHECK (amount_due >= 0),
  work_time text,
  availability text,
  warranty text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditions text,
  valid_until date,
  status text NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado','aceptado','rechazado')),
  decided_at timestamptz,
  decision_reason text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`)

// ── mensajes, historial, valoraciones, notificaciones ──
await q(`CREATE TABLE IF NOT EXISTS public.quote_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('client','workshop','admin')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
)`)
await q(`CREATE INDEX IF NOT EXISTS ix_quote_messages_req ON public.quote_messages (quote_request_id, created_at)`)
await q(`CREATE TABLE IF NOT EXISTS public.quote_events (
  id bigserial PRIMARY KEY,
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text NOT NULL,
  type text NOT NULL,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
)`)
await q(`CREATE INDEX IF NOT EXISTS ix_quote_events_req ON public.quote_events (quote_request_id, created_at)`)
await q(`CREATE TABLE IF NOT EXISTS public.workshop_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL UNIQUE REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL,
  client_id uuid NOT NULL,
  visit_id uuid,
  trato smallint NOT NULL CHECK (trato BETWEEN 1 AND 5),
  puntualidad smallint NOT NULL CHECK (puntualidad BETWEEN 1 AND 5),
  claridad smallint NOT NULL CHECK (claridad BETWEEN 1 AND 5),
  profesionalidad smallint NOT NULL CHECK (profesionalidad BETWEEN 1 AND 5),
  instalaciones smallint NOT NULL CHECK (instalaciones BETWEEN 1 AND 5),
  overall numeric(3,2) GENERATED ALWAYS AS (((trato + puntualidad + claridad + profesionalidad + instalaciones)::numeric / 5)) STORED,
  comment text CHECK (comment IS NULL OR length(comment) <= 2000),
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
)`)
await q(`CREATE INDEX IF NOT EXISTS ix_workshop_ratings_ws ON public.workshop_ratings (workshop_id)`)
await q(`CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
)`)
await q(`CREATE INDEX IF NOT EXISTS ix_notifications_user ON public.notifications (user_id, created_at DESC)`)
await q(`CREATE INDEX IF NOT EXISTS ix_notifications_unread ON public.notifications (user_id) WHERE read_at IS NULL`)

for (const t of ['diagnostic_visits', 'final_quotes', 'quote_messages', 'quote_events', 'workshop_ratings', 'notifications']) {
  const n = (await q(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [t])).rows[0].n
  console.log(`${t}: ${n} columnas`)
}
await pool.end()
