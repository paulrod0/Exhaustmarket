-- =========================================================================
-- MVP v3: Acceso por suscripción + tutoriales con video y modelos 3D
-- =========================================================================

-- 1) allowed_tiers para controlar acceso
ALTER TABLE public.exhaust_schemas
  ADD COLUMN IF NOT EXISTS allowed_tiers text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS allowed_tiers text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text;

-- 2) Bucket para tutoriales (PDFs, GLB, STL, OBJ)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tutorial-files', 'tutorial-files', true, 52428800,
  ARRAY[
    'application/pdf',
    'application/octet-stream',
    'model/gltf-binary',
    'model/gltf+json',
    'application/sla',
    'application/vnd.ms-pki.stl',
    'text/plain',
    'image/png','image/jpeg'
  ]
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "tutorial_files_public_read" ON storage.objects;
CREATE POLICY "tutorial_files_public_read" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'tutorial-files');

DROP POLICY IF EXISTS "tutorial_files_admin_write" ON storage.objects;
CREATE POLICY "tutorial_files_admin_write" ON storage.objects FOR ALL
TO authenticated USING (bucket_id = 'tutorial-files' AND public.is_current_user_admin())
WITH CHECK (bucket_id = 'tutorial-files' AND public.is_current_user_admin());

-- 3) Helper user_can_view_tiers (admins ven todo; array vacío = público)
CREATE OR REPLACE FUNCTION public.user_can_view_tiers(required_tiers text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_tier text;
BEGIN
  IF required_tiers IS NULL OR array_length(required_tiers, 1) IS NULL THEN
    RETURN true;
  END IF;
  IF public.is_current_user_admin() THEN
    RETURN true;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT user_type::text INTO user_tier FROM public.user_profiles WHERE id = auth.uid();
  RETURN user_tier = ANY(required_tiers);
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_view_tiers(text[]) TO anon, authenticated;
