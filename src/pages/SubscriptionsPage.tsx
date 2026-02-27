import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Check } from 'lucide-react';

export default function SubscriptionsPage() {
  const { profile } = useAuthStore();

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3" style={{ color: '#86868B' }}>
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{ border: '2px solid #D2D2D7', borderTopColor: '#0071E3' }}
          />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  if (profile.user_type === 'workshop' || profile.user_type === 'professional') {
    return <WorkshopPlans currentPlan={profile.user_type} />;
  }

  return <ManufacturerPlans currentPlan={profile.user_type} />;
}

function WorkshopPlans({ currentPlan }: { currentPlan: string }) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        'Buscar talleres',
        'Ver catalogo basico',
        'Solicitar presupuestos',
        'Chat limitado',
      ],
      recommended: false,
    },
    {
      id: 'workshop',
      name: 'Workshop Base',
      monthlyPrice: 19,
      annualPrice: 190,
      features: [
        'Recibir presupuestos',
        'Gestionar trabajos',
        'Comprar a fabricantes PRO',
        'Subcontratar fabricacion',
        'Expedientes completos',
        'Pagos protegidos',
      ],
      recommended: false,
    },
    {
      id: 'professional',
      name: 'Workshop Premium',
      monthlyPrice: 29,
      annualPrice: 290,
      features: [
        'Todo incluido en Base',
        'Marketplace de accesorios',
        'Compra Aftermarket PRO',
        'Buscador OEM avanzado',
        'Mayor visibilidad',
        'Creditos mensuales',
        'Prioridad en solicitudes',
      ],
      recommended: true,
    },
  ];

  return (
    <div className="content-width" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      {/* Header */}
      <div className="text-center" style={{ marginBottom: '40px' }}>
        <h1 className="text-headline" style={{ color: '#1D1D1F', marginBottom: '12px' }}>
          Suscripciones
        </h1>
        <p className="text-body-large" style={{ color: '#6E6E73', maxWidth: '600px', margin: '0 auto' }}>
          Elige el plan perfecto para tu taller
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center" style={{ marginBottom: '48px' }}>
        <div
          className="inline-flex"
          style={{
            backgroundColor: '#F5F5F7',
            borderRadius: '980px',
            padding: '3px',
          }}
        >
          <button
            onClick={() => setBilling('monthly')}
            style={{
              padding: '8px 24px',
              borderRadius: '980px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: billing === 'monthly' ? '#1D1D1F' : 'transparent',
              color: billing === 'monthly' ? '#FFFFFF' : '#1D1D1F',
            }}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling('annual')}
            style={{
              padding: '8px 24px',
              borderRadius: '980px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: billing === 'annual' ? '#1D1D1F' : 'transparent',
              color: billing === 'annual' ? '#FFFFFF' : '#1D1D1F',
            }}
          >
            Anual
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;

          return (
            <div
              key={plan.id}
              className="card-apple"
              style={{
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                border: plan.recommended ? '2px solid #0071E3' : undefined,
                position: 'relative',
              }}
            >
              {/* Current plan badge */}
              {isCurrent && (
                <span
                  className="badge badge-blue"
                  style={{ position: 'absolute', top: '16px', right: '16px' }}
                >
                  Plan actual
                </span>
              )}

              {/* Plan name */}
              <h3 style={{ fontSize: '28px', fontWeight: 600, color: '#1D1D1F', marginBottom: '16px' }}>
                {plan.name}
              </h3>

              {/* Price */}
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '48px', fontWeight: 700, color: '#1D1D1F', lineHeight: 1 }}>
                  {'\u20AC'}{price}
                </span>
              </div>
              <p style={{ fontSize: '15px', color: '#6E6E73', marginBottom: '28px' }}>
                {billing === 'monthly' ? 'al mes' : 'al ano'}
              </p>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '32px', flex: 1 }}>
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3"
                    style={{ marginBottom: '12px' }}
                  >
                    <Check size={16} style={{ color: '#34C759', flexShrink: 0 }} />
                    <span style={{ fontSize: '15px', color: '#1D1D1F' }}>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                className={`btn-pill ${plan.recommended ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%' }}
                disabled={isCurrent}
              >
                {isCurrent ? 'Plan actual' : 'Suscribirse'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ManufacturerPlans({ currentPlan }: { currentPlan: string }) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        'Perfil de fabricante',
        'Ver solicitudes basicas',
        'Chat limitado',
        'Listado basico',
      ],
      recommended: false,
    },
    {
      id: 'manufacturer',
      name: 'Manufacturer Base',
      monthlyPrice: 49,
      annualPrice: 490,
      features: [
        'Marketplace Products',
        'Quote Requests',
        'Sell Aftermarket & Accessories',
        'Shipping Management',
        'Invoicing',
        'Client Chat & Escrow',
        'Basic Analytics',
      ],
      recommended: false,
    },
    {
      id: 'premium',
      name: 'Manufacturer Premium',
      monthlyPrice: 69,
      annualPrice: 690,
      features: [
        'Todo incluido en Base',
        '3D CAD Library',
        'Cost Calculation Tools',
        'Time Estimator',
        'BOM Automation',
        'Sound Simulation',
        'Enhanced Visibility',
        'Monthly Credits',
      ],
      recommended: true,
    },
  ];

  return (
    <div className="content-width" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      {/* Header */}
      <div className="text-center" style={{ marginBottom: '40px' }}>
        <h1 className="text-headline" style={{ color: '#1D1D1F', marginBottom: '12px' }}>
          Suscripciones
        </h1>
        <p className="text-body-large" style={{ color: '#6E6E73', maxWidth: '600px', margin: '0 auto' }}>
          Elige el plan ideal para tu negocio de fabricacion
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center" style={{ marginBottom: '48px' }}>
        <div
          className="inline-flex"
          style={{
            backgroundColor: '#F5F5F7',
            borderRadius: '980px',
            padding: '3px',
          }}
        >
          <button
            onClick={() => setBilling('monthly')}
            style={{
              padding: '8px 24px',
              borderRadius: '980px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: billing === 'monthly' ? '#1D1D1F' : 'transparent',
              color: billing === 'monthly' ? '#FFFFFF' : '#1D1D1F',
            }}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling('annual')}
            style={{
              padding: '8px 24px',
              borderRadius: '980px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: billing === 'annual' ? '#1D1D1F' : 'transparent',
              color: billing === 'annual' ? '#FFFFFF' : '#1D1D1F',
            }}
          >
            Anual
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;

          return (
            <div
              key={plan.id}
              className="card-apple"
              style={{
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                border: plan.recommended ? '2px solid #0071E3' : undefined,
                position: 'relative',
              }}
            >
              {/* Current plan badge */}
              {isCurrent && (
                <span
                  className="badge badge-blue"
                  style={{ position: 'absolute', top: '16px', right: '16px' }}
                >
                  Plan actual
                </span>
              )}

              {/* Plan name */}
              <h3 style={{ fontSize: '28px', fontWeight: 600, color: '#1D1D1F', marginBottom: '16px' }}>
                {plan.name}
              </h3>

              {/* Price */}
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '48px', fontWeight: 700, color: '#1D1D1F', lineHeight: 1 }}>
                  {'\u20AC'}{price}
                </span>
              </div>
              <p style={{ fontSize: '15px', color: '#6E6E73', marginBottom: '28px' }}>
                {billing === 'monthly' ? 'al mes' : 'al ano'}
              </p>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '32px', flex: 1 }}>
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3"
                    style={{ marginBottom: '12px' }}
                  >
                    <Check size={16} style={{ color: '#34C759', flexShrink: 0 }} />
                    <span style={{ fontSize: '15px', color: '#1D1D1F' }}>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                className={`btn-pill ${plan.recommended ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%' }}
                disabled={isCurrent}
              >
                {isCurrent ? 'Plan actual' : 'Suscribirse'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
