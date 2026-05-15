# Migrar de AWS Amplify a Vercel

Esta guía te lleva paso a paso para mover la web de Amplify a Vercel **sin
coste** y manteniendo la base de datos de Supabase (no se toca nada de BD,
solo el hosting estático del SPA).

## ¿Por qué Vercel?

- **Gratis** hasta 100 GB de tráfico / mes (más que suficiente para tu MVP)
- **Detecta Vite automáticamente** y aplica la config correcta para SPA
- **No requiere configurar rewrite manualmente** como en Amplify (el problema
  que tuvimos del `/admin` en blanco)
- **Despliegues más rápidos** (típicamente 1-2 min vs 5-6 min de Amplify)
- **Preview URLs por cada PR** automáticamente
- **Rollback en 1 click** si algo sale mal

## Lo que ya está preparado

El repo ya tiene todo listo:

- `vercel.json` con `framework: vite`, `outputDirectory: dist` y rewrites SPA
- `package.json` con `build`/`dev` scripts compatibles
- `npm run build` verificado funcionando localmente

## Variables de entorno que necesitarás copiar

Estas dos (las tienes ya en tu `.env` local y en Amplify):

```
VITE_SUPABASE_URL = https://afsmlmpijjapkzdlrhhd.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Pasos exactos (5 minutos)

### 1. Crear cuenta en Vercel

Si no la tienes ya:

1. Ve a https://vercel.com/signup
2. Click **"Continue with GitHub"** (usa tu cuenta `paulrod0`)
3. Acepta los permisos para acceder a tus repos

### 2. Importar el proyecto

1. En el dashboard de Vercel → **"Add New..."** → **"Project"**
2. Busca el repo **`Exhaustmarket`** en la lista de repos de tu cuenta
3. Click **"Import"** al lado

### 3. Configurar el proyecto

Vercel detectará automáticamente que es **Vite**. Aun así, comprueba:

| Campo | Valor |
|---|---|
| **Framework Preset** | `Vite` (auto-detectado) |
| **Root Directory** | `./` (raíz, no `mobile/`) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci` |

### 4. Configurar variables de entorno

Antes de hacer click en Deploy, expande la sección **"Environment Variables"** y
añade las dos:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://afsmlmpijjapkzdlrhhd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (la pegas del `.env` local — la clave que empieza por `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`) |

Para cada una marca los tres entornos: **Production**, **Preview**, **Development**.

### 5. Deploy

Click en el botón grande **"Deploy"**.

Verás el build en directo. Tarda ~1-2 minutos. Al final te da una URL tipo:

```
https://exhaustmarket-xyz.vercel.app
```

### 6. Verificar que funciona

Abre la URL y prueba:

- `/` → home con CTAs
- `/login` → login screen
- `/admin` → debe redirigir a login (si no estás logueado)
- Login con `pablo@hiumsolutions.com` / `ExhaustAdmin2026!`
- `/esquemas` → ves los 202 modelos con sus dossiers técnicos
- `/admin` → CRM completo

**Importante**: refresca cualquier ruta profunda (ej. `/admin/esquemas/nuevo`)
con F5 y debe seguir funcionando. Si la home funciona pero `/admin` da blanco
o 404, el `vercel.json` no se aplicó — abre un issue.

### 7. (Opcional) Dominio personalizado

Si tienes un dominio (ej. `exhaustmarket.com`):

1. Settings → **Domains**
2. Add → escribes el dominio
3. Vercel te da el record DNS que tienes que poner en tu registrar (GoDaddy,
   Namecheap, Cloudflare, etc.)
4. En 5-30 minutos propaga y ya tienes la web en tu dominio con SSL automático

### 8. Apagar Amplify (cuando estés seguro)

Una vez verifiques que Vercel funciona 100%:

1. AWS Console → Amplify → ExhaustMarket
2. **Actions** → **Delete app** (o "Disconnect branch" si prefieres mantenerlo)

> Hasta que lo borres, AWS te seguirá cobrando si te pasas del free tier (que
> Amplify tiene muy limitado: 1000 build min/mes). Vercel es ilimitado en builds.

## Configuración avanzada (no necesaria al inicio)

### Cron jobs

Si más adelante quieres tareas programadas (limpieza de sesiones expiradas,
emails recurrentes, etc.) Vercel los soporta nativamente en `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cleanup", "schedule": "0 3 * * *" }
  ]
}
```

(no aplica ahora, está vacío)

### Edge functions

Si quieres respuestas más rápidas en alguna ruta, Vercel permite Edge Functions
en `/api/`. No las necesitas ahora (todo es client-side + Supabase Edge
Functions que ya tienes).

## Lo que NO se toca

- ✅ **Supabase**: la BD, el storage, las edge functions y las RLS policies
  siguen igual. Vercel solo sirve los archivos del frontend.
- ✅ **App móvil (Expo)**: en `/mobile/` sigue desplegándose en Railway como
  hasta ahora. Vercel solo sirve la web Vite.
- ✅ **Stripe**: la integración usa Edge Functions de Supabase. Nada cambia.
- ✅ **GitHub**: el repo sigue siendo el mismo. Vercel hace deploy en cada push
  a `main` automáticamente (igual que Amplify).

## Si algo sale mal

| Síntoma | Solución |
|---|---|
| Build falla con error de TypeScript | `npm run build` localmente para reproducir, fijar y push |
| `/admin` da blanco tras login | Verifica que `vercel.json` está en la raíz y tiene los rewrites |
| Las queries a Supabase fallan con CORS | Añade el dominio de Vercel en Supabase → Auth → URL Configuration |
| Las env vars no se aplican | Settings → Environment Variables → confirma que están en los 3 entornos y redeploy |
