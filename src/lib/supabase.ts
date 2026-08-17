/**
 * Facade que mantiene la forma del cliente Supabase pero usa el nuevo stack:
 * - .from(table) -> Neon via /api/db
 * - .storage.from(bucket) -> Cloudflare R2 via /api/upload + /api/storage-delete
 * - .auth.* -> Clerk
 * - .functions.invoke(name, ...) -> /api/fn/<name>
 */

import { db, configureDbAuth } from './dbClient'
import { storage, configureStorageAuth } from './storage-client'
import { auth } from './auth-client'

// Pasar el token Clerk a las llamadas DB y Storage automaticamente.
configureDbAuth(() => auth.__getToken())
configureStorageAuth(() => auth.__getToken())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invokeFunction<T = any>(
  name: string,
  opts?: { body?: unknown; method?: string },
): Promise<{ data: T | null; error: { message: string } | null }> {
  try {
    const token = await auth.__getToken()
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (token) headers.authorization = `Bearer ${token}`
    const res = await fetch(`/api/fn/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(opts?.body ?? {}),
    })
    if (!res.ok) {
      const text = await res.text()
      return { data: null, error: { message: text || res.statusText } }
    }
    const data = (await res.json()) as T
    return { data, error: null }
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } }
  }
}

export const supabase = {
  from: db.from.bind(db),
  storage,
  auth,
  functions: { invoke: invokeFunction },
  rpc: async (_name: string, _params?: unknown) => ({
    data: null,
    error: { message: 'rpc not supported in new stack' },
  }),
}
