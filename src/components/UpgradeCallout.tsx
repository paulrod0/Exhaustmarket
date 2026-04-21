import { Link } from 'react-router-dom'
import { Lock, Crown, ArrowRight } from 'lucide-react'
import { USER_TIER_LABEL, type UserTier, cheapestTier } from '../lib/contentTypes'

interface Props {
  allowedTiers: string[]
  isAuthenticated: boolean
  title?: string
  description?: string
  compact?: boolean
}

/**
 * Callout que se muestra al usuario cuando intenta ver contenido
 * que su suscripción no cubre.
 */
export default function UpgradeCallout({
  allowedTiers,
  isAuthenticated,
  title,
  description,
  compact = false,
}: Props) {
  const lowest = cheapestTier(allowedTiers)
  const tierLabels = allowedTiers
    .map((t) => USER_TIER_LABEL[t as UserTier] ?? t)
    .join(', ')

  const defaultTitle = !isAuthenticated
    ? 'Crea una cuenta para ver este contenido'
    : `Este contenido es exclusivo para ${tierLabels}`

  const defaultDescription = !isAuthenticated
    ? 'Regístrate gratis para acceder. Algunas secciones requieren suscripción Professional o superior.'
    : lowest
      ? `Actualiza tu suscripción a ${USER_TIER_LABEL[lowest]} para desbloquear esta guía, el vídeo tutorial y los archivos adjuntos.`
      : 'Actualiza tu suscripción para desbloquear el contenido completo.'

  if (compact) {
    return (
      <div
        style={{
          backgroundColor: '#1D1D1F',
          color: 'white',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 16,
        }}
      >
        <Lock size={18} style={{ color: '#FFD700', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
          <strong>{title ?? defaultTitle}</strong>
        </div>
        <Link
          to={isAuthenticated ? '/subscriptions' : '/register'}
          style={{
            backgroundColor: '#FFD700',
            color: '#1D1D1F',
            padding: '7px 14px',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {isAuthenticated ? 'Mejorar' : 'Crear cuenta'}
        </Link>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: '#1D1D1F',
        color: 'white',
        borderRadius: 18,
        padding: '32px 28px',
        textAlign: 'center',
        margin: '24px 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,215,0,0.18) 0%, transparent 70%)',
        }}
      />
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: 'rgba(255,215,0,0.15)',
          margin: '0 auto 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Crown size={24} style={{ color: '#FFD700' }} />
      </div>
      <h3
        style={{
          fontSize: 20,
          fontWeight: 700,
          margin: '0 0 8px',
          color: 'white',
          position: 'relative',
        }}
      >
        {title ?? defaultTitle}
      </h3>
      <p
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.78)',
          margin: '0 auto 18px',
          maxWidth: 480,
          lineHeight: 1.5,
          position: 'relative',
        }}
      >
        {description ?? defaultDescription}
      </p>
      <Link
        to={isAuthenticated ? '/subscriptions' : '/register'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#FFD700',
          color: '#1D1D1F',
          padding: '10px 20px',
          borderRadius: 980,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
          position: 'relative',
        }}
      >
        {isAuthenticated ? 'Ver planes disponibles' : 'Crear cuenta gratis'}
        <ArrowRight size={14} />
      </Link>
    </div>
  )
}
