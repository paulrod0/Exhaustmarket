import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Product = Database['public']['Tables']['professional_products']['Row']
type ProductInsert = Database['public']['Tables']['professional_products']['Insert']
type ProductUpdate = Database['public']['Tables']['professional_products']['Update']
type Service = Database['public']['Tables']['workshop_services']['Row']
type ServiceInsert = Database['public']['Tables']['workshop_services']['Insert']
type ServiceUpdate = Database['public']['Tables']['workshop_services']['Update']
type Transaction = Database['public']['Tables']['transactions']['Row']
type Invoice = Database['public']['Tables']['invoices']['Row']
type CatalogSource = Database['public']['Tables']['catalog_sources']['Row']

interface PanelStats {
  totalRevenue: number
  monthlyRevenue: number
  totalOrders: number
  pendingQuotes: number
}

interface PanelState {
  myProducts: Product[]
  myServices: Service[]
  myTransactions: (Transaction & { buyer?: { full_name: string } })[]
  myInvoices: Invoice[]
  catalogSources: CatalogSource[]
  stats: PanelStats
  loading: boolean
  error: string | null
  // Products CRUD
  fetchMyProducts: () => Promise<void>
  createProduct: (product: Omit<ProductInsert, 'professional_id'>) => Promise<void>
  updateProduct: (id: string, updates: ProductUpdate) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  // Services CRUD
  fetchMyServices: () => Promise<void>
  createService: (service: Omit<ServiceInsert, 'workshop_id'>) => Promise<void>
  updateService: (id: string, updates: ServiceUpdate) => Promise<void>
  deleteService: (id: string) => Promise<void>
  // Transactions & Invoices
  fetchMyTransactions: () => Promise<void>
  fetchMyInvoices: () => Promise<void>
  createInvoice: (invoice: {
    buyer_id?: string
    transaction_id?: string
    items: any[]
    subtotal: number
    tax_amount: number
    total: number
    notes?: string
    due_at?: string
  }) => Promise<void>
  generateInvoicePdf: (invoiceId: string) => Promise<string | null>
  // Catalog sync
  fetchCatalogSources: () => Promise<void>
  addCatalogSource: (source: { source_type: string; url?: string; file_url?: string; mapping?: any }) => Promise<void>
  deleteCatalogSource: (id: string) => Promise<void>
  triggerSync: (sourceId: string) => Promise<void>
  // Stats
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

  // --- Products ---
  fetchMyProducts: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('professional_products')
      .select('*')
      .eq('professional_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message }); return }
    set({ myProducts: data ?? [] })
  },

  createProduct: async (product) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { error } = await supabase
      .from('professional_products')
      .insert({ ...product, professional_id: user.id } as any)

    if (error) throw error
    await get().fetchMyProducts()
  },

  updateProduct: async (id, updates) => {
    const { error } = await supabase
      .from('professional_products')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)

    if (error) throw error
    await get().fetchMyProducts()
  },

  deleteProduct: async (id) => {
    const { error } = await supabase
      .from('professional_products')
      .delete()
      .eq('id', id)

    if (error) throw error
    await get().fetchMyProducts()
  },

  // --- Services ---
  fetchMyServices: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('workshop_services')
      .select('*')
      .eq('workshop_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message }); return }
    set({ myServices: data ?? [] })
  },

  createService: async (service) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { error } = await supabase
      .from('workshop_services')
      .insert({ ...service, workshop_id: user.id } as any)

    if (error) throw error
    await get().fetchMyServices()
  },

  updateService: async (id, updates) => {
    const { error } = await supabase
      .from('workshop_services')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)

    if (error) throw error
    await get().fetchMyServices()
  },

  deleteService: async (id) => {
    const { error } = await supabase
      .from('workshop_services')
      .delete()
      .eq('id', id)

    if (error) throw error
    await get().fetchMyServices()
  },

  // --- Transactions ---
  fetchMyTransactions: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('transactions')
      .select('*, buyer:user_profiles!buyer_id(full_name)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message }); return }
    set({ myTransactions: data as any ?? [] })
  },

  // --- Invoices ---
  fetchMyInvoices: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message }); return }
    set({ myInvoices: data ?? [] })
  },

  createInvoice: async (invoiceData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    // Generate invoice number: INV-YYYYMMDD-XXXX
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const invoiceNumber = `INV-${dateStr}-${rand}`

    const { error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        seller_id: user.id,
        buyer_id: invoiceData.buyer_id,
        transaction_id: invoiceData.transaction_id,
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        tax_amount: invoiceData.tax_amount,
        total: invoiceData.total,
        notes: invoiceData.notes,
        due_at: invoiceData.due_at,
      } as any)

    if (error) throw error
    await get().fetchMyInvoices()
  },

  generateInvoicePdf: async (invoiceId) => {
    const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
      body: { invoice_id: invoiceId },
    })

    if (error) {
      set({ error: error.message })
      return null
    }

    await get().fetchMyInvoices()
    return data?.pdf_url ?? null
  },

  // --- Catalog Sync ---
  fetchCatalogSources: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('catalog_sources')
      .select('*')
      .eq('workshop_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message }); return }
    set({ catalogSources: data ?? [] })
  },

  addCatalogSource: async (source) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { error } = await supabase
      .from('catalog_sources')
      .insert({
        workshop_id: user.id,
        source_type: source.source_type,
        url: source.url,
        file_url: source.file_url,
        mapping: source.mapping ?? {},
      } as any)

    if (error) throw error
    await get().fetchCatalogSources()
  },

  deleteCatalogSource: async (id) => {
    const { error } = await supabase
      .from('catalog_sources')
      .delete()
      .eq('id', id)

    if (error) throw error
    await get().fetchCatalogSources()
  },

  triggerSync: async (sourceId) => {
    // Update status to syncing
    await supabase
      .from('catalog_sources')
      .update({ sync_status: 'syncing' } as any)
      .eq('id', sourceId)

    const { error } = await supabase.functions.invoke('sync-catalog', {
      body: { catalog_source_id: sourceId },
    })

    if (error) {
      set({ error: error.message })
    }

    await get().fetchCatalogSources()
  },

  // --- Stats ---
  fetchStats: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [totalRes, monthlyRes, ordersRes, quotesRes] = await Promise.all([
      supabase.from('transactions').select('amount').eq('seller_id', user.id).eq('status', 'completed'),
      supabase.from('transactions').select('amount').eq('seller_id', user.id).eq('status', 'completed').gte('created_at', firstOfMonth),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
      supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('target_user_id', user.id).eq('status', 'pending'),
    ])

    const totalRevenue = (totalRes.data ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0)
    const monthlyRevenue = (monthlyRes.data ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0)

    set({
      stats: {
        totalRevenue,
        monthlyRevenue,
        totalOrders: ordersRes.count ?? 0,
        pendingQuotes: quotesRes.count ?? 0,
      },
    })
  },
}))
