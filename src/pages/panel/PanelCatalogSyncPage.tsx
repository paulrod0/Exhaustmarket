import { useEffect, useState } from 'react'
import { usePanelStore } from '../../stores/panelStore'
import {
  RefreshCw,
  Plus,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'

type SourceType = 'url' | 'csv' | 'feed'

export default function PanelCatalogSyncPage() {
  const {
    catalogSources,
    loading,
    fetchCatalogSources,
    addCatalogSource,
    deleteCatalogSource,
    triggerSync,
  } = usePanelStore()

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [sourceType, setSourceType] = useState<SourceType>('url')
  const [url, setUrl] = useState('')

  useEffect(() => {
    fetchCatalogSources()
  }, [fetchCatalogSources])

  const resetForm = () => {
    setSourceType('url')
    setUrl('')
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      await addCatalogSource({
        source_type: sourceType,
        url: sourceType !== 'csv' ? url : undefined,
        file_url: sourceType === 'csv' ? url : undefined,
      })
      setShowForm(false)
      resetForm()
    } catch (err: any) {
      setFormError(err.message ?? 'Error al anadir la fuente')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSync = async (sourceId: string) => {
    setSyncingId(sourceId)
    try {
      await triggerSync(sourceId)
    } catch (err: any) {
      console.error('Sync error:', err)
    } finally {
      setSyncingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCatalogSource(id)
      setDeleteConfirmId(null)
    } catch (err: any) {
      console.error('Delete error:', err)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca'
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusDisplay = (status: string, error?: string | null) => {
    switch (status) {
      case 'idle':
        return {
          icon: <Clock size={16} style={{ color: '#86868B' }} />,
          dotColor: '#86868B',
          label: 'Inactivo',
          badgeClass: 'badge badge-gray',
        }
      case 'syncing':
        return {
          icon: <Loader2 size={16} className="animate-spin" style={{ color: '#FF9500' }} />,
          dotColor: '#FF9500',
          label: 'Sincronizando',
          badgeClass: 'badge badge-orange',
        }
      case 'success':
        return {
          icon: <CheckCircle2 size={16} style={{ color: '#34C759' }} />,
          dotColor: '#34C759',
          label: 'Completado',
          badgeClass: 'badge badge-green',
        }
      case 'error':
        return {
          icon: <AlertCircle size={16} style={{ color: '#FF3B30' }} />,
          dotColor: '#FF3B30',
          label: error ?? 'Error',
          badgeClass: 'badge badge-red',
        }
      default:
        return {
          icon: null,
          dotColor: '#86868B',
          label: status,
          badgeClass: 'badge badge-gray',
        }
    }
  }

  const sourceTypeLabel: Record<string, string> = {
    url: 'URL',
    csv: 'CSV',
    feed: 'Feed',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.01em', lineHeight: 1.14 }}>
            Sincronizar Catalogo
          </h1>
          <p style={{ marginTop: '6px', fontSize: '14px', color: '#86868B' }}>
            Configura fuentes externas para sincronizar tu catalogo de productos
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
          Anadir Fuente
        </button>
      </div>

      {/* Add Source Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: '0 16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '21px', fontWeight: 600, color: '#1D1D1F' }}>
                Nueva Fuente de Catalogo
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Source Type */}
              <div>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
                  Tipo de fuente
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {(['url', 'csv', 'feed'] as SourceType[]).map((type) => (
                    <label
                      key={type}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="source_type"
                        value={type}
                        checked={sourceType === type}
                        onChange={() => setSourceType(type)}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#0071E3',
                        }}
                      />
                      <span style={{ fontSize: '14px', color: '#1D1D1F', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* URL / File reference */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
                  {sourceType === 'csv'
                    ? 'URL del archivo CSV'
                    : sourceType === 'feed'
                    ? 'URL del feed'
                    : 'URL de la fuente'}
                </label>
                <input
                  type="url"
                  required
                  placeholder={
                    sourceType === 'csv'
                      ? 'https://ejemplo.com/catalogo.csv'
                      : sourceType === 'feed'
                      ? 'https://ejemplo.com/feed.xml'
                      : 'https://ejemplo.com/api/products'
                  }
                  className="input-apple"
                  style={{ fontSize: '14px' }}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3" style={{ paddingTop: '8px' }}>
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
                  {submitting ? 'Anadiendo...' : 'Anadir Fuente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '32px',
              width: '100%',
              maxWidth: '380px',
              margin: '0 16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h3 style={{ fontSize: '21px', fontWeight: 600, color: '#1D1D1F' }}>
              Confirmar eliminacion
            </h3>
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#6E6E73', lineHeight: 1.5 }}>
              Estas seguro de que deseas eliminar esta fuente de catalogo? Esta
              accion no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3" style={{ marginTop: '24px' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-pill btn-secondary btn-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="btn-pill btn-sm"
                style={{ backgroundColor: '#FF3B30', color: '#FFFFFF' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Sources */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#86868B', fontSize: '14px' }}>
          Cargando...
        </div>
      ) : catalogSources.length === 0 ? (
        <div
          className="flex flex-col items-center"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #F2F2F7',
            padding: '64px 20px',
            textAlign: 'center',
          }}
        >
          <RefreshCw size={40} style={{ color: '#D2D2D7', marginBottom: '16px' }} />
          <p style={{ fontSize: '17px', color: '#1D1D1F', fontWeight: 500 }}>
            No hay fuentes configuradas
          </p>
          <p style={{ marginTop: '4px', fontSize: '14px', color: '#86868B' }}>
            Anade una fuente para sincronizar tu catalogo automaticamente
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {catalogSources.map((source) => {
            const display = statusDisplay(
              source.sync_status,
              source.sync_error
            )

            return (
              <div
                key={source.id}
                className="card-flat"
                style={{ padding: '20px 24px' }}
              >
                <div className="flex items-center justify-between">
                  {/* Left side: source info */}
                  <div className="flex items-center gap-4" style={{ flex: 1, minWidth: 0 }}>
                    {/* Status dot */}
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: display.dotColor,
                        flexShrink: 0,
                      }}
                    />
                    {/* Source details */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="flex items-center gap-3" style={{ marginBottom: '4px' }}>
                        <span
                          className="badge badge-gray"
                          style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}
                        >
                          {sourceTypeLabel[source.source_type] ?? source.source_type}
                        </span>
                        <span className={display.badgeClass}>
                          {display.label}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#6E6E73',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '400px',
                        }}
                      >
                        {source.url ?? source.file_url ?? '-'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#86868B', marginTop: '4px' }}>
                        Ultima sincronizacion: {formatDate(source.last_synced)}
                      </p>
                    </div>
                  </div>

                  {/* Right side: actions */}
                  <div className="flex items-center gap-2" style={{ flexShrink: 0, marginLeft: '16px' }}>
                    <button
                      onClick={() => handleSync(source.id)}
                      disabled={
                        syncingId === source.id ||
                        source.sync_status === 'syncing'
                      }
                      className="btn-pill btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        padding: '5px 12px',
                        opacity: (syncingId === source.id || source.sync_status === 'syncing') ? 0.5 : 1,
                      }}
                      title="Sincronizar ahora"
                    >
                      {syncingId === source.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RefreshCw size={13} />
                      )}
                      Sincronizar
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(source.id)}
                      title="Eliminar"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px',
                        color: '#86868B',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.08)'
                        e.currentTarget.style.color = '#FF3B30'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#86868B'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
