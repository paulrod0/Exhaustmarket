# ExhaustMarket — Metodología de datos

Guía operativa para investigadores, freelancers y revisores QA.
Basada en el dossier del cliente.

## URL del panel

https://exhaustmarket.vercel.app/admin

Tu cuenta debe estar marcada como **admin** en `user_profiles.is_admin = true`.

---

## Modelo de datos

```
vehicles (marca + modelo + generación + años)
   └─ engines (versión + código motor + combustible + potencia)
       └─ exhaust_diagrams (layout + imagen + fuente + calidad)
           ├─ exhaust_parts (tipo + nombre + OEM ref + material + diámetro)
           │       └─ compatibilities ← productos compatibles
           └─ exhaust_aftermarket_products (marca + ref + precio + URL)

sources       (URLs documentales)
qa_reviews    (historial de revisiones)
```

Cada registro tiene un campo `status` con uno de estos valores:

| Estado | Significado |
|---|---|
| `draft` | Recién creado, incompleto |
| `in_research` | El investigador está trabajando |
| `submitted` | Entregado para revisión QA |
| `needs_changes` | El revisor pidió correcciones |
| `approved` | Validado, listo para publicar |
| `rejected` | No utilizable |
| `duplicate` | Ya existe un registro equivalente |
| `legacy_imported` | Migrado desde la versión vieja v1 |

---

## Los 4 formularios

### Formulario A — Vehículo + motor + esquema
**URL:** `/admin/data/vehiculos/nuevo`

Se rellena una vez por combinación **marca + modelo + generación + año + motor**.
Crea simultáneamente:

- Un **vehicle** (BMW Serie 3 F30, 2012–2018, sedan)
- Un **engine** asociado (320d, código N47, 2.0L diésel, 184 CV)
- Un **exhaust_diagram** asociado (layout i4tt, imagen del esquema OEM, fuente, calidad)

**Antes de crear, busca duplicados** en la lista — si ya existe BMW Serie 3 F30 con motor 320d, edítalo en vez de crear otro.

**ID interno auto-generado** con formato `BMW-SERIE-3-F30-320D-2012-N47`. Se construye solo y sirve para enlazar Formulario B y C después.

### Formulario B — Piezas OEM individuales
**URL:** `/admin/data/piezas/nuevo`

Una entrada por cada pieza visible en el esquema. Para un BMW Serie 3 F30 320d:

- Pieza 1: tipo `colector`, OEM `11627810631`
- Pieza 2: tipo `dpf`, OEM `18308584496`
- Pieza 3: tipo `tubo` intermedio, …
- etc.

**Campos críticos:**
- **Esquema asociado**: selector vinculado al Formulario A
- **Tipo**: colector, downpipe, catalizador, DPF/FAP, x-pipe, h-pipe, tubo, silenciador, sensor, junta, soporte, tip
- **OEM ref**: la referencia original. Si no se encuentra, marca el checkbox **OEM no encontrado** (no inventes referencias).
- **Posición en esquema**: número del despiece (1, 2, 3…) para mapear visualmente
- **Fuente**: URL donde se obtuvo la información
- **Confianza**: alta / media / baja

### Formulario C — Producto aftermarket
**URL:** `/admin/data/productos/nuevo`

Productos comerciales: Akrapovic Evolution, Milltek Cat-Back, Walker Sport, etc.

Campos:
- Marca (selector vinculado a `aftermarket_brands`)
- Referencia comercial (ej. `MSVWG7CB`)
- Tipo: repuesto equivalente / deportivo homologado / competición / universal / custom
- Precio + moneda + URL del vendedor + país + tiempo de entrega
- Homologación: ECE / TUV / CE / no_homologado / desconocido
- **Compatibilidad con piezas del esquema**: busca y añade qué piezas reemplaza este producto. Esto enlaza Formulario C ↔ Formulario B vía la tabla `compatibilities`.

### Formulario D — Panel QA (revisión)
**URL:** `/admin/qa`

Solo lo usa un revisor diferente al investigador.

Lista todos los registros en `submitted` o `needs_changes` de todas las tablas. Por cada uno:

- **Aprobar** → status = `approved`
- **Pedir cambios** → status = `needs_changes` (escribir comentarios)
- **Marcar duplicado** → status = `duplicate`
- **Rechazar** → status = `rejected`

