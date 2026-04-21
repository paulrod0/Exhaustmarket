import { Lock, Globe } from 'lucide-react'
import { USER_TIER_SHORT_LABEL, cheapestTier, type UserTier } from '../lib/contentTypes'

/**
 * Pill que indica si un contenido es público o restringido a ciertos tiers.
 */
export default function TierBadge({
  allowedTiers,
  locked,
  size = 'md',
}: {
  allowedTiers: string[]
  locked: boolean
  size?: 'sm' | 'md'
}) {
  if (!allowedTiers || allowedTiers.length === 0) {
    return (
      <span style={{ ...pillStyle(size), backgroundColor: '#E8F5E9', color: '#1A8C1A' }}>
        <Globe size={size === 'sm' ? 9 : 10} />
        Gratis
      </span>
    )
  }

  const lowest = cheapestTier(allowedTiers)
  const label = lowest ? USER_TIER_SHORT_LABEL[lowest as UserTier] : 'Premium'

  if (locked) {
    return (
      <span style={{ ...pillStyle(size), backgroundColor: '#1D1D1F', color: '#FFD700' }}>
        <Lock size={size === 'sm' ? 9 : 10} />
        {label}
      </span>
    )
  }

  return (
    <span style={{ ...pillStyle(size), backgroundColor: '#FFF7E5', color: '#B25400' }}>
      {label}
    </span>
  )
}

function pillStyle(size: 'sm' | 'md'): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: size === 'sm' ? 10 : 11,
    fontWeight: 600,
    padding: size === 'sm' ? '2px 7px' : '3px 9px',
    borderRadius: 980,
    letterSpacing: '0.02em',
  }
}
