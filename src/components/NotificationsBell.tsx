import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

interface Notification { id: string; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }

/**
 * Campana de avisos in-app (tabla notifications, la rellena el servidor: /api/quotes…). Se refresca
 * al navegar, al volver a la pestaña y cada minuto. Siempre filtrada por el propio perfil (el admin
 * no debe ver los avisos de otros aunque el facade se lo permitiera).
 */
export default function NotificationsBell() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const pid = profile?.id

  const load = useCallback(async () => {
    if (!pid) return
    const { data } = await supabase.from('notifications' as any).select('id, kind, title, body, link, read_at, created_at')
      .eq('user_id', pid).order('created_at', { ascending: false }).limit(20)
    if (Array.isArray(data)) setItems(data as unknown as Notification[])
  }, [pid])

  useEffect(() => {
    void load()
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load() }, 60_000)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => { window.clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [load])
  useEffect(() => { void load() }, [location.pathname, location.search, load])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!pid) return null
  const unread = items.filter((n) => !n.read_at).length

  const markAll = async () => {
    const now = new Date().toISOString()
    setItems((xs) => xs.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    await supabase.from('notifications' as any).update({ read_at: now } as any).eq('user_id', pid).is('read_at', null)
  }
  const openItem = async (n: Notification) => {
    setOpen(false)
    if (!n.read_at) {
      const now = new Date().toISOString()
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)))
      void supabase.from('notifications' as any).update({ read_at: now } as any).eq('id', n.id).eq('user_id', pid)
    }
    if (n.link) navigate(n.link)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button type="button" onClick={() => setOpen(!open)} aria-label={unread ? `Avisos: ${unread} sin leer` : 'Avisos'} aria-expanded={open}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#1D1D1F', display: 'flex' }}>
        <Bell size={16} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#FF3B30', color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: '16px', textAlign: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Avisos" style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 340, maxWidth: 'calc(100vw - 24px)', background: '#fff', borderRadius: 14, border: '1px solid #E5E5EA', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #F2F2F7' }}>
            <strong style={{ fontSize: 14, color: '#1D1D1F' }}>Avisos</strong>
            {unread > 0 && <button type="button" onClick={() => void markAll()} style={{ background: 'none', border: 'none', color: '#0071E3', fontSize: 12.5, cursor: 'pointer' }}>Marcar todo como leído</button>}
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {items.length === 0 ? <p style={{ padding: 18, fontSize: 13, color: '#86868B', margin: 0, textAlign: 'center' }}>No tienes avisos.</p>
              : items.map((n) => (
                <button key={n.id} type="button" onClick={() => void openItem(n)} style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderBottom: '1px solid #F7F7F9', background: n.read_at ? '#fff' : '#F5F9FF', cursor: 'pointer' }}>
                  <span style={{ width: 7, height: 7, marginTop: 6, borderRadius: '50%', background: n.read_at ? 'transparent' : '#0071E3', flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: n.read_at ? 500 : 700, color: '#1D1D1F' }}>{n.title}</span>
                    {n.body && <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 12.5, color: '#6E6E73', marginTop: 2 }}>{n.body}</span>}
                    <span style={{ display: 'block', fontSize: 11.5, color: '#86868B', marginTop: 3 }}>{ago(n.created_at)}</span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ago(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  if (s < 2 * 86400) return 'ayer'
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
