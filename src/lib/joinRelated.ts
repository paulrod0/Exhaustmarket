import { supabase } from './supabase'

/**
 * El facade (Neon) NO soporta los selects anidados de Supabase (p.ej.
 * `*, seller:user_profiles!professional_id(...)`). Este helper hace el "join"
 * en cliente: trae la tabla relacionada aparte y la adjunta a cada fila.
 *
 * Relación 1:1 por id (fila.fk → related.id).
 */
export async function attachRelated<T extends Record<string, unknown>>(
  rows: T[],
  specs: { table: string; fk: string; as: string; columns?: string }[],
): Promise<T[]> {
  for (const s of specs) {
    const ids = [...new Set(rows.map((r) => r[s.fk]).filter(Boolean))]
    if (ids.length === 0) {
      for (const r of rows) (r as Record<string, unknown>)[s.as] = null
      continue
    }
    const { data } = await supabase.from(s.table as never).select(s.columns ?? '*').in('id', ids as string[])
    const map = new Map(((data ?? []) as { id: string }[]).map((d) => [d.id, d]))
    for (const r of rows) (r as Record<string, unknown>)[s.as] = map.get(r[s.fk] as string) ?? null
  }
  return rows
}

/**
 * Relación 1:N: adjunta un array de filas hijas agrupadas por una FK.
 * (p.ej. quotes de cada quote_request → fila.quotes = [...]).
 */
export async function attachChildren<T extends Record<string, unknown>>(
  rows: T[],
  spec: { table: string; parentKey: string; childFk: string; as: string; columns?: string },
): Promise<T[]> {
  const parentIds = [...new Set(rows.map((r) => r[spec.parentKey]).filter(Boolean))]
  if (parentIds.length === 0) {
    for (const r of rows) (r as Record<string, unknown>)[spec.as] = []
    return rows
  }
  const { data } = await supabase.from(spec.table as never).select(spec.columns ?? '*').in(spec.childFk, parentIds as string[])
  const byParent = new Map<string, unknown[]>()
  for (const child of (data ?? []) as Record<string, unknown>[]) {
    const key = child[spec.childFk] as string
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(child)
  }
  for (const r of rows) (r as Record<string, unknown>)[spec.as] = byParent.get(r[spec.parentKey] as string) ?? []
  return rows
}
