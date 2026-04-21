/**
 * Tipos compartidos (espejo de los de web). Cualquier cambio aquí debe
 * replicarse en /src/lib/contentTypes.ts de la app web.
 */

export type UserTier = 'standard' | 'professional' | 'workshop' | 'premium'
export type PriceTier = 'budget' | 'mid' | 'premium' | 'ultra-premium'

export type ArticleCategory =
  | 'guide'
  | 'tutorial'
  | 'review'
  | 'news'
  | 'comparison'

export type AttachmentType = 'pdf' | '3d-model' | 'image' | 'other'

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
  allowed_tiers: string[]
  video_url: string | null
  attachment_url: string | null
  attachment_type: AttachmentType | null
}

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

export const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  budget: 'Económica',
  mid: 'Media',
  premium: 'Premium',
  'ultra-premium': 'Ultra premium',
}

export const ARTICLE_CATEGORY_LABEL: Record<ArticleCategory, string> = {
  guide: 'Guía',
  tutorial: 'Tutorial',
  review: 'Review',
  news: 'Noticia',
  comparison: 'Comparativa',
}

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

export function cheapestTier(allowedTiers: string[]): UserTier | null {
  const order: UserTier[] = ['standard', 'professional', 'workshop', 'premium']
  for (const t of order) {
    if (allowedTiers.includes(t)) return t
  }
  return null
}

// ─── Schema types ────────────────────────────────────────────────────────────

export type Layout =
  | 'v8tt'
  | 'v8na'
  | 'v10na'
  | 'v12na'
  | 'flat6na'
  | 'flat6tt'
  | 'i6tt'

export interface ExhaustComponent {
  id: string
  name: string
  material: string
  temp: string
  description: string
  tip?: string
}

export interface ExhaustSchemaRecord {
  id: string
  brand: string
  model: string
  year: string
  engine: string
  power: string
  layout: Layout
  color: string
  note: string | null
  components: Record<string, ExhaustComponent>
  cover_url: string | null
  gallery_urls: string[]
  is_active: boolean
  allowed_tiers: string[]
  created_at: string
}

export const LAYOUT_LABEL: Record<Layout, string> = {
  v8tt: 'V8 Biturbo',
  v8na: 'V8 NA',
  v10na: 'V10 NA',
  v12na: 'V12',
  flat6na: 'Flat-6 NA',
  flat6tt: 'Flat-6 Biturbo',
  i6tt: 'I6 / V6 Turbo',
}
