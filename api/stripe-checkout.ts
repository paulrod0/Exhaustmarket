import Stripe from 'stripe'
import { neon } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'

/**
 * Crea (o reutiliza) Product+Price de un tier y devuelve la URL de Stripe Checkout
 * para SUSCRIPCIÓN. Self-contained (sin _lib: rompe en Vercel).
 */
interface TierRow {
  id: string; name: string; price_monthly: string; price_yearly: string
  stripe_product_id: string | null; stripe_price_id_monthly: string | null; stripe_price_id_yearly: string | null
}
interface ProfileRow { id: string; email: string | null; full_name: string; stripe_customer_id: string | null }

export async function POST(req: Request): Promise<Response> {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    if (!STRIPE_SECRET_KEY) return json({ error: 'Stripe no configurado (falta STRIPE_SECRET_KEY)' }, 503)
    if (!process.env.DATABASE_URL) return json({ error: 'DATABASE_URL not set' }, 500)
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-05-28.basil' as Stripe.LatestApiVersion })
    const sql = neon(process.env.DATABASE_URL)

    const auth = await requireAuth(req, sql)
    if (!auth?.profileId) return json({ error: 'unauthorized' }, 401)

    const { tier, interval, success_url, cancel_url } = (await req.json()) as {
      tier: string; interval: 'monthly' | 'yearly'; success_url: string; cancel_url: string
    }
    if (!tier || !interval) return json({ error: 'tier+interval required' }, 400)

    const tiers = (await sql`SELECT * FROM public.subscription_tiers WHERE name = ${tier} LIMIT 1`) as TierRow[]
    const t = tiers[0]
    if (!t) return json({ error: 'tier not found' }, 404)

    let productId = t.stripe_product_id
    let priceId = interval === 'yearly' ? t.stripe_price_id_yearly : t.stripe_price_id_monthly

    if (!productId) {
      const product = await stripe.products.create({ name: `ExhaustMarket ${tier}`, metadata: { tier_id: t.id, tier_name: t.name } })
      productId = product.id
    }
    if (!priceId) {
      const amount = Math.round(parseFloat(interval === 'yearly' ? t.price_yearly : t.price_monthly) * 100)
      const price = await stripe.prices.create({
        product: productId, unit_amount: amount, currency: 'eur',
        recurring: { interval: interval === 'yearly' ? 'year' : 'month' },
      })
      priceId = price.id
      if (interval === 'yearly') {
        await sql`UPDATE public.subscription_tiers SET stripe_product_id = ${productId}, stripe_price_id_yearly = ${priceId} WHERE id = ${t.id}`
      } else {
        await sql`UPDATE public.subscription_tiers SET stripe_product_id = ${productId}, stripe_price_id_monthly = ${priceId} WHERE id = ${t.id}`
      }
    } else if (!t.stripe_product_id) {
      await sql`UPDATE public.subscription_tiers SET stripe_product_id = ${productId} WHERE id = ${t.id}`
    }

    const profiles = (await sql`SELECT id, email, full_name, stripe_customer_id FROM public.user_profiles WHERE id = ${auth.profileId} LIMIT 1`) as ProfileRow[]
    const profile = profiles[0]
    if (!profile) return json({ error: 'profile not found' }, 404)

    let customerId = profile.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email ?? auth.email ?? undefined,
        name: profile.full_name,
        metadata: { profile_id: profile.id, clerk_user_id: auth.userId },
      })
      customerId = customer.id
      await sql`UPDATE public.user_profiles SET stripe_customer_id = ${customerId} WHERE id = ${profile.id}`
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: { profile_id: profile.id, tier_id: t.id, interval },
    })

    return json({ url: session.url })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAuth(req: Request, sql: any): Promise<{ userId: string; profileId: string | null; email: string | null } | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return null
  try {
    const payload = (await verifyToken(header.slice(7), { secretKey: secret })) as { sub: string; email?: string }
    const rows = (await sql`SELECT id, email FROM public.user_profiles WHERE clerk_user_id = ${payload.sub} LIMIT 1`) as Array<{ id: string; email: string | null }>
    return { userId: payload.sub, profileId: rows[0]?.id ?? null, email: rows[0]?.email ?? payload.email ?? null }
  } catch {
    return null
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
