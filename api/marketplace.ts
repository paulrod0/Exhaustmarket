import { Pool } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'
import Stripe from 'stripe'

/**
 * Endpoint consolidado del marketplace.
 * POST body: { op: 'create_order' | 'send_message' | 'kyc_submit' | 'wallet_apply_discount' | 'mark_read' | ... }
 *
 * Único endpoint para mantenernos bajo el límite de 12 funciones del plan Hobby.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await req.json()) as any
    const auth = await getAuth(req)
    if (!auth) return json({ error: 'unauthorized' }, 401)

    switch (body.op) {
      case 'create_order':       return await createOrder(auth, body)
      case 'send_message':       return await sendMessage(auth, body)
      case 'kyc_submit':         return await kycSubmit(auth, body)
      case 'list_threads':       return await listThreads(auth)
      case 'thread_messages':    return await threadMessages(auth, body)
      case 'mark_read':          return await markRead(auth, body)
      case 'wallet_info':        return await walletInfo(auth)
      // ───── seller / buyer order management ─────
      case 'ship_order':         return await shipOrder(auth, body)
      case 'mark_delivered':     return await markDelivered(auth, body)
      case 'raise_dispute':      return await raiseDispute(auth, body)
      case 'cancel_order':       return await cancelOrder(auth, body)
      // ───── admin ─────
      case 'kyc_review':         return await kycReview(auth, body)
      case 'seller_stats':       return await sellerStats(auth)
      case 'order_detail':       return await orderDetail(auth, body)
      default:                   return json({ error: `unknown op: ${body.op}` }, 400)
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
}

interface AuthCtx { userId: string; profileId: string; isAdmin: boolean; email: string | null }

async function getAuth(req: Request): Promise<AuthCtx | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return null
  try {
    const payload = (await verifyToken(header.slice(7), { secretKey: secret })) as { sub: string; email?: string }
    const pool = pgPool()
    const r = await pool.query(
      `SELECT id, is_admin, email FROM public.user_profiles WHERE clerk_user_id = $1 LIMIT 1`,
      [payload.sub],
    )
    if (!r.rows[0]) return null
    return {
      userId: payload.sub,
      profileId: r.rows[0].id,
      isAdmin: Boolean(r.rows[0].is_admin),
      email: r.rows[0].email ?? payload.email ?? null,
    }
  } catch { return null }
}

function pgPool(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL })
}

/* ─── CREATE ORDER + STRIPE CHECKOUT ─── */

