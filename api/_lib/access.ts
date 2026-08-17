import type { AuthContext } from './auth'

/**
 * Per-table access rules. Replaces Supabase RLS.
 *
 * - `read`: who can SELECT
 * - `write`: who can INSERT/UPDATE/DELETE
 * - `ownerColumn`: if set, write requires `<column> = auth.userId` (unless admin)
 */
type Rule = {
  read: 'public' | 'authed' | 'admin'
  write: 'public' | 'authed' | 'admin'
  ownerColumn?: string
}

const RULES: Record<string, Rule> = {
  aftermarket_brands: { read: 'public', write: 'admin' },
  exhaust_schemas: { read: 'public', write: 'admin' },
  schema_brand_suggestions: { read: 'public', write: 'admin' },
  schema_article_links: { read: 'public', write: 'admin' },
  articles: { read: 'public', write: 'admin' },
  manuals: { read: 'public', write: 'admin' },
  subscription_tiers: { read: 'public', write: 'admin' },
  catalog_sources: { read: 'public', write: 'admin' },

  user_profiles: { read: 'authed', write: 'authed', ownerColumn: 'id' },
  user_subscriptions: { read: 'authed', write: 'admin' },
  transactions: { read: 'authed', write: 'authed' },
  quote_requests: { read: 'authed', write: 'authed', ownerColumn: 'user_id' },
  quotes: { read: 'authed', write: 'authed' },
  invoices: { read: 'authed', write: 'authed' },

  professional_products: { read: 'public', write: 'authed', ownerColumn: 'professional_id' },
  workshop_services: { read: 'public', write: 'authed', ownerColumn: 'workshop_id' },
  design_3d: { read: 'authed', write: 'admin' },

  supplier_api_keys: { read: 'authed', write: 'authed', ownerColumn: 'user_id' },
  supplier_sync_logs: { read: 'authed', write: 'authed', ownerColumn: 'user_id' },
  user_documents: { read: 'authed', write: 'authed', ownerColumn: 'user_id' },
}

export function canRead(table: string, auth: AuthContext | null): boolean {
  const rule = RULES[table]
  if (!rule) return false
  if (rule.read === 'public') return true
  if (!auth) return false
  if (rule.read === 'admin') return auth.isAdmin
  return true
}

export function canWrite(
  table: string,
  auth: AuthContext | null,
  row?: Record<string, unknown>,
): boolean {
  const rule = RULES[table]
  if (!rule) return false
  if (!auth) return false
  if (rule.write === 'admin') return auth.isAdmin
  if (rule.write === 'public') return true
  // authed
  if (auth.isAdmin) return true
  if (rule.ownerColumn && row) {
    return row[rule.ownerColumn] === auth.profileId
  }
  return true
}

export function ownerFilter(
  table: string,
  auth: AuthContext | null,
): { column: string; value: string } | null {
  const rule = RULES[table]
  if (!rule || !rule.ownerColumn || !auth || auth.isAdmin) return null
  if (rule.read === 'public') return null
  if (!auth.profileId) return { column: rule.ownerColumn, value: '__no_profile__' }
  return { column: rule.ownerColumn, value: auth.profileId }
}

export function knownTable(table: string): boolean {
  return Object.prototype.hasOwnProperty.call(RULES, table)
}
