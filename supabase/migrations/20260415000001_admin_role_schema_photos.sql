-- =========================================================================
-- Panel Admin: rol de administrador + fotos en exhaust_schemas + RLS
-- =========================================================================
-- Esta migración:
-- 1) Añade columna is_admin a user_profiles
-- 2) Añade cover_url y gallery_urls a exhaust_schemas
-- 3) Crea función helper is_current_user_admin()
-- 4) Activa RLS en exhaust_schemas: lectura pública si is_active=true, o si admin.
--    Escritura sólo por admins.
-- 5) Crea bucket Storage 'exhaust-photos' con políticas: lectura pública,
--    escritura sólo por admins.

-- 1) Columna is_admin
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2) Columnas de fotos en exhaust_schemas
ALTER TABLE public.exhaust_schemas
  ADD COLUMN IF NOT EXISTS cover_url   text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}'::text[];

-- 3) Función helper para comprobar el rol admin del usuario actual
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO anon, authenticated;

-- 4) RLS en exhaust_schemas
ALTER TABLE public.exhaust_schemas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exhaust_schemas_public_read" ON public.exhaust_schemas;
CREATE POLICY "exhaust_schemas_public_read"
  ON public.exhaust_schemas
  FOR SELECT
  USING (is_active = true OR public.is_current_user_admin());

DROP POLICY IF EXISTS "exhaust_schemas_admin_insert" ON public.exhaust_schemas;
CREATE POLICY "exhaust_schemas_admin_insert"
  ON public.exhaust_schemas
  FOR INSERT
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "exhaust_schemas_admin_update" ON public.exhaust_schemas;
CREATE POLICY "exhaust_schemas_admin_update"
  ON public.exhaust_schemas
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "exhaust_schemas_admin_delete" ON public.exhaust_schemas;
CREATE POLICY "exhaust_schemas_admin_delete"
  ON public.exhaust_schemas
  FOR DELETE
  USING (public.is_current_user_admin());

-- 5) Bucket Storage para fotos de esquemas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exhaust-photos',
  'exhaust-photos',
  true,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas del bucket
DROP POLICY IF EXISTS "exhaust_photos_public_read" ON storage.objects;
CREATE POLICY "exhaust_photos_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'exhaust-photos');

DROP POLICY IF EXISTS "exhaust_photos_admin_insert" ON storage.objects;
CREATE POLICY "exhaust_photos_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exhaust-photos'
    AND public.is_current_user_admin()
  );

DROP POLICY IF EXISTS "exhaust_photos_admin_update" ON storage.objects;
CREATE POLICY "exhaust_photos_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'exhaust-photos'
    AND public.is_current_user_admin()
  );

DROP POLICY IF EXISTS "exhaust_photos_admin_delete" ON storage.objects;
CREATE POLICY "exhaust_photos_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'exhaust-photos'
    AND public.is_current_user_admin()
  );
