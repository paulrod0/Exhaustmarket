/**
 * Carrito de compra simple persistido en localStorage.
 * Solo permite items del MISMO seller (limitación actual del endpoint).
 */

export interface CartItem {
  product_type: 'professional_product' | 'workshop_service' | 'aftermarket_product'
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  seller_id: string | null
  seller_name?: string | null
  image_url?: string | null
}

const KEY = 'em_cart_v1'

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as CartItem[]
  } catch {
    return []
  }
}

function write(items: CartItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('em_cart_changed'))
}

export const cart = {
  list(): CartItem[] { return read() },

  add(item: CartItem): { ok: boolean; error?: string } {
    const items = read()
    // Multi-seller no permitido todavía
    const otherSeller = items.find((i) => i.seller_id && item.seller_id && i.seller_id !== item.seller_id)
    if (otherSeller) {
      return { ok: false, error: 'Tu carrito tiene productos de otro vendedor. Finaliza esa compra primero o vacía el carrito.' }
    }
    const existing = items.find((i) => i.product_type === item.product_type && i.product_id === item.product_id)
    if (existing) existing.quantity += item.quantity
    else items.push(item)
    write(items)
    return { ok: true }
  },

  remove(productType: string, productId: string) {
    write(read().filter((i) => !(i.product_type === productType && i.product_id === productId)))
  },

  setQuantity(productType: string, productId: string, qty: number) {
    const items = read()
    const it = items.find((i) => i.product_type === productType && i.product_id === productId)
    if (!it) return
    if (qty <= 0) write(items.filter((i) => !(i.product_type === productType && i.product_id === productId)))
    else { it.quantity = qty; write(items) }
  },

  clear() { write([]) },

  count(): number { return read().reduce((s, i) => s + i.quantity, 0) },

  subtotal(): number { return read().reduce((s, i) => s + i.unit_price * i.quantity, 0) },
}
