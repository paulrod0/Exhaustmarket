import { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { LogOut, Menu, X } from 'lucide-react'

export default function Layout() {
  const { user, profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isActive = (path: string) => location.pathname === path

  // -- Nav links for authenticated users --
  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/quotes', label: 'Cotizaciones' },
    { to: '/manuals', label: 'Manuales' },
  ]

  const conditionalLinks = [
    ...(profile?.user_type === 'professional' || profile?.user_type === 'premium'
      ? [{ to: '/designs', label: '3D' }]
      : []),
    ...(profile?.user_type === 'workshop' || profile?.user_type === 'professional'
      ? [{ to: '/panel', label: 'Panel' }]
      : []),
  ]

  const allNavLinks = [...navLinks, ...conditionalLinks]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
      {/* ─── Navigation ──────────────────────────────────── */}
      <nav
        className="nav-frosted"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          height: '44px',
        }}
      >
        <div
          className="content-width"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '44px',
            maxWidth: '980px',
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1D1D1F',
              letterSpacing: '-0.01em',
              flexShrink: 0,
            }}
          >
            ExhaustMarket
          </Link>

          {/* Desktop Nav Links */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
            }}
            className="desktop-nav"
          >
            {user ? (
              <>
                {allNavLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    style={{
                      textDecoration: 'none',
                      fontSize: '12px',
                      color: '#1D1D1F',
                      opacity: isActive(link.to) ? 1 : 0.8,
                      fontWeight: isActive(link.to) ? 500 : 400,
                      transition: 'opacity 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.target as HTMLElement).style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive(link.to)) {
                        ;(e.target as HTMLElement).style.opacity = '0.8'
                      }
                    }}
                  >
                    {link.label}
                  </Link>
                ))}

                <Link
                  to="/profile"
                  style={{
                    textDecoration: 'none',
                    fontSize: '12px',
                    color: '#1D1D1F',
                    opacity: isActive('/profile') ? 1 : 0.8,
                    fontWeight: isActive('/profile') ? 500 : 400,
                    transition: 'opacity 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.target as HTMLElement).style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/profile')) {
                      ;(e.target as HTMLElement).style.opacity = '0.8'
                    }
                  }}
                >
                  Perfil
                </Link>

                <button
                  onClick={handleSignOut}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    color: '#1D1D1F',
                    opacity: 0.8,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'opacity 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.opacity = '0.8'
                  }}
                >
                  <LogOut size={12} />
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  style={{
                    textDecoration: 'none',
                    fontSize: '12px',
                    color: '#1D1D1F',
                    opacity: 0.8,
                    transition: 'opacity 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.target as HTMLElement).style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.target as HTMLElement).style.opacity = '0.8'
                  }}
                >
                  Iniciar Sesion
                </Link>
                <Link
                  to="/register"
                  className="btn-pill btn-primary btn-sm"
                  style={{
                    textDecoration: 'none',
                    fontSize: '12px',
                    padding: '4px 14px',
                    borderRadius: '980px',
                  }}
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#1D1D1F',
            }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            className="mobile-menu-dropdown"
            style={{
              position: 'fixed',
              top: '44px',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(251, 251, 253, 0.97)',
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              overflowY: 'auto',
              zIndex: 9998,
              animation: 'fadeIn 0.25s ease',
            }}
          >
            <div
              className="content-width"
              style={{
                paddingTop: '16px',
                paddingBottom: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
              }}
            >
              {user ? (
                <>
                  {allNavLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        textDecoration: 'none',
                        fontSize: '17px',
                        fontWeight: isActive(link.to) ? 600 : 400,
                        color: '#1D1D1F',
                        padding: '12px 0',
                        borderBottom: '1px solid #D2D2D7',
                        display: 'block',
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      textDecoration: 'none',
                      fontSize: '17px',
                      fontWeight: isActive('/profile') ? 600 : 400,
                      color: '#1D1D1F',
                      padding: '12px 0',
                      borderBottom: '1px solid #D2D2D7',
                      display: 'block',
                    }}
                  >
                    Perfil
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleSignOut()
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '17px',
                      color: '#FF3B30',
                      padding: '12px 0',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                    }}
                  >
                    <LogOut size={16} />
                    Cerrar sesion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      textDecoration: 'none',
                      fontSize: '17px',
                      color: '#1D1D1F',
                      padding: '12px 0',
                      borderBottom: '1px solid #D2D2D7',
                      display: 'block',
                    }}
                  >
                    Iniciar Sesion
                  </Link>
                  <div style={{ paddingTop: '16px' }}>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn-pill btn-primary"
                      style={{
                        textDecoration: 'none',
                        fontSize: '17px',
                        width: '100%',
                        textAlign: 'center',
                      }}
                    >
                      Registrarse
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ─── Spacer for fixed nav ────────────────────────── */}
      <div style={{ height: '44px', flexShrink: 0 }} />

      {/* ─── Main Content ────────────────────────────────── */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer
        style={{
          backgroundColor: '#F5F5F7',
          borderTop: '1px solid #D2D2D7',
          marginTop: 'auto',
        }}
      >
        {/* Footer Links Grid */}
        <div className="content-width" style={{ paddingTop: '24px', paddingBottom: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '16px',
            }}
            className="footer-grid"
          >
            {/* Column 1: Marketplace */}
            <div>
              <h4
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1D1D1F',
                  marginBottom: '8px',
                  lineHeight: 1.33,
                }}
              >
                Marketplace
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>
                  <Link to="/marketplace" style={footerLinkStyle}>
                    Explorar
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace" style={footerLinkStyle}>
                    Escapes
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace" style={footerLinkStyle}>
                    Accesorios
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Servicios */}
            <div>
              <h4
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1D1D1F',
                  marginBottom: '8px',
                  lineHeight: 1.33,
                }}
              >
                Servicios
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>
                  <Link to="/quotes" style={footerLinkStyle}>
                    Cotizaciones
                  </Link>
                </li>
                <li>
                  <Link to="/manuals" style={footerLinkStyle}>
                    Manuales
                  </Link>
                </li>
                <li>
                  <Link to="/designs" style={footerLinkStyle}>
                    Disenos 3D
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Cuenta */}
            <div>
              <h4
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1D1D1F',
                  marginBottom: '8px',
                  lineHeight: 1.33,
                }}
              >
                Cuenta
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>
                  <Link to="/profile" style={footerLinkStyle}>
                    Tu Perfil
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" style={footerLinkStyle}>
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Profesionales */}
            <div>
              <h4
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1D1D1F',
                  marginBottom: '8px',
                  lineHeight: 1.33,
                }}
              >
                Profesionales
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>
                  <Link to="/panel" style={footerLinkStyle}>
                    Panel de Taller
                  </Link>
                </li>
                <li>
                  <Link to="/register" style={footerLinkStyle}>
                    Registrar Taller
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: Soporte */}
            <div>
              <h4
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1D1D1F',
                  marginBottom: '8px',
                  lineHeight: 1.33,
                }}
              >
                Soporte
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>
                  <Link to="/manuals" style={footerLinkStyle}>
                    Centro de Ayuda
                  </Link>
                </li>
                <li>
                  <Link to="/" style={footerLinkStyle}>
                    Contacto
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="content-width">
          <div style={{ borderTop: '1px solid #D2D2D7' }} />
        </div>

        {/* Bottom Bar */}
        <div className="content-width" style={{ paddingTop: '12px', paddingBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
            className="footer-bottom"
          >
            <p
              style={{
                fontSize: '12px',
                color: '#6E6E73',
                lineHeight: 1.33,
                margin: 0,
              }}
            >
              Copyright &copy; 2026 ExhaustMarket. Todos los derechos reservados.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <Link to="/" style={footerLegalLinkStyle}>
                Privacidad
              </Link>
              <span style={{ color: '#D2D2D7', fontSize: '12px' }}>|</span>
              <Link to="/" style={footerLegalLinkStyle}>
                Terminos de Uso
              </Link>
              <span style={{ color: '#D2D2D7', fontSize: '12px' }}>|</span>
              <Link to="/" style={footerLegalLinkStyle}>
                Politica de Ventas
              </Link>
              <span style={{ color: '#D2D2D7', fontSize: '12px' }}>|</span>
              <Link to="/" style={footerLegalLinkStyle}>
                Mapa del Sitio
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Responsive Styles ───────────────────────────── */}
      <style>{`
        .desktop-nav {
          display: flex !important;
        }
        .mobile-menu-btn {
          display: none !important;
        }

        .footer-grid {
          grid-template-columns: repeat(5, 1fr) !important;
        }

        @media (max-width: 833px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          .footer-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 24px !important;
          }
          .footer-bottom {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

/* ─── Footer Link Styles (shared constants) ─────────── */

const footerLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  fontSize: '12px',
  color: '#6E6E73',
  lineHeight: 1.33,
  transition: 'color 0.2s ease',
}

const footerLegalLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  fontSize: '12px',
  color: '#6E6E73',
  lineHeight: 1.33,
  transition: 'color 0.2s ease',
}
