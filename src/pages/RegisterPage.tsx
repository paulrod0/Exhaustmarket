import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [userType, setUserType] = useState<'standard' | 'professional' | 'workshop'>('standard')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signUp } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden')
      setLoading(false)
      return
    }

    try {
      await signUp(email, password, fullName, userType)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  const userTypeOptions: { value: 'standard' | 'professional' | 'workshop'; label: string }[] = [
    { value: 'standard', label: 'Particular' },
    { value: 'professional', label: 'Taller' },
    { value: 'workshop', label: 'Fabricante' },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        padding: '40px 22px',
      }}
    >
      <div
        className="animate-fade-in"
        style={{ width: '100%', maxWidth: 400 }}
      >
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#1D1D1F',
              lineHeight: 1.14,
              letterSpacing: '0.007em',
            }}
          >
            Crear cuenta
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(255, 59, 48, 0.08)',
              border: '1px solid rgba(255, 59, 48, 0.2)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 24,
              color: '#FF3B30',
              fontSize: 14,
              lineHeight: 1.43,
            }}
          >
            {error}
          </div>
        )}

        {/* Segmented Control */}
        <div style={{ marginBottom: 28 }}>
          <label
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#1D1D1F',
              marginBottom: 10,
            }}
          >
            Tipo de cuenta
          </label>
          <div
            style={{
              display: 'flex',
              border: '1px solid #D2D2D7',
              borderRadius: 980,
              overflow: 'hidden',
            }}
          >
            {userTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setUserType(option.value)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: 14,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease, color 0.2s ease',
                  backgroundColor:
                    userType === option.value ? '#1D1D1F' : 'transparent',
                  color:
                    userType === option.value ? '#FFFFFF' : '#1D1D1F',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="fullName"
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#1D1D1F',
                marginBottom: 8,
              }}
            >
              Nombre completo
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Tu nombre completo"
              className="input-apple"
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#1D1D1F',
                marginBottom: 8,
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              className="input-apple"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#1D1D1F',
                marginBottom: 8,
              }}
            >
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Minimo 6 caracteres"
              className="input-apple"
            />
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: 28 }}>
            <label
              htmlFor="confirmPassword"
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#1D1D1F',
                marginBottom: 8,
              }}
            >
              Confirmar contrasena
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Repite tu contrasena"
              className="input-apple"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-pill btn-primary"
            style={{
              width: '100%',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        {/* Login link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 28,
            fontSize: 14,
            color: '#6E6E73',
          }}
        >
          Ya tienes cuenta?{' '}
          <Link
            to="/login"
            style={{
              color: '#0066CC',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  )
}
