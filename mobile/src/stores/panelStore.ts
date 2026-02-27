import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface PanelStats {
  totalRevenue: number
  monthlyRevenue: number
  totalOrders: number
  pendingQuotes: number
}

interface PanelState {
  myProducts: any[]
  myServices: any[]
  myTransactions: any[]
  myInvoices: any[]
  catalogSources: any[]
  stats: PanelStats
  loading: boolean
  error: string | null
  fetchMyProducts: () => Promise<void>
  createProduct: (product: any) => Promise<void>
  updateProduct: (id: string, updates: any) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  fetchMyServices: () => Promise<void>
  createService: (service: any) => Promise<void>
  updateService: (id: string, updates: any) => Promise<void>
  deleteService: (id: string) => Promise<void>
  fetchMyTransactions: () => Promise<void>
  fetchMyInvoices: () => Promise<void>
  createInvoice: (invoice: any) => Promise<void>
  generateInvoicePdf: (invoiceId: string) => Promise<string | null>
  fetchCatalogSources: () => Promise<void>
  addCatalogSource: (source: any) => Promise<void>
  deleteCatalogSource: (id: string) => Promise<void>
  triggerSync: (sourceId: string) => Promise<void>
  fetchStats: () => Promise<void>
}

export const usePanelStore = create<PanelState>((set, get) => ({
  myProducts: [],
  myServices: [],
  myTransactions: [],
  myInvoices: [],
  catalogSources: [],
  stats: { totalRevenue: 0, monthlyRevenue: 0, totalOrders: 0, pendingQuotes: 0 },
  loading: false,
  error: null,

  fetchMyProducts: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('professional_products').select('*').eq('professional_id', user.id).order('created_at', { ascending: false })
    if (error) { set({ error: error.message }); return }
    set({ myProducts: data ?? [] })
  },

  createProduct: async (product) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const { error } = await supabase.from('professional_products').insert({ ...product, professional_id: user.id })
    if (error) throw error
    await get().fetchMyProducts()
  },

  updateProduct: async (id, updates) => {
    const { error } = await supabase.from('professional_products').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    await get().fetchMyProducts()
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('professional_products').delete().eq('id', id)
    if (error) throw error
    await get().fetchMyProducts()
  },

  fetchMyServices: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('workshop_services').select('*').eq('workshop_id', user.id).order('created_at', { ascending: false })
    if (error) { set({ error: error.message }); return }
    set({ myServices: data ?? [] })
  },

  createService: async (service) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const { error } = await supabase.from('workshop_services').insert({ ...service, workshop_id: user.id })
    if (error) throw error
    await get().fetchMyServices()
  },

  updateService: async (id, updates) => {
    const { error } = await supabase.from('workshop_services').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    await get().fetchMyServices()
  },

  deleteService: async (id) => {
    const { error } = await supabase.from('workshop_services').delete().eq('id', id)
    if (error) throw error
    await get().fetchMyServices()
  },

  fetchMyTransactions: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('transactions').select('*, buyer:user_profiles!buyer_id(full_name)').eq('seller_id', user.id).order('created_at', { ascending: false })
    if (error) { set({ error: error.message }); return }
    set({ myTransactions: data ?? [] })
  },

  fetchMyInvoices: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('invoices').select('*').eq('seller_id', user.id).order('created_at', { ascending: false })
    if (error) { set({ error: error.message }); return }
    set({ myInvoices: data ?? [] })
  },

  createInvoice: async (invoiceData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const { error } = await supabase.from('invoices').insert({
      invoice_number: `INV-${dateStr}-${rand}`,
      seller_id: user.id,
      ...invoiceData,
    })
    if (error) throw error
    await get().fetchMyInvoices()
  },

  generateInvoicePdf: async (invoiceId) => {
    const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
      body: { invoice_id: invoiceId },
    })
    if (error) { set({ error: error.message }); return null }
    await get().fetchMyInvoices()
    return data?.pdf_url ?? null
  },

  fetchCatalogSources: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('catalog_sources').select('*').eq('workshop_id', user.id).order('created_at', { ascending: false })
    if (error) { set({ error: error.message }); return }
    set({ catalogSources: data ?? [] })
  },

  addCatalogSource: async (source) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const { error } = await supabase.from('catalog_sources').insert({ workshop_id: user.id, ...source })
    if (error) throw error
    await get().fetchCatalogSources()
  },

  deleteCatalogSource: async (id) => {
    const { error } = await supabase.from('catalog_sources').delete().eq('id', id)
    if (error) throw error
    await get().fetchCatalogSources()
  },

  triggerSync: async (sourceId) => {
    await supabase.from('catalog_sources').update({ sync_status: 'syncing' } as any).eq('id', sourceId)
    const { error } = await supabase.functions.invoke('sync-catalog', { body: { catalog_source_id: sourceId } })
    if (error) set({ error: error.message })
    await get().fetchCatalogSources()
  },

  fetchStats: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const [totalRes, monthlyRes, ordersRes, quotesRes] = await Promise.all([
      supabase.from('transactions').select('amount').eq('seller_id', user.id).eq('status', 'completed'),
      supabase.from('transactions').select('amount').eq('seller_id', user.id).eq('status', 'completed').gte('created_at', firstOfMonth),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
      supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('target_user_id', user.id).eq('status', 'pending'),
    ])
    set({
      stats: {
        totalRevenue: (totalRes.data ?? []).reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0),
        monthlyRevenue: (monthlyRes.data ?? []).reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0),
        totalOrders: ordersRes.count ?? 0,
        pendingQuotes: quotesRes.count ?? 0,
      },
    })
  },
}))
