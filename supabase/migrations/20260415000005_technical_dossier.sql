-- =========================================================================
-- Dossier técnico: campos para que cada esquema sea ficha de fabricación
-- =========================================================================
-- Convierte los esquemas en fichas profesionales con OEM, despiece, costes,
-- horas, fotos técnicas y vídeo. Pensado para usuarios profesionales/talleres.

ALTER TABLE public.exhaust_schemas
  ADD COLUMN IF NOT EXISTS despiece jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cost_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reference_photos text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS related_video_url text,
  ADD COLUMN IF NOT EXISTS total_estimated_hours numeric(5,2),
  ADD COLUMN IF NOT EXISTS total_estimated_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_materials_count integer;

-- despiece: array de objetos { element, material, specification, quantity, process }
-- cost_breakdown: objeto con { materials, consumables, labor, hours, currency }
-- Los campos por componente (oem_ref, diameter_mm, thickness_mm, fabrication_hours,
-- material_cost, total_cost, difficulty, fabricable) van dentro del JSON de
-- 'components' que ya existe.

COMMENT ON COLUMN public.exhaust_schemas.despiece IS 'Tabla "Despiece / Material necesario" (sección A del dossier)';
COMMENT ON COLUMN public.exhaust_schemas.cost_breakdown IS 'Estimación de costes y horas (sección B): materials, consumables, labor, hours';
COMMENT ON COLUMN public.exhaust_schemas.reference_photos IS 'Fotos técnicas de referencia (sección D), separadas de la galería principal';
COMMENT ON COLUMN public.exhaust_schemas.related_video_url IS 'URL YouTube/Vimeo del vídeo de instalación (sección E)';
