import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { toast, type Toast, type ToastKind } from '../lib/toast'

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return toast.subscribe(setToasts)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const palette = paletteFor(t.kind)
        const Icon = palette.icon
        return (
          <div
            key={t.id}
            style={{
              backgroundColor: palette.bg,
              color: palette.fg,
              borderRadius: 12,
              padding: '12px 14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              pointerEvents: 'auto',
              animation: 'toastSlide 0.25s ease',
              fontSize: 13,
              border: `1px solid ${palette.border}`,
            }}
          >
            <Icon size={18} style={{ flexShrink: 0, color: palette.accent, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>{t.message}</div>
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: palette.fg,
                opacity: 0.6,
                cursor: 'pointer',
                padding: 0,
                marginLeft: 4,
                flexShrink: 0,
              }}
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}

      <style>{`
        @keyframes toastSlide {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function paletteFor(kind: ToastKind) {
  switch (kind) {
    case 'success':
      return {
        bg: '#FFFFFF',
        fg: '#1D1D1F',
        border: '#D1F7D1',
        accent: '#1A8C1A',
        icon: CheckCircle2,
      }
    case 'error':
      return {
        bg: '#FFFFFF',
        fg: '#1D1D1F',
        border: '#FFD1D4',
        accent: '#D70015',
        icon: XCircle,
      }
    case 'info':
      return {
        bg: '#FFFFFF',
        fg: '#1D1D1F',
        border: '#D1EAFE',
        accent: '#0071E3',
        icon: Info,
      }
  }
}
