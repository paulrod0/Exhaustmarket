import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { auth as authClient } from '../../lib/auth-client'
import { useAuthStore } from '../../stores/authStore'

interface Thread {
  thread_key: string
  sender_id: string
  recipient_id: string
  body: string
  created_at: string
  read_at: string | null
  unread: number
  product_id: string | null
  order_id: string | null
}

interface Message {
  id: string
  thread_key: string
  sender_id: string
  recipient_id: string
  body: string
  created_at: string
  read_at: string | null
}

export default function PanelMessagesPage() {
  const { profile } = useAuthStore()
  const [threads, setThreads] = useState<Thread[]>([])
  const [selected, setSelected] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)

  const apiCall = async (body: Record<string, unknown>) => {
    const token = await authClient.__getToken()
    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  const refreshThreads = async () => {
    const data = await apiCall({ op: 'list_threads' })
    setThreads(data.threads ?? [])
    setLoading(false)
  }

  const openThread = async (t: Thread) => {
    setSelected(t)
    const data = await apiCall({ op: 'thread_messages', thread_key: t.thread_key })
    setMessages(data.messages ?? [])
    if (t.unread > 0) await apiCall({ op: 'mark_read', thread_key: t.thread_key })
    refreshThreads()
  }

  const sendReply = async () => {
    if (!selected || !draft.trim() || !profile) return
    const otherUser = selected.sender_id === profile.id ? selected.recipient_id : selected.sender_id
    await apiCall({
      op: 'send_message',
      recipient_id: otherUser,
      product_id: selected.product_id,
      order_id: selected.order_id,
      body: draft,
    })
    setDraft('')
    openThread(selected)
  }

  useEffect(() => { if (profile) refreshThreads() }, [profile])

  if (!profile) return <div style={{ padding: 40 }}>Inicia sesión.</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 100px)', gap: 0 }}>
      <aside style={{ borderRight: '1px solid #E5E5EA', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #E5E5EA' }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>Mensajes</h2>
        </div>
        {loading ? <p style={{ padding: 16, color: '#86868B' }}>Cargando…</p> :
         threads.length === 0 ? <p style={{ padding: 16, color: '#86868B', fontSize: 13 }}>Aún no tienes conversaciones.</p> :
         threads.map((t) => (
          <button key={t.thread_key} onClick={() => openThread(t)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: 14, background: selected?.thread_key === t.thread_key ? '#F2F2F7' : 'white',
            border: 'none', borderBottom: '1px solid #F2F2F7', cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {t.product_id ? 'Producto' : t.order_id ? 'Pedido' : 'Conversación'}
              </span>
              {t.unread > 0 && (
                <span style={{ background: '#FF3B30', color: 'white', borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 600 }}>{t.unread}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#86868B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.body}
            </div>
            <div style={{ fontSize: 11, color: '#86868B', marginTop: 4 }}>
              {new Date(t.created_at).toLocaleString('es-ES')}
            </div>
          </button>
        ))}
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column' }}>
        {selected ? (
          <>
            <div style={{ padding: 16, borderBottom: '1px solid #E5E5EA', fontWeight: 600 }}>
              {selected.product_id ? `Producto ${selected.product_id.slice(0, 8)}…` : selected.order_id ? `Pedido ${selected.order_id.slice(0, 8)}…` : 'Conversación'}
            </div>
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((m) => (
                <div key={m.id} style={{
                  alignSelf: m.sender_id === profile.id ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                  padding: '8px 14px',
                  background: m.sender_id === profile.id ? '#0071E3' : '#F2F2F7',
                  color: m.sender_id === profile.id ? 'white' : '#1D1D1F',
                  borderRadius: 14,
                  fontSize: 14,
                }}>
                  {m.body}
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                    {new Date(m.created_at).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #E5E5EA', display: 'flex', gap: 8 }}>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                placeholder="Escribe un mensaje…" rows={2}
                style={{ flex: 1, padding: 10, border: '1px solid #D2D2D7', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none' }} />
              <button onClick={sendReply} disabled={!draft.trim()} style={{
                padding: '0 18px', background: '#0071E3', color: 'white', border: 'none',
                borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#86868B', margin: 'auto' }}>
            Selecciona una conversación
          </div>
        )}
      </main>
    </div>
  )
}
