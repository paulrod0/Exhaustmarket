/**
 * Adaptador para que `supabase.auth.*` siga funcionando pero por detrás use
 * Clerk. La sesión y el token los provee `<ClerkProvider>` (ver App.tsx) que
 * registra un callback via `configureAuth()`.
 */

type UnsubscribeHandle = { unsubscribe: () => void }

interface ClerkUserLike {
  id: string
  emailAddresses: { emailAddress: string; id: string }[]
  primaryEmailAddressId: string | null
  fullName: string | null
}

export interface AuthUser {
  id: string
  email: string | null
  user_metadata: { full_name?: string; user_type?: string }
}

let getTokenFn: () => Promise<string | null> = async () => null
let getUserFn: () => ClerkUserLike | null = () => null
let signInFn: (email: string, password: string) => Promise<void> = async () => {
  throw new Error('Clerk not configured')
}
let signUpFn: (
  email: string,
  password: string,
  meta: { fullName: string; userType: string },
) => Promise<void> = async () => {
  throw new Error('Clerk not configured')
}
let signOutFn: () => Promise<void> = async () => {}

const listeners = new Set<(user: AuthUser | null) => void>()

/**
 * Plug Clerk's helpers from a component that has access to its hooks.
 * Called once in App.tsx.
 */
export function configureAuth(opts: {
  getToken: () => Promise<string | null>
  getUser: () => ClerkUserLike | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    meta: { fullName: string; userType: string },
  ) => Promise<void>
  signOut: () => Promise<void>
}): void {
  getTokenFn = opts.getToken
  getUserFn = opts.getUser
  signInFn = opts.signIn
  signUpFn = opts.signUp
  signOutFn = opts.signOut
}

/** Called from App.tsx when Clerk user state changes. */
export function emitAuthChange(user: AuthUser | null): void {
  for (const l of listeners) l(user)
}

function toAuthUser(u: ClerkUserLike | null): AuthUser | null {
  if (!u) return null
  const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
  return {
    id: u.id,
    email: primary?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null,
    user_metadata: { full_name: u.fullName ?? undefined },
  }
}

export const auth = {
  async getSession(): Promise<{ data: { session: { user: AuthUser } | null }; error: null }> {
    const u = toAuthUser(getUserFn())
    return { data: { session: u ? { user: u } : null }, error: null }
  },

  async getUser(): Promise<{ data: { user: AuthUser | null }; error: null }> {
    return { data: { user: toAuthUser(getUserFn()) }, error: null }
  },

  async signInWithPassword({
    email,
    password,
  }: {
    email: string
    password: string
  }): Promise<{ data: { user: AuthUser | null }; error: Error | null }> {
    try {
      await signInFn(email, password)
      return { data: { user: toAuthUser(getUserFn()) }, error: null }
    } catch (e) {
      return { data: { user: null }, error: e as Error }
    }
  },

  async signUp({
    email,
    password,
    options,
  }: {
    email: string
    password: string
    options?: { data?: { full_name?: string; user_type?: string } }
  }): Promise<{ data: { user: AuthUser | null }; error: Error | null }> {
    try {
      await signUpFn(email, password, {
        fullName: options?.data?.full_name ?? '',
        userType: options?.data?.user_type ?? 'standard',
      })
      return { data: { user: toAuthUser(getUserFn()) }, error: null }
    } catch (e) {
      return { data: { user: null }, error: e as Error }
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    try {
      await signOutFn()
      return { error: null }
    } catch (e) {
      return { error: e as Error }
    }
  },

  onAuthStateChange(
    cb: (event: string, session: { user: AuthUser } | null) => void,
  ): { data: { subscription: UnsubscribeHandle } } {
    const listener = (user: AuthUser | null) => {
      cb(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null)
    }
    listeners.add(listener)
    return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } }
  },

  // Token getter for db/storage clients.
  __getToken: () => getTokenFn(),
}
