import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let env = ''
for (const f of ['../.env.new', '../.env']) { try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ } }
const url = env.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m)[1].trim().replace(/^["']|["']$/g, '')
const sql = neon(url)

await sql`
  CREATE TABLE IF NOT EXISTS public.exhaust_architectures (
    code text PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    fuel_hint text,
    description text,
    default_components text[] NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now()
  )`

await sql`ALTER TABLE public.exhaust_diagrams ADD COLUMN IF NOT EXISTS architecture_code text`

// Taxonomía del dossier v3 (sección 6). category: gasolina/diesel/hibrido/electrico/deportivo/suv/van/otro
const ARCH = [
  ['A01', 'Gasolina atmosférico simple sin GPF/OPF', 'gasolina', 'gasolina', 'Utilitarios y compactos atmosféricos simples.', ['colector', 'catalizador', 'sensor', 'silencioso', 'salidas']],
  ['A02', 'Gasolina atmosférico doble salida', 'gasolina', 'gasolina', 'Berlinas/coupés medianos-grandes sin GPF/OPF.', ['colector', 'catalizador', 'silencioso', 'salidas']],
  ['T01', 'Gasolina turbo sin GPF/OPF', 'gasolina', 'gasolina', 'TSI/TFSI/EcoBoost y deportivos anteriores a OPF.', ['colector', 'downpipe', 'catalizador', 'sensor', 'silencioso', 'salidas']],
  ['T02', 'Gasolina turbo con GPF/OPF', 'gasolina', 'gasolina', 'Gasolina moderna Euro 6c/6d con filtro de partículas.', ['colector', 'downpipe', 'catalizador', 'gpf', 'sensor', 'silencioso', 'salidas']],
  ['T03', 'Gasolina turbo deportivo', 'deportivo', 'gasolina', 'GTI/RS/AMG/Cupra; puede llevar OPF y válvulas.', ['downpipe', 'catalizador', 'gpf', 'resonador', 'valvula', 'silencioso', 'salidas']],
  ['D01', 'Diésel sin DPF', 'diesel', 'diesel', 'Diésel antiguos Euro 3/4.', ['colector', 'downpipe', 'catalizador', 'silencioso', 'salidas']],
  ['D02', 'Diésel con DPF', 'diesel', 'diesel', 'Diésel Euro 4/5/6 sin AdBlue.', ['downpipe', 'catalizador', 'dpf', 'sensor', 'silencioso', 'salidas']],
  ['D03', 'Diésel con DPF + SCR/AdBlue', 'diesel', 'diesel', 'Diésel modernos Euro 6.', ['catalizador', 'dpf', 'scr', 'sensor', 'silencioso', 'salidas']],
  ['D04', 'Diésel comercial largo', 'van', 'diesel', 'Furgonetas y pick-ups.', ['downpipe', 'catalizador', 'dpf', 'scr', 'silencioso', 'salidas']],
  ['H01', 'Híbrido gasolina simple sin GPF/OPF', 'hibrido', 'hibrido', 'Híbridos gasolina no enchufables sin filtro.', ['colector', 'catalizador', 'sensor', 'silencioso', 'salidas']],
  ['H02', 'Híbrido gasolina con GPF/OPF', 'hibrido', 'hibrido', 'Híbridos modernos Euro 6d.', ['colector', 'catalizador', 'gpf', 'sensor', 'silencioso', 'salidas']],
  ['H03', 'Híbrido enchufable PHEV', 'hibrido', 'hibrido', 'SUV/berlinas y urbanos PHEV.', ['catalizador', 'gpf', 'silencioso', 'salidas']],
  ['E01', 'Eléctrico puro', 'electrico', 'electrico', 'Sin sistema de escape. Mostrar accesorios/servicios.', []],
  ['E02', 'Hidrógeno FCEV', 'electrico', 'hidrogeno', 'Pila de combustible; salida de agua/vapor.', []],
  ['H2ICE01', 'Hidrógeno combustión', 'otro', 'hidrogeno', 'Motores térmicos de hidrógeno.', ['colector', 'catalizador', 'sensor', 'silencioso', 'salidas']],
  ['S01', 'Doble línea real', 'deportivo', 'gasolina', 'V6/V8/V10/V12, boxer 6 y deportivos con dos bancadas.', ['colector', 'catalizador', 'silencioso', 'salidas']],
  ['S02', 'Escape con válvulas activas', 'deportivo', 'gasolina', 'AMG/BMW M/Audi S-RS/Porsche.', ['catalizador', 'valvula', 'silencioso', 'salidas']],
  ['S03', 'Escape central deportivo', 'deportivo', 'gasolina', 'Deportivos con salida central.', ['colector', 'catalizador', 'silencioso', 'salidas']],
  ['SUV01', 'SUV gasolina', 'suv', 'gasolina', 'SUV gasolina; marcar variante OPF.', ['catalizador', 'gpf', 'silencioso', 'salidas']],
  ['SUV02', 'SUV diésel con DPF', 'suv', 'diesel', 'SUV diésel.', ['downpipe', 'catalizador', 'dpf', 'sensor', 'silencioso', 'salidas']],
  ['SUV03', 'SUV diésel con SCR', 'suv', 'diesel', 'SUV diésel Euro 6.', ['catalizador', 'dpf', 'scr', 'sensor', 'silencioso', 'salidas']],
  ['SUV04', '4x4 protegido', 'suv', 'diesel', 'Todoterreno y 4x4.', ['catalizador', 'dpf', 'silencioso', 'salidas']],
  ['VAN01', 'Furgoneta diésel corta', 'van', 'diesel', 'Furgoneta compacta.', ['downpipe', 'catalizador', 'dpf', 'silencioso', 'salidas']],
  ['VAN02', 'Furgoneta diésel larga con SCR', 'van', 'diesel', 'Furgoneta larga moderna.', ['downpipe', 'catalizador', 'dpf', 'scr', 'sensor', 'silencioso', 'salidas']],
  ['VAN03', 'Camión ligero / chasis cabina', 'van', 'diesel', 'Camión ligero y chasis cabina.', ['catalizador', 'dpf', 'scr', 'silencioso', 'salidas']],
]

for (const [code, name, category, fuel, desc, comps] of ARCH) {
  await sql`
    INSERT INTO public.exhaust_architectures (code, name, category, fuel_hint, description, default_components)
    VALUES (${code}, ${name}, ${category}, ${fuel}, ${desc}, ${comps})
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name, category = EXCLUDED.category, fuel_hint = EXCLUDED.fuel_hint,
      description = EXCLUDED.description, default_components = EXCLUDED.default_components`
}

const n = await sql`SELECT count(*)::int c FROM exhaust_architectures`
console.log('exhaust_architectures pobladas:', n[0].c)
console.log('architecture_code añadida a exhaust_diagrams ✓')
