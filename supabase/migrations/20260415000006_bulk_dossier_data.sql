-- =========================================================================
-- Showcase: rellenar 200+ esquemas con datos del dossier técnico
-- =========================================================================
-- Datos plausibles según layout del motor: V12 → Inconel/cara, I6 turbo →
-- acero/asequible. OEMs son ejemplos generados con hash determinista.
-- Pablo y los admins pueden refinarlos desde /admin/esquemas.

-- 1) Función helper temporal para rellenar componentes
CREATE OR REPLACE FUNCTION public.fill_component_tech_data(
  comp_id text, comp jsonb, schema_layout text, schema_brand text, schema_id_seed text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  oem_prefix text;
  oem_serial int;
  base jsonb := comp;
  manifold_diameter numeric; muffler_diameter numeric; cat_diameter numeric;
  manifold_material text; manifold_hours numeric; manifold_cost numeric;
  difficulty_val text;
BEGIN
  IF comp ? 'oem_ref' AND comp->>'oem_ref' IS NOT NULL AND comp->>'oem_ref' != '' THEN
    RETURN comp;
  END IF;

  oem_prefix := upper(left(md5(schema_id_seed || comp_id), 4));
  oem_serial := (abs(hashtext(schema_id_seed || comp_id)) % 9000) + 1000;

  IF schema_layout = 'v12na' THEN
    manifold_material := 'Inconel 625'; manifold_diameter := 55; muffler_diameter := 76;
    cat_diameter := 70; manifold_hours := 4.5; manifold_cost := 280; difficulty_val := 'alta';
  ELSIF schema_layout = 'v8tt' OR schema_layout = 'flat6tt' THEN
    manifold_material := 'Acero inox 321'; manifold_diameter := 60; muffler_diameter := 76;
    cat_diameter := 76; manifold_hours := 3.5; manifold_cost := 180; difficulty_val := 'alta';
  ELSIF schema_layout = 'v8na' THEN
    manifold_material := 'Acero inox 321'; manifold_diameter := 50; muffler_diameter := 70;
    cat_diameter := 65; manifold_hours := 3; manifold_cost := 140; difficulty_val := 'media';
  ELSIF schema_layout = 'v10na' THEN
    manifold_material := 'Inconel 625'; manifold_diameter := 55; muffler_diameter := 76;
    cat_diameter := 70; manifold_hours := 4; manifold_cost := 240; difficulty_val := 'alta';
  ELSIF schema_layout = 'flat6na' THEN
    manifold_material := 'Acero inox 321'; manifold_diameter := 50; muffler_diameter := 70;
    cat_diameter := 65; manifold_hours := 3; manifold_cost := 170; difficulty_val := 'media';
  ELSE
    manifold_material := 'Acero inox 304'; manifold_diameter := 63; muffler_diameter := 76;
    cat_diameter := 70; manifold_hours := 2.5; manifold_cost := 120; difficulty_val := 'media';
  END IF;

  CASE
    WHEN comp_id IN ('manifold_l', 'manifold_r', 'manifold') THEN
      base := base || jsonb_build_object('oem_ref', oem_prefix || lpad(oem_serial::text, 4, '0'),
        'diameter_mm', manifold_diameter, 'thickness_mm', 1.5, 'fabrication_hours', manifold_hours,
        'material_cost', manifold_cost, 'total_cost', round(manifold_cost * 2.18),
        'difficulty', difficulty_val, 'fabricable', true);
    WHEN comp_id IN ('turbo_l', 'turbo_r') THEN
      base := base || jsonb_build_object('oem_ref', oem_prefix || lpad(oem_serial::text, 4, '0'),
        'diameter_mm', 76, 'thickness_mm', 2.0, 'fabrication_hours', 0,
        'material_cost', 1200, 'total_cost', 1450, 'difficulty', 'alta', 'fabricable', false);
    WHEN comp_id IN ('cat_l', 'cat_r') THEN
      base := base || jsonb_build_object('oem_ref', oem_prefix || lpad(oem_serial::text, 4, '0'),
        'diameter_mm', cat_diameter, 'thickness_mm', 1.5, 'fabrication_hours', 1.5,
        'material_cost', 110, 'total_cost', 215, 'difficulty', 'baja', 'fabricable', true);
    WHEN comp_id = 'xpipe' THEN
      base := base || jsonb_build_object('oem_ref', oem_prefix || lpad(oem_serial::text, 4, '0'),
        'diameter_mm', cat_diameter, 'thickness_mm', 1.5, 'fabrication_hours', 1,
        'material_cost', 65, 'total_cost', 110, 'difficulty', 'media', 'fabricable', true);
    WHEN comp_id IN ('downpipe_l', 'downpipe_r', 'downpipe') THEN
      base := base || jsonb_build_object('oem_ref', oem_prefix || lpad(oem_serial::text, 4, '0'),
        'diameter_mm', 76, 'thickness_mm', 1.5, 'fabrication_hours', 2.5,
        'material_cost', 150, 'total_cost', 290, 'difficulty', 'alta', 'fabricable', true);
    WHEN comp_id = 'muffler' THEN
      base := base || jsonb_build_object('oem_ref', oem_prefix || lpad(oem_serial::text, 4, '0'),
        'diameter_mm', muffler_diameter, 'thickness_mm', 1.5, 'fabrication_hours', 3.5,
        'material_cost', 165, 'total_cost', 360, 'difficulty', 'media', 'fabricable', true);
    WHEN comp_id = 'tips' THEN
      base := base || jsonb_build_object('oem_ref', oem_prefix || lpad(oem_serial::text, 4, '0'),
        'diameter_mm', 90, 'thickness_mm', 1.5, 'fabrication_hours', 0.7,
        'material_cost', 55, 'total_cost', 110, 'difficulty', 'baja', 'fabricable', true);
    ELSE
      base := base || jsonb_build_object('oem_ref', oem_prefix || lpad(oem_serial::text, 4, '0'),
        'diameter_mm', cat_diameter, 'thickness_mm', 1.5, 'fabrication_hours', 1.5,
        'material_cost', 90, 'total_cost', 175, 'difficulty', difficulty_val, 'fabricable', true);
  END CASE;

  RETURN base;
END;
$$;

-- 2) Aplicar campos técnicos a TODOS los componentes
UPDATE public.exhaust_schemas s
SET components = (
  SELECT jsonb_object_agg(key, public.fill_component_tech_data(key, value, s.layout::text, s.brand, s.id::text))
  FROM jsonb_each(s.components)
)
WHERE jsonb_typeof(s.components) = 'object';

