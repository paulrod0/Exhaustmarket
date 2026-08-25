/**
 * Geocodificación server-side (dirección -> lat/lng) vía Nominatim (OpenStreetMap).
 * Se hace en servidor para respetar la política de uso (User-Agent obligatorio) y evitar CORS.
 * Uso: GET /api/geocode?q=<direccion>  ->  { lat, lon, display_name } | { error }
 * Self-contained (sin _lib: rompe en Vercel).
 */
export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q || q.length < 3) return json({ error: 'query too short' }, 400)

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`
    const r = await fetch(url, {
      headers: {
        // Nominatim exige un User-Agent identificable con contacto.
        'User-Agent': 'ExhaustMarket/1.0 (https://exhaustmarket.vercel.app)',
        'Accept-Language': 'es',
      },
    })
    if (!r.ok) return json({ error: `geocoder ${r.status}` }, 502)
    const arr = (await r.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>
    const hit = arr?.[0]
    if (!hit?.lat || !hit?.lon) return json({ error: 'not found' }, 404)
    return json({
      lat: Number(hit.lat),
      lon: Number(hit.lon),
      display_name: hit.display_name ?? null,
    })
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'geocode failed' }, 500)
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' },
  })
}