Cada acción genera un registro en `qa_reviews` con el historial.

---

## Reglas para investigadores

1. **No inventar datos.** Si no se encuentra una OEM ref, marca el checkbox "OEM no encontrado". Mejor un dato vacío que uno falso.
2. **No mezclar motores** si el sistema de escape cambia (ej. 320d vs 330i son DOS engines distintos).
3. **Toda referencia OEM debe incluir fuente** (URL del catálogo, RealOEM, ETKA, etc.).
4. **Toda compatibilidad debe estar justificada** con su fuente.
5. **Diferenciar entre tipos**: pieza OEM original, equivalente aftermarket, deportivo homologado, pieza universal.
6. **Marcar dudas** en el campo "Notas / comentarios".
7. **No usar imágenes sin indicar procedencia** en `source_url`.

### Niveles de confianza

| Nivel | Criterio |
|---|---|
| **alta** | Dato confirmado en varias fuentes fiables o catálogo OEM oficial |
| **media** | Una fuente fiable, sin contradicciones visibles |
| **baja** | Dato incompleto o fuente poco clara — marcar dudas en notas |

---

## Workflow estándar

```
investigador                                                  revisor QA
─────────────────                                            ──────────────
1. Asignar bloque                                                
   (ej. BMW Serie 3 todas las versiones, 2012-2018)              
                                                                 
2. Formulario A → crear vehicle + engine + diagram               
   estado: draft → in_research                                   
                                                                 
3. Formulario B → cada pieza del despiece                        
   con OEM ref, fuente, confianza                                
                                                                 
4. Formulario C → productos aftermarket que encajan              
   con compatibilidades hacia las piezas                         
                                                                 
5. Marcar estado: submitted     ───────────────────────►        
                                                            6. Panel QA
                                                               revisar cada entrada
                                                               aprobar / pedir cambios
                                                               
   ◄─────────── (si needs_changes)                              
7. Corregir lo solicitado                                       
   marcar como submitted otra vez   ───────────────────►        8. Aprobar → published
                                                                
9. Datos visibles para usuarios en la web pública
```

---

## MVP recomendado (alta demanda primero)

Prioridad para los primeros lotes:

1. **BMW Serie 3** (F30, G20) → todos sus motores (320d/330i/M340i/etc.)
2. **Volkswagen Golf** (Mk7, Mk8) → GTI / R / TDI 
3. **Audi A3 / A4** → Mismas familias de motor EA888 / 2.0 TDI

Modelos con más demanda en aftermarket. Volumen suficiente para validar la metodología antes de escalar.

---

## Tablas de la BD (referencia técnica)

| Tabla | Filas (actual) | Origen |
|---|---|---|
| `vehicles` | 201 | migración desde `exhaust_schemas` legacy |
| `engines` | 201 | igual |
| `exhaust_diagrams` | 201 | igual |
| `exhaust_parts` | varios cientos | migración desde JSONB `despiece` |
| `exhaust_aftermarket_products` | 0 | nuevo, lo rellenas con Formulario C |
| `compatibilities` | 0 | nuevo, se llena al guardar productos |
| `sources` | 0 | nuevo |
| `qa_reviews` | 0 | se rellena automático al usar Panel QA |
| `aftermarket_brands` | 21 | preexistente (Akrapovic, Milltek, etc.) |

Estado de las 201 entradas migradas: **`legacy_imported`** — sirven como base pero deberían revisarse y normalizarse con el nuevo modelo antes de marcarlas como `approved`.

---

## API (para integraciones)

Todos los endpoints viven bajo `https://exhaustmarket.vercel.app/api/`.

| Endpoint | Para qué |
|---|---|
| `POST /api/db` | CRUD genérico (`select/insert/update/delete/upsert`) sobre cualquier tabla |
| `POST /api/me` | Devuelve el `user_profile` del usuario Clerk autenticado |
| `POST /api/upload` | Genera URL firmada R2 para subir imágenes de esquemas |

Los requests deben incluir `Authorization: Bearer <clerk-jwt>` para operaciones autenticadas. La lectura de tablas públicas (vehicles, engines, exhaust_*) funciona sin auth.
