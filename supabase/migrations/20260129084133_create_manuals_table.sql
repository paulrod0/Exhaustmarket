/*
  # Crear sistema de Manuales

  1. Nueva Tabla
    - manuals: Almacena información de los manuales en PDF
      - id (uuid, primary key)
      - title (text) - Título del manual
      - description (text) - Descripción del manual
      - car_brand (text) - Marca del coche
      - car_model (text) - Modelo del coche
      - manual_type (text) - Tipo: car_manual, exhaust_installation, maintenance, other
      - file_url (text) - URL del PDF en storage
      - file_size (bigint) - Tamaño del archivo en bytes
      - thumbnail_url (text, nullable) - URL de la miniatura
      - required_tier (text) - Tier mínimo requerido: standard, professional, workshop, premium
      - uploaded_by (uuid) - Usuario que subió el manual
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Seguridad
    - Habilitar RLS en la tabla manuals
    - Políticas para lectura según tier de suscripción del usuario
    - Políticas para inserción/actualización/eliminación por el creador

  3. Storage
    - Crear bucket para PDFs de manuales con políticas adecuadas
*/

-- Tabla de manuales
CREATE TABLE IF NOT EXISTS manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  car_brand text NOT NULL,
  car_model text NOT NULL,
  manual_type text NOT NULL DEFAULT 'car_manual' CHECK (manual_type IN ('car_manual', 'exhaust_installation', 'maintenance', 'other')),
  file_url text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  thumbnail_url text,
  required_tier text NOT NULL DEFAULT 'standard' CHECK (required_tier IN ('standard', 'professional', 'workshop', 'premium')),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;

-- Política para lectura: usuarios con suscripción activa pueden ver manuales según su tier
CREATE POLICY "Users can view manuals based on subscription"
  ON manuals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.id
      WHERE us.user_id = auth.uid()
      AND us.status = 'active'
      AND (
        st.name = 'premium' OR
        (st.name = 'workshop' AND manuals.required_tier IN ('standard', 'professional', 'workshop')) OR
        (st.name = 'professional' AND manuals.required_tier IN ('standard', 'professional')) OR
        (st.name = 'standard' AND manuals.required_tier = 'standard')
      )
    )
  );

-- Política para inserción: usuarios autenticados pueden subir manuales
CREATE POLICY "Authenticated users can insert manuals"
  ON manuals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Política para actualización: solo el creador puede actualizar sus manuales
CREATE POLICY "Users can update own manuals"
  ON manuals FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

-- Política para eliminación: solo el creador puede eliminar sus manuales
CREATE POLICY "Users can delete own manuals"
  ON manuals FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Crear bucket de storage para manuales si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'manuals'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('manuals', 'manuals', false);
  END IF;
END $$;

-- Política de storage: usuarios autenticados pueden subir archivos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload manuals'
  ) THEN
    CREATE POLICY "Authenticated users can upload manuals"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'manuals');
  END IF;
END $$;

-- Política de storage: usuarios autenticados pueden ver archivos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can view manual files'
  ) THEN
    CREATE POLICY "Authenticated users can view manual files"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'manuals');
  END IF;
END $$;

-- Política de storage: usuarios pueden actualizar sus propios archivos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update own manual files storage'
  ) THEN
    CREATE POLICY "Users can update own manual files storage"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'manuals' AND auth.uid()::text = owner::text)
      WITH CHECK (bucket_id = 'manuals');
  END IF;
END $$;

-- Política de storage: usuarios pueden eliminar sus propios archivos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own manual files storage'
  ) THEN
    CREATE POLICY "Users can delete own manual files storage"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'manuals' AND auth.uid()::text = owner::text);
  END IF;
END $$;