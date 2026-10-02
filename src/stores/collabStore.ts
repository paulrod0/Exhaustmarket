import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { attachRelated } from '../lib/joinRelated'
import { useAuthStore } from './authStore'

// El "id de dueño" (submitted_by) es el UUID del perfil (user_profiles.id), igual que en
// el resto del facade owner-scoped. Ver panelStore/authStore.
function currentProfileId(): string | null {
  return useAuthStore.getState().profile?.id ?? null
}

/** Payload libre del envío del colaborador. Varía según la ruta (A / B-F1 / B-F2 / B-F3);
 *  todo viaja dentro del blob jsonb `data` (una sola serialización). */
export type SubmissionData = Record<string, any>

/** Columnas de indexación/moderación que el colaborador puede fijar al enviar. */
export interface SubmissionMeta {
  route?: string          // A | B-F1 | B-F2 | B-F3 | null (legacy)
  case_code?: string | null
  scan_3d_url?: string | null
  scan_3d_format?: string | null
}

export interface SchemaSubmission {
  id: string
  submitted_by: string
  status: 'pending' | 'approved' | 'rejected'
  title: string | null
  data: SubmissionData
  route: string | null
  case_code: string | null
  scan_3d_url: string | null
  scan_3d_format: string | null
  scan_3d_status: string | null
  published_design_3d_id: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  published_schema_id: string | null
  created_at: string
  updated_at: string
  submitter?: { id: string; full_name: string | null; email: string | null } | null
}

interface CollabState {
  mine: SchemaSubmission[]
  all: SchemaSubmission[]
  loading: boolean
  error: string | null
  submit: (title: string, data: SubmissionData, meta?: SubmissionMeta) => Promise<void>
  fetchMine: () => Promise<void>
  fetchAll: () => Promise<void>
  review: (id: string, status: 'approved' | 'rejected', notes: string, publishedSchemaId?: string | null) => Promise<void>
}

export const useCollabStore = create<CollabState>((set, get) => ({
  mine: [],
  all: [],
  loading: false,
  error: null,

  submit: async (title, data, meta) => {
    const profileId = currentProfileId()
    if (!profileId) throw new Error('No autenticado')
    // `data` es jsonb: hay que serializar. status/scan_3d_status/reviewed_* los pone/controla el
    // servidor (columnas protegidas). route/case_code/scan_3d_url/scan_3d_format sí las fija el colaborador.
    const row: Record<string, unknown> = {
      submitted_by: profileId,
      title: title.trim() || null,
      data: JSON.stringify(data),
    }
    if (meta?.route) row.route = meta.route
    if (meta?.case_code) row.case_code = meta.case_code
    if (meta?.scan_3d_url) row.scan_3d_url = meta.scan_3d_url
    if (meta?.scan_3d_format) row.scan_3d_format = meta.scan_3d_format
    const { error } = await supabase.from('schema_submissions' as any).insert(row as any)
    if (error) throw error
    await get().fetchMine()
  },

  fetchMine: async () => {
    const profileId = currentProfileId()
    if (!profileId) return
    set({ loading: true })
    const { data, error } = await supabase
      .from('schema_submissions' as any)
      .select('*')
      .eq('submitted_by', profileId)
      .order('created_at', { ascending: false })
    if (error) { set({ error: error.message, loading: false }); return }
    set({ mine: (data as unknown as SchemaSubmission[]) ?? [], loading: false })
  },

  fetchAll: async () => {
    set({ loading: true })
    // El admin ve todos (el facade no scopea por dueño cuando isAdmin).
    const { data, error } = await supabase
      .from('schema_submissions' as any)
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { set({ error: error.message, loading: false }); return }
    const withSubmitter = await attachRelated((data as any[]) ?? [], [
      { table: 'user_profiles', fk: 'submitted_by', as: 'submitter', columns: 'id, full_name, email' },
    ])
    set({ all: withSubmitter as unknown as SchemaSubmission[], loading: false })
  },

  review: async (id, status, notes, publishedSchemaId = null) => {
    const reviewerId = currentProfileId()
    const patch: Record<string, unknown> = {
      status,
      review_notes: notes.trim() || null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (publishedSchemaId) patch.published_schema_id = publishedSchemaId
    const { error } = await supabase
      .from('schema_submissions' as any)
      .update(patch as any)
      .eq('id', id)
    if (error) throw error
    await get().fetchAll()
  },
}))
