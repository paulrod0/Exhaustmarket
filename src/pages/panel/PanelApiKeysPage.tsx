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
  }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName.trim()) return
    await generateApiKey(keyName.trim())
    setKeyName('')
    setShowForm(false)
  }

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sincronización API</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestiona tus API Keys para sincronizar productos desde cualquier plataforma
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva API Key
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {newlyGeneratedKey && (
        <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
          <p className="text-green-400 text-sm font-medium mb-2">
            ✅ API Key generada. Cópiala ahora — no se mostrará de nuevo.
          </p>
          <div className="flex items-center gap-2 bg-gray-900 rounded px-3 py-2 font-mono text-xs text-gray-200 break-all">
            <span className="flex-1">{newlyGeneratedKey}</span>
            <button onClick={() => handleCopy(newlyGeneratedKey)} className="shrink-0 text-gray-400 hover:text-white">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={clearNewKey} className="text-xs text-gray-500 hover:text-gray-300 mt-2">
            Ya la he copiado, cerrar
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleGenerate} className="p-4 bg-gray-800 border border-gray-700 rounded-lg space-y-3">
          <p className="text-sm text-white font-medium">Nueva API Key</p>
          <input
            type="text"
            placeholder="Nombre (ej: WooCommerce Producción)"
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400"
            required
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50">
              {loading ? 'Generando...' : 'Generar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Tus API Keys ({apiKeys.length})</span>
        </div>
        {apiKeys.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            No tienes API Keys aún. Crea una para empezar a sincronizar productos.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Prefijo</th>
                <th className="px-4 py-2 text-left">Último uso</th>
                <th className="px-4 py-2 text-left">Creada</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map(key => (
                <tr key={key.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-white font-medium">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{key.key_prefix}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString('es-ES') : 'Nunca'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(key.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {revokeConfirmId === key.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-red-400">¿Revocar?</span>
                        <button onClick={() => { revokeApiKey(key.id); setRevokeConfirmId(null) }}
                          className="text-xs text-red-400 hover:text-red-300 font-medium">Sí</button>
                        <button onClick={() => setRevokeConfirmId(null)}
                          className="text-xs text-gray-400 hover:text-gray-300">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setRevokeConfirmId(key.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Historial de sincronización</span>
          </div>
          <button onClick={fetchSyncLogs} className="text-xs text-gray-400 hover:text-gray-200">Actualizar</button>
        </div>
        {syncLogs.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Sin sincronizaciones todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Acción</th>
                <th className="px-4 py-2 text-left">Plataforma</th>
                <th className="px-4 py-2 text-left">Resultados</th>
                <th className="px-4 py-2 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.map(log => (
                <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    {log.status === 'success'
                      ? <CheckCircle className="w-4 h-4 text-green-400" />
                      : <AlertCircle className="w-4 h-4 text-red-400" />}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{log.action}</td>
                  <td className="px-4 py-3 text-gray-400">{log.source_platform ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    +{log.products_created} ~{log.products_updated} -{log.products_deleted}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(log.started_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl space-y-3">
        <p className="text-sm font-medium text-white">Cómo integrar tu tienda</p>
        <div className="space-y-2 text-xs text-gray-400">
          <p><span className="text-gray-200 font-medium">Endpoint:</span> <code className="bg-gray-700 px-1 rounded">POST https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync</code></p>
          <p><span className="text-gray-200 font-medium">Header:</span> <code className="bg-gray-700 px-1 rounded">Authorization: Bearer em_live_xxxx</code></p>
          <p><span className="text-gray-200 font-medium">WordPress/WooCommerce:</span> Instala el plugin ExhaustMarket Sync y pega tu API Key en los ajustes.</p>
        </div>
      </div>
    </div>
  )
}
