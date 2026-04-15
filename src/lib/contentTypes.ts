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
