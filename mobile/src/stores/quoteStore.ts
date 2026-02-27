import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface CreateQuoteRequestData {
  target_user_id: string
  car_model: string
  car_year: number
  service_type: string
  specifications: string
}

interface RespondToQuoteData {
  quote_request_id: string
  price: number
  notes: string
  valid_until: string
}

interface QuoteState {
  workshops: any[]
  sentRequests: any[]
  receivedRequests: any[]
  loading: boolean
  error: string | null
  fetchWorkshops: () => Promise<void>
  createQuoteRequest: (data: CreateQuoteRequestData) => Promise<void>
  fetchSentRequests: () => Promise<void>
  fetchReceivedRequests: () => Promise<void>
  respondToQuote: (data: RespondToQuoteData) => Promise<void>
  updateRequestStatus: (requestId: string, status: string) => Promise<void>
}

export const useQuoteStore = create<QuoteState>((set, get) => ({
  workshops: [],
  sentRequests: [],
  receivedRequests: [],
  loading: false,
  error: null,

  fetchWorkshops: async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('user_type', ['workshop', 'professional'])
      .eq('is_verified', true)
      .order('company_name')

    if (error) { set({ error: error.message }); return }
    set({ workshops: data ?? [] })
  },

  createQuoteRequest: async (reqData) => {
    set({ loading: true, error: null })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data: request, error } = await supabase
        .from('quote_requests')
        .insert({
          user_id: user.id,
          target_user_id: reqData.target_user_id,
          car_model: reqData.car_model,
          car_year: reqData.car_year,
          service_type: reqData.service_type,
          specifications: reqData.specifications,
        } as any)
        .select()
        .single()

      if (error) throw error

      const [targetRes, senderRes] = await Promise.all([
        supabase.from('user_profiles').select('email, full_name, company_name').eq('id', reqData.target_user_id).single(),
        supabase.from('user_profiles').select('full_name').eq('id', user.id).single(),
      ])

      if (targetRes.data?.email) {
        await supabase.functions.invoke('send-quote-email', {
          body: {
            to_email: targetRes.data.email,
            to_name: targetRes.data.company_name || targetRes.data.full_name,
            from_name: senderRes.data?.full_name ?? 'Usuario',
            car_model: reqData.car_model,
            car_year: reqData.car_year,
            service_type: reqData.service_type,
            specifications: reqData.specifications,
            quote_request_id: request.id,
          },
        })
      }

      await get().fetchSentRequests()
      set({ loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  fetchSentRequests: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('quote_requests')
      .select('*, target:user_profiles!target_user_id(id, full_name, company_name, email), quotes(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message }); return }
    set({ sentRequests: data ?? [] })
  },

  fetchReceivedRequests: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('quote_requests')
      .select('*, sender:user_profiles!user_id(id, full_name, company_name, email), quotes(*)')
      .eq('target_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message }); return }
    set({ receivedRequests: data ?? [] })
  },

  respondToQuote: async (data) => {
    set({ loading: true, error: null })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error: quoteError } = await supabase
        .from('quotes')
        .insert({
          quote_request_id: data.quote_request_id,
          quoted_by: user.id,
          price: data.price,
          notes: data.notes,
          valid_until: data.valid_until,
        } as any)

      if (quoteError) throw quoteError

      const { error: updateError } = await supabase
        .from('quote_requests')
        .update({ status: 'quoted', updated_at: new Date().toISOString() } as any)
        .eq('id', data.quote_request_id)

      if (updateError) throw updateError

      await get().fetchReceivedRequests()
      set({ loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  updateRequestStatus: async (requestId, status) => {
    const { error } = await supabase
      .from('quote_requests')
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq('id', requestId)

    if (error) { set({ error: error.message }); return }
    await Promise.all([get().fetchSentRequests(), get().fetchReceivedRequests()])
  },
}))
