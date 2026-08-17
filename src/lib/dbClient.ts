/**
 * Cliente DB con la misma forma que `supabase.from('table').select().eq().single()`
 * pero que llama a /api/db (Vercel Function backed by Neon).
 */

type Filter = [string, string, unknown]

interface QueryState {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  columns?: string
  filters: Filter[]
  order: { column: string; ascending?: boolean }[]
  limit?: number
  single?: boolean
  maybeSingle?: boolean
  data?: unknown
  onConflict?: string
}

type Awaiter<T> = { data: T | null; error: { message: string } | null }

let getAuthHeader: () => Promise<string | null> = async () => null

/** Plug in Clerk's getToken when ClerkProvider mounts (App.tsx). */
export function configureDbAuth(fn: () => Promise<string | null>): void {
  getAuthHeader = fn
}

async function execute<T>(state: QueryState): Promise<Awaiter<T>> {
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    const token = await getAuthHeader()
    if (token) headers.authorization = `Bearer ${token}`
    const res = await fetch('/api/db', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        op: state.op,
        table: state.table,
        columns: state.columns,
        filters: state.filters,
        order: state.order,
        limit: state.limit,
        single: state.single,
        maybeSingle: state.maybeSingle,
        data: state.data,
        onConflict: state.onConflict,
      }),
    })
    const json = (await res.json()) as Awaiter<T>
    return json
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } }
  }
}

class Builder<T> implements PromiseLike<Awaiter<T>> {
  constructor(private state: QueryState) {}

  select(columns = '*'): Builder<T> {
    // Si ya es una mutación (insert/update/upsert/delete), .select() significa
    // "devuélveme las filas afectadas" (RETURNING), NO un SELECT nuevo.
    // Antes esto pisaba el op a 'select' y rompía insert().select().single().
    const mutation = this.state.op === 'insert' || this.state.op === 'update' || this.state.op === 'upsert' || this.state.op === 'delete'
    if (!mutation) this.state.op = 'select'
    this.state.columns = columns
    return this
  }
  eq(col: string, val: unknown): this { this.state.filters.push([col, 'eq', val]); return this }
  neq(col: string, val: unknown): this { this.state.filters.push([col, 'neq', val]); return this }
  gt(col: string, val: unknown): this { this.state.filters.push([col, 'gt', val]); return this }
  gte(col: string, val: unknown): this { this.state.filters.push([col, 'gte', val]); return this }
  lt(col: string, val: unknown): this { this.state.filters.push([col, 'lt', val]); return this }
  lte(col: string, val: unknown): this { this.state.filters.push([col, 'lte', val]); return this }
  like(col: string, val: unknown): this { this.state.filters.push([col, 'like', val]); return this }
  ilike(col: string, val: unknown): this { this.state.filters.push([col, 'ilike', val]); return this }
  in(col: string, vals: unknown[]): this { this.state.filters.push([col, 'in', vals]); return this }
  is(col: string, val: unknown): this { this.state.filters.push([col, 'is', val]); return this }
  contains(col: string, val: unknown): this { this.state.filters.push([col, 'contains', val]); return this }
  overlaps(col: string, val: unknown): this { this.state.filters.push([col, 'overlaps', val]); return this }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.state.order.push({ column: col, ascending: opts?.ascending !== false })
    return this
  }
  limit(n: number): this { this.state.limit = n; return this }

  single(): Builder<T> { this.state.single = true; return this }
  maybeSingle(): Builder<T> { this.state.maybeSingle = true; return this }

  then<R1, R2>(
    onfulfilled?: ((v: Awaiter<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((e: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return execute<T>(this.state).then(onfulfilled, onrejected)
  }
}

class MutationBuilder<T> extends Builder<T> {
  insert(data: unknown): MutationBuilder<T> { (this as unknown as { state: QueryState }).state.op = 'insert'; (this as unknown as { state: QueryState }).state.data = data; return this }
  update(data: unknown): MutationBuilder<T> { (this as unknown as { state: QueryState }).state.op = 'update'; (this as unknown as { state: QueryState }).state.data = data; return this }
  upsert(data: unknown, opts?: { onConflict?: string }): MutationBuilder<T> {
    (this as unknown as { state: QueryState }).state.op = 'upsert'
    ;(this as unknown as { state: QueryState }).state.data = data
    if (opts?.onConflict) (this as unknown as { state: QueryState }).state.onConflict = opts.onConflict
    return this
  }
  delete(): MutationBuilder<T> { (this as unknown as { state: QueryState }).state.op = 'delete'; return this }
}

export const db = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from<T = any>(table: string): MutationBuilder<T> {
    return new MutationBuilder<T>({
      table,
      op: 'select',
      filters: [],
      order: [],
    })
  },
}
