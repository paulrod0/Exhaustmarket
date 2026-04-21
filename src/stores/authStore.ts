import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { supabase } from '../lib/supabase'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  signUp: (email: string, password: string, fullName: string, userType: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  fetchProfile: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  signUp: async (email, password, fullName, userType) => {
    // El trigger on_auth_user_created crea automáticamente user_profile con los
    // valores de raw_user_meta_data (full_name, user_type). Aquí solo hay que
    // asegurarse de pasarlos en options.data.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          user_type: userType,
        },
      },
    })

    if (error) throw error
    if (!data.user) throw new Error('No user returned')

    // Defensa: si por algún motivo el trigger no existe o no se ejecutó,
    // hacemos upsert del perfil. El trigger usa ON CONFLICT DO NOTHING,
    // así que llamar a upsert desde aquí también es seguro.
    await supabase
      .from('user_profiles')
      .upsert(
        {
          id: data.user.id,
          full_name: fullName,
          user_type: userType,
        } as any,
        { onConflict: 'id' },
      )

    set({ user: data.user })
    await get().fetchProfile()
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    set({ user: data.user })
    await get().fetchProfile()
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    set({ user: null, profile: null })
  },

  fetchProfile: async () => {
    const user = get().user
    if (!user) {
      set({ profile: null })
      return
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw error

    set({ profile: data })
  },

  updateProfile: async (updates) => {
    const user = get().user
    if (!user) throw new Error('No user logged in')

    const { error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', user.id)

    if (error) throw error

    await get().fetchProfile()
  },
}))
