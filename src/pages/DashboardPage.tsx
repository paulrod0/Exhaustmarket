import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePanelStore } from '../stores/panelStore';
import { useQuoteStore } from '../stores/quoteStore';
import { Link } from 'react-router-dom';
import {
  Package,
  Wrench,
  TrendingUp,
  ShoppingCart,
  FileText,
  User,
  Clock,
  Euro,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Layers,
  MessageSquare,
  Settings,
  Star,
} from 'lucide-react';

/* ─── Helpers ──────────────────────────────────────────── */

const USER_TYPE_LABELS: Record<string, string> = {
  standard: 'Particular',
  professional: 'Profesional',
  workshop: 'Taller',
  premium: 'Premium',
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateLong = (): string => {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'badge badge-green';
    case 'pending':
      return 'badge badge-orange';
    case 'cancelled':
    case 'rejected':
      return 'badge badge-red';
    case 'quoted':
    case 'in_progress':
      return 'badge badge-blue';
    default:
      return 'badge badge-gray';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'Completado';
    case 'pending':
      return 'Pendiente';
    case 'cancelled':
      return 'Cancelado';
    case 'rejected':
      return 'Rechazado';
    case 'quoted':
      return 'Cotizado';
    case 'in_progress':
      return 'En Progreso';
    case 'accepted':
      return 'Aceptado';
    default:
      return status;
  }
};

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'product':
      return 'Producto';
    case 'service':
      return 'Servicio';
    default:
      return type;
  }
};

/* ─── Spinner ──────────────────────────────────────────── */

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid var(--color-blue)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
    </div>
  );
}

/* ─── Empty State ──────────────────────────────────────── */

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--color-tertiary)',
        fontSize: 15,
      }}
    >
      <Icon size={32} style={{ color: 'var(--color-tertiary)', marginBottom: 12, opacity: 0.5 }} />
      <p>{text}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN ENTRY
   ═══════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const { profile } = useAuthStore();

  if (!profile) {
    return <Spinner />;
  }

  const isProUser =
    profile.user_type === 'workshop' ||
    profile.user_type === 'professional' ||
    profile.user_type === 'premium';

  if (isProUser) {
    return <ProDashboard profile={profile} />;
  }

  return <DefaultDashboard profile={profile} />;
}

/* ═══════════════════════════════════════════════════════════
   PRO DASHBOARD (workshop / professional / premium)
   ═══════════════════════════════════════════════════════════ */

