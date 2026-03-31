import { useEffect, useState } from 'react'
import { Key, Plus, Trash2, Copy, Check, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { useSupplierStore } from '../../stores/supplierStore'

export default function PanelApiKeysPage() {
  const {
    apiKeys, syncLogs, loading, error, newlyGeneratedKey,
    fetchApiKeys, fetchSyncLogs, generateApiKey, revokeApiKey, clearNewKey,
  } = useSupplierStore()

  const [showForm, setShowForm] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [copied, setCopied] = useState(false)
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
    fetchSyncLogs()
  }, [fetchApiKeys, fetchSyncLogs])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName.trim()) return
    await generateApiKey(keyName.trim())
    setKeyName('')
    setShowForm(false)
  }

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available — silently ignore
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.01em', lineHeight: 1.14 }}>
            Sincronización API
          </h1>
          <p style={{ marginTop: '6px', fontSize: '14px', color: '#86868B' }}>
            Gestiona tus API Keys para sincronizar productos desde cualquier plataforma
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-pill btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          Nueva API Key
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            marginBottom: '16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 59, 48, 0.08)',
            border: '1px solid rgba(255, 59, 48, 0.2)',
            padding: '12px 16px',
            fontSize: '14px',
            color: '#FF3B30',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Newly Generated Key Banner */}
      {newlyGeneratedKey && (
        <div
          style={{
            marginBottom: '16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(52, 199, 89, 0.08)',
            border: '1px solid rgba(52, 199, 89, 0.2)',
            padding: '16px',
          }}
        >
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#1D8F42', marginBottom: '8px' }}>
            API Key generada. Cópiala ahora — no se mostrará de nuevo.
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F5F5F7',
              border: '1px solid #F2F2F7',
              borderRadius: '8px',
              padding: '10px 12px',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: '12px',
              color: '#1D1D1F',
              wordBreak: 'break-all',
            }}
          >
            <span style={{ flex: 1 }}>{newlyGeneratedKey}</span>
            <button
              onClick={() => handleCopy(newlyGeneratedKey)}
              aria-label="Copiar API Key"
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                color: '#86868B',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {copied ? <Check size={16} style={{ color: '#34C759' }} /> : <Copy size={16} />}
            </button>
          </div>
          <button
            onClick={clearNewKey}
            style={{
              marginTop: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#86868B',
              padding: 0,
            }}
          >
            Ya la he copiado, cerrar
          </button>
        </div>
      )}

      {/* New Key Form */}
      {showForm && (
        <div
          style={{
            marginBottom: '16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #F2F2F7',
            padding: '20px',
          }}
        >
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F', marginBottom: '12px' }}>
            Nueva API Key
          </p>
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              placeholder="Nombre (ej: WooCommerce Producción)"
              value={keyName}
              onChange={e => setKeyName(e.target.value)}
              className="input-apple"
              style={{ fontSize: '14px', padding: '10px 14px' }}
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-pill btn-primary btn-sm"
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                {loading ? 'Generando...' : 'Generar'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-pill btn-secondary btn-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* API Keys Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #F2F2F7',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #F2F2F7',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Key size={16} style={{ color: '#0071E3' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
            Tus API Keys ({apiKeys.length})
          </span>
        </div>

        {loading && apiKeys.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#86868B', fontSize: '14px' }}>
            Cargando...
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="flex flex-col items-center" style={{ padding: '64px 20px', textAlign: 'center' }}>
            <Key size={40} style={{ color: '#D2D2D7', marginBottom: '16px' }} />
            <p style={{ fontSize: '17px', color: '#1D1D1F', fontWeight: 500 }}>
              No tienes API Keys aún
            </p>
            <p style={{ marginTop: '4px', fontSize: '14px', color: '#86868B' }}>
              Crea una para empezar a sincronizar productos
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F5F5F7' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nombre</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prefijo</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Último uso</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Creada</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => (
                  <tr
                    key={key.id}
                    style={{ borderBottom: '1px solid #F2F2F7', backgroundColor: '#FFFFFF' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
                  >
                    <td style={{ padding: '14px 20px', color: '#1D1D1F', fontWeight: 500 }}>{key.name}</td>
                    <td style={{ padding: '14px 20px', fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#6E6E73', fontSize: '12px' }}>{key.key_prefix}</td>
                    <td style={{ padding: '14px 20px', color: '#6E6E73' }}>
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString('es-ES') : 'Nunca'}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#6E6E73' }}>
                      {new Date(key.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      {revokeConfirmId === key.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span style={{ fontSize: '12px', color: '#FF3B30' }}>¿Revocar?</span>
                          <button
                            onClick={async () => {
                              await revokeApiKey(key.id)
                              setRevokeConfirmId(null)
                            }}
                            style={{ fontSize: '12px', fontWeight: 500, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setRevokeConfirmId(null)}
                            style={{ fontSize: '12px', color: '#86868B', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRevokeConfirmId(key.id)}
                          aria-label="Revocar API Key"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '8px',
                            color: '#86868B',
                            display: 'inline-flex',
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sync Logs Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #F2F2F7',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #F2F2F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw size={16} style={{ color: '#0071E3' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>Historial de sincronización</span>
          </div>
          <button
            onClick={fetchSyncLogs}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: loading ? 'default' : 'pointer',
              fontSize: '12px',
              color: '#86868B',
              padding: 0,
              opacity: loading ? 0.5 : 1,
            }}
          >
            Actualizar
          </button>
        </div>

        {syncLogs.length === 0 ? (
          <p style={{ padding: '32px 20px', textAlign: 'center', fontSize: '14px', color: '#86868B' }}>
            Sin sincronizaciones todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F5F5F7' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estado</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Acción</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plataforma</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resultados</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map(log => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid #F2F2F7', backgroundColor: '#FFFFFF' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      {log.status === 'success'
                        ? <CheckCircle size={16} style={{ color: '#34C759' }} />
                        : <AlertCircle size={16} style={{ color: '#FF3B30' }} />}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#1D1D1F' }}>{log.action}</td>
                    <td style={{ padding: '14px 20px', color: '#6E6E73' }}>{log.source_platform ?? '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: '12px', color: '#6E6E73' }}>
                      +{log.products_created} ~{log.products_updated} -{log.products_deleted}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#6E6E73' }}>
                      {new Date(log.started_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Integration Guide */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #F2F2F7',
          padding: '20px',
        }}
      >
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F', marginBottom: '12px' }}>
          Cómo integrar tu tienda
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#6E6E73' }}>
          <p>
            <span style={{ color: '#1D1D1F', fontWeight: 500 }}>Endpoint:</span>{' '}
            <code style={{ backgroundColor: '#F5F5F7', padding: '2px 6px', borderRadius: '4px', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
              POST https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync
            </code>
          </p>
          <p>
            <span style={{ color: '#1D1D1F', fontWeight: 500 }}>Header:</span>{' '}
            <code style={{ backgroundColor: '#F5F5F7', padding: '2px 6px', borderRadius: '4px', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
              Authorization: Bearer em_live_xxxx
            </code>
          </p>
          <p>
            <span style={{ color: '#1D1D1F', fontWeight: 500 }}>WordPress/WooCommerce:</span>{' '}
            Instala el plugin ExhaustMarket Sync y pega tu API Key en los ajustes.
          </p>
        </div>
      </div>
    </div>
  )
}
