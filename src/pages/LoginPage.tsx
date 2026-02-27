import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

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
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#1D1D1F',
              lineHeight: 1.14,
              letterSpacing: '0.007em',
            }}
          >
            Inicia sesion
          </h1>
          <p
            style={{
              fontSize: 17,
              color: '#6E6E73',
              marginTop: 8,
              lineHeight: 1.47,
            }}
          >
            en ExhaustMarket
          </p>
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
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
          <div style={{ marginBottom: 28 }}>
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
              placeholder="Tu contrasena"
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
            {loading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
          </button>
        </form>

        {/* Register link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 28,
            fontSize: 14,
            color: '#6E6E73',
          }}
        >
          No tienes cuenta?{' '}
          <Link
            to="/register"
            style={{
              color: '#0066CC',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
