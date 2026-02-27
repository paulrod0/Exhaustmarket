import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Upload, Check, Clock, X, Pencil, FileCheck, AlertCircle, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const { profile, updateProfile, signOut } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [companyName, setCompanyName] = useState(profile?.company_name || '')
  const [taxId, setTaxId] = useState(profile?.tax_id || '')
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
      await updateProfile({
        full_name: fullName,
        phone: phone || null,
        company_name: companyName || null,
        tax_id: taxId || null,
      })
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
