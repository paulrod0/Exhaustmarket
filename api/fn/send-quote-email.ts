/**
 * RETIRADA. Antes enviaba el email «nuevo presupuesto» con destinatario y texto que mandaba el
 * navegador: con RESEND_API_KEY configurada, cualquier usuario con sesión podía usarla para enviar
 * correos a cualquier dirección (relé de spam). Los avisos los envía ahora el servidor desde
 * /api/quotes, con el destinatario sacado de la base de datos.
 */
export async function POST(): Promise<Response> {
  return new Response(JSON.stringify({ error: 'Sustituido por /api/quotes (los avisos los envía el servidor).' }), {
    status: 410, headers: { 'content-type': 'application/json' },
  })
}
