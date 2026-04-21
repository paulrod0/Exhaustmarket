import { Lock, Globe } from 'lucide-react'
import { USER_TIER_LABEL, type UserTier } from '../../lib/contentTypes'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  label?: string
  helpText?: string
}

const ALL_TIERS: UserTier[] = ['standard', 'professional', 'workshop', 'premium']

/**
 * Selector de tiers que pueden acceder a un contenido.
 * Array vacío = público gratis para todos.
 */
export default function TierSelector({ value, onChange, label, helpText }: Props) {
  const isPublic = value.length === 0

  function toggle(tier: UserTier) {
    if (value.includes(tier)) {
      onChange(value.filter((t) => t !== tier))
    } else {
      onChange([...value, tier])
    }
  }

  function setPublic() {
    onChange([])
  }

  return (
    <div>
      {label && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#86868B',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'block',
            marginBottom: 8,
          }}
        >
          {label}
        </span>
      )}

      <div
        style={{
          backgroundColor: isPublic ? '#E8F5E9' : '#FFF7E5',
          border: `1px solid ${isPublic ? '#34C759' : '#FF9500'}`,
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 12,
          color: isPublic ? '#1A8C1A' : '#B25400',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {isPublic ? <Globe size={14} /> : <Lock size={14} />}
        <strong>
          {isPublic
            ? 'Público — cualquier visitante (con o sin cuenta) puede ver este contenido.'
            : `Restringido — solo ${value.length} ${value.length === 1 ? 'tipo' : 'tipos'} de suscripción pueden verlo.`}
        </strong>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          onClick={setPublic}
          style={{
            padding: '8px 14px',
            borderRadius: 980,
            border: `1.5px solid ${isPublic ? '#34C759' : '#E5E5EA'}`,
            backgroundColor: isPublic ? '#34C75914' : '#FFFFFF',
            color: isPublic ? '#1A8C1A' : '#86868B',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Globe size={12} />
          Público (todos)
        </button>
        {ALL_TIERS.map((t) => {
          const active = value.includes(t)
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              style={{
                padding: '8px 14px',
                borderRadius: 980,
                border: `1.5px solid ${active ? '#0071E3' : '#E5E5EA'}`,
                backgroundColor: active ? '#0071E314' : '#FFFFFF',
                color: active ? '#0060C0' : '#1D1D1F',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {USER_TIER_LABEL[t]}
            </button>
          )
        })}
      </div>

      {helpText && (
        <p style={{ fontSize: 11, color: '#86868B', marginTop: 8 }}>{helpText}</p>
      )}
    </div>
  )
}