-- 3) Despiece según layout
UPDATE public.exhaust_schemas
SET despiece = CASE
  WHEN layout IN ('v8tt', 'flat6tt') THEN jsonb_build_array(
    jsonb_build_object('element', 'Cuerpo silenciador', 'material', 'Acero inox 304', 'specification', 'chapa 1.5 mm', 'quantity', '1 ud', 'process', 'Corte y plegado'),
    jsonb_build_object('element', 'Tubo principal', 'material', 'Inox 304', 'specification', 'Ø76 mm', 'quantity', '3.2 m', 'process', 'curvado mandrel'),
    jsonb_build_object('element', 'Downpipe sleeve', 'material', 'Inox 321', 'specification', 'Ø76 mm', 'quantity', '0.8 m', 'process', 'soldadura TIG'),
    jsonb_build_object('element', 'Lana acústica HT', 'material', 'Basalto', 'specification', '>650°C', 'quantity', '1 kit', 'process', 'relleno'),
    jsonb_build_object('element', 'Soportes', 'material', 'Varilla inox', 'specification', 'Ø10 mm', 'quantity', '4 uds', 'process', 'soldadura'),
    jsonb_build_object('element', 'Bridas turbo', 'material', 'Inox 321', 'specification', 'fundición V-band', 'quantity', '2 uds', 'process', 'mecanizado'),
    jsonb_build_object('element', 'Abrazaderas V-band', 'material', 'Inox', 'specification', 'Ø76 mm', 'quantity', '4 uds', 'process', 'montaje')
  )
  WHEN layout IN ('v8na', 'v10na', 'v12na', 'flat6na') THEN jsonb_build_array(
    jsonb_build_object('element', 'Cuerpo silenciador', 'material', 'Acero inox 304', 'specification', 'chapa 1.5 mm', 'quantity', '1 ud', 'process', 'Corte y plegado'),
    jsonb_build_object('element', 'Tubo entrada/salida', 'material', 'Inox 304', 'specification', 'Ø63.5 mm', 'quantity', '2.4 m', 'process', 'curvado TIG'),
    jsonb_build_object('element', 'Lana acústica', 'material', 'Basalto / inox', 'specification', 'alta temperatura', 'quantity', '1 kit', 'process', 'relleno'),
    jsonb_build_object('element', 'Soportes', 'material', 'Varilla inox', 'specification', 'Ø10 mm', 'quantity', '3 uds', 'process', 'soldadura'),
    jsonb_build_object('element', 'Abrazaderas', 'material', 'Inox reforzado', 'specification', '63.5 mm', 'quantity', '2 uds', 'process', 'montaje')
  )
  ELSE jsonb_build_array(
    jsonb_build_object('element', 'Cuerpo silenciador', 'material', 'Acero inox 304', 'specification', 'chapa 1.5 mm', 'quantity', '1 ud', 'process', 'Corte y plegado'),
    jsonb_build_object('element', 'Tubo principal', 'material', 'Inox 304', 'specification', 'Ø76 mm', 'quantity', '2 m', 'process', 'curvado mandrel'),
    jsonb_build_object('element', 'Lana acústica', 'material', 'Basalto', 'specification', 'alta temperatura', 'quantity', '1 kit', 'process', 'relleno'),
    jsonb_build_object('element', 'Soportes goma + inox', 'material', 'EPDM + inox', 'specification', 'estándar', 'quantity', '3 uds', 'process', 'montaje'),
    jsonb_build_object('element', 'Abrazaderas', 'material', 'Inox', 'specification', 'Ø76 mm', 'quantity', '2 uds', 'process', 'montaje')
  )
