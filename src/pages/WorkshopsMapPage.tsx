import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'

interface Shop {
  id: string
  name: string
  user_type: string
  address: string | null
  latitude: number
  longitude: number
  is_verified: boolean
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export default function WorkshopsMapPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const mapEl = useRef<HTMLDivElement>(null)
  const mapObj = useRef<L.Map | null>(null)

  useEffect(() => {
    fetch('/api/workshops')
      .then((r) => r.json())
      .then((j: { data?: Shop[] }) =>
        setShops((j.data ?? []).map((s) => ({ ...s, latitude: Number(s.latitude), longitude: Number(s.longitude) }))),
      )
      .catch(() => setShops([]))
      .finally(() => setLoading(false))
  }, [])

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (!mapEl.current || mapObj.current) return
    const map = L.map(mapEl.current).setView([40.2, -3.7], 5) // España (centro)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    mapObj.current = map
    return () => {
      map.remove()
      mapObj.current = null
    }
  }, [])

  // Pinta/actualiza los marcadores cuando llegan los talleres.
  useEffect(() => {
    const map = mapObj.current
    if (!map || !shops.length) return
    const markers: L.CircleMarker[] = []
    const bounds = L.latLngBounds([])
    for (const s of shops) {
      if (!Number.isFinite(s.latitude) || !Number.isFinite(s.longitude)) continue
      const isWs = s.user_type === 'workshop'
      const color = isWs ? '#1f7a4d' : '#0f5c8c'
      const m = L.circleMarker([s.latitude, s.longitude], {
        radius: 9, color, fillColor: color, fillOpacity: 0.85, weight: 2,
      }).addTo(map)
      m.bindPopup(
        `<div style="min-width:170px">
           <div style="font-weight:600;margin-bottom:2px">${escapeHtml(s.name || 'Taller')}</div>
           <div style="font-size:12px;color:#666">${isWs ? 'Taller' : 'Profesional'}${s.is_verified ? ' · ✓ verificado' : ''}</div>
           ${s.address ? `<div style="font-size:12px;color:#666;margin-top:4px">${escapeHtml(s.address)}</div>` : ''}
           <a href="/quotes?taller=${encodeURIComponent(s.id)}" style="display:inline-block;margin-top:8px;color:#0071E3;font-size:13px;font-weight:600;text-decoration:none">Solicitar presupuesto →</a>
         </div>`,
      )
      markers.push(m)
      bounds.extend([s.latitude, s.longitude])
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    return () => markers.forEach((m) => m.remove())
  }, [shops])

  return (
    <div className="content-width" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Mapa de talleres y profesionales
        </h1>
        <p style={{ fontSize: 15, color: '#86868B', margin: 0 }}>
          Encuentra un taller o profesional cerca de ti y solicítale presupuesto directamente.
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <div
          ref={mapEl}
          style={{ height: '68vh', minHeight: 380, width: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid #E5E5EA', zIndex: 0 }}
        />
        {!loading && shops.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', padding: 24,
          }}>
            <div style={{
              background: 'white', borderRadius: 12, padding: '18px 22px', textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)', maxWidth: 360, pointerEvents: 'auto',
            }}>
              <MapPin size={26} style={{ color: '#86868B', marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 14, color: '#1D1D1F', fontWeight: 600 }}>Aún no hay talleres en el mapa</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#86868B', lineHeight: 1.4 }}>
                Los talleres y profesionales aparecen aquí cuando añaden su dirección en su perfil.
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 13, color: '#6E6E73' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#1f7a4d', display: 'inline-block' }} /> Taller
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#0f5c8c', display: 'inline-block' }} /> Profesional
        </span>
        {!loading && shops.length > 0 && <span style={{ marginLeft: 'auto' }}>{shops.length} en el mapa</span>}
      </div>
    </div>
  )
}
