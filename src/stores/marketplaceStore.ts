import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Product = Database['public']['Tables']['professional_products']['Row']
type Service = Database['public']['Tables']['workshop_services']['Row']

export interface MarketplaceListing {
  id: string
  type: 'product' | 'service'
  name: string
  description: string
  price: number
  stock?: number
  category: string
  images: string[]
  is_active: boolean
  seller_id: string
  seller_name: string
  seller_company: string | null
  created_at: string
}

interface ProductFilters {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
}

interface MarketplaceState {
  products: (Product & { seller: { full_name: string; company_name: string | null } })[]
  services: (Service & { seller: { full_name: string; company_name: string | null } })[]
  listings: MarketplaceListing[]
  loading: boolean
  error: string | null
  filters: ProductFilters
  setFilters: (filters: ProductFilters) => void
  fetchProducts: () => Promise<void>
  fetchServices: () => Promise<void>
  fetchAllListings: () => Promise<void>
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  products: [],
  services: [],
  listings: [],
  loading: false,
  error: null,
  filters: {},

  setFilters: (filters) => set({ filters }),

  fetchProducts: async () => {
    const { data, error } = await supabase
      .from('professional_products')
      .select('*, seller:user_profiles!professional_id(full_name, company_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message })
      return
    }

    set({ products: data as any })
  },

  fetchServices: async () => {
    const { data, error } = await supabase
      .from('workshop_services')
      .select('*, seller:user_profiles!workshop_id(full_name, company_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message })
      return
    }

    set({ services: data as any })
  },

  fetchAllListings: async () => {
    set({ loading: true, error: null })

    try {
      await Promise.all([get().fetchProducts(), get().fetchServices()])

      const { products, services, filters } = get()

      let listings: MarketplaceListing[] = [
        ...products.map((p) => ({
          id: p.id,
          type: 'product' as const,
          name: p.product_name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          category: p.category,
          images: p.images,
          is_active: p.is_active,
          seller_id: p.professional_id,
          seller_name: p.seller?.full_name ?? '',
          seller_company: p.seller?.company_name ?? null,
          created_at: p.created_at,
        })),
        ...services.map((s) => ({
          id: s.id,
          type: 'service' as const,
          name: s.service_name,
          description: s.description,
          price: s.base_price,
          category: s.category,
          images: s.images,
          is_active: s.is_active,
          seller_id: s.workshop_id,
          seller_name: s.seller?.full_name ?? '',
          seller_company: s.seller?.company_name ?? null,
          created_at: s.created_at,
        })),
      ]

      // Apply filters
      if (filters.search) {
        const q = filters.search.toLowerCase()
        listings = listings.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q) ||
            l.seller_name.toLowerCase().includes(q) ||
            (l.seller_company && l.seller_company.toLowerCase().includes(q))
        )
      }
      if (filters.category) {
        listings = listings.filter((l) => l.category === filters.category)
      }
      if (filters.minPrice !== undefined) {
        listings = listings.filter((l) => l.price >= filters.minPrice!)
      }
      if (filters.maxPrice !== undefined) {
        listings = listings.filter((l) => l.price <= filters.maxPrice!)
      }

      set({ listings, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },
}))
