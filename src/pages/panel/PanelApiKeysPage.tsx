import { useEffect, useState } from 'react'
import { Key, Plus, Trash2, Copy, Check, RefreshCw, AlertCircle, CheckCircle, Download, Globe, Plug } from 'lucide-react'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Zustand actions are stable refs — run once on mount

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
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #F2F2F7', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F2F2F7' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F', margin: 0 }}>
            Cómo empezar
          </p>
          <p style={{ fontSize: '13px', color: '#86868B', marginTop: '2px', marginBottom: 0 }}>
            Sigue estos pasos para sincronizar tu catálogo con ExhaustMarket
          </p>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Step 1 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{
              flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: '#0071E3', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 600,
            }}>1</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F', marginBottom: '4px' }}>
                Genera una API Key
              </p>
              <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, marginBottom: 0 }}>
                Haz clic en <strong>Nueva API Key</strong> (arriba a la derecha), ponle un nombre descriptivo (ej: "WooCommerce Producción") y cópiala. Solo se muestra una vez.
              </p>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#F2F2F7' }} />

          {/* Step 2 — WordPress */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{
              flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: '#0071E3', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 600,
            }}>2</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Plug size={14} style={{ color: '#6E6E73' }} />
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F', margin: 0 }}>
                  WordPress / WooCommerce
                </p>
              </div>
              <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, marginBottom: '12px' }}>
                Instala el plugin <strong>ExhaustMarket Sync</strong> en tu WordPress. Ve a
                {' '}<strong>WooCommerce → ExhaustMarket Sync</strong>, pega tu API Key y haz clic en
                {' '}<em>"Sincronizar todo el catálogo ahora"</em> para la primera carga. Después se sincroniza automáticamente cada vez que guardes o elimines un producto.
              </p>
              <a
                href="/exhaustmarket-sync-v1.0.0.zip"
                download="exhaustmarket-sync-v1.0.0.zip"
                className="btn-pill btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <Download size={14} />
                Descargar plugin v1.0.0
              </a>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#F2F2F7' }} />

          {/* Step 3 — Custom API */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{
              flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: '#0071E3', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 600,
            }}>3</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Globe size={14} style={{ color: '#6E6E73' }} />
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F', margin: 0 }}>
                  Shopify, Magento u otra plataforma
                </p>
              </div>
              <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, marginBottom: '10px' }}>
                Haz un <code style={{ backgroundColor: '#F5F5F7', padding: '1px 5px', borderRadius: '4px', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '12px' }}>POST</code> a este endpoint con tu API Key en el header:
              </p>
              <div style={{
                backgroundColor: '#F5F5F7',
                borderRadius: '10px',
                padding: '12px 14px',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: '11px',
                color: '#1D1D1F',
                lineHeight: 1.7,
                overflowX: 'auto',
              }}>
                <span style={{ color: '#86868B' }}>POST </span>
                https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync{'\n'}
                <span style={{ color: '#86868B' }}>Authorization: </span>Bearer em_live_xxxx{'\n'}
                <span style={{ color: '#86868B' }}>Content-Type: </span>application/json{'\n\n'}
                {'{'} <span style={{ color: '#0066CC' }}>"action"</span>: <span style={{ color: '#34C759' }}>"upsert"</span>,{'\n'}
                {'  '}<span style={{ color: '#0066CC' }}>"products"</span>: [{' '}{'{'} <span style={{ color: '#0066CC' }}>"ref"</span>: <span style={{ color: '#34C759' }}>"SKU-001"</span>, <span style={{ color: '#0066CC' }}>"name"</span>: <span style={{ color: '#34C759' }}>"..."</span>, <span style={{ color: '#0066CC' }}>"price"</span>: 99.99 {'}'}] {'}'}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
