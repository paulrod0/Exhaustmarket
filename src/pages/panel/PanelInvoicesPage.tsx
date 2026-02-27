import { useEffect, useState } from 'react'
import { usePanelStore } from '../../stores/panelStore'
import {
  FileText,
  Plus,
  X,
  Trash2,
  Download,
  FileDown,
  Loader2,
} from 'lucide-react'

interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
}

const TAX_RATE = 0.21

const statusConfig: Record<string, { label: string; badgeClass: string }> = {
  draft: { label: 'Borrador', badgeClass: 'badge badge-gray' },
  generated: {
    label: 'Generada',
    badgeClass: 'badge badge-blue',
  },
  sent: { label: 'Enviada', badgeClass: 'badge badge-orange' },
  paid: { label: 'Pagada', badgeClass: 'badge badge-green' },
}

export default function PanelInvoicesPage() {
  const {
    myInvoices,
    loading,
    fetchMyInvoices,
    createInvoice,
    generateInvoicePdf,
  } = usePanelStore()

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ])
  const [notes, setNotes] = useState('')
  const [dueAt, setDueAt] = useState('')

  useEffect(() => {
    fetchMyInvoices()
  }, [fetchMyInvoices])

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  )
  const taxAmount = subtotal * TAX_RATE
  const total = subtotal + taxAmount

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const resetForm = () => {
    setItems([{ description: '', quantity: 1, unit_price: 0 }])
    setNotes('')
    setDueAt('')
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    const validItems = items.filter((item) => item.description.trim() !== '')
    if (validItems.length === 0) {
      setFormError('Anade al menos un articulo a la factura')
      setSubmitting(false)
      return
    }

    try {
      await createInvoice({
        items: validItems,
        subtotal,
        tax_amount: taxAmount,
        total,
        notes: notes || undefined,
        due_at: dueAt || undefined,
      })
      setShowForm(false)
      resetForm()
    } catch (err: any) {
      setFormError(err.message ?? 'Error al crear la factura')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGeneratePdf = async (invoiceId: string) => {
    setGeneratingPdf(invoiceId)
    try {
      await generateInvoicePdf(invoiceId)
    } catch (err: any) {
      console.error('Error generating PDF:', err)
    } finally {
      setGeneratingPdf(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.01em', lineHeight: 1.14 }}>
            Facturas
          </h1>
          <p style={{ marginTop: '6px', fontSize: '14px', color: '#86868B' }}>
            Crea y gestiona tus facturas
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="btn-pill btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          Crear Factura
        </button>
      </div>

      {/* Create Invoice Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: '16px' }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '32px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '21px', fontWeight: 600, color: '#1D1D1F' }}>
                Nueva Factura
              </h2>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#86868B',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  marginBottom: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 59, 48, 0.08)',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#FF3B30',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Items */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
                    Articulos
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="btn-text"
                    style={{ fontSize: '13px' }}
                  >
                    Anadir articulo
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="card-flat"
                      style={{
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                          type="text"
                          placeholder="Descripcion"
                          required
                          className="input-apple"
                          style={{ fontSize: '14px' }}
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, 'description', e.target.value)
                          }
                        />
                        <div className="flex gap-3">
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#86868B' }}>
                              Cantidad
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              className="input-apple"
                              style={{ fontSize: '14px' }}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  'quantity',
                                  parseInt(e.target.value) || 1
                                )
                              }
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#86868B' }}>
                              Precio unitario ({'\u20ac'})
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              className="input-apple"
                              style={{ fontSize: '14px' }}
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  'unit_price',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#86868B',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.2s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#FF3B30' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#86868B' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div
                className="card-flat"
                style={{ padding: '20px' }}
              >
                <div className="flex justify-between" style={{ fontSize: '14px', color: '#6E6E73' }}>
                  <span>Subtotal</span>
                  <span>
                    {subtotal.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    {'\u20ac'}
                  </span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '14px', color: '#6E6E73', marginTop: '8px' }}>
                  <span>IVA (21%)</span>
                  <span>
                    {taxAmount.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    {'\u20ac'}
                  </span>
                </div>
                <div
                  className="flex justify-between"
                  style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #E5E5EA',
                    fontSize: '17px',
                    fontWeight: 600,
                    color: '#1D1D1F',
                  }}
                >
                  <span>Total</span>
                  <span>
                    {total.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    {'\u20ac'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
                  Notas (opcional)
                </label>
                <textarea
                  rows={2}
                  className="input-apple"
                  style={{ resize: 'none', fontSize: '14px' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales para la factura..."
                />
              </div>

              {/* Due date */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
                  Fecha de vencimiento (opcional)
                </label>
                <input
                  type="date"
                  className="input-apple"
                  style={{ fontSize: '14px' }}
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-pill btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-pill btn-primary btn-sm"
                  style={{ opacity: submitting ? 0.5 : 1 }}
                >
                  {submitting ? 'Creando...' : 'Crear Factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #F2F2F7',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#86868B', fontSize: '14px' }}>
            Cargando...
          </div>
        ) : myInvoices.length === 0 ? (
          <div className="flex flex-col items-center" style={{ padding: '64px 20px', textAlign: 'center' }}>
            <FileText size={40} style={{ color: '#D2D2D7', marginBottom: '16px' }} />
            <p style={{ fontSize: '17px', color: '#1D1D1F', fontWeight: 500 }}>
              No hay facturas todavia
            </p>
            <p style={{ marginTop: '4px', fontSize: '14px', color: '#86868B' }}>
              Crea tu primera factura para empezar
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F5F5F7' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Numero
                  </th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Fecha
                  </th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total
                  </th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Estado
                  </th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {myInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status] ?? {
                    label: invoice.status,
                    badgeClass: 'badge badge-gray',
                  }

                  return (
                    <tr
                      key={invoice.id}
                      style={{ borderBottom: '1px solid #F2F2F7', backgroundColor: '#FFFFFF' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
                    >
                      <td style={{ padding: '14px 20px', color: '#1D1D1F', fontWeight: 500 }}>
                        {invoice.invoice_number}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#6E6E73' }}>
                        {formatDate(invoice.issued_at)}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#1D1D1F', fontWeight: 500 }}>
                        {invoice.total.toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        {'\u20ac'}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={status.badgeClass}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div className="flex items-center gap-2">
                          {invoice.pdf_url ? (
                            <a
                              href={invoice.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-pill btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '12px',
                                padding: '5px 12px',
                                textDecoration: 'none',
                              }}
                            >
                              <Download size={13} />
                              Descargar PDF
                            </a>
                          ) : (
                            <button
                              onClick={() => handleGeneratePdf(invoice.id)}
                              disabled={generatingPdf === invoice.id}
                              className="btn-pill btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '12px',
                                padding: '5px 12px',
                                opacity: generatingPdf === invoice.id ? 0.5 : 1,
                              }}
                            >
                              {generatingPdf === invoice.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <FileDown size={13} />
                              )}
                              Generar PDF
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
