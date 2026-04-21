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
export function canViewTiers(
  allowedTiers: string[] | null | undefined,
  userTier: string | null | undefined,
  isAdmin = false,
): boolean {
  if (isAdmin) return true
  if (!allowedTiers || allowedTiers.length === 0) return true
  if (!userTier) return false
  return allowedTiers.includes(userTier)
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
