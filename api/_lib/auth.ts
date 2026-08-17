import { verifyToken } from '@clerk/backend'
import { sql } from './db'

export interface AuthContext {
  /** Clerk user ID (sub claim, format `user_xxx`). */
  userId: string
  /** Email del usuario segun el JWT. */
  email: string | null
  /** UUID del user_profiles asociado. */
  profileId: string | null
  /** True si user_profiles.is_admin = true. */
  isAdmin: boolean
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

interface JwtPayload {
  sub: string
  email?: string
}

export async function getAuth(req: Request): Promise<AuthContext | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return null
  const token = header.slice(7)
  let payload: JwtPayload
  try {
    payload = (await verifyToken(token, { secretKey: secret })) as JwtPayload
  } catch {
    return null
  }

  const rows = (await sql`
    SELECT id, is_admin FROM public.user_profiles
    WHERE clerk_user_id = ${payload.sub}
       OR (clerk_user_id IS NULL AND email = ${payload.email ?? ''})
    LIMIT 1
  `) as { id: string; is_admin: boolean }[]

  return {
    userId: payload.sub,
    email: payload.email ?? null,
    profileId: rows[0]?.id ?? null,
    isAdmin: Boolean(rows[0]?.is_admin),
  }
}

export async function requireAuth(req: Request): Promise<AuthContext> {
  const auth = await getAuth(req)
  if (!auth) throw new HttpError(401, 'unauthorized')
  return auth
}
