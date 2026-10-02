import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Layers, LogOut, ArrowLeft, Factory, BookOpen, LayoutDashboard, Users, CreditCard, Car, Wrench, Tag, ShieldCheck, Inbox, FileText, Box, Database, KeyRound, CalendarCheck } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { adminFetch } from '../lib/adminApi'

interface NavLink { to: string; label: string; icon: any; exact?: boolean; badge?: boolean; hint?: string }

export default function AdminLayout() {
  const { signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  // Pendientes de revisión (publicación + envíos de colaboradores) para el badge del menú.
  const [pending, setPending] = useState(0)
  useEffect(() => {
    const load = () => adminFetch<{ publicacion: number; envios: number }>('/api/review', { query: { op: 'counts' } })
      .then((c) => setPending((c.publicacion ?? 0) + (c.envios ?? 0))).catch(() => {})
    load()
    window.addEventListener('em-review-changed', load)
    return () => window.removeEventListener('em-review-changed', load)
  }, [location.pathname])

  // Menú agrupado por TAREA (no por versión técnica v1/v2): primero lo que hay que revisar,
  // luego el catálogo, el contenido editorial y por último usuarios/negocio. El Panel QA y los
  // Envíos de colaboradores viven ahora dentro de la Bandeja de revisión (pestañas).
  const navSections: { title: string; links: NavLink[] }[] = [
    {
      title: 'Inicio',
      links: [
        { to: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
        { to: '/admin/revision', label: 'Bandeja de revisión', icon: Inbox, badge: true },
      ],
    },
    {
      title: 'Catálogo',
      links: [
        { to: '/admin/esquemas', label: 'Esquemas', icon: Layers },
        { to: '/admin/data/vehiculos', label: 'Vehículos y motores', icon: Car },
        { to: '/admin/data/piezas', label: 'Componentes OEM', icon: Wrench },
        { to: '/admin/data/productos', label: 'Productos aftermarket', icon: Tag },
        { to: '/admin/marcas', label: 'Marcas aftermarket', icon: Factory },
      ],
    },
    {
      title: 'Contenido',
      links: [
        { to: '/admin/articulos', label: 'Guías y artículos', icon: BookOpen },
        { to: '/manuals', label: 'Manuales', icon: FileText, hint: 'se gestionan en la web' },
        { to: '/designs', label: 'Diseños 3D', icon: Box, hint: 'se gestionan en la web' },
      ],
    },
    {
      title: 'Datos e integraciones',
      links: [
        { to: '/admin/datos', label: 'Importar / exportar', icon: Database },
        { to: '/admin/api', label: 'API y webhooks', icon: KeyRound },
      ],
    },
    {
      title: 'Usuarios y negocio',
      links: [
        { to: '/admin/visitas', label: 'Visitas y reclamaciones', icon: CalendarCheck },
        { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
        { to: '/admin/kyc', label: 'Verificaciones KYC', icon: ShieldCheck },
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
                  const active = isActive(link.to, link.exact)
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      title={link.hint}
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
                      <span style={{ flex: 1 }}>{link.label}</span>
                      {link.badge && pending > 0 && (
                        <span style={{ background: '#FF9500', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10.5, fontWeight: 700 }}>
                          {pending > 99 ? '99+' : pending}
                        </span>
                      )}
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
