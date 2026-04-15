-- =========================================================================
-- MVP: auto-perfil al signup + marcas aftermarket + artículos del blog
-- =========================================================================

-- 1) Auto-crear user_profile al registrarse (antes se hacía en JS, ahora seguro)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type_enum, 'standard')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Marcas aftermarket
CREATE TABLE IF NOT EXISTS public.aftermarket_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  country text,
  founded_year integer,
  description text,
  logo_url text,
  website text,
  specialties text[] DEFAULT '{}'::text[],
  price_tier text CHECK (price_tier IN ('budget', 'mid', 'premium', 'ultra-premium')),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aftermarket_brands_active ON public.aftermarket_brands(is_active);
CREATE INDEX IF NOT EXISTS idx_aftermarket_brands_slug ON public.aftermarket_brands(slug);

ALTER TABLE public.aftermarket_brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brands_public_read" ON public.aftermarket_brands;
CREATE POLICY "brands_public_read" ON public.aftermarket_brands FOR SELECT
USING (is_active = true OR public.is_current_user_admin());
DROP POLICY IF EXISTS "brands_admin_write" ON public.aftermarket_brands;
CREATE POLICY "brands_admin_write" ON public.aftermarket_brands FOR ALL
USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

-- 3) Artículos (blog)
CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  category text NOT NULL CHECK (category IN ('guide', 'tutorial', 'review', 'news', 'comparison')),
  excerpt text,
  content_md text NOT NULL DEFAULT '',
  cover_url text,
  tags text[] DEFAULT '{}'::text[],
  reading_minutes integer DEFAULT 5,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "articles_public_read" ON public.articles;
CREATE POLICY "articles_public_read" ON public.articles FOR SELECT
USING (is_published = true OR public.is_current_user_admin());
DROP POLICY IF EXISTS "articles_admin_write" ON public.articles;
CREATE POLICY "articles_admin_write" ON public.articles FOR ALL
USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

-- 4) Sugerencias de marcas por esquema (reservado para siguiente iteración)
CREATE TABLE IF NOT EXISTS public.schema_brand_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id uuid NOT NULL REFERENCES public.exhaust_schemas(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.aftermarket_brands(id) ON DELETE CASCADE,
  component_id text,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(schema_id, brand_id, component_id)
);
CREATE INDEX IF NOT EXISTS idx_schema_brand_suggestions_schema ON public.schema_brand_suggestions(schema_id);
ALTER TABLE public.schema_brand_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sbs_public_read" ON public.schema_brand_suggestions;
CREATE POLICY "sbs_public_read" ON public.schema_brand_suggestions FOR SELECT USING (true);
DROP POLICY IF EXISTS "sbs_admin_write" ON public.schema_brand_suggestions;
CREATE POLICY "sbs_admin_write" ON public.schema_brand_suggestions FOR ALL
USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

-- 5) Bucket Storage content-media (artículos + logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-media', 'content-media', true, 10485760,
  ARRAY['image/png','image/jpeg','image/webp','image/avif','image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "content_media_public_read" ON storage.objects;
CREATE POLICY "content_media_public_read" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'content-media');
DROP POLICY IF EXISTS "content_media_admin_write" ON storage.objects;
CREATE POLICY "content_media_admin_write" ON storage.objects FOR ALL
TO authenticated USING (bucket_id = 'content-media' AND public.is_current_user_admin())
WITH CHECK (bucket_id = 'content-media' AND public.is_current_user_admin());
