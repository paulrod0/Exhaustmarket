# Sistema de Pagos y Escrow

## Integración de Stripe

Esta plataforma está preparada para integrar Stripe como pasarela de pago. Para habilitar los pagos, necesitarás:

### 1. Configuración de Stripe

1. Crea una cuenta en [Stripe](https://dashboard.stripe.com/register)
2. Obtén tus claves API desde el [Dashboard de Stripe](https://dashboard.stripe.com/apikeys)
3. Añade las siguientes variables de entorno:
   - `STRIPE_SECRET_KEY`: Tu clave secreta de Stripe
   - `STRIPE_PUBLISHABLE_KEY`: Tu clave pública de Stripe

### 2. Funcionalidades de Pago

La plataforma soporta los siguientes tipos de transacciones:

#### Suscripciones
- Pagos recurrentes mensuales o anuales
- Gestión automática de renovaciones
- Cancelación y cambios de plan

#### Compra de Productos
- Pago único por productos de profesionales
- Sistema de inventario automático

#### Servicios de Taller
- Pagos por servicios contratados
- Sistema de presupuestos y aceptación

### 3. Sistema de Escrow

El sistema de escrow protege tanto a compradores como vendedores:

#### Flujo de Escrow

1. **Pago Inicial**: El comprador realiza el pago
2. **Retención**: Los fondos se retienen en escrow
3. **Prestación del Servicio**: El vendedor completa el trabajo
4. **Confirmación**: El comprador confirma la satisfacción
5. **Liberación**: Los fondos se liberan al vendedor

#### Estados del Escrow

- `held`: Fondos retenidos en espera
- `released`: Fondos liberados al vendedor
- `refunded`: Fondos devueltos al comprador

#### Resolución de Disputas

Si surge una disputa:

1. El comprador o vendedor puede abrir una disputa
2. Se proporciona evidencia de ambas partes
3. Un mediador revisa el caso
4. Se toma una decisión final sobre la distribución de fondos

### 4. Seguridad

- Todos los pagos se procesan de forma segura a través de Stripe
- No almacenamos datos de tarjetas de crédito
- Cumplimiento PCI DSS a través de Stripe
- Cifrado TLS/SSL en todas las transacciones

### 5. Comisiones de la Plataforma

La plataforma puede configurar comisiones por transacción:

- Suscripciones: Sin comisión adicional
- Productos: 5% del valor de la transacción
- Servicios: 7% del valor del servicio

### 6. Implementación

Para implementar los pagos en tu aplicación:

```typescript
// Ejemplo de creación de pago
const { data, error } = await supabase
  .from('transactions')
  .insert({
    buyer_id: userId,
    seller_id: sellerId,
    amount: totalAmount,
    type: 'product',
    reference_id: productId,
    status: 'pending'
  })

// Crear escrow hold
await supabase
  .from('escrow_holds')
  .insert({
    transaction_id: data.id,
    amount: totalAmount,
    status: 'held',
    release_date: addDays(new Date(), 7) // Liberar en 7 días
  })
```

### 7. Webhooks de Stripe

Configura webhooks en Stripe para recibir notificaciones de:

- `payment_intent.succeeded`: Pago completado
- `payment_intent.payment_failed`: Pago fallido
- `customer.subscription.updated`: Suscripción actualizada
- `customer.subscription.deleted`: Suscripción cancelada

### 8. Documentación Adicional

Para más información sobre la integración de Stripe, visita:
https://bolt.new/setup/stripe

## Cumplimiento Legal

### Para Profesionales y Talleres

Según la normativa española y europea, todos los profesionales y talleres deben:

1. **Registro Fiscal**
   - Alta en Hacienda (Autónomo o Empresa)
   - NIF/CIF válido

2. **Documentación Requerida**
   - Licencia de actividad
   - Seguro de responsabilidad civil (talleres)
   - Certificados profesionales correspondientes

3. **Facturación**
   - Emitir facturas conforme a ley
   - IVA aplicable según corresponda
   - Conservar registros contables

4. **Protección de Datos**
   - Cumplimiento RGPD
   - Política de privacidad
   - Consentimiento de usuarios

La plataforma incluye un sistema de verificación de documentos para asegurar el cumplimiento legal de todos los vendedores.
