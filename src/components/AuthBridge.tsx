import { useEffect } from 'react'
import { useAuth, useUser, useClerk, useSignIn, useSignUp } from '@clerk/clerk-react'
import { configureAuth, emitAuthChange } from '../lib/auth-client'
import { useAuthStore } from '../stores/authStore'

/**
 * Componente sin UI. Conecta los hooks de Clerk con `auth-client.ts` y el
 * `authStore` para evitar la carrera de inicializacion (App.tsx llamaba a
 * supabase.auth.getSession() antes de que AuthBridge configurara el provider,
 * causando user=null inicial y loop login<->dashboard).
 */
export default function AuthBridge(): null {
  const { isLoaded, getToken } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const { signOut } = useClerk()
  const { signIn: clerkSignIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp: clerkSignUp, isLoaded: signUpLoaded } = useSignUp()
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)
  const setProfile = useAuthStore((s) => s.setProfile)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)

  // 1) Wire Clerk into the legacy supabase.auth.* facade.
  useEffect(() => {
    configureAuth({
      getToken: async () => {
        try {
          return (await getToken()) ?? null
        } catch {
          return null
        }
      },
      getUser: () => (user ? mapUser(user) : null),
      signIn: async (email, password) => {
        if (!signInLoaded || !clerkSignIn) throw new Error('signIn not ready')
        const result = await clerkSignIn.create({ identifier: email, password })
        if (result.status !== 'complete') {
          throw new Error(`signIn status: ${result.status}`)
        }
      },
      signUp: async (email, password, meta) => {
        if (!signUpLoaded || !clerkSignUp) throw new Error('signUp not ready')
        const result = await clerkSignUp.create({
          emailAddress: email,
          password,
          unsafeMetadata: { user_type: meta.userType, full_name: meta.fullName },
        })
        if (result.status !== 'complete') {
          throw new Error(`signUp status: ${result.status}`)
        }
      },
      signOut: async () => {
        await signOut()
      },
    })
  }, [getToken, user, signOut, clerkSignIn, signInLoaded, clerkSignUp, signUpLoaded])

  // 2) Drive the authStore directly from Clerk state (autoritativo).
  //    Esto evita el bootstrap viejo en App.tsx que daba null antes de tiempo.
  useEffect(() => {
    if (!isLoaded || !userLoaded) return
    if (user) {
      const mapped = {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        user_metadata: { full_name: user.fullName ?? undefined },
      }
      setUser(mapped)
      // fetchProfile usa /api/me con JWT de Clerk → reclama profile admin por email
      fetchProfile().catch(console.error).finally(() => setLoading(false))
      emitAuthChange(mapped)
    } else {
      setUser(null)
      setProfile(null)
      setLoading(false)
      emitAuthChange(null)
    }
  }, [isLoaded, userLoaded, user, setUser, setProfile, setLoading, fetchProfile])

  return null
}

function mapUser(u: { id: string; emailAddresses: { emailAddress: string; id: string }[]; primaryEmailAddressId: string | null; fullName: string | null }) {
  return {
    id: u.id,
    emailAddresses: u.emailAddresses,
    primaryEmailAddressId: u.primaryEmailAddressId,
    fullName: u.fullName,
  }
}
