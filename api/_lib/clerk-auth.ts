// Verify Clerk JWT from request and expose user identity to Vercel Functions
import type { VercelRequest } from '@vercel/node'
import { verifyToken } from '@clerk/backend'
import { sql } from './neon'

export interface AuthedUser {
  clerkId: string
  email: string | null
  profileId: string | null // matches user_profiles.id
  isAdmin: boolean
  userType: 'standard' | 'professional' | 'workshop' | 'premium' | 'manufacturer' | null
}

/**
 * Extracts the Clerk JWT from the `Authorization` header (Bearer <token>) or
 * the `__session` cookie, verifies it, and resolves the matching row in
 * `public.user_profiles`. The profile row is matched by `clerk_id` (preferred)
 * or `email` (fallback during the migration window).
 *
 * Returns `null` for anonymous requests so endpoints can branch easily.
 */
export async function getAuthedUser(req: VercelRequest): Promise<AuthedUser | null> {
  const token = extractToken(req)
  if (!token) return null
  let payload: { sub?: string; email?: string } | null = null
  try {
    payload = (await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })) as any
  } catch (err) {
    console.warn('[clerk-auth] token verify failed', err)
    return null
  }
  const clerkId = payload?.sub
  if (!clerkId) return null
  const email = (payload as any)?.email ?? null

  // Resolve the user_profile row that backs this Clerk identity
  const rows = (await sql`
    SELECT id, email, is_admin, user_type
    FROM public.user_profiles
    WHERE clerk_id = ${clerkId}
       OR (clerk_id IS NULL AND email = ${email})
    LIMIT 1
  `) as Array<{ id: string; email: string | null; is_admin: boolean; user_type: AuthedUser['userType'] }>

  const profile = rows[0]
  return {
    clerkId,
    email,
    profileId: profile?.id ?? null,
    isAdmin: !!profile?.is_admin,
    userType: profile?.user_type ?? null,
  }
}

function extractToken(req: VercelRequest): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  const cookie = req.headers.cookie
  if (!cookie) return null
  const match = cookie.match(/(?:^|;\s*)__session=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}
