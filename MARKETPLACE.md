# ExhaustMarket — Módulo Marketplace + Monedero colaborativo

## Estado actual

✅ Marketplace operativo en producción: https://exhaustmarket.vercel.app/marketplace
✅ Sistema de monedero colaborativo activo en `/panel/monedero`
✅ KYC vendedor en `/panel/kyc`
✅ Mensajería buyer↔seller en `/panel/mensajes`
✅ Módulo de esquemas técnicos cerrado al público (admin sigue accediendo por URL directa)

## Estructura

### Tablas BD

| Tabla | Para qué |
|---|---|
| `marketplace_orders` | Pedidos con buyer, seller, totales, comisión, descuento monedero |
| `marketplace_order_items` | Items de cada pedido con snapshot del producto en el momento de compra |
| `marketplace_messages` | Chat buyer↔seller agrupado por `thread_key` (producto/pedido/directo) |
| `wallets` | Saldo, total ganado, total canjeado por usuario (1:1 con user_profile) |
| `wallet_transactions` | Historial de movimientos: créditos por QA, débitos por comisión |
| `user_profiles` (extras) | `dni_cif`, `iban`, `billing_*`, `kyc_status`, `commission_rate` |

### Endpoints

| Endpoint | Método | Para qué |
|---|---|---|
| `/api/marketplace` | POST | Endpoint consolidado: `op` = `create_order`, `send_message`, `kyc_submit`, `list_threads`, `thread_messages`, `mark_read`, `wallet_info` |
| `/api/stripe-checkout` | POST | (subscripciones — sin cambios) |
| `/api/stripe-webhook` | POST | Ampliado para procesar pagos marketplace + descontar wallet automáticamente |
| `/api/db` | POST | CRUD genérico, ahora también para `wallets`, `wallet_transactions`, `marketplace_*` |

### Rutas frontend

| Ruta | Pública | Para qué |
|---|---|---|
| `/marketplace` | ✅ | Browse de productos pro, aftermarket y servicios |
| `/marketplace/:kind/:id` | ✅ | Detalle de producto/servicio (`kind` = `product` / `service` / `aftermarket`) |
| `/marketplace/carrito` | ✅ | Carrito local (localStorage) + checkout Stripe |
| `/marketplace/pedidos` | 🔒 | Mis pedidos como comprador |
| `/panel/kyc` | 🔒 | Vendedor: enviar DNI/CIF/IBAN para verificación |
| `/panel/mensajes` | 🔒 | Chat con compradores/vendedores |
| `/panel/monedero` | 🔒 | Saldo + historial + reglas |

## Modelo del monedero colaborativo

### Cómo se acreditan créditos automáticamente

Trigger Postgres `trg_wallet_credit` (función `credit_wallet_on_qa_approval`). Cuando un revisor inserta una fila en `qa_reviews` con `action = 'approved'`, el sistema:

1. Mira el `record_type` del registro aprobado.
2. Localiza al investigador via `<tabla>.created_by` → mapea a `user_profile` vía `clerk_user_id`.
3. Acredita la cantidad según la tarifa:

| Tipo aprobado | Crédito |
|---|---|
| Vehículo (`vehicle`) | 2 € |
| Motor (`engine`) | 2 € |
| Esquema (`exhaust_diagram`) | 3 € |
| Pieza OEM (`exhaust_part`) | 1 € |
| Producto aftermarket | 3 € |

La transacción se registra en `wallet_transactions` con `kind = 'credit_qa_approval'`.

### Cómo se canjean

Cuando un vendedor con saldo en monedero recibe un pedido y marca **"Aplicar monedero al pago"** en el carrito:

1. `/api/marketplace` con `op = create_order` calcula la comisión normal del seller (10% por defecto, configurable en `user_profiles.commission_rate`).
2. Toma `min(wallet.balance, commission)` como descuento.
3. Crea la orden con `wallet_discount` reflejado.
4. Cuando Stripe confirma el pago (`checkout.session.completed`), el webhook resta el descuento del wallet y crea una `wallet_transactions` con `kind = 'debit_commission_offset'`.

### Reglas

- Imposible retirar a tarjeta (no hay endpoint que lo permita).
- Solo descontable de comisiones, no del subtotal pagado por el comprador.
- Histórico completo siempre auditable en `wallet_transactions`.

## Flujo de un pedido completo

```
1. Buyer entra /marketplace → ve productos
2. Buyer clica un producto → /marketplace/product/:id
3. Buyer "Añadir al carrito" → localStorage
4. Buyer va a /marketplace/carrito
5. Buyer pulsa "Pagar con tarjeta"
   POST /api/marketplace { op: create_order, items, shipping_address, use_wallet }
   ↓
6. Backend crea marketplace_orders + items + Stripe Checkout Session
   Devuelve checkout_url
7. Frontend redirige a Stripe → comprador paga
8. Stripe redirige a /marketplace/pedidos?ok=<order_id>
9. Stripe envía webhook checkout.session.completed
   ↓
10. /api/stripe-webhook actualiza marketplace_orders.status = 'paid'
    Si had wallet_discount, debita wallet del seller
11. Seller ve el pedido en /panel/orders y lo marca como enviado
12. Buyer recibe, lo marca como entregado (TODO siguiente fase)
```

## Pendiente para producción real

- [ ] **Configurar Stripe** (necesita Pablo): `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` en Vercel env vars + webhook URL en Stripe Dashboard
- [x] ~~Vista admin para procesar KYCs~~ → `/admin/kyc`
- [x] ~~Vendedor marca pedido enviado + tracking~~ → `/panel/orders` botón "Enviar"
- [x] ~~Comprador marca entregado + sistema disputas~~ → `/marketplace/pedidos` botones "He recibido" / "Hay un problema"
- [x] ~~Estadísticas vendedor reales~~ → `/panel` con `seller_stats` endpoint
- [ ] Email transaccional (Resend) — código en `/api/fn/send-quote-email` listo, falta `RESEND_API_KEY`
- [ ] Stripe Connect (pagos directos seller→Stripe) — fase 2
- [ ] Integración envíos (Correos/SEUR/DHL) — fase 2

## Cómo se conecta con el catálogo de esquemas

Los productos aftermarket (Akrapovic, Milltek, etc.) creados en `/admin/data/productos` tienen tabla `compatibilities` que los vincula con `exhaust_parts`. Cuando un usuario busca por su coche en `/compatibilidad`, encuentra:

1. Las piezas OEM del esquema de su coche
2. Los productos aftermarket compatibles con esas piezas
3. Puede comprarlas directamente desde el marketplace
