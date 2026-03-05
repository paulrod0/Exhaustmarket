import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Check } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function startCheckout(tier: string, interval: 'monthly' | 'yearly') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión activa');

  const origin = window.location.origin;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      tier,
      interval,
      success_url: `${origin}/payment-result?status=success`,
      cancel_url: `${origin}/payment-result?status=cancelled`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al crear la sesión de pago');
  }

  const { url } = await res.json();
  window.location.href = url;
}

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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      monthlyPrice: 49.99,
      annualPrice: 499.99,
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
      monthlyPrice: 29.99,
      annualPrice: 299.99,
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

  const handleSubscribe = async (planId: string) => {
    setError(null);
    setLoadingPlan(planId);
    try {
      await startCheckout(planId, billing === 'annual' ? 'yearly' : 'monthly');
    } catch (e: any) {
      setError(e.message);
      setLoadingPlan(null);
    }
  };

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

      {error && (
        <div
          style={{
            backgroundColor: '#FFF2F2',
            border: '1px solid #FF3B30',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            color: '#FF3B30',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
          const isLoading = loadingPlan === plan.id;

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
                disabled={isCurrent || plan.id === 'free' || isLoading || loadingPlan !== null}
                onClick={() => !isCurrent && plan.id !== 'free' && handleSubscribe(plan.id)}
              >
                {isLoading ? 'Redirigiendo...' : isCurrent ? 'Plan actual' : plan.id === 'free' ? 'Gratuito' : 'Suscribirse'}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: '13px', color: '#86868B', marginTop: '32px' }}>
        Los pagos son procesados de forma segura por Stripe.
      </p>
    </div>
  );
}

function ManufacturerPlans({ currentPlan }: { currentPlan: string }) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      monthlyPrice: 49.00,
      annualPrice: 490.00,
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
      monthlyPrice: 99.99,
      annualPrice: 999.99,
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

  const handleSubscribe = async (planId: string) => {
    setError(null);
    setLoadingPlan(planId);
    try {
      await startCheckout(planId, billing === 'annual' ? 'yearly' : 'monthly');
    } catch (e: any) {
      setError(e.message);
      setLoadingPlan(null);
    }
  };

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

      {error && (
        <div
          style={{
            backgroundColor: '#FFF2F2',
            border: '1px solid #FF3B30',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            color: '#FF3B30',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
          const isLoading = loadingPlan === plan.id;

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
                disabled={isCurrent || plan.id === 'free' || isLoading || loadingPlan !== null}
                onClick={() => !isCurrent && plan.id !== 'free' && handleSubscribe(plan.id)}
              >
                {isLoading ? 'Redirigiendo...' : isCurrent ? 'Plan actual' : plan.id === 'free' ? 'Gratuito' : 'Suscribirse'}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: '13px', color: '#86868B', marginTop: '32px' }}>
        Los pagos son procesados de forma segura por Stripe.
      </p>
    </div>
  );
}