END
WHERE jsonb_array_length(despiece) = 0;

-- 4) Cost breakdown según layout
UPDATE public.exhaust_schemas
SET cost_breakdown = CASE
  WHEN layout = 'v12na' THEN jsonb_build_object('materials', 380, 'consumables', 65, 'labor', 540, 'hours', 12.5, 'currency', 'EUR')
  WHEN layout IN ('v8tt', 'flat6tt') THEN jsonb_build_object('materials', 290, 'consumables', 55, 'labor', 420, 'hours', 10, 'currency', 'EUR')
  WHEN layout = 'v10na' THEN jsonb_build_object('materials', 320, 'consumables', 60, 'labor', 480, 'hours', 11, 'currency', 'EUR')
  WHEN layout IN ('v8na', 'flat6na') THEN jsonb_build_object('materials', 220, 'consumables', 45, 'labor', 360, 'hours', 8.5, 'currency', 'EUR')
  ELSE jsonb_build_object('materials', 165, 'consumables', 35, 'labor', 240, 'hours', 6, 'currency', 'EUR')
END
WHERE cost_breakdown = '{}'::jsonb;

-- 5) Totales agregados
UPDATE public.exhaust_schemas s
SET
  total_estimated_cost = COALESCE((SELECT SUM(COALESCE((value->>'total_cost')::numeric, 0)) FROM jsonb_each(s.components)), 0),
  total_estimated_hours = COALESCE((SELECT SUM(COALESCE((value->>'fabrication_hours')::numeric, 0)) FROM jsonb_each(s.components)), 0),
  total_materials_count = COALESCE((SELECT jsonb_array_length(s.despiece) + (SELECT COUNT(DISTINCT value->>'material') FROM jsonb_each(s.components) WHERE value->>'material' IS NOT NULL AND value->>'material' != '')), 0)
WHERE total_estimated_cost IS NULL OR total_estimated_cost = 0;

-- 6) Limpieza
DROP FUNCTION IF EXISTS public.fill_component_tech_data(text, jsonb, text, text, text);
