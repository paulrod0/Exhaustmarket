import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { fetchProfile } = useAuthStore();
  const status = params.get('status');
  const success = status === 'success';

  useEffect(() => {
    if (success) {
      // Refresh profile so user_type updates from webhook
      fetchProfile().catch(() => {});
    }
  }, [success, fetchProfile]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F7',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '48px 40px',
          textAlign: 'center',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontSize: '56px', marginBottom: '24px' }}>
          {success ? '✅' : '❌'}
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1D1D1F', marginBottom: '12px' }}>
          {success ? '¡Pago completado!' : 'Pago cancelado'}
        </h1>
        <p style={{ fontSize: '16px', color: '#6E6E73', marginBottom: '32px', lineHeight: 1.5 }}>
          {success
            ? 'Tu suscripción se ha activado. Puede tardar unos segundos en actualizarse.'
            : 'No se ha realizado ningún cargo. Puedes intentarlo de nuevo cuando quieras.'}
        </p>
        <button
          onClick={() => navigate('/subscriptions')}
          style={{
            backgroundColor: '#0071E3',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '980px',
            padding: '14px 32px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          {success ? 'Ver mi suscripción' : 'Volver a planes'}
        </button>
      </div>
    </div>
  );
}
