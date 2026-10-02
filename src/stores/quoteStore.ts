import { create } from 'zustand'
import { quotesApi, type QItem } from '../lib/quotesApi'

/**
 * Lectura de solicitudes de presupuesto para el panel de inicio (DashboardPage). Toda la gestión
 * (crear, responder, visita de diagnóstico, presupuesto final…) vive en QuotesPage + /api/quotes.
 */
interface QuoteState {
  sentRequests: QItem[]
  receivedRequests: QItem[]
  fetchSentRequests: () => Promise<void>
  fetchReceivedRequests: () => Promise<void>
}

export const useQuoteStore = create<QuoteState>((set) => ({
  sentRequests: [],
  receivedRequests: [],
  fetchSentRequests: async () => {
    try { set({ sentRequests: (await quotesApi.list('client')).items }) } catch { /* el panel sigue sin este bloque */ }
  },
  fetchReceivedRequests: async () => {
    try { set({ receivedRequests: (await quotesApi.list('workshop')).items }) } catch { /* idem */ }
  },
}))
