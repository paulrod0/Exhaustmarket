// Authorization rules per table, replacing Supabase RLS.
//
// For each table we declare who can SELECT / INSERT / UPDATE / DELETE rows,
// and (optionally) a `scope` callback that injects extra WHERE clauses so the
// caller only sees their own rows.
//
// Roles:
//  - 'anon'       : unauthenticated
//  - 'user'       : any authenticated user
//  - 'owner'      : authenticated user matching the row's owner column
//  - 'admin'      : `user_profiles.is_admin = true`
//  - 'service'    : an internal API key (used by Stripe webhook etc.)
import type { AuthedUser } from './clerk-auth'

export type Role = 'anon' | 'user' | 'owner' | 'admin' | 'service'
export type Op = 'select' | 'insert' | 'update' | 'delete'

export interface TableRule {
  /** Roles permitted to perform the operation */
  allow: Record<Op, Role[]>
  /**
   * Column used to match `owner` checks against `AuthedUser.profileId`.
   * For tables where ownership is composite/derived, set to `null` and
   * implement custom logic in `scopedFilters` below.
   */
  ownerColumn?: string
  /**
   * Returns extra WHERE clauses to add for non-admin SELECTs.
   * Use this to scope rows to the current user when the simple
   * `ownerColumn === auth.profileId` is not enough.
   */
  scopedFilters?: (auth: AuthedUser | null) => Array<{ col: string; op: 'eq' | 'in'; val: unknown }>
}

const PUBLIC_READ_AUTHED_WRITE: TableRule = {
  allow: {
    select: ['anon', 'user', 'admin'],
    insert: ['admin'],
    update: ['admin'],
    delete: ['admin'],
  },
}

const ADMIN_ONLY: TableRule = {
  allow: {
    select: ['admin'],
    insert: ['admin'],
    update: ['admin'],
    delete: ['admin'],
  },
}

const OWNER_OR_ADMIN = (ownerColumn: string): TableRule => ({
  allow: {
    select: ['owner', 'admin'],
    insert: ['user', 'admin'],
    update: ['owner', 'admin'],
    delete: ['owner', 'admin'],
  },
  ownerColumn,
})

export const TABLE_RULES: Record<string, TableRule> = {
  // Marketplace reference data — public read, admin write
  aftermarket_brands: PUBLIC_READ_AUTHED_WRITE,
  articles: PUBLIC_READ_AUTHED_WRITE,
  exhaust_schemas: PUBLIC_READ_AUTHED_WRITE,
  schema_brand_suggestions: PUBLIC_READ_AUTHED_WRITE,
  schema_article_links: PUBLIC_READ_AUTHED_WRITE,
  manuals: PUBLIC_READ_AUTHED_WRITE,
  subscription_tiers: PUBLIC_READ_AUTHED_WRITE,
  catalog_sources: PUBLIC_READ_AUTHED_WRITE,

  // User-owned data
  user_profiles: {
    allow: {
      select: ['user', 'admin'], // users see their own; admin sees all (scoped below)
      insert: ['service', 'admin'], // profiles are created by Clerk webhook, never by client
      update: ['owner', 'admin'],
      delete: ['admin'],
    },
    ownerColumn: 'id',
    scopedFilters: (auth) => {
      if (!auth) return [{ col: 'id', op: 'eq', val: '00000000-0000-0000-0000-000000000000' }] // empty result
      if (auth.isAdmin) return []
      return [{ col: 'id', op: 'eq', val: auth.profileId }]
    },
  },
  user_subscriptions: OWNER_OR_ADMIN('user_id'),
  professional_products: {
    // Anyone can browse products; only owner/admin can mutate
    allow: {
      select: ['anon', 'user', 'admin'],
      insert: ['user', 'admin'],
      update: ['owner', 'admin'],
      delete: ['owner', 'admin'],
    },
    ownerColumn: 'professional_id',
  },
  workshop_services: {
    allow: {
      select: ['anon', 'user', 'admin'],
      insert: ['user', 'admin'],
      update: ['owner', 'admin'],
      delete: ['owner', 'admin'],
    },
    ownerColumn: 'workshop_id',
  },
  quote_requests: {
    allow: {
      select: ['owner', 'admin'],
      insert: ['user', 'admin'],
      update: ['owner', 'admin'],
      delete: ['admin'],
    },
    ownerColumn: 'user_id',
    scopedFilters: (auth) => {
      if (!auth) return [{ col: 'user_id', op: 'eq', val: '00000000-0000-0000-0000-000000000000' }]
      if (auth.isAdmin) return []
      // user_id OR target_user_id matches
      return [{ col: 'user_id', op: 'in', val: [auth.profileId] }]
    },
  },
  quotes: OWNER_OR_ADMIN('quote_request_id'),
  transactions: {
    allow: {
      select: ['owner', 'admin'],
      insert: ['service', 'admin'],
      update: ['service', 'admin'],
      delete: ['admin'],
    },
    ownerColumn: 'buyer_id',
  },
  invoices: OWNER_OR_ADMIN('user_id'),
  supplier_api_keys: OWNER_OR_ADMIN('user_id'),
  supplier_sync_logs: OWNER_OR_ADMIN('user_id'),
}

export function getRule(table: string): TableRule | null {
  return TABLE_RULES[table] ?? null
}

export function isAllowed(rule: TableRule, op: Op, auth: AuthedUser | null): boolean {
  const roles = rule.allow[op]
  if (!roles?.length) return false
  if (roles.includes('anon')) return true
  if (!auth) return false
  if (roles.includes('admin') && auth.isAdmin) return true
  if (roles.includes('user')) return true
  if (roles.includes('owner')) return true // detailed ownership check happens in db.ts
  return false
}
