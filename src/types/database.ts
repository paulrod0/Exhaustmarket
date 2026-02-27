export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserType = 'standard' | 'professional' | 'workshop' | 'premium'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending'
export type BillingCycle = 'monthly' | 'yearly'
export type QuoteStatus = 'pending' | 'quoted' | 'accepted' | 'rejected' | 'cancelled'
export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'disputed' | 'refunded'
export type EscrowStatus = 'held' | 'released' | 'refunded'
export type DocumentStatus = 'pending' | 'approved' | 'rejected'
export type DocumentType = 'business_license' | 'tax_registration' | 'id_card' | 'insurance'
export type CatalogSourceType = 'url' | 'csv' | 'feed'
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'
export type InvoiceStatus = 'draft' | 'generated' | 'sent' | 'paid'

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_type: UserType
          full_name: string
          email: string | null
          phone: string | null
          company_name: string | null
          tax_id: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_type?: UserType
          full_name: string
          email?: string | null
          phone?: string | null
          company_name?: string | null
          tax_id?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_type?: UserType
          full_name?: string
          email?: string | null
          phone?: string | null
          company_name?: string | null
          tax_id?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subscription_tiers: {
        Row: {
          id: string
          name: string
          price_monthly: number
          price_yearly: number
          features: Json
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          price_monthly: number
          price_yearly: number
          features?: Json
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          price_monthly?: number
          price_yearly?: number
          features?: Json
          active?: boolean
          created_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          tier_id: string
          status: SubscriptionStatus
          billing_cycle: BillingCycle
          started_at: string
          expires_at: string
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier_id: string
          status?: SubscriptionStatus
          billing_cycle: BillingCycle
          started_at?: string
          expires_at: string
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier_id?: string
          status?: SubscriptionStatus
          billing_cycle?: BillingCycle
          started_at?: string
          expires_at?: string
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workshop_services: {
        Row: {
          id: string
          workshop_id: string
          service_name: string
          description: string
          base_price: number
          category: string
          images: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workshop_id: string
          service_name: string
          description: string
          base_price: number
          category?: string
          images?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string
          service_name?: string
          description?: string
          base_price?: number
          category?: string
          images?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      professional_products: {
        Row: {
          id: string
          professional_id: string
          product_name: string
          description: string
          price: number
          stock: number
          category: string
          images: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          product_name: string
          description: string
          price: number
          stock?: number
          category?: string
          images?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          professional_id?: string
          product_name?: string
          description?: string
          price?: number
          stock?: number
          category?: string
          images?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      design_3d: {
        Row: {
          id: string
          uploaded_by: string
          title: string
          description: string | null
          file_url: string
          thumbnail_url: string | null
          file_size: number | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          uploaded_by: string
          title: string
          description?: string | null
          file_url: string
          thumbnail_url?: string | null
          file_size?: number | null
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          uploaded_by?: string
          title?: string
          description?: string | null
          file_url?: string
          thumbnail_url?: string | null
          file_size?: number | null
          is_public?: boolean
          created_at?: string
        }
      }
      quote_requests: {
        Row: {
          id: string
          user_id: string
          target_user_id: string
          car_model: string
          car_year: number
          specifications: string
          service_type: string
          status: QuoteStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_user_id: string
          car_model: string
          car_year: number
          specifications: string
          service_type: string
          status?: QuoteStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_user_id?: string
          car_model?: string
          car_year?: number
          specifications?: string
          service_type?: string
          status?: QuoteStatus
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          quote_request_id: string
          quoted_by: string
          price: number
          notes: string | null
          valid_until: string
          created_at: string
        }
        Insert: {
          id?: string
          quote_request_id: string
          quoted_by: string
          price: number
          notes?: string | null
          valid_until: string
          created_at?: string
        }
        Update: {
          id?: string
          quote_request_id?: string
          quoted_by?: string
          price?: number
          notes?: string | null
          valid_until?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          buyer_id: string
          seller_id: string
          amount: number
          type: string
          reference_id: string | null
          status: TransactionStatus
          stripe_payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          buyer_id: string
          seller_id: string
          amount: number
          type: string
          reference_id?: string | null
          status?: TransactionStatus
          stripe_payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          buyer_id?: string
          seller_id?: string
          amount?: number
          type?: string
          reference_id?: string | null
          status?: TransactionStatus
          stripe_payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      escrow_holds: {
        Row: {
          id: string
          transaction_id: string
          amount: number
          status: EscrowStatus
          release_date: string | null
          dispute_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          amount: number
          status?: EscrowStatus
          release_date?: string | null
          dispute_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          amount?: number
          status?: EscrowStatus
          release_date?: string | null
          dispute_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_documents: {
        Row: {
          id: string
          user_id: string
          document_type: DocumentType
          file_url: string
          status: DocumentStatus
          uploaded_at: string
          verified_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          document_type: DocumentType
          file_url: string
          status?: DocumentStatus
          uploaded_at?: string
          verified_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          document_type?: DocumentType
          file_url?: string
          status?: DocumentStatus
          uploaded_at?: string
          verified_at?: string | null
        }
      }
      catalog_sources: {
        Row: {
          id: string
          workshop_id: string
          source_type: CatalogSourceType
          url: string | null
          file_url: string | null
          last_synced: string | null
          sync_status: SyncStatus
          sync_error: string | null
          mapping: Json
          sync_interval: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workshop_id: string
          source_type: CatalogSourceType
          url?: string | null
          file_url?: string | null
          last_synced?: string | null
          sync_status?: SyncStatus
          sync_error?: string | null
          mapping?: Json
          sync_interval?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string
          source_type?: CatalogSourceType
          url?: string | null
          file_url?: string | null
          last_synced?: string | null
          sync_status?: SyncStatus
          sync_error?: string | null
          mapping?: Json
          sync_interval?: string
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          seller_id: string
          buyer_id: string | null
          transaction_id: string | null
          items: Json
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          status: InvoiceStatus
          pdf_url: string | null
          notes: string | null
          issued_at: string
          due_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          seller_id: string
          buyer_id?: string | null
          transaction_id?: string | null
          items?: Json
          subtotal: number
          tax_rate?: number
          tax_amount: number
          total: number
          status?: InvoiceStatus
          pdf_url?: string | null
          notes?: string | null
          issued_at?: string
          due_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          seller_id?: string
          buyer_id?: string | null
          transaction_id?: string | null
          items?: Json
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          status?: InvoiceStatus
          pdf_url?: string | null
          notes?: string | null
          issued_at?: string
          due_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
