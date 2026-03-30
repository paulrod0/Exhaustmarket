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

export const useSupplierStore = create<SupplierState>((set, get) => ({
  apiKeys: [],
  syncLogs: [],
  loading: false,
  error: null,
  newlyGeneratedKey: null,

  fetchApiKeys: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { set({ loading: false }); return }

      const { data, error } = await supabase.functions.invoke('supplier-keys', {
        method: 'GET',
      })
      if (error) { set({ error: error.message, loading: false }); return }
      set({ apiKeys: data?.keys ?? [], loading: false })
    } catch (err: any) {
      set({ loading: false, error: err.message ?? 'Error' })
    }
  },

  generateApiKey: async (name: string) => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { set({ loading: false }); return null }

      const { data, error } = await supabase.functions.invoke('supplier-keys', {
        method: 'POST',
        body: { action: 'generate', name },
      })
      if (error) { set({ error: error.message, loading: false }); return null }

      const { full_key, ...keyData } = data
      set(state => ({
        apiKeys: [keyData, ...state.apiKeys],
        newlyGeneratedKey: full_key,
        loading: false,
      }))
      return data as GeneratedApiKey
    } catch (err: any) {
      set({ loading: false, error: err.message ?? 'Error' })
      return null
    }
  },

  revokeApiKey: async (id: string) => {
    set({ loading: true, error: null })
    // Keep snapshot for rollback on error
    const snapshot = get().apiKeys
    // Optimistic delete
    set(state => ({ apiKeys: state.apiKeys.filter(k => k.id !== id) }))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { set({ apiKeys: snapshot, loading: false }); return }

      const { error } = await supabase.functions.invoke('supplier-keys', {
        method: 'DELETE',
        body: { id },
      })
      if (error) {
        // Restore snapshot on failure
        set({ apiKeys: snapshot, error: error.message, loading: false })
        return
      }
      set({ loading: false })
    } catch (err: any) {
      set({ apiKeys: snapshot, loading: false, error: err.message ?? 'Error' })
    }
  },

  fetchSyncLogs: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('supplier_sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50)

      if (error) { set({ loading: false, error: error.message }); return }
      set({ syncLogs: data ?? [], loading: false })
    } catch (err: any) {
      set({ loading: false, error: err.message ?? 'Error' })
    }
  },

  clearNewKey: () => set({ newlyGeneratedKey: null }),
}))
