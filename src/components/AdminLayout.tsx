import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Layers, LogOut, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function AdminLayout() {
  const { signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const navLinks = [
    { to: '/admin/esquemas', label: 'Esquemas', icon: Layers },
  ]

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        backgroundColor: '#F5F5F7',
      }}
      className="admin-layout"
    >
      {/* Sidebar */}
      <aside
        style={{
          backgroundColor: '#1D1D1F',
          color: '#FFFFFF',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div>
          <Link
            to="/"
            style={{
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ opacity: 0.7, fontSize: 11 }}>ExhaustMarket /</span>
            Admin
          </Link>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.to)
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  textDecoration: 'none',
                  color: active ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                  backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link
            to="/dashboard"
            style={{
              textDecoration: 'none',
              color: 'rgba(255,255,255,0.75)',
              padding: '8px 12px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ArrowLeft size={13} />
            Volver a la app
          </Link>
          <button
            onClick={handleSignOut}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.75)',
              padding: '8px 12px',
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main
        style={{
          padding: '28px 32px',
          minHeight: '100vh',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 720px) {
          .admin-layout {
            grid-template-columns: 1fr !important;
          }
          .admin-layout > aside {
            position: static !important;
            height: auto !important;
            flex-direction: row !important;
            gap: 12px !important;
            align-items: center !important;
            padding: 12px 16px !important;
          }
          .admin-layout > aside > nav {
            flex-direction: row !important;
            flex: 1;
          }
          .admin-layout > aside > div:last-child {
            margin-top: 0 !important;
            flex-direction: row !important;
          }
        }
      `}</style>
    </div>
  )
}
