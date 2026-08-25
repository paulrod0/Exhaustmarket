import { Pool } from '@neondatabase/serverless'

/**
 * Directorio público de talleres/profesionales con ubicación, para el mapa.
 * Endpoint dedicado (NO pasa por el facade /api/db, que scopea user_profiles al dueño):
 * expone SOLO info de negocio (nombre comercial, tipo, dirección, coords) de quienes han
 * puesto su dirección. Self-contained (sin _lib: rompe en Vercel).
 */
export async function GET(): Promise<Response> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const r = await pool.query(
      `SELECT id,
              COALESCE(NULLIF(company_name, ''), full_name) AS name,
              user_type, address, latitude, longitude, is_verified
         FROM public.user_profiles
        WHERE user_type IN ('workshop', 'professional')
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY is_verified DESC, name`,
    )
    return json({ data: r.rows })
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'error' }, 500)
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=120' },
  })
}
