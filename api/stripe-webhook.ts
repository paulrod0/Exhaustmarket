import Stripe from 'stripe'
import { neon } from '@neondatabase/serverless'

/**
 * Webhook de Stripe. Self-contained (sin _lib: importar de _lib rompe en Vercel).
 * Las comprobaciones de env van DENTRO del handler para no crashear al arrancar.
 * Necesita el raw body para verificar la firma.
 */
export const config = {
  api: { bodyParser: false },
}

export async function POST(req: Request): Promise<Response> {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response('Stripe no configurado (faltan STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET)', { status: 503 })
  }
  if (!process.env.DATABASE_URL) return new Response('DATABASE_URL not set', { status: 500 })

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-05-28.basil' as Stripe.LatestApiVersion })
  const sql = neon(process.env.DATABASE_URL)

  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('missing signature', { status: 400 })
  const raw = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    return new Response(`bad signature: ${(e as Error).message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.order_id
        const sellerProfileId = session.metadata?.seller_profile_id
        if (orderId && sellerProfileId) {
          await sql`
            UPDATE public.marketplace_orders
            SET status = 'paid', paid_at = now(),
                stripe_payment_intent = ${typeof session.payment_intent === 'string' ? session.payment_intent : null}
            WHERE id = ${orderId}
          `
          const order = await sql`SELECT wallet_discount FROM public.marketplace_orders WHERE id = ${orderId}` as { wallet_discount: number }[]
          const walletDiscount = Number(order[0]?.wallet_discount ?? 0)
          if (walletDiscount > 0) {
            const wallet = await sql`SELECT id FROM public.wallets WHERE user_id = ${sellerProfileId}` as { id: string }[]
            if (wallet[0]) {
              await sql`
                INSERT INTO public.wallet_transactions
                  (wallet_id, user_id, kind, amount, reason, related_order_id)
                VALUES (${wallet[0].id}, ${sellerProfileId}, 'debit_commission_offset', ${-walletDiscount},
                        'Comisión cubierta con monedero', ${orderId})
              `
              await sql`
                UPDATE public.wallets
                SET balance = balance - ${walletDiscount}, total_spent = total_spent + ${walletDiscount}, updated_at = now()
                WHERE id = ${wallet[0].id}
              `
            }
          }
          break
        }

        const profileId = session.metadata?.profile_id
        const tierId = session.metadata?.tier_id
        const interval = session.metadata?.interval as 'monthly' | 'yearly'
        if (!profileId || !tierId) break

        const expiresAt = new Date()
        if (interval === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        else expiresAt.setMonth(expiresAt.getMonth() + 1)

        await sql`
          INSERT INTO public.user_subscriptions (user_id, tier_id, status, billing_cycle, started_at, expires_at, stripe_subscription_id)
          VALUES (${profileId}, ${tierId}, 'active', ${interval ?? 'monthly'}, now(), ${expiresAt.toISOString()}, ${typeof session.subscription === 'string' ? session.subscription : null})
        `
        const tierName = await sql`SELECT name FROM public.subscription_tiers WHERE id = ${tierId} LIMIT 1`
        const name = (tierName as { name: string }[])[0]?.name
        if (name) {
          await sql`UPDATE public.user_profiles SET user_type = ${name}::user_type_enum WHERE id = ${profileId}`
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await sql`UPDATE public.user_subscriptions SET status = 'cancelled', updated_at = now() WHERE stripe_subscription_id = ${sub.id}`
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const subId = (inv as unknown as { subscription?: string }).subscription
        if (subId) {
          await sql`UPDATE public.user_subscriptions SET status = 'expired', updated_at = now() WHERE stripe_subscription_id = ${subId}`
        }
        break
      }
    }
    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error('webhook error', e)
    return new Response((e as Error).message, { status: 500 })
  }
}