async function createOrder(auth: AuthCtx, body: { items?: unknown; shipping_address?: string; shipping_notes?: string; use_wallet?: boolean }): Promise<Response> {
  const items = body.items as Array<{ product_type: string; product_id: string; quantity: number }> | undefined
  if (!items || !Array.isArray(items) || items.length === 0) {
    return json({ error: 'items required' }, 400)
  }

  const pool = pgPool()

  // Resolver productos + verificar mismo seller
  const productRows: Array<Record<string, unknown>> = []
  let sellerId: string | null = null

  for (const it of items) {
    const table = it.product_type === 'professional_product' ? 'professional_products' :
                  it.product_type === 'workshop_service' ? 'workshop_services' :
                  it.product_type === 'aftermarket_product' ? 'exhaust_aftermarket_products' : null
    if (!table) return json({ error: `bad product_type: ${it.product_type}` }, 400)

    const r = await pool.query(`SELECT * FROM public.${table} WHERE id = $1 LIMIT 1`, [it.product_id])
    if (!r.rows[0]) return json({ error: `product ${it.product_id} not found` }, 404)

    const sellerCol = it.product_type === 'professional_product' ? 'professional_id' :
                      it.product_type === 'workshop_service' ? 'workshop_id' : null

    if (sellerCol) {
      const s = String(r.rows[0][sellerCol])
      if (!sellerId) sellerId = s
      else if (sellerId !== s) return json({ error: 'multi-seller orders not supported yet' }, 400)
    }
    productRows.push({ ...r.rows[0], _product_type: it.product_type, _quantity: it.quantity })
  }

  if (!sellerId) return json({ error: 'seller not resolved' }, 400)
  if (sellerId === auth.profileId) return json({ error: 'cannot buy your own products' }, 400)

  // Calcular totales
  let subtotal = 0
  const orderItems: Array<{ product_type: string; product_id: string; snapshot: Record<string, unknown>; quantity: number; unit_price: number; line_total: number }> = []
  for (const p of productRows) {
    const unitPrice = Number(p.price ?? p.base_price ?? 0)
    const qty = Number(p._quantity ?? 1)
    const lineTotal = unitPrice * qty
    subtotal += lineTotal
    orderItems.push({
      product_type: String(p._product_type),
      product_id: String(p.id),
      snapshot: p,
      quantity: qty,
      unit_price: unitPrice,
      line_total: lineTotal,
    })
  }

  // Comisión del seller
  const sellerR = await pool.query(`SELECT commission_rate FROM public.user_profiles WHERE id = $1`, [sellerId])
  const commissionRate = Number(sellerR.rows[0]?.commission_rate ?? 0.10)
  const commission = round2(subtotal * commissionRate)

  // Descuento monedero (solo aplica a comisión)
  let walletDiscount = 0
  if (body.use_wallet) {
    const w = await pool.query(`SELECT balance FROM public.wallets WHERE user_id = $1`, [sellerId])
    const sellerBalance = Number(w.rows[0]?.balance ?? 0)
    walletDiscount = Math.min(sellerBalance, commission)
  }
  const total = round2(subtotal) // El comprador paga el subtotal; el seller recibe (subtotal - commission + walletDiscount)

  // Crear orden
  const orderInsert = await pool.query(`
    INSERT INTO public.marketplace_orders
      (buyer_id, seller_id, subtotal, commission, wallet_discount, total, currency, status, shipping_address, shipping_notes)
    VALUES ($1, $2, $3, $4, $5, $6, 'EUR', 'pending', $7, $8)
    RETURNING id
  `, [auth.profileId, sellerId, subtotal, commission, walletDiscount, total, body.shipping_address ?? '', body.shipping_notes ?? ''])
  const orderId = orderInsert.rows[0].id as string

  // Items
  for (const oi of orderItems) {
    await pool.query(`
      INSERT INTO public.marketplace_order_items (order_id, product_type, product_id, product_snapshot, quantity, unit_price, line_total)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [orderId, oi.product_type, oi.product_id, oi.snapshot, oi.quantity, oi.unit_price, oi.line_total])
  }

  // Crear Stripe Checkout Session si Stripe está configurado
  const stripeKey = process.env.STRIPE_SECRET_KEY
  let checkoutUrl: string | null = null
  if (stripeKey) {
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-05-28.basil' as Stripe.LatestApiVersion })
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: orderItems.map((oi) => ({
        quantity: oi.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(oi.unit_price * 100),
          product_data: {
            name: String(oi.snapshot.product_name ?? oi.snapshot.service_name ?? 'Producto'),
            description: String(oi.snapshot.description ?? '').slice(0, 500),
          },
        },
      })),
      metadata: { order_id: orderId, buyer_profile_id: auth.profileId, seller_profile_id: sellerId },
      success_url: `${getOrigin(/* eslint-disable-line */)}/marketplace/pedidos?ok=${orderId}`,
      cancel_url: `${getOrigin()}/marketplace/carrito?cancel=${orderId}`,
    })
    checkoutUrl = session.url
    await pool.query(`UPDATE public.marketplace_orders SET stripe_session_id = $1 WHERE id = $2`, [session.id, orderId])
  } else {
    // Sin Stripe: marcar pendiente, manual settlement
  }

  return json({ ok: true, order_id: orderId, checkout_url: checkoutUrl, total, commission, wallet_discount: walletDiscount })
}

function round2(n: number): number { return Math.round(n * 100) / 100 }
function getOrigin(): string { return process.env.PUBLIC_ORIGIN ?? 'https://exhaustmarket.vercel.app' }

/* ─── MENSAJERÍA ─── */

async function sendMessage(auth: AuthCtx, body: { recipient_id?: string; product_id?: string; order_id?: string; body?: string }): Promise<Response> {
  if (!body.recipient_id || !body.body) return json({ error: 'recipient_id + body required' }, 400)
  const pool = pgPool()
  const threadKey = body.order_id ? `order:${body.order_id}` :
                    body.product_id ? `product:${body.product_id}:buyer:${[auth.profileId, body.recipient_id].sort().join(':')}` :
                    `direct:${[auth.profileId, body.recipient_id].sort().join(':')}`
  const r = await pool.query(`
    INSERT INTO public.marketplace_messages (thread_key, sender_id, recipient_id, product_id, order_id, body)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [threadKey, auth.profileId, body.recipient_id, body.product_id ?? null, body.order_id ?? null, body.body])
  return json({ ok: true, message: r.rows[0] })
}

async function listThreads(auth: AuthCtx): Promise<Response> {
  const pool = pgPool()
  const r = await pool.query(`
    WITH last_msg AS (
      SELECT DISTINCT ON (thread_key)
        thread_key, sender_id, recipient_id, body, created_at, read_at, product_id, order_id
      FROM public.marketplace_messages
      WHERE sender_id = $1 OR recipient_id = $1
      ORDER BY thread_key, created_at DESC
    ),
    counter AS (
      SELECT thread_key, count(*) FILTER (WHERE read_at IS NULL AND recipient_id = $1) AS unread
      FROM public.marketplace_messages
      WHERE sender_id = $1 OR recipient_id = $1
      GROUP BY thread_key
    )
    SELECT lm.*, COALESCE(c.unread, 0) AS unread
    FROM last_msg lm
    LEFT JOIN counter c USING (thread_key)
    ORDER BY lm.created_at DESC
  `, [auth.profileId])
  return json({ threads: r.rows })
}

async function threadMessages(auth: AuthCtx, body: { thread_key?: string }): Promise<Response> {
  if (!body.thread_key) return json({ error: 'thread_key required' }, 400)
  const pool = pgPool()
  const r = await pool.query(`
    SELECT * FROM public.marketplace_messages
    WHERE thread_key = $1 AND (sender_id = $2 OR recipient_id = $2)
    ORDER BY created_at ASC
  `, [body.thread_key, auth.profileId])
  return json({ messages: r.rows })
}

async function markRead(auth: AuthCtx, body: { thread_key?: string }): Promise<Response> {
  if (!body.thread_key) return json({ error: 'thread_key required' }, 400)
  const pool = pgPool()
  await pool.query(`
    UPDATE public.marketplace_messages SET read_at = now()
    WHERE thread_key = $1 AND recipient_id = $2 AND read_at IS NULL
  `, [body.thread_key, auth.profileId])
  return json({ ok: true })
}

/* ─── KYC ─── */

async function kycSubmit(auth: AuthCtx, body: { dni_cif?: string; iban?: string; billing_address?: string; billing_city?: string; billing_zip?: string; billing_country?: string }): Promise<Response> {
  if (!body.dni_cif || !body.iban) return json({ error: 'dni_cif + iban required' }, 400)
  const pool = pgPool()
  await pool.query(`
    UPDATE public.user_profiles
    SET dni_cif = $1, iban = $2, billing_address = $3, billing_city = $4, billing_zip = $5, billing_country = $6,
        kyc_status = 'pending', kyc_submitted_at = now()
    WHERE id = $7
  `, [body.dni_cif, body.iban, body.billing_address ?? null, body.billing_city ?? null, body.billing_zip ?? null, body.billing_country ?? null, auth.profileId])
  return json({ ok: true, kyc_status: 'pending' })
}

/* ─── WALLET ─── */

async function walletInfo(auth: AuthCtx): Promise<Response> {
  const pool = pgPool()
  const w = await pool.query(`SELECT * FROM public.wallets WHERE user_id = $1`, [auth.profileId])
  const tx = await pool.query(`
    SELECT * FROM public.wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
  `, [auth.profileId])
  return json({ wallet: w.rows[0] ?? null, transactions: tx.rows })
}

/* ─── ORDER MANAGEMENT (seller/buyer) ─── */

async function shipOrder(auth: AuthCtx, body: { order_id?: string; courier?: string; tracking_number?: string }): Promise<Response> {
  if (!body.order_id) return json({ error: 'order_id required' }, 400)
  const pool = pgPool()
  const o = await pool.query(`SELECT seller_id, status FROM public.marketplace_orders WHERE id = $1`, [body.order_id])
  if (!o.rows[0]) return json({ error: 'order not found' }, 404)
  if (o.rows[0].seller_id !== auth.profileId && !auth.isAdmin) return json({ error: 'forbidden' }, 403)
  if (o.rows[0].status !== 'paid') return json({ error: `cannot ship in status ${o.rows[0].status}` }, 400)
  const notes = body.courier || body.tracking_number
    ? `Enviado · ${body.courier ?? ''} ${body.tracking_number ? '(tracking: ' + body.tracking_number + ')' : ''}`.trim()
    : null
  await pool.query(`
    UPDATE public.marketplace_orders
    SET status = 'shipped', shipped_at = now(),
        shipping_notes = COALESCE(shipping_notes || E'\n', '') || $1
    WHERE id = $2
  `, [notes ?? 'Enviado', body.order_id])
  return json({ ok: true })
}

async function markDelivered(auth: AuthCtx, body: { order_id?: string }): Promise<Response> {
  if (!body.order_id) return json({ error: 'order_id required' }, 400)
  const pool = pgPool()
  const o = await pool.query(`SELECT buyer_id, seller_id, status FROM public.marketplace_orders WHERE id = $1`, [body.order_id])
  if (!o.rows[0]) return json({ error: 'order not found' }, 404)
  if (o.rows[0].buyer_id !== auth.profileId && o.rows[0].seller_id !== auth.profileId && !auth.isAdmin) {
    return json({ error: 'forbidden' }, 403)
  }
  if (!['paid', 'shipped'].includes(o.rows[0].status)) {
    return json({ error: `cannot mark delivered in status ${o.rows[0].status}` }, 400)
  }
  await pool.query(`UPDATE public.marketplace_orders SET status = 'delivered', delivered_at = now() WHERE id = $1`, [body.order_id])
  return json({ ok: true })
}

async function raiseDispute(auth: AuthCtx, body: { order_id?: string; reason?: string }): Promise<Response> {
  if (!body.order_id || !body.reason) return json({ error: 'order_id + reason required' }, 400)
  const pool = pgPool()
  const o = await pool.query(`SELECT buyer_id, seller_id, status FROM public.marketplace_orders WHERE id = $1`, [body.order_id])
  if (!o.rows[0]) return json({ error: 'order not found' }, 404)
  if (o.rows[0].buyer_id !== auth.profileId && o.rows[0].seller_id !== auth.profileId) return json({ error: 'forbidden' }, 403)
  if (['cancelled', 'refunded'].includes(o.rows[0].status)) return json({ error: 'cannot dispute finalized order' }, 400)
  await pool.query(`
    UPDATE public.marketplace_orders
    SET status = 'disputed',
        shipping_notes = COALESCE(shipping_notes || E'\n', '') || $1
    WHERE id = $2
  `, [`Disputa: ${body.reason}`, body.order_id])
  // Notificar al otro lado vía mensaje
  const other = o.rows[0].buyer_id === auth.profileId ? o.rows[0].seller_id : o.rows[0].buyer_id
  await pool.query(`
    INSERT INTO public.marketplace_messages (thread_key, sender_id, recipient_id, order_id, body)
    VALUES ($1, $2, $3, $4, $5)
  `, [`order:${body.order_id}`, auth.profileId, other, body.order_id, `[DISPUTA] ${body.reason}`])
  return json({ ok: true })
}

async function cancelOrder(auth: AuthCtx, body: { order_id?: string; reason?: string }): Promise<Response> {
  if (!body.order_id) return json({ error: 'order_id required' }, 400)
  const pool = pgPool()
  const o = await pool.query(`SELECT buyer_id, seller_id, status FROM public.marketplace_orders WHERE id = $1`, [body.order_id])
  if (!o.rows[0]) return json({ error: 'order not found' }, 404)
  if (o.rows[0].buyer_id !== auth.profileId && o.rows[0].seller_id !== auth.profileId && !auth.isAdmin) return json({ error: 'forbidden' }, 403)
  if (!['pending', 'paid'].includes(o.rows[0].status)) return json({ error: `cannot cancel in status ${o.rows[0].status}` }, 400)
  await pool.query(`
    UPDATE public.marketplace_orders
    SET status = 'cancelled',
        shipping_notes = COALESCE(shipping_notes || E'\n', '') || $1
    WHERE id = $2
  `, [`Cancelado: ${body.reason ?? 'sin motivo'}`, body.order_id])
  return json({ ok: true })
}

/* ─── ADMIN ─── */

async function kycReview(auth: AuthCtx, body: { profile_id?: string; action?: string; notes?: string }): Promise<Response> {
  if (!auth.isAdmin) return json({ error: 'forbidden' }, 403)
  if (!body.profile_id || !body.action) return json({ error: 'profile_id + action required' }, 400)
  if (!['verified', 'rejected'].includes(body.action)) return json({ error: 'bad action' }, 400)
  const pool = pgPool()
  await pool.query(`
    UPDATE public.user_profiles
    SET kyc_status = $1,
        kyc_verified_at = CASE WHEN $1 = 'verified' THEN now() ELSE kyc_verified_at END
    WHERE id = $2
  `, [body.action, body.profile_id])
  // TODO: enviar email con notas si rejected
  return json({ ok: true })
}

async function sellerStats(auth: AuthCtx): Promise<Response> {
  const pool = pgPool()
  const sellerId = auth.profileId
  const [totals, byMonth, byProduct] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(CASE WHEN status IN ('paid','shipped','delivered') THEN subtotal ELSE 0 END), 0) AS gross_sales,
        COALESCE(SUM(CASE WHEN status IN ('paid','shipped','delivered') THEN commission ELSE 0 END), 0) AS total_commission,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN subtotal - commission + wallet_discount ELSE 0 END), 0) AS net_payout,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'paid')::int AS to_ship_count,
        COUNT(*) FILTER (WHERE status = 'shipped')::int AS shipped_count,
        COUNT(*) FILTER (WHERE status = 'disputed')::int AS disputed_count
      FROM public.marketplace_orders
      WHERE seller_id = $1
    `, [sellerId]),
    pool.query(`
      SELECT date_trunc('month', created_at)::date AS month,
             COUNT(*)::int AS orders,
             SUM(subtotal) AS sales,
             SUM(commission) AS commission
      FROM public.marketplace_orders
      WHERE seller_id = $1 AND status IN ('paid','shipped','delivered')
      GROUP BY 1 ORDER BY 1 DESC LIMIT 12
    `, [sellerId]),
    pool.query(`
      SELECT i.product_id, i.product_snapshot->>'product_name' AS name,
             SUM(i.quantity)::int AS units, SUM(i.line_total) AS revenue
      FROM public.marketplace_order_items i
      JOIN public.marketplace_orders o ON o.id = i.order_id
      WHERE o.seller_id = $1 AND o.status IN ('paid','shipped','delivered')
      GROUP BY i.product_id, i.product_snapshot->>'product_name'
      ORDER BY revenue DESC LIMIT 10
    `, [sellerId]),
  ])
  return json({ totals: totals.rows[0], by_month: byMonth.rows, top_products: byProduct.rows })
}

async function orderDetail(auth: AuthCtx, body: { order_id?: string }): Promise<Response> {
  if (!body.order_id) return json({ error: 'order_id required' }, 400)
  const pool = pgPool()
  const o = await pool.query(`SELECT * FROM public.marketplace_orders WHERE id = $1`, [body.order_id])
  if (!o.rows[0]) return json({ error: 'not found' }, 404)
  if (o.rows[0].buyer_id !== auth.profileId && o.rows[0].seller_id !== auth.profileId && !auth.isAdmin) return json({ error: 'forbidden' }, 403)
  const items = await pool.query(`SELECT * FROM public.marketplace_order_items WHERE order_id = $1`, [body.order_id])
  const [buyer, seller] = await Promise.all([
    pool.query(`SELECT id, full_name, company_name, email FROM public.user_profiles WHERE id = $1`, [o.rows[0].buyer_id]),
    pool.query(`SELECT id, full_name, company_name, email FROM public.user_profiles WHERE id = $1`, [o.rows[0].seller_id]),
  ])
  return json({ order: o.rows[0], items: items.rows, buyer: buyer.rows[0], seller: seller.rows[0] })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
