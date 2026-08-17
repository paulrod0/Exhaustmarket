import { Pool } from '@neondatabase/serverless'
import { verifyToken, createClerkClient } from '@clerk/backend'

/**
 * POST /api/me — devuelve el user_profile asociado al usuario Clerk actual.
 * Si no existe, lo enlaza por email a un user_profile pre-existente (admins),
 * o crea uno nuevo. Self-contained.
 *
 * Clerk JWT por defecto NO incluye email; lo sacamos vía createClerkClient.users.getUser.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const header = req.headers.get('authorization')
    if (!header?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)
    const token = header.slice(7)
    const secret = process.env.CLERK_SECRET_KEY
    if (!secret) return json({ error: 'CLERK_SECRET_KEY not set' }, 500)
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) return json({ error: 'DATABASE_URL not set' }, 500)

    let payload: { sub: string }
    try {
      payload = (await verifyToken(token, { secretKey: secret })) as { sub: string }
    } catch (e) {
      return json({ error: 'invalid token: ' + (e as Error).message }, 401)
    }

    const clerk = createClerkClient({ secretKey: secret })
    let email = ''
    let fullName = ''
    try {
      const u = await clerk.users.getUser(payload.sub)
      email = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress
        ?? u.emailAddresses[0]?.emailAddress ?? ''
      fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username || ''
    } catch (e) {
      // continue without email/name
      console.error('clerk user fetch failed', e)
    }

    const pool = new Pool({ connectionString: dbUrl })

    // 1) By clerk_user_id
    const byClerk = await pool.query(
      `SELECT * FROM public.user_profiles WHERE clerk_user_id = $1 LIMIT 1`,
      [payload.sub],
    )
    if (byClerk.rows[0]) return json({ data: byClerk.rows[0] })

    // 2) Claim pre-existing profile by email (admins)
    if (email) {
      const byEmail = await pool.query(
        `SELECT * FROM public.user_profiles WHERE email = $1 LIMIT 1`,
        [email],
      )
      if (byEmail.rows[0]) {
        const claimed = await pool.query(
          `UPDATE public.user_profiles SET clerk_user_id = $1 WHERE id = $2 AND clerk_user_id IS NULL RETURNING *`,
          [payload.sub, byEmail.rows[0].id],
        )
        return json({ data: claimed.rows[0] ?? byEmail.rows[0] })
      }
    }

    // 3) Create new
    const created = await pool.query(
      `INSERT INTO public.user_profiles (clerk_user_id, email, full_name, user_type)
       VALUES ($1, $2, $3, 'standard') RETURNING *`,
      [payload.sub, email, fullName],
    )
    return json({ data: created.rows[0] })
  } catch (e) {
    console.error('me endpoint error', e)
    return json({ error: (e as Error).message }, 500)
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
