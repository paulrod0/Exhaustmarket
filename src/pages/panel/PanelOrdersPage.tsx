import { useEffect } from 'react'
import { usePanelStore } from '../../stores/panelStore'
import { ClipboardList } from 'lucide-react'

const statusConfig: Record<string, { label: string; badgeClass: string }> = {
  pending: {
    label: 'Pendiente',
    badgeClass: 'badge badge-orange',
  },
  completed: {
    label: 'Completado',
    badgeClass: 'badge badge-green',
  },
  cancelled: {
    label: 'Cancelado',
    badgeClass: 'badge badge-red',
  },
  disputed: {
    label: 'Disputado',
    badgeClass: 'badge badge-orange',
  },
  refunded: {
    label: 'Reembolsado',
    badgeClass: 'badge badge-gray',
  },
}

export default function PanelOrdersPage() {
  const { myTransactions, loading, fetchMyTransactions } = usePanelStore()

  useEffect(() => {
    fetchMyTransactions()
  }, [fetchMyTransactions])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.01em', lineHeight: 1.14 }}>
          Pedidos
        </h1>
        <p style={{ marginTop: '6px', fontSize: '14px', color: '#86868B' }}>
          Historial de transacciones recibidas
        </p>
      </div>

      {/* Orders table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #F2F2F7',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#86868B', fontSize: '14px' }}>
            Cargando...
          </div>
        ) : myTransactions.length === 0 ? (
          <div className="flex flex-col items-center" style={{ padding: '64px 20px', textAlign: 'center' }}>
            <ClipboardList size={40} style={{ color: '#D2D2D7', marginBottom: '16px' }} />
            <p style={{ fontSize: '17px', color: '#1D1D1F', fontWeight: 500 }}>
              No hay pedidos todavia
            </p>
            <p style={{ marginTop: '4px', fontSize: '14px', color: '#86868B' }}>
              Aqui apareceran las transacciones cuando los clientes te compren
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F5F5F7' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Fecha
                  </th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Comprador
                  </th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Importe
                  </th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Tipo
                  </th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {myTransactions.map((tx) => {
                  const status = statusConfig[tx.status] ?? {
                    label: tx.status,
                    badgeClass: 'badge badge-gray',
                  }

                  return (
                    <tr
                      key={tx.id}
                      style={{ borderBottom: '1px solid #F2F2F7', backgroundColor: '#FFFFFF' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
                    >
                      <td style={{ padding: '14px 20px', color: '#6E6E73' }}>
                        {formatDate(tx.created_at)}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#1D1D1F', fontWeight: 500 }}>
                        {tx.buyer?.full_name ?? 'Desconocido'}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#1D1D1F', fontWeight: 500 }}>
                        {tx.amount.toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        {'\u20ac'}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#6E6E73', textTransform: 'capitalize' }}>
                        {tx.type}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={status.badgeClass}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
