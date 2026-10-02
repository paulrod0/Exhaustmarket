import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { auth as authClient } from '../lib/auth-client'
import { Upload, Check, Clock, X, Pencil, FileCheck, AlertCircle, LogOut, Wallet, ChevronRight } from 'lucide-react'

export default function ProfilePage() {
  const { profile, updateProfile, signOut } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [companyName, setCompanyName] = useState(profile?.company_name || '')
  const [taxId, setTaxId] = useState(profile?.tax_id || '')
  const [address, setAddress] = useState(profile?.address || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#86868B' }}>
          <div style={{
            width: 20,
            height: 20,
            border: '2px solid #D2D2D7',
            borderTopColor: '#0071E3',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <span style={{ fontSize: 14 }}>Cargando perfil...</span>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const patch: Parameters<typeof updateProfile>[0] = {
        full_name: fullName,
        phone: phone || null,
        company_name: companyName || null,
        tax_id: taxId || null,
      }
      const isSeller = profile.user_type === 'professional' || profile.user_type === 'workshop'
      if (isSeller) {
        patch.address = address || null
        // Geocodificar la direccion para el mapa de talleres (best-effort: guarda igual si falla).
        if (address.trim().length >= 3) {
          try {
            const res = await fetch(`/api/geocode?q=${encodeURIComponent(address.trim())}`)
            if (res.ok) {
              const g = (await res.json()) as { lat?: number; lon?: number }
              if (typeof g.lat === 'number' && typeof g.lon === 'number') {
                patch.latitude = g.lat
                patch.longitude = g.lon
              }
            }
          } catch { /* geocode best-effort */ }
        } else {
          patch.latitude = null
          patch.longitude = null
        }
      }
      await updateProfile(patch)
      setSuccess('Perfil actualizado correctamente')
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      // handle silently
    }
  }

  const needsDocumentation = (profile.user_type === 'professional' || profile.user_type === 'workshop') && !profile.is_verified

  const userTypeLabels: Record<string, string> = {
    standard: 'Particular',
    regular: 'Particular',
    professional: 'Profesional',
    workshop: 'Taller',
    premium: 'Premium',
    admin: 'Administrador',
  }

  const userTypeBadge: Record<string, string> = {
    standard: 'badge badge-gray',
    regular: 'badge badge-gray',
    professional: 'badge badge-blue',
    workshop: 'badge badge-green',
    premium: 'badge badge-orange',
    admin: 'badge badge-red',
  }

  return (
    <div className="content-width" style={{ paddingTop: 60, paddingBottom: 80, maxWidth: 680 }}>
      {/* Page Header */}
      <h1 className="text-headline" style={{ color: '#1D1D1F', marginBottom: 40 }}>Mi Perfil</h1>

      {/* Success Alert */}
      {success && (
        <div style={{
          backgroundColor: 'rgba(52,199,89,0.08)',
          color: '#34C759',
          borderRadius: 12,
          padding: 14,
          marginBottom: 24,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(255,59,48,0.08)',
          color: '#FF3B30',
          borderRadius: 12,
          padding: 14,
          marginBottom: 24,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Monedero: acceso directo desde la zona de usuario (antes solo estaba dentro del Panel) */}
      <WalletShortcut />

      {/* Profile Info Card */}
      <div className="card-flat" style={{ padding: 32, marginBottom: 32 }}>
        {editing ? (
          <>
            <h2 style={{ fontSize: 21, fontWeight: 600, color: '#1D1D1F', marginBottom: 24 }}>
              Editar Perfil
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="input-apple"
                />
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
                  Telefono
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-apple"
                />
              </div>

              {(profile.user_type === 'professional' || profile.user_type === 'workshop') && (
                <>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
                      Nombre de la Empresa
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="input-apple"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
                      NIF/CIF
                    </label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="input-apple"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', marginBottom: 8, display: 'block' }}>
                      Direccion <span style={{ color: '#86868B', fontWeight: 400 }}>&middot; para aparecer en el mapa de talleres</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Calle, numero, ciudad"
                      className="input-apple"
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-pill btn-primary"
                  style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setFullName(profile.full_name)
                    setPhone(profile.phone || '')
                    setCompanyName(profile.company_name || '')
                    setTaxId(profile.tax_id || '')
                    setAddress(profile.address || '')
                  }}
                  className="btn-pill btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Display mode */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 className="text-subheadline" style={{ color: '#1D1D1F', marginBottom: 6 }}>
                  {profile.full_name}
                </h2>
                <p style={{ fontSize: 15, color: '#6E6E73', marginBottom: 10 }}>
                  {profile.email || profile.id}
                </p>
                <span className={userTypeBadge[profile.user_type] || 'badge badge-gray'}>
                  {userTypeLabels[profile.user_type] || profile.user_type}
                </span>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="btn-pill btn-secondary btn-sm"
                style={{ gap: 6, display: 'inline-flex', alignItems: 'center' }}
              >
                <Pencil size={14} />
                Editar
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <InfoRow label="Telefono" value={profile.phone || 'No especificado'} />
              {(profile.user_type === 'professional' || profile.user_type === 'workshop') && (
                <>
                  <InfoRow label="Empresa" value={profile.company_name || 'No especificada'} />
                  <InfoRow label="NIF/CIF" value={profile.tax_id || 'No especificado'} />
                  <InfoRow label="Direccion" value={profile.address || 'No especificada'} />
                </>
              )}
              <InfoRow
                label="Verificacion"
                value={profile.is_verified ? 'Verificado' : 'Pendiente'}
                badge={profile.is_verified ? 'badge badge-green' : 'badge badge-orange'}
              />
              <InfoRow
                label="Miembro desde"
                value={new Date(profile.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
                isLast
              />
            </div>
          </>
        )}
      </div>

      {/* Documentation Section */}
      {needsDocumentation && (
        <div className="card-flat" style={{ padding: 32, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Upload size={20} style={{ color: '#FF9500' }} />
            <h2 style={{ fontSize: 21, fontWeight: 600, color: '#1D1D1F' }}>Documentacion Requerida</h2>
          </div>

          <p style={{ fontSize: 14, color: '#6E6E73', lineHeight: 1.5, marginBottom: 20 }}>
            Para verificar tu cuenta y comenzar a {profile.user_type === 'professional' ? 'vender productos' : 'ofrecer servicios'},
            necesitas subir la siguiente documentacion:
          </p>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DocumentItem title="Licencia de Negocio o Alta de Autonomo" status="pending" />
            <DocumentItem title="Registro Fiscal (NIF/CIF)" status="pending" />
            <DocumentItem title="Documento de Identidad" status="pending" />
            {profile.user_type === 'workshop' && (
              <DocumentItem title="Seguro de Responsabilidad Civil" status="pending" />
            )}
          </ul>

          <div style={{
            marginTop: 20,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 16,
          }}>
            <p style={{ fontSize: 14, color: '#86868B', lineHeight: 1.5 }}>
              La funcionalidad de subida de documentos estara disponible proximamente. Por favor, contacta con soporte para verificar tu cuenta manualmente.
            </p>
          </div>
        </div>
      )}

      {/* Sign Out */}
      <div style={{ paddingTop: 16 }}>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: 'none',
            color: '#FF3B30',
            fontSize: 17,
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <LogOut size={18} />
          Cerrar Sesion
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value, badge, isLast }: { label: string; value: string; badge?: string; isLast?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: isLast ? 'none' : '1px solid #E5E5EA',
    }}>
      <span style={{ fontSize: 14, color: '#86868B' }}>{label}</span>
      {badge ? (
        <span className={badge}>{value}</span>
      ) : (
        <span style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F' }}>{value}</span>
      )}
    </div>
  )
}

function DocumentItem({ title, status }: { title: string; status: 'pending' | 'approved' | 'rejected' }) {
  const statusConfig = {
    pending: { icon: <Clock size={16} />, badgeClass: 'badge badge-orange', text: 'Pendiente' },
    approved: { icon: <FileCheck size={16} />, badgeClass: 'badge badge-green', text: 'Aprobado' },
    rejected: { icon: <X size={16} />, badgeClass: 'badge badge-red', text: 'Rechazado' },
  }

  const config = statusConfig[status]

  return (
    <li style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
    }}>
      <span style={{ fontSize: 14, color: '#1D1D1F' }}>{title}</span>
      <span className={config.badgeClass} style={{ gap: 4, display: 'inline-flex', alignItems: 'center' }}>
        {config.icon} {config.text}
      </span>
    </li>
  )
}

/** Saldo del monedero + enlace a /monedero. Si no se puede leer, el enlace sigue funcionando. */
function WalletShortcut() {
  const [balance, setBalance] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const token = await authClient.__getToken()
        const res = await fetch('/api/marketplace', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ op: 'wallet_info' }),
        })
        const data = await res.json()
        if (alive && data?.wallet) setBalance(Number(data.wallet.balance ?? 0))
      } catch { /* sin saldo: se muestra solo el enlace */ }
    })()
    return () => { alive = false }
  }, [])
  return (
    <Link to="/monedero" className="card-flat" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px', marginBottom: 24, textDecoration: 'none', color: 'inherit' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#E5F2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Wallet size={20} style={{ color: '#0071E3' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F' }}>Mi monedero</div>
        <div style={{ fontSize: 13, color: '#86868B' }}>Créditos por colaborar en el catálogo y su historial</div>
      </div>
      {balance != null && <span style={{ fontSize: 17, fontWeight: 600, color: '#0071E3' }}>{balance.toFixed(2)} €</span>}
      <ChevronRight size={18} style={{ color: '#86868B', flexShrink: 0 }} />
    </Link>
  )
}