function ProDashboard({ profile }: { profile: any }) {
  const {
    stats,
    myProducts,
    myServices,
    myTransactions,
    fetchStats,
    fetchMyProducts,
    fetchMyServices,
    fetchMyTransactions,
    fetchMyInvoices,
  } = usePanelStore();

  const { receivedRequests, fetchReceivedRequests } = useQuoteStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchMyProducts(),
        fetchMyServices(),
        fetchMyTransactions(),
        fetchMyInvoices(),
        fetchReceivedRequests(),
      ]);
      setLoading(false);
    };
    loadAll();
  }, []);

  if (loading) {
    return <Spinner />;
  }

  const showServices = profile.user_type === 'workshop' || profile.user_type === 'premium';

  /* Stock analysis */
  const activeProducts = myProducts.filter((p) => p.is_active);
  const lowStockProducts = myProducts.filter((p) => p.is_active && (p.stock ?? 0) < 5);

  /* Recent data slices */
  const recentTransactions = myTransactions.slice(0, 5);
  const recentQuotes = receivedRequests.slice(0, 3);
  const displayProducts = myProducts.slice(0, 6);

  return (
    <div className="content-width-wide animate-fade-in-up" style={{ paddingTop: 60, paddingBottom: 80 }}>
      {/* ── 1. HEADER ──────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1 className="text-headline" style={{ color: 'var(--color-primary)' }}>
              Dashboard
            </h1>
            {profile.company_name && (
              <p
                style={{
                  fontSize: 19,
                  fontWeight: 500,
                  color: 'var(--color-secondary)',
                  marginTop: 4,
                }}
              >
                {profile.company_name}
              </p>
            )}
            <p
              className="text-body"
              style={{
                color: 'var(--color-tertiary)',
                marginTop: 4,
                textTransform: 'capitalize',
              }}
            >
              {formatDateLong()}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge-blue" style={{ fontSize: 13, padding: '5px 14px' }}>
              {USER_TYPE_LABELS[profile.user_type] || profile.user_type}
            </span>
            {profile.user_type === 'premium' && (
              <span className="badge badge-orange" style={{ fontSize: 13, padding: '5px 14px' }}>
                PREMIUM
              </span>
            )}
            {profile.is_verified ? (
              <span className="badge badge-green" style={{ fontSize: 13, padding: '5px 14px' }}>
                Verificado
              </span>
            ) : (
              <span className="badge badge-gray" style={{ fontSize: 13, padding: '5px 14px' }}>
                No verificado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. KPI CARDS ROW ───────────────────────────────── */}
      <div
        className="stagger-children"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          marginBottom: 56,
        }}
      >
        {/* Ingresos del Mes */}
        <div className="card-flat" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(0, 113, 227, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={20} style={{ color: 'var(--color-blue)' }} />
            </div>
            <span style={{ fontSize: 15, color: 'var(--color-secondary)', fontWeight: 500 }}>
              Ingresos del Mes
            </span>
          </div>
          <p style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, color: 'var(--color-primary)' }}>
            {formatCurrency(stats.monthlyRevenue)}
          </p>
        </div>

        {/* Ingresos Totales */}
        <div className="card-flat" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(52, 199, 89, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Euro size={20} style={{ color: 'var(--color-green)' }} />
            </div>
            <span style={{ fontSize: 15, color: 'var(--color-secondary)', fontWeight: 500 }}>
              Ingresos Totales
            </span>
          </div>
          <p style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, color: 'var(--color-primary)' }}>
            {formatCurrency(stats.totalRevenue)}
          </p>
        </div>

        {/* Pedidos */}
        <div className="card-flat" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255, 149, 0, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} style={{ color: 'var(--color-orange)' }} />
            </div>
            <span style={{ fontSize: 15, color: 'var(--color-secondary)', fontWeight: 500 }}>
              Pedidos
            </span>
          </div>
          <p style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, color: 'var(--color-primary)' }}>
            {stats.totalOrders}
          </p>
        </div>

        {/* Cotizaciones Pendientes */}
        <div className="card-flat" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255, 59, 48, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={20} style={{ color: 'var(--color-red)' }} />
            </div>
            <span style={{ fontSize: 15, color: 'var(--color-secondary)', fontWeight: 500 }}>
              Cotizaciones Pendientes
            </span>
          </div>
          <p style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, color: 'var(--color-primary)' }}>
            {stats.pendingQuotes}
          </p>
        </div>
      </div>

      {/* ── 3. VENTAS RECIENTES ────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h2 className="text-subheadline" style={{ color: 'var(--color-primary)' }}>
            Ventas Recientes
          </h2>
          <Link to="/panel/orders" className="btn-text" style={{ fontSize: 14 }}>
            Ver todas
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState icon={BarChart3} text="No hay ventas registradas todavia." />
        ) : (
          <div className="card-apple dashboard-table-scroll" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ minWidth: 560 }}>
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 0.8fr 0.8fr 1fr',
                padding: '14px 24px',
                background: '#FAFAFA',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <span>Comprador</span>
              <span>Importe</span>
              <span>Tipo</span>
              <span>Estado</span>
              <span>Fecha</span>
            </div>
            {/* Rows */}
            {recentTransactions.map((tx, idx) => (
              <div
                key={tx.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 0.8fr 0.8fr 1fr',
                  padding: '16px 24px',
                  alignItems: 'center',
                  borderBottom:
                    idx < recentTransactions.length - 1
                      ? '1px solid var(--color-border)'
                      : 'none',
                  fontSize: 15,
                }}
              >
                <span style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                  {(tx.buyer as any)?.full_name || 'Cliente'}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                  {formatCurrency(tx.amount ?? 0)}
                </span>
                <span style={{ color: 'var(--color-secondary)' }}>
                  {getTypeLabel(tx.type ?? '')}
                </span>
                <span className={getStatusBadgeClass(tx.status ?? '')}>
                  {getStatusLabel(tx.status ?? '')}
                </span>
                <span style={{ color: 'var(--color-tertiary)', fontSize: 14 }}>
                  {formatDate(tx.created_at)}
                </span>
              </div>
            ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 4. INVENTARIO ──────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <h2 className="text-subheadline" style={{ color: 'var(--color-primary)' }}>
            Inventario
          </h2>
          <Link to="/panel/products" className="btn-text" style={{ fontSize: 14 }}>
            Ver todos
          </Link>
        </div>

        {/* Summary line */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
            fontSize: 15,
            color: 'var(--color-secondary)',
          }}
        >
          <span>
            <strong style={{ color: 'var(--color-primary)' }}>{activeProducts.length}</strong>{' '}
            productos activos
          </span>
          {lowStockProducts.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={14} style={{ color: 'var(--color-red)' }} />
              <strong style={{ color: 'var(--color-red)' }}>{lowStockProducts.length}</strong> en
              stock bajo
            </span>
          )}
        </div>

        {displayProducts.length === 0 ? (
          <EmptyState icon={Layers} text="No tienes productos en tu inventario." />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {displayProducts.map((product) => {
              const stock = product.stock ?? 0;
              const isLow = stock < 5;
              const isWarning = stock >= 5 && stock <= 10;

              return (
                <div
                  key={product.id}
                  className="card-apple"
                  style={{
                    padding: 20,
                    borderLeft: isLow
                      ? '3px solid var(--color-red)'
                      : isWarning
                        ? '3px solid var(--color-orange)'
                        : '3px solid transparent',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                        fontSize: 16,
                        lineHeight: 1.3,
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      {product.product_name}
                    </p>
                    {product.is_active ? (
                      <span className="badge badge-green" style={{ flexShrink: 0 }}>
                        Activo
                      </span>
                    ) : (
                      <span className="badge badge-gray" style={{ flexShrink: 0 }}>
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                      }}
                    >
                      {formatCurrency(product.price ?? 0)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isLow ? (
                        <span className="badge badge-red">Stock: {stock}</span>
                      ) : isWarning ? (
                        <span className="badge badge-orange">Stock: {stock}</span>
                      ) : (
                        <span className="badge badge-gray">Stock: {stock}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 5. COTIZACIONES RECIBIDAS ──────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h2 className="text-subheadline" style={{ color: 'var(--color-primary)' }}>
            Cotizaciones Recibidas
          </h2>
          <Link to="/quotes" className="btn-text" style={{ fontSize: 14 }}>
            Ver todas
          </Link>
        </div>

        {recentQuotes.length === 0 ? (
          <EmptyState icon={MessageSquare} text="No tienes cotizaciones recibidas." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentQuotes.map((req) => (
              <div
                key={req.id}
                className="card-apple"
                style={{
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: 16,
                      color: 'var(--color-primary)',
                      marginBottom: 4,
                    }}
                  >
                    {req.car_model} ({req.car_year})
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--color-secondary)' }}>
                    {req.service_type}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={getStatusBadgeClass(req.status)}>
                    {getStatusLabel(req.status)}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--color-tertiary)' }}>
                    {formatDate(req.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 6. SERVICIOS (workshop / premium only) ─────────── */}
      {showServices && (
        <section style={{ marginBottom: 56 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <h2 className="text-subheadline" style={{ color: 'var(--color-primary)' }}>
              Mis Servicios
            </h2>
            <Link to="/panel" className="btn-text" style={{ fontSize: 14 }}>
              Gestionar
            </Link>
          </div>

          {myServices.length === 0 ? (
            <EmptyState icon={Wrench} text="No tienes servicios registrados." />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {myServices.map((service) => (
                <div key={service.id} className="card-apple" style={{ padding: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: 'rgba(0, 113, 227, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Wrench size={18} style={{ color: 'var(--color-blue)' }} />
                      </div>
                      <p
                        style={{
                          fontWeight: 600,
                          fontSize: 16,
                          color: 'var(--color-primary)',
                          lineHeight: 1.3,
                        }}
                      >
                        {service.service_name}
                      </p>
                    </div>
                    {service.is_active ? (
                      <span className="badge badge-green" style={{ flexShrink: 0 }}>
                        Activo
                      </span>
                    ) : (
                      <span className="badge badge-gray" style={{ flexShrink: 0 }}>
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                    }}
                  >
                    {formatCurrency(service.base_price ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 7. QUICK ACTIONS ───────────────────────────────── */}
      <section>
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/panel"
            className="btn-pill btn-primary"
            style={{ fontSize: 15, padding: '12px 28px' }}
          >
            <Settings size={16} style={{ marginRight: 8 }} />
            Panel de Control
          </Link>
          <Link
            to="/marketplace"
            className="btn-pill btn-primary"
            style={{
              fontSize: 15,
              padding: '12px 28px',
              background: 'var(--color-primary)',
            }}
          >
            <ShoppingCart size={16} style={{ marginRight: 8 }} />
            Marketplace
          </Link>
          <Link
            to="/quotes"
            className="btn-pill btn-primary"
            style={{
              fontSize: 15,
              padding: '12px 28px',
              background: 'var(--color-green)',
            }}
          >
            <FileText size={16} style={{ marginRight: 8 }} />
            Nueva Cotizacion
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DEFAULT DASHBOARD (standard users)
   ═══════════════════════════════════════════════════════════ */

function DefaultDashboard({ profile }: { profile: any }) {
  const { sentRequests, fetchSentRequests } = useQuoteStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchSentRequests();
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <Spinner />;
  }

  const recentActivity = sentRequests.slice(0, 5);

  return (
    <div className="content-width-wide animate-fade-in-up" style={{ paddingTop: 60, paddingBottom: 80 }}>
      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <h1 className="text-headline" style={{ color: 'var(--color-primary)' }}>
          Bienvenido, {profile.full_name || 'Usuario'}
        </h1>
        <p
          className="text-body-large"
          style={{ color: 'var(--color-secondary)', marginTop: 4, textTransform: 'capitalize' }}
        >
          {formatDateLong()}
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div
        className="stagger-children"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          marginBottom: 56,
        }}
      >
        {/* Estado */}
        <div className="card-flat" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(0, 113, 227, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={20} style={{ color: 'var(--color-blue)' }} />
            </div>
            <span style={{ fontSize: 15, color: 'var(--color-secondary)', fontWeight: 500 }}>
              Estado
            </span>
          </div>
          <p style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, color: 'var(--color-primary)' }}>
            Activo
          </p>
        </div>

        {/* Verificacion */}
        <div className="card-flat" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: profile.is_verified
                  ? 'rgba(52, 199, 89, 0.08)'
                  : 'rgba(255, 149, 0, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {profile.is_verified ? (
                <CheckCircle size={20} style={{ color: 'var(--color-green)' }} />
              ) : (
                <Clock size={20} style={{ color: 'var(--color-orange)' }} />
              )}
            </div>
            <span style={{ fontSize: 15, color: 'var(--color-secondary)', fontWeight: 500 }}>
              Verificacion
            </span>
          </div>
          <p style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, color: 'var(--color-primary)' }}>
            {profile.is_verified ? 'Verificado' : 'Pendiente'}
          </p>
          {profile.is_verified ? (
            <span className="badge badge-green" style={{ marginTop: 10, display: 'inline-flex' }}>
              Verificado
            </span>
          ) : (
            <span className="badge badge-orange" style={{ marginTop: 10, display: 'inline-flex' }}>
              Pendiente
            </span>
          )}
        </div>

        {/* Plan */}
        <div className="card-flat" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(0, 113, 227, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Star size={20} style={{ color: 'var(--color-blue)' }} />
            </div>
            <span style={{ fontSize: 15, color: 'var(--color-secondary)', fontWeight: 500 }}>
              Plan
            </span>
          </div>
          <p
            style={{
              fontSize: 36,
              fontWeight: 600,
              lineHeight: 1.1,
              color: 'var(--color-primary)',
              textTransform: 'capitalize',
            }}
          >
            {USER_TYPE_LABELS[profile.user_type] || profile.user_type}
          </p>
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <h2 className="text-subheadline" style={{ color: 'var(--color-primary)', marginBottom: 20 }}>
          Acciones Rapidas
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            to="/marketplace"
            className="btn-pill btn-primary"
            style={{ fontSize: 15, padding: '12px 28px' }}
          >
            <ShoppingCart size={16} style={{ marginRight: 8 }} />
            Ver Marketplace
          </Link>
          <Link
            to="/quotes"
            className="btn-pill btn-primary"
            style={{
              fontSize: 15,
              padding: '12px 28px',
              background: 'var(--color-green)',
            }}
          >
            <FileText size={16} style={{ marginRight: 8 }} />
            Mis Cotizaciones
          </Link>
          <Link
            to="/profile"
            className="btn-pill btn-primary"
            style={{
              fontSize: 15,
              padding: '12px 28px',
              background: 'var(--color-primary)',
            }}
          >
            <User size={16} style={{ marginRight: 8 }} />
            Mi Perfil
          </Link>
        </div>
      </div>

      {/* ── Activity Feed ──────────────────────────────── */}
      <section>
        <h2 className="text-subheadline" style={{ color: 'var(--color-primary)', marginBottom: 20 }}>
          Actividad Reciente
        </h2>
        {recentActivity.length === 0 ? (
          <EmptyState icon={Clock} text="No hay actividad reciente. Explora el marketplace para comenzar." />
        ) : (
          <div>
            {recentActivity.map((req, idx) => (
              <div key={req.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '18px 0',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--color-bg-light, #F5F5F7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={18} style={{ color: 'var(--color-secondary)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, color: 'var(--color-primary)', fontSize: 16 }}>
                      Cotizacion: {req.car_model} ({req.car_year})
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--color-secondary)', marginTop: 2 }}>
                      {req.service_type}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span className={getStatusBadgeClass(req.status)}>
                      {getStatusLabel(req.status)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--color-tertiary)' }}>
                      {formatDate(req.created_at)}
                    </span>
                  </div>
                </div>
                {idx < recentActivity.length - 1 && (
                  <div style={{ height: 1, background: 'var(--color-border)' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
