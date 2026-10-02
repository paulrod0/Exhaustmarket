import { useEffect } from 'react'

/**
 * Franja «PRE» del entorno de pruebas. Solo se activa en las compilaciones de pre
 * (VITE_APP_ENV=pre, variable de Vercel solo para Preview); en producción no pinta nada.
 * Además marca la pestaña con [PRE] y pide a los buscadores que no indexen pre.
 */
export default function EnvBanner() {
  const isPre = import.meta.env.VITE_APP_ENV === 'pre'

  useEffect(() => {
    if (!isPre) return
    if (!document.title.startsWith('[PRE]')) document.title = `[PRE] ${document.title}`
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => { meta.remove() }
  }, [isPre])

  if (!isPre) return null
  return (
    <div
      role="status"
      aria-label="Entorno de pruebas"
      style={{
        position: 'fixed', left: 12, bottom: 12, zIndex: 9999, pointerEvents: 'none',
        background: '#FF9500', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
        padding: '6px 12px', borderRadius: 999, boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
      }}
    >
      PRE · entorno de pruebas
    </div>
  )
}
