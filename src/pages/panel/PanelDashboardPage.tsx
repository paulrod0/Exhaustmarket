import { useEffect } from 'react'
import { usePanelStore } from '../../stores/panelStore'
import { useAuthStore } from '../../stores/authStore'
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Clock,
  Package,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PanelDashboardPage() {
  const { stats, myProducts, myServices, loading, fetchStats, fetchMyProducts, fetchMyServices } =
    usePanelStore()
  const { profile } = useAuthStore()

  useEffect(() => {
    fetchStats()
    fetchMyProducts()
    fetchMyServices()
  }, [fetchStats, fetchMyProducts, fetchMyServices])

  const isWorkshop = profile?.user_type === 'workshop'
  const recentItems = isWorkshop ? myServices.slice(0, 5) : myProducts.slice(0, 5)

  const statCards = [
    {
      label: 'Ingresos Totales',
      value: `${stats.totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      prefix: '',
      suffix: ' \u20ac',
    },
    {
      label: 'Ingresos del Mes',
      value: `${stats.monthlyRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      prefix: '',
      suffix: ' \u20ac',
    },
    {
      label: 'Total Pedidos',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      prefix: '',
      suffix: '',
    },
    {
      label: 'Presupuestos Pendientes',
      value: stats.pendingQuotes.toString(),
      icon: Clock,
      prefix: '',
      suffix: '',
    },
  ]

  return (
    <div className="content-width-wide" style={{ padding: 0 }}>
      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.01em', lineHeight: 1.14 }}>
          Dashboard
        </h1>
        <p style={{ marginTop: '6px', fontSize: '14px', color: '#86868B' }}>
          Resumen de tu actividad como {isWorkshop ? 'taller' : 'profesional'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: '32px' }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            className="card-flat"
            style={{ padding: '24px' }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 400, color: '#6E6E73' }}>
                {card.label}
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(0, 113, 227, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <card.icon size={18} style={{ color: '#0071E3' }} />
              </div>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.01em' }}>
              {card.prefix}
              {card.value}
              {card.suffix}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Items */}
      <div className="card-flat" style={{ padding: '28px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }}>
            {isWorkshop ? 'Servicios Recientes' : 'Productos Recientes'}
          </h2>
          <Link
            to={isWorkshop ? '/panel/products' : '/panel/products'}
            className="btn-text"
            style={{ fontSize: '14px' }}
          >
            Ver todos
          </Link>
        </div>

        {loading ? (
          <p style={{ color: '#86868B', fontSize: '14px', padding: '20px 0' }}>Cargando...</p>
        ) : recentItems.length === 0 ? (
          <div className="flex flex-col items-center" style={{ padding: '48px 0', textAlign: 'center' }}>
            {isWorkshop ? (
              <Wrench size={36} style={{ color: '#D2D2D7', marginBottom: '12px' }} />
            ) : (
              <Package size={36} style={{ color: '#D2D2D7', marginBottom: '12px' }} />
            )}
            <p style={{ fontSize: '15px', color: '#6E6E73' }}>
              No tienes {isWorkshop ? 'servicios' : 'productos'} registrados
              todavia.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F2F2F7' }}>
                  <th style={{ padding: '10px 0', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Nombre
                  </th>
                  <th style={{ padding: '10px 0', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Precio
                  </th>
                  {!isWorkshop && (
                    <th style={{ padding: '10px 0', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Stock
                    </th>
                  )}
                  <th style={{ padding: '10px 0', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentItems.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F2F2F7' }}>
                    <td style={{ padding: '14px 0', color: '#1D1D1F', fontWeight: 500 }}>
                      {isWorkshop ? item.service_name : item.product_name}
                    </td>
                    <td style={{ padding: '14px 0', color: '#6E6E73' }}>
                      {(isWorkshop ? item.base_price : item.price)?.toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      {'\u20ac'}
                    </td>
                    {!isWorkshop && (
                      <td style={{ padding: '14px 0', color: '#6E6E73' }}>{item.stock ?? '-'}</td>
                    )}
                    <td style={{ padding: '14px 0' }}>
                      <span
                        className={item.is_active ? 'badge badge-green' : 'badge badge-red'}
                      >
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '24px' }}>
        <Link to="/panel/products" className="btn-text" style={{ fontSize: '14px' }}>
          Gestionar {isWorkshop ? 'servicios' : 'productos'}
        </Link>
        <Link to="/panel/orders" className="btn-text" style={{ fontSize: '14px' }}>
          Ver pedidos
        </Link>
        <Link to="/panel/invoices" className="btn-text" style={{ fontSize: '14px' }}>
          Crear factura
        </Link>
      </div>
    </div>
  )
}
