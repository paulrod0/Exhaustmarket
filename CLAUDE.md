# CLAUDE.md — ExhaustMarket (web)

Guía para trabajar en la **web** de ExhaustMarket (marketplace + catálogo técnico de sistemas de escape). La app **móvil** (Expo) vive en `/mobile/` y es otro despliegue.

## Qué es
Plataforma para automoción: catálogo relacional de escapes (vehículos → motores → esquemas → piezas), esquemas 2D clicables, marketplace (productos pro/servicios/aftermarket), diseños 3D descargables, monedero colaborativo, KYC, cotizaciones y suscripciones Stripe.

- **Producción:** https://exhaustmarket.vercel.app
- **Repo:** github.com/paulrod0/exhaustmarket

## Stack
- **Frontend:** Vite + React 18 + TypeScript + React Router + Zustand + TanStack Query. Estilo inline/Apple-like.
- **Backend:** Vercel Functions en `/api/*` (Node) sobre **Neon Postgres** (driver `@neondatabase/serverless`).
- **Auth:** Clerk (`@clerk/clerk-react` en cliente, `@clerk/backend` en funciones).
- **Storage:** Cloudflare **R2** (S3-compatible) vía presigned URLs.
- **Pagos:** Stripe (Checkout alojado + webhook).
- **Hosting:** **Vercel Pro** (NO Cloudflare Pages). Deploy: `npx vercel --prod --yes`.

## Arquitectura clave: el "facade"
La app se migró de Supabase a Neon+Clerk+R2 **sin reescribir** 30+ ficheros, mediante un facade que imita `supabase.*`:
- `src/lib/supabase.ts` → reexporta el facade.
- `src/lib/dbClient.ts` → `.from(t).select().eq().single()` → POST `/api/db`.
- `src/lib/storage-client.ts` + `src/lib/storage.ts` → `.storage.from(b).upload()` → `/api/upload` + `/api/storage-delete`.

### ⚠️ Trampas del facade (han causado bugs reales — LEER)
1. **No soporta selects anidados de Supabase** (`.select('*, rel(*)')`). Usar `src/lib/joinRelated.ts` (`attachRelated`/`attachChildren`): traer la relación aparte y unir en cliente.
2. **jsonb NO conserva el orden de claves de un objeto** (Postgres las normaliza). Para listas ordenadas guardar un campo `order` dentro de cada valor y ordenar por él (ver `sortedComponents`/`reindexComponents` en `src/lib/schemaDefinitions.ts`).
3. **Arrays JS → columnas jsonb** dan *"invalid input syntax for type json"*. Hacer `JSON.stringify(...)` de los campos jsonb array/objeto antes de insertar (`despiece`, `components`, `files`). Los `text[]` sí van como array JS.
4. **`insert().select().single()`**: antes `.select()` reseteaba el `op` a select y rompía. Ya arreglado en `dbClient` + `/api/db` respeta `single`.
5. **Importar de `api/_lib/*` ROMPE en Vercel** (FUNCTION_INVOCATION_FAILED al arrancar). **Todas** las funciones en `/api` deben ser **self-contained** (inline de auth/neon). No crear `_lib` compartido.
6. **`getPublicUrl`** devolvía ruta relativa → `file_url` roto (404). `uploadToBucket` ya devuelve la URL completa de `upload()`.

## Estructura del repo
```
api/                    Vercel Functions (self-contained)
  db.ts                 CRUD genérico con reglas de acceso (RULES)
  me.ts                 perfil Clerk↔user_profiles
  upload.ts             presign R2 (PUT)
  storage-delete.ts     borra objeto R2
  csv.ts                export/import CSV (op=export|import)
  marketplace.ts        pedidos/mensajes/KYC/monedero (op=...)
  stripe-checkout.ts    suscripciones
  stripe-webhook.ts     eventos Stripe
  fn/                   email, api-keys, factura, sync (self-contained)
src/
  lib/                  facade (dbClient, storage-client, storage), joinRelated, schemaDefinitions, dataAdmin
  pages/                públicas + /admin/* + /panel/*
  components/           incl. admin/PhotoUploader, FilePicker, pickers; ExhaustSchematic
  stores/               zustand (auth, marketplace, panel, quote, panelStore)
scripts/                migraciones puntuales .mjs (leen de .env.new)
```

## Datos (Neon)
- **Catálogo v2 (relacional):** `vehicles` → `engines` → `exhaust_diagrams` → `exhaust_parts`; `compatibilities`, `exhaust_aftermarket_products`, `sources`, `qa_reviews`, `exhaust_architectures` (25 del dossier).
- **Esquemas legacy:** `exhaust_schemas` (jsonb `components`, `despiece`) — editor de una página que usan los freelancers.
- **Marketplace/monedero:** `marketplace_orders/_items/_messages`, `wallets`, `wallet_transactions`.
- **Otros:** `user_profiles` (campo `is_admin`, `user_type`, `kyc_status`), `subscription_tiers`, `manuals`, `design_3d` (con `files` jsonb multi-archivo), `professional_products`, `workshop_services`, `quote_requests`/`quotes`.
- `vehicles.internal_id` tiene UNIQUE (necesario para el import CSV con ON CONFLICT).

## Reglas de acceso
En `api/db.ts` → `RULES`: por tabla `{ read, write: 'public'|'authed'|'admin', ownerColumn? }`. `ownerColumn` filtra por dueño salvo admin. `single/maybeSingle` soportados en select **e** insert/update.

## Env vars (en Vercel, NO en el repo)
`DATABASE_URL`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET/PUBLIC_BASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, (`RESEND_API_KEY`, `PUBLIC_ORIGIN` opc).
Localmente los secretos están en `.env.new` (**gitignored**).

## Comandos
```bash
npm run dev          # desarrollo
npm run build        # build (vite)
npx vercel --prod --yes   # deploy a producción
```
- **Nota:** el build LOCAL puede quedar cacheado/parcial (Node muy nuevo). Vercel reconstruye en remoto desde el fuente, así que el deploy es correcto aunque el `dist/` local se vea raro.
- **CORS de R2:** configurado en el panel de Cloudflare (PUT/GET desde `exhaustmarket.vercel.app` y `*.vercel.app`). Si falla la subida con *"Failed to fetch"*, revisar el CORS Policy del bucket.

## Esquema 2D clicable
El diagrama del escape se **genera desde los componentes** (`ExhaustSchemasPage` `GenericDiagram`, y `CompatibilidadPage` `ExhaustSchematic`). Refleja añadir/quitar/renombrar/reordenar del panel. En el editor legacy los componentes tienen `order` explícito (ver trampa jsonb #2).

## Pendiente / a vigilar
- **Stripe:** claves LIVE configuradas; falta prueba de cobro real y **rotar claves** (se pegaron en chat).
- Nombres de vendedor/comprador en marketplace requieren sesión (perfiles son `authed`).
- Ref OEM del 2.9 V6 Giulia GTA a confirmar por EPC (dato copiado mal `60666107`).
