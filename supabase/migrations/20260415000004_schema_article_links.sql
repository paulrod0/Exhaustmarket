-- =========================================================================
-- MVP v4: Relación N:N esquema <-> artículo + CRM admin
-- =========================================================================

-- Tabla many-to-many entre esquemas y artículos (tutoriales, guías, reviews)
CREATE TABLE IF NOT EXISTS public.schema_article_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id uuid NOT NULL REFERENCES public.exhaust_schemas(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'related' CHECK (kind IN ('tutorial', 'review', 'related', 'install_guide')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(schema_id, article_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_schema_article_links_schema ON public.schema_article_links(schema_id);
CREATE INDEX IF NOT EXISTS idx_schema_article_links_article ON public.schema_article_links(article_id);

ALTER TABLE public.schema_article_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sal_public_read" ON public.schema_article_links;
CREATE POLICY "sal_public_read" ON public.schema_article_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "sal_admin_write" ON public.schema_article_links;
CREATE POLICY "sal_admin_write" ON public.schema_article_links FOR ALL
USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
