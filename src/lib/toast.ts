/**
 * Sistema de notificaciones toast ligero (sin dependencias).
 * Uso: `toast.success('Guardado')`, `toast.error('Algo falló')`.
 * La UI vive en <ToastHost /> montado una sola vez en App.
 */

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  expiresAt: number
}

type Listener = (toasts: Toast[]) => void

let nextId = 1
let active: Toast[] = []
const listeners = new Set<Listener>()

function emit() {
  const snapshot = active.slice()
  listeners.forEach((l) => l(snapshot))
}

function addToast(kind: ToastKind, message: string, durationMs = 3500) {
  const id = nextId++
  const t: Toast = { id, kind, message, expiresAt: Date.now() + durationMs }
  active = [...active, t]
  emit()
  setTimeout(() => {
    active = active.filter((x) => x.id !== id)
    emit()
  }, durationMs)
}

export const toast = {
  success: (msg: string) => addToast('success', msg),
  error: (msg: string) => addToast('error', msg),
  info: (msg: string) => addToast('info', msg),
  /** Subscribirse desde un componente. Devuelve función de unsubscribe. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    listener(active.slice())
    return () => {
      listeners.delete(listener)
    }
  },
  dismiss(id: number) {
    active = active.filter((t) => t.id !== id)
    emit()
  },
}
