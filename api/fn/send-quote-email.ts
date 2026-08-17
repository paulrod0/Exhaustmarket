import { verifyToken } from '@clerk/backend'

/** Envía email "nuevo presupuesto" vía Resend. Self-contained (sin _lib). */
export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await verifyAuth(req)
    if (!auth) return json({ error: 'unauthorized' }, 401)

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const body = (await req.json()) as {
      to_email: string; to_name: string; from_name: string
      car_model: string; car_year: number; service_type: string; specifications: string
    }

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY missing — skipping email send')
      return json({ ok: true, skipped: true })
    }

    const origin = process.env.PUBLIC_ORIGIN ?? 'https://exhaustmarket.vercel.app'
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
        <h2>Nuevo presupuesto solicitado</h2>
        <p>Hola ${escapeHtml(body.to_name)},</p>
        <p><strong>${escapeHtml(body.from_name)}</strong> te ha pedido un presupuesto para:</p>
        <ul>
          <li><strong>Vehiculo:</strong> ${escapeHtml(body.car_model)} (${body.car_year})</li>
          <li><strong>Servicio:</strong> ${escapeHtml(body.service_type)}</li>
        </ul>
        <p><strong>Detalles:</strong></p>
        <blockquote style="border-left:3px solid #0071E3;padding-left:12px;color:#555">${escapeHtml(body.specifications)}</blockquote>
        <p><a href="${origin}/quotes" style="background:#0071E3;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">Ver en ExhaustMarket</a></p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'ExhaustMarket <noreply@exhaustmarket.com>',
        to: body.to_email,
        subject: `Nuevo presupuesto: ${body.car_model} (${body.car_year})`,
        html,
      }),
    })
    if (!res.ok) return json({ error: `Resend error: ${await res.text()}` }, 502)
    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
}

async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) return null
  try {
    const payload = (await verifyToken(header.slice(7), { secretKey: secret })) as { sub: string }
    return { userId: payload.sub }
  } catch { return null }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c))
}
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
