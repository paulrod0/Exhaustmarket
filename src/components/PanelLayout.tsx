import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  FileText,
  RefreshCw,
  Key,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react'

const sidebarLinks = [
  { to: '/panel', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/panel/products', label: 'Productos', icon: Package, end: false },
  { to: '/panel/orders', label: 'Pedidos', icon: ClipboardList, end: false },
  { to: '/panel/invoices', label: 'Facturas', icon: FileText, end: false },
  {
    to: '/panel/catalog-sync',
    label: 'Sincronizar Catalogo',
    icon: RefreshCw,
    end: false,
  },
  {
    to: '/panel/api-keys',
    label: 'Sincronización API',
    icon: Key,
    end: false,
  },
]

export default function PanelLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const closeSidebar = () => setMobileSidebarOpen(false)

  const sidebarContent = (
    <>
      {/* Sidebar title row */}
      <div className="px-6 pt-6 pb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '17px',
            fontWeight: 600,
            color: '#1D1D1F',
            letterSpacing: '-0.01em',
          }}
        >
          Panel
        </span>
        {/* Close button — visible only on mobile via CSS */}
        <button
          className="panel-close-btn"
          onClick={closeSidebar}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: '#6E6E73',
          }}
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {sidebarLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors duration-200"
            style={({ isActive }) => ({
              fontSize: '14px',
              fontWeight: isActive ? 500 : 400,
              color: isActive ? '#0066CC' : '#1D1D1F',
              backgroundColor: isActive
                ? 'rgba(0, 102, 204, 0.06)'
                : 'transparent',
              borderRadius: '8px',
              padding: '10px 16px',
            })}
          >
            {({ isActive }) => (
              <>
                <link.icon
                  size={18}
                  style={{ color: isActive ? '#0066CC' : '#86868B' }}
                />
                <span>{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Volver link at bottom */}
      <div className="px-6 py-5">
        <Link
          to="/"
          onClick={closeSidebar}
          className="flex items-center gap-1.5 transition-colors duration-200"
          style={{
            fontSize: '14px',
            color: '#6E6E73',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#1D1D1F'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#6E6E73'
          }}
        >
          <ChevronLeft size={16} />
          Volver
        </Link>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="panel-overlay"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-60 flex-shrink-0 flex flex-col panel-sidebar${mobileSidebarOpen ? ' panel-sidebar--open' : ''}`}
        style={{
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #D2D2D7',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Mobile top bar with hamburger */}
        <div
          className="panel-mobile-topbar"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid #D2D2D7',
            backgroundColor: '#FFFFFF',
          }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#1D1D1F',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <span
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: '#1D1D1F',
              letterSpacing: '-0.01em',
            }}
          >
            Panel
          </span>
        </div>

        <div style={{ padding: '40px' }} className="panel-main-content">
          <Outlet />
        </div>
      </main>

      {/* Inline responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .panel-mobile-topbar {
            display: flex !important;
          }
          .panel-main-content {
            padding: 20px !important;
          }
          .panel-close-btn {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  )
}
