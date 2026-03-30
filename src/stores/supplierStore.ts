// src/stores/supplierStore.ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { ApiKey, GeneratedApiKey } from '../types/supplier'
import type { Database } from '../types/database'

type SyncLog = Database['public']['Tables']['supplier_sync_logs']['Row']

interface SupplierState {
  apiKeys: ApiKey[]
  syncLogs: SyncLog[]
  loading: boolean
  error: string | null
  newlyGeneratedKey: string | null  // shown once after generation

  fetchApiKeys: () => Promise<void>
  generateApiKey: (name: string) => Promise<GeneratedApiKey | null>
  revokeApiKey: (id: string) => Promise<void>
  fetchSyncLogs: () => Promise<void>
  clearNewKey: () => void
}

export const useSupplierStore = create<SupplierState>((set) => ({
  apiKeys: [],
  syncLogs: [],
  loading: false,
  error: null,
  newlyGeneratedKey: null,

  fetchApiKeys: async () => {
    set({ loading: true, error: null })
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/supplier-keys`,
      { headers: { Authorization: `Bearer ${session?.access_token}` } }
    )
    const json = await res.json()
    if (!res.ok) {
      set({ loading: false, error: json.error })
      return
    }
    set({ apiKeys: json.keys, loading: false })
  },

  generateApiKey: async (name: string) => {
    set({ loading: true, error: null })
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/supplier-keys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate', name }),
      }
    )
    const json = await res.json()
    if (!res.ok) {
      set({ loading: false, error: json.error })
      return null
    }
    const { full_key, ...keyData } = json
    set(state => ({
      apiKeys: [keyData, ...state.apiKeys],
      newlyGeneratedKey: full_key,
      loading: false,
    }))
    return json as GeneratedApiKey
  },

  revokeApiKey: async (id: string) => {
    set({ loading: true, error: null })
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/supplier-keys`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      }
    )
    set(state => ({
      apiKeys: state.apiKeys.filter(k => k.id !== id),
      loading: false,
    }))
  },

  fetchSyncLogs: async () => {
    const { data, error } = await supabase
      .from('supplier_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50)

    if (!error) set({ syncLogs: data ?? [] })
  },

  clearNewKey: () => set({ newlyGeneratedKey: null }),
}))
