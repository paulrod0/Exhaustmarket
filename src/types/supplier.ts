// src/types/supplier.ts
// Types for the Supplier Sync API request/response payloads

export interface SupplierProduct {
  ref: string           // Unique ID in the external system
  name: string
  description?: string
  price: number
  stock?: number
  category?: string
  images?: string[]
  active?: boolean
  source_platform?: string  // 'woocommerce' | 'shopify' | 'custom'
}

export type SyncAction = 'full_sync' | 'upsert' | 'delete'

export interface SyncRequest {
  action: SyncAction
  products?: SupplierProduct[]  // for full_sync and upsert
  ref?: string                  // for delete (single product)
  source_platform?: string
}

export interface SyncResponse {
  success: boolean
  action: SyncAction
  products_created?: number
  products_updated?: number
  products_deleted?: number
  error?: string
}

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export interface GeneratedApiKey extends ApiKey {
  full_key: string  // Only returned once at creation time
}
