import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Layers, LogOut, ArrowLeft, Factory, BookOpen, LayoutDashboard, Users, CreditCard } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function AdminLayout() {
  const { signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const navSections = [
    {
      title: 'General',
      links: [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      ],
    },
    {
      title: 'Contenido',
      links: [
        { to: '/admin/esquemas', label: 'Esquemas', icon: Layers },
        { to: '/admin/marcas', label: 'Marcas aftermarket', icon: Factory },
        { to: '/admin/articulos', label: 'Artículos / tutoriales', icon: BookOpen },
      ],
    },
    {
      title: 'CRM',
      links: [
        { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
        { to: '/admin/suscripciones', label: 'Suscripciones', icon: CreditCard },
      ],
    },
  ]

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/')

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

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {navSections.map((section) => (
            <div key={section.title}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0 12px',
                  marginBottom: 4,
                }}
              >
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.links.map((link) => {
                  const Icon = link.icon
                  const active = isActive(link.to, (link as any).exact)
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      style={{
                        textDecoration: 'none',
                        color: active ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                        backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                        padding: '7px 12px',
                        borderRadius: 7,
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={14} />
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
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
