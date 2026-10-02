import { auth } from './auth-client'

/**
 * fetch autenticado (token de Clerk) para los endpoints propios de admin (/api/review,
 * /api/csv, /api/v1-admin, …). Lanza Error con el mensaje del servidor si la respuesta no es OK.
 */
export async function adminFetch<T = any>(
  path: string,
  opts: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; query?: Record<string, string | number | null | undefined>; body?: unknown; raw?: boolean } = {},
): Promise<T> {
  const token = await auth.__getToken()
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  const url = qs.toString() ? `${path}?${qs}` : path
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  let body: BodyInit | undefined
  if (opts.body !== undefined) {
    if (typeof opts.body === 'string') { body = opts.body; headers['content-type'] = 'text/plain; charset=utf-8' }
    else { body = JSON.stringify(opts.body); headers['content-type'] = 'application/json' }
  }
  const res = await fetch(url, { method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'), headers, body })
  if (opts.raw) {
    if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
    return res as unknown as T
  }
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
  // /api/review y /api/csv devuelven { error: "texto" }; /api/v1 devuelve { error: { code, message } }.
  if (!res.ok) throw new Error((typeof data?.error === 'string' ? data.error : data?.error?.message) || `HTTP ${res.status}`)
  return data as T
}

/** Aviso global para refrescar contadores (badge del menú) tras aprobar/rechazar. */
export function notifyReviewChanged(): void {
  window.dispatchEvent(new Event('em-review-changed'))
}
