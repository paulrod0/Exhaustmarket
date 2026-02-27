import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useQuoteStore } from '../stores/quoteStore'
import { FileText, Plus, CheckCircle, XCircle, Send, MessageSquare } from 'lucide-react'

export default function QuotesPage() {
  const { profile, user } = useAuthStore()
  const {
    sentRequests,
    receivedRequests,
    loading,
    fetchSentRequests,
    fetchReceivedRequests,
  } = useQuoteStore()

  const [view, setView] = useState<'sent' | 'received'>('sent')
  const [showNewRequestForm, setShowNewRequestForm] = useState(false)

  useEffect(() => {
    if (user) {
      fetchSentRequests()
      fetchReceivedRequests()
    }
  }, [user, fetchSentRequests, fetchReceivedRequests])

  const canReceiveQuotes = profile?.user_type === 'workshop' || profile?.user_type === 'professional' || profile?.user_type === 'premium'

  return (
    <div className="content-width" style={{ paddingTop: 60, paddingBottom: 80 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
        <h1 className="text-headline" style={{ color: '#1D1D1F' }}>Cotizaciones</h1>
        <button
          onClick={() => setShowNewRequestForm(true)}
          className="btn-pill btn-primary"
          style={{ gap: 8, display: 'inline-flex', alignItems: 'center' }}
        >
          <Plus size={18} />
          Nueva Solicitud
        </button>
      </div>

      {/* Segmented Control */}
      <div style={{
        display: 'flex',
        backgroundColor: '#F5F5F7',
        borderRadius: 980,
        padding: 4,
        width: 'fit-content',
        marginBottom: 32,
      }}>
        <button
          onClick={() => setView('sent')}
          style={{
            padding: '10px 24px',
            borderRadius: 980,
            fontSize: 14,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            backgroundColor: view === 'sent' ? '#FFFFFF' : 'transparent',
            color: view === 'sent' ? '#1D1D1F' : '#6E6E73',
            boxShadow: view === 'sent' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          Mis Solicitudes
        </button>
        {canReceiveQuotes && (
          <button
            onClick={() => setView('received')}
            style={{
              padding: '10px 24px',
              borderRadius: 980,
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              backgroundColor: view === 'received' ? '#FFFFFF' : 'transparent',
              color: view === 'received' ? '#1D1D1F' : '#6E6E73',
              boxShadow: view === 'received' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Recibidas
          </button>
        )}
      </div>

      {/* New Request Modal */}
      {showNewRequestForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewRequestForm(false) }}
        >
          <div style={{ width: '100%', maxWidth: 560, margin: '0 22px' }}>
            <NewQuoteRequestForm
              onClose={() => setShowNewRequestForm(false)}
              onSuccess={() => {
                setShowNewRequestForm(false)
              }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#86868B' }}>
            <div style={{
              width: 20,
              height: 20,
              border: '2px solid #D2D2D7',
              borderTopColor: '#0071E3',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span style={{ fontSize: 14 }}>Cargando...</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {view === 'sent' ? (
            sentRequests.length === 0 ? (
              <EmptyState message="No has enviado ninguna solicitud de presupuesto todavia" />
            ) : (
              sentRequests.map((request) => (
                <QuoteRequestCard
                  key={request.id}
                  request={request}
                  quotes={request.quotes || []}
                  isSender={true}
                />
              ))
            )
          ) : (
            receivedRequests.length === 0 ? (
              <EmptyState message="No has recibido ninguna solicitud de presupuesto todavia" />
            ) : (
              receivedRequests.map((request) => (
                <QuoteRequestCard
                  key={request.id}
                  request={request}
                  quotes={request.quotes || []}
                  isSender={false}
                />
              ))
            )
          )}
        </div>
      )}
    </div>
  )
}

function QuoteRequestCard({ request, quotes, isSender }: { request: any; quotes: any[]; isSender: boolean }) {
  const { respondToQuote, updateRequestStatus } = useQuoteStore()
  const [showRespondForm, setShowRespondForm] = useState(false)
  const [respondPrice, setRespondPrice] = useState('')
  const [respondNotes, setRespondNotes] = useState('')
  const [respondValidUntil, setRespondValidUntil] = useState('')
  const [respondLoading, setRespondLoading] = useState(false)
  const [respondError, setRespondError] = useState('')

  const statusConfig: Record<string, { badge: string; text: string }> = {
    pending: { badge: 'badge badge-orange', text: 'Pendiente' },
    quoted: { badge: 'badge badge-blue', text: 'Cotizado' },
    accepted: { badge: 'badge badge-green', text: 'Aceptado' },
    rejected: { badge: 'badge badge-red', text: 'Rechazado' },
  }

  const status = statusConfig[request.status as string] || statusConfig.pending

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault()
    setRespondLoading(true)
    setRespondError('')

    try {
      await respondToQuote({
        quote_request_id: request.id,
        price: parseFloat(respondPrice),
        notes: respondNotes,
        valid_until: respondValidUntil,
      })
      setShowRespondForm(false)
      setRespondPrice('')
      setRespondNotes('')
      setRespondValidUntil('')
    } catch (err) {
      setRespondError(err instanceof Error ? err.message : 'Error al enviar cotizacion')
    } finally {
      setRespondLoading(false)
    }
  }

  const handleAccept = async (quoteRequestId: string) => {
    await updateRequestStatus(quoteRequestId, 'accepted')
  }

  const handleReject = async (quoteRequestId: string) => {
    await updateRequestStatus(quoteRequestId, 'rejected')
  }

  const defaultValidUntil = () => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  }

  // Find best quote price
  const bestQuote = quotes.length > 0 ? quotes.reduce((a: any, b: any) => a.price < b.price ? a : b) : null

  return (
    <div className="card-flat" style={{ padding: 24 }}>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', marginBottom: 4 }}>
            {request.service_type}
          </h3>
          <p style={{ fontSize: 14, color: '#6E6E73' }}>
            {request.car_model} ({request.car_year})
          </p>
        </div>
        <span className={status.badge}>
          {status.text}
        </span>
      </div>

      {/* Description */}
      <p style={{ fontSize: 14, color: '#6E6E73', lineHeight: 1.5, marginBottom: 8 }}>
        {request.specifications}
      </p>

      {/* Price & Date Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: quotes.length > 0 ? 0 : 4 }}>
        {bestQuote && (
          <span style={{ fontSize: 21, fontWeight: 600, color: '#1D1D1F' }}>
            {'\u20AC'}{bestQuote.price.toFixed(2)}
          </span>
        )}
        <span className="text-caption" style={{ color: '#86868B', marginLeft: 'auto' }}>
          {new Date(request.created_at).toLocaleDateString('es-ES')}
        </span>
      </div>

      {/* Quotes Section */}
      {quotes.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #E5E5EA' }}>
          <h4 style={{ fontSize: 14, fontWeight: 500, color: '#6E6E73', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={14} />
            Cotizaciones ({quotes.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {quotes.map((quote: any) => (
              <div
                key={quote.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 21, fontWeight: 600, color: '#0071E3' }}>
                    {'\u20AC'}{quote.price.toFixed(2)}
                  </span>
                  <span className="text-caption" style={{ color: '#86868B' }}>
                    Valido hasta: {new Date(quote.valid_until).toLocaleDateString('es-ES')}
                  </span>
                </div>
                {quote.notes && (
                  <p style={{ fontSize: 14, color: '#6E6E73', lineHeight: 1.5 }}>{quote.notes}</p>
                )}

                {/* Accept/Reject buttons */}
                {isSender && request.status === 'quoted' && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="btn-pill"
                      style={{
                        flex: 1,
                        backgroundColor: '#34C759',
                        color: '#FFFFFF',
                        fontSize: 14,
                        padding: '10px 20px',
                        gap: 6,
                      }}
                    >
                      <CheckCircle size={16} />
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="btn-pill"
                      style={{
                        flex: 1,
                        backgroundColor: 'transparent',
                        color: '#FF3B30',
                        border: '1px solid #FF3B30',
                        fontSize: 14,
                        padding: '10px 20px',
                        gap: 6,
                      }}
                    >
                      <XCircle size={16} />
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* "Ver detalles" link */}
      {quotes.length === 0 && (
        <div style={{ marginTop: 8 }}>
          <button className="btn-text" style={{ fontSize: 14 }}>
            Ver detalles
          </button>
        </div>
      )}

      {/* Respond button for workshop when status is pending */}
      {!isSender && request.status === 'pending' && !showRespondForm && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => {
              if (!respondValidUntil) setRespondValidUntil(defaultValidUntil())
              setShowRespondForm(true)
            }}
            className="btn-pill btn-primary"
            style={{ width: '100%' }}
          >
            Responder
          </button>
        </div>
      )}

      {/* Respond form for workshops */}
      {!isSender && showRespondForm && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #E5E5EA' }}>
          <h4 style={{ fontSize: 14, fontWeight: 500, color: '#6E6E73', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Send size={14} />
            Enviar Cotizacion
          </h4>

          {respondError && (
            <div style={{
              backgroundColor: 'rgba(255,59,48,0.08)',
              color: '#FF3B30',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              fontSize: 14,
            }}>
              {respondError}
            </div>
          )}

          <form onSubmit={handleRespond} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
                Precio ({'\u20AC'})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={respondPrice}
                onChange={(e) => setRespondPrice(e.target.value)}
                required
                placeholder="Ej: 450.00"
                className="input-apple"
              />
            </div>

            <div>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
                Notas
              </label>
              <textarea
                value={respondNotes}
                onChange={(e) => setRespondNotes(e.target.value)}
                placeholder="Detalles de la cotizacion, tiempos de entrega, etc."
                rows={3}
                className="input-apple"
                style={{ resize: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
                Valido hasta
              </label>
              <input
                type="date"
                value={respondValidUntil}
                onChange={(e) => setRespondValidUntil(e.target.value)}
                required
                className="input-apple"
              />
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
              <button
                type="submit"
                disabled={respondLoading}
                className="btn-pill btn-primary"
                style={{ flex: 1, opacity: respondLoading ? 0.5 : 1, cursor: respondLoading ? 'not-allowed' : 'pointer' }}
              >
                {respondLoading ? 'Enviando...' : 'Enviar Cotizacion'}
              </button>
              <button
                type="button"
                onClick={() => setShowRespondForm(false)}
                className="btn-pill btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function NewQuoteRequestForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { workshops, fetchWorkshops, createQuoteRequest, loading: storeLoading } = useQuoteStore()
  const [targetWorkshopId, setTargetWorkshopId] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carYear, setCarYear] = useState(new Date().getFullYear())
  const [serviceType, setServiceType] = useState('')
  const [specifications, setSpecifications] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchWorkshops()
  }, [fetchWorkshops])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!targetWorkshopId) {
      setError('Selecciona un taller o profesional')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await createQuoteRequest({
        target_user_id: targetWorkshopId,
        car_model: carModel,
        car_year: carYear,
        service_type: serviceType,
        specifications,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 32,
      width: '100%',
    }}>
      <h2 style={{ fontSize: 28, fontWeight: 600, color: '#1D1D1F', marginBottom: 24 }}>
        Nueva Solicitud
      </h2>

      {error && (
        <div style={{
          backgroundColor: 'rgba(255,59,48,0.08)',
          color: '#FF3B30',
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
            Taller / Profesional
          </label>
          <select
            value={targetWorkshopId}
            onChange={(e) => setTargetWorkshopId(e.target.value)}
            required
            className="input-apple"
          >
            <option value="">-- Selecciona un taller --</option>
            {workshops.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.company_name || ws.full_name}
              </option>
            ))}
          </select>
          {workshops.length === 0 && !storeLoading && (
            <p style={{ color: '#FF9500', fontSize: 12, marginTop: 6 }}>
              No hay talleres verificados disponibles
            </p>
          )}
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
            Modelo de Coche
          </label>
          <input
            type="text"
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            required
            placeholder="Ej: Toyota Corolla"
            className="input-apple"
          />
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
            Ano
          </label>
          <input
            type="number"
            value={carYear}
            onChange={(e) => setCarYear(parseInt(e.target.value))}
            required
            min={1900}
            max={new Date().getFullYear() + 1}
            className="input-apple"
          />
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
            Tipo de Servicio
          </label>
          <input
            type="text"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            required
            placeholder="Ej: Sistema de escape deportivo"
            className="input-apple"
          />
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
            Especificaciones
          </label>
          <textarea
            value={specifications}
            onChange={(e) => setSpecifications(e.target.value)}
            required
            placeholder="Describe las especificaciones de tu vehiculo y lo que necesitas..."
            rows={4}
            className="input-apple"
            style={{ resize: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
          <button
            type="submit"
            disabled={submitting}
            className="btn-pill btn-primary"
            style={{ flex: 1, opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-pill btn-secondary"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-flat" style={{ padding: '64px 32px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: '#E5E5EA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <FileText size={24} style={{ color: '#86868B' }} />
        </div>
      </div>
      <p style={{ fontSize: 14, color: '#86868B' }}>{message}</p>
    </div>
  )
}
