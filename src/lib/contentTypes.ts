/**
 * Tipos compartidos del contenido editorial (marcas aftermarket, artículos
 * del blog y sugerencias de marcas por esquema).
 */

export type PriceTier = 'budget' | 'mid' | 'premium' | 'ultra-premium'

export interface AftermarketBrand {
  id: string
  slug: string
  name: string
  country: string | null
  founded_year: number | null
  description: string | null
  logo_url: string | null
  website: string | null
  specialties: string[]
  price_tier: PriceTier | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type ArticleCategory =
  | 'guide'
  | 'tutorial'
  | 'review'
  | 'news'
  | 'comparison'

export interface Article {
  id: string
  slug: string
  title: string
  subtitle: string | null
  category: ArticleCategory
  excerpt: string | null
  content_md: string
  cover_url: string | null
  tags: string[]
  reading_minutes: number
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  /** Array vacío = público. Si tiene valores, solo esos tiers tienen acceso. */
  allowed_tiers: UserTier[]
  video_url: string | null
  attachment_url: string | null
  attachment_type: AttachmentType | null
}

/** Matching database.ts UserType */
export type UserTier = 'standard' | 'professional' | 'workshop' | 'premium'

export type AttachmentType = 'pdf' | '3d-model' | 'image' | 'other'

export const USER_TIER_LABEL: Record<UserTier, string> = {
  standard: 'Standard (gratis)',
  professional: 'Professional',
  workshop: 'Taller',
  premium: 'Premium',
}

export const USER_TIER_SHORT_LABEL: Record<UserTier, string> = {
  standard: 'Standard',
  professional: 'Pro',
  workshop: 'Taller',
  premium: 'Premium',
}

/**
 * Comprueba si un usuario puede ver contenido con los tiers requeridos.
 * Convención: array vacío (o null) = público (todos pueden verlo).
 */
// Jerarquía de tiers (espejo EXACTO de api/db.ts): standard(0) < taller(1) < profesional(2)
// < fabricante(3). premium y manufacturer = mismo nivel máximo. allowed_tiers = tier mínimo.
const TIER_RANK: Record<string, number> = { standard: 0, workshop: 1, professional: 2, premium: 3, manufacturer: 3 }
const rankOf = (t: string | null | undefined) => (t != null && TIER_RANK[t] != null ? TIER_RANK[t] : 0)

export function canViewTiers(
  allowedTiers: string[] | null | undefined,
  userTier: string | null | undefined,
  isAdmin = false,
): boolean {
  if (isAdmin) return true
  if (!allowedTiers || allowedTiers.length === 0) return true
  if (!userTier) return false
  const need = Math.min(...allowedTiers.map((t) => TIER_RANK[t] ?? Infinity)) // desconocido no baja el listón
  return rankOf(userTier) >= need
}

// ─── Gating por sección (espejo EXACTO de api/db.ts) ───
export function canSeeOem(userTier: string | null | undefined, isAdmin = false): boolean {
  return isAdmin || rankOf(userTier) >= 2 // Profesional+
}
export function canSeeWorkshopData(userTier: string | null | undefined, isAdmin = false): boolean {
  return isAdmin || rankOf(userTier) >= 1 // Taller+
}

/** ¿Puede descargar este manual? Se respeta el required_tier del manual ('standard' = libre). */
export function canDownloadManual(
  requiredTier: string | null | undefined,
  userTier: string | null | undefined,
  isAdmin = false,
): boolean {
  // Espejo EXACTO de redactManual en api/db.ts: se respeta el required_tier tal cual.
  // 'standard' = descarga libre; workshop/professional/premium = ese tier mínimo.
  const need = rankOf(requiredTier ?? 'standard')
  return isAdmin || rankOf(userTier) >= need
}

/**
 * Precio efectivo a MOSTRAR al comprador (SOLO UX). Taller+ (canSeeWorkshopData) ve el
 * pro_price fijado por el vendedor; el Particular ve siempre el price normal.
 * OJO: el precio REAL lo recalcula el servidor en createOrder; esto es solo display.
 * Debe reflejar la MISMA regla que api/marketplace.ts (canWS ? pro_price : price).
 */
export function effectivePrice(
  product: { price?: number | null; pro_price?: number | null } | null | undefined,
  userTier: string | null | undefined,
  isAdmin = false,
): { price: number; base: number; isPro: boolean } {
  const base = Number(product?.price ?? 0)
  const proRaw = product?.pro_price
  const pro = proRaw == null ? null : Number(proRaw)
  // pro < base: el precio pro solo aplica si es realmente más barato (evita "descuentos" que encarecen).
  const proApplies = pro != null && Number.isFinite(pro) && pro > 0 && pro < base && canSeeWorkshopData(userTier, isAdmin)
  return proApplies ? { price: pro, base, isPro: true } : { price: base, base, isPro: false }
}

/** Devuelve el tier "mínimo" razonable al que hay que subir para ver algo */
export function cheapestTier(allowedTiers: string[]): UserTier | null {
  const order: UserTier[] = ['standard', 'professional', 'workshop', 'premium']
  for (const t of order) {
    if (allowedTiers.includes(t)) return t
  }
  return null
}

export interface SchemaBrandSuggestion {
  id: string
  schema_id: string
  brand_id: string
  component_id: string | null
  note: string | null
  created_at: string
}

export type SchemaArticleKind = 'tutorial' | 'review' | 'related' | 'install_guide'

export interface SchemaArticleLink {
  id: string
  schema_id: string
  article_id: string
  kind: SchemaArticleKind
  display_order: number
  created_at: string
}

export const SCHEMA_ARTICLE_KIND_LABEL: Record<SchemaArticleKind, string> = {
  tutorial: 'Tutorial',
  install_guide: 'Guía de instalación',
  review: 'Review',
  related: 'Relacionado',
}

export const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  'budget': 'Económica',
  'mid': 'Media',
  'premium': 'Premium',
  'ultra-premium': 'Ultra premium',
}

export const ARTICLE_CATEGORY_LABEL: Record<ArticleCategory, string> = {
  guide: 'Guía',
  tutorial: 'Tutorial',
  review: 'Review',
  news: 'Noticia',
  comparison: 'Comparativa',
}
