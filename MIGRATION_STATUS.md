# Migración Supabase → Neon + Clerk + R2 + Vercel Functions

**Estado: ✅ COMPLETA EN PRODUCCIÓN**

URL: https://exhaustmarket.vercel.app

---

## ✅ Live en producción

| Servicio | Estado |
|---|---|
| Web (Vercel) | ✅ https://exhaustmarket.vercel.app |
| Neon Postgres | ✅ project `divine-sound-26512912` |
| Clerk Auth | ✅ app `app_3DyUCdAz6TbP8ywl9lHijvXxgKq` |
| Cloudflare R2 | ✅ bucket `exhaustmarket-media` |

### Datos en Neon (1001 filas + portadas)

| Tabla | Filas | Imágenes |
|---|---|---|
| `aftermarket_brands` | 21 | ✅ 21/21 logos placeholder |
| `subscription_tiers` | 5 | — |
| `user_profiles` (admins) | 4 | — |
| `articles` | 6 | ✅ 6/6 covers placeholder |
| `exhaust_schemas` | 201 | ✅ 201/201 covers placeholder (con color de marca) |
| `schema_brand_suggestions` | 552 | — |
| `workshop_services` | 5 | — |
| `professional_products` | 207 | — |

### Sobre las imágenes

Las fotos originales del Supabase viejo (`afsmlmpijjapkzdlrhhd`) están atrapadas tras el muro de pago (Pro 25 USD/mes). **Nunca se llegaron a asociar en BD** — los `cover_url` y `gallery_urls` siempre estuvieron NULL en producción. Solo 7 esquemas tenían fotos físicas en el bucket de tests:

- Alfa Giulia Quadrifoglio (49 fotos)
- Ferrari 458 Italia (14)
- Porsche 911 GT3 992 (11+7)
- Toyota Yaris GR Mk2 (11)
- Porsche 911 GT3 RS (5)
- BMW M3 G80 (1)

Para que el sitio se vea presentable, todos los esquemas/artículos/marcas ahora tienen **portadas dinámicas estilizadas** generadas vía `placehold.co`:

- **Esquemas**: 1200×675, color de fondo = `color` del esquema (rojo Ferrari, azul BMW, etc.), texto = `Marca\nModelo` con font Lora
- **Marcas**: 400×400, azul `#0071e3`, nombre de marca con font Playfair Display
- **Artículos**: 1200×630, gris oscuro `#1d1d1f`, título con font Lora

Cero coste, cacheable, sin storage. Cuando subas fotos reales por el admin de la app (vía `/api/upload` → R2), reemplazarán el placeholder automáticamente.

---

## 🔌 Endpoints Vercel Functions

| Endpoint | Función |
|---|---|
| `POST /api/db` | CRUD genérico → Neon |
| `POST /api/me` | Bootstrap user_profile en 1er login Clerk |
| `POST /api/upload` | Presigned URL R2 |
| `POST /api/storage-delete` | Borrar de R2 |
| `POST /api/stripe-checkout` | Crear Stripe Checkout Session (necesita STRIPE_SECRET_KEY) |
| `POST /api/stripe-webhook` | Recibir eventos Stripe (necesita STRIPE_WEBHOOK_SECRET) |
| `POST /api/fn/send-quote-email` | Email via Resend |
| `POST /api/fn/supplier-keys` | CRUD claves API supplier |
| `POST /api/fn/generate-invoice-pdf` | Esqueleto invoice |
| `POST /api/fn/sync-catalog` | Esqueleto sync catálogo |

---

## 🔑 Env vars en Vercel (production)

Configuradas:
```
DATABASE_URL
VITE_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
```

Faltan (opcional, cuando se quieran activar):
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

---

## 🚪 Primer login

Ve a https://exhaustmarket.vercel.app/register → Sign up con email `pablo.lprdz@gmail.com` (o GitHub/Google). El endpoint `/api/me` reclamará automáticamente tu `user_profile` admin por el email.

Admins preconfigurados:
- `pablo.lprdz@gmail.com` → admin
- `pablo@hiumsolutions.com` → admin
- `adamantium.exhaust@gmail.com` → admin
- `info@spartanexhaust.com` → professional (Spartan, 207 productos)

---

## ⚠️ Pendiente (cuando quieras, no urgente)

1. **Stripe**: configurar `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` en Vercel + apuntar webhook Stripe Dashboard a `/api/stripe-webhook`.
2. **Mobile (Expo)**: rewrite a `@clerk/clerk-expo`. ~4-6h.
3. **Fotos reales**: cuando tengas tiempo, sube fotos reales desde el admin de la app → reemplazan los placeholders en R2.

---

## Debug rápido

```bash
# Ver logs Vercel
vercel logs https://exhaustmarket.vercel.app

# Verificar BD vía API pública
curl -sX POST https://exhaustmarket.vercel.app/api/db \
  -H "content-type: application/json" \
  -d '{"op":"select","table":"aftermarket_brands","limit":3}'

# Sample portada estilizada (visual)
open "https://placehold.co/1200x675/C8102E/ffffff/png?text=Ferrari%0A812+Superfast&font=lora"
```
