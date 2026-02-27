# Plataforma Marketplace Automotriz

Plataforma completa de marketplace para el sector automotriz que conecta usuarios estándar, profesionales y talleres en un ecosistema seguro y eficiente.

## 📱 Versiones Disponibles

- **Web App** - Aplicación web completa (carpeta raíz)
- **iOS/Android App** - Aplicación móvil nativa con React Native + Expo (carpeta `mobile/`)

> Para la aplicación iOS/Android, consulta [mobile/README.md](mobile/README.md)

## Características Principales

### Tipos de Usuario

1. **Usuario Estándar (Gratis)**
   - Solicitar presupuestos a talleres
   - Ver y explorar el marketplace
   - Contratar servicios de escape
   - Comprar productos y materiales

2. **Profesional (29.99€/mes)**
   - Todo lo del plan Estándar
   - Vender productos y materiales a talleres
   - Acceso completo a biblioteca de diseños 3D
   - Analíticas avanzadas
   - Soporte prioritario

3. **Taller (49.99€/mes)**
   - Todo lo del plan Estándar
   - Ofrecer servicios de escape personalizados
   - Recibir y responder presupuestos
   - Herramientas de gestión de taller
   - Comprar materiales de profesionales

4. **Premium (99.99€/mes)**
   - Acceso completo a todas las funcionalidades
   - Subir y compartir diseños 3D propios
   - Listados ilimitados de productos/servicios
   - API access para integraciones
   - White-label options
   - Soporte 24/7

### Funcionalidades del Sistema

#### Sistema de Autenticación
- Registro seguro con email y contraseña
- Cifrado de datos sensibles
- Gestión de sesiones con Supabase Auth
- Perfiles diferenciados por tipo de usuario

#### Marketplace
- Catálogo de productos de profesionales
- Listado de servicios de talleres
- Sistema de búsqueda y filtrado
- Imágenes y descripciones detalladas
- Gestión de inventario

#### Sistema de Presupuestos
- Usuarios pueden solicitar presupuestos personalizados
- Especificación de modelo, año y detalles del vehículo
- Talleres pueden responder con cotizaciones
- Seguimiento de estado de solicitudes
- Historial completo de presupuestos

#### Diseños 3D (Professional/Premium)
- Biblioteca de diseños 3D de piezas automotrices
- Visor 3D integrado (próximamente)
- Opción de hacer diseños públicos o privados
- Subida de archivos 3D propios (Premium)
- Gestión de permisos de acceso

#### Sistema de Verificación
- Verificación de documentación legal para profesionales y talleres
- Subida segura de documentos
- Proceso de aprobación
- Estados: Pendiente, Aprobado, Rechazado
- Cumplimiento legal y regulatorio

#### Suscripciones
- Planes mensuales y anuales
- Cambio de plan flexible
- Integración con Stripe (ver PAYMENTS.md)
- Gestión automática de renovaciones
- Facturación automatizada

#### Sistema de Pagos (Próximamente)
- Pasarela de pago segura con Stripe
- Protección de datos de tarjeta (PCI DSS)
- Múltiples métodos de pago
- Facturación automática

#### Sistema Escrow
- Protección para compradores y vendedores
- Retención de fondos durante la transacción
- Liberación automática o manual
- Resolución de disputas
- Transparencia total del proceso

## Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Estilos**: CSS-in-JS (inline styles)
- **Gestión de Estado**: Zustand
- **Queries**: TanStack React Query
- **Iconos**: Lucide React
- **Pagos**: Stripe (integración pendiente)

## Estructura de la Base de Datos

La plataforma utiliza Supabase con las siguientes tablas principales:

- `user_profiles` - Perfiles extendidos de usuarios
- `subscription_tiers` - Planes de suscripción disponibles
- `user_subscriptions` - Suscripciones activas de usuarios
- `workshop_services` - Servicios ofrecidos por talleres
- `professional_products` - Productos vendidos por profesionales
- `design_3d` - Biblioteca de diseños 3D
- `quote_requests` - Solicitudes de presupuesto
- `quotes` - Cotizaciones enviadas
- `transactions` - Historial de transacciones
- `escrow_holds` - Fondos en escrow
- `user_documents` - Documentación de verificación

Todas las tablas incluyen Row Level Security (RLS) para máxima seguridad.

## Seguridad y Cumplimiento

### Seguridad
- Autenticación segura con Supabase Auth
- Row Level Security en todas las tablas
- Cifrado de datos sensibles
- Protección contra SQL injection
- Validación de entrada en cliente y servidor
- HTTPS obligatorio

### Cumplimiento Legal
- RGPD compliant
- Verificación de documentación empresarial
- Sistema de facturación conforme a ley
- Términos y condiciones
- Política de privacidad
- Gestión de consentimientos

## Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa de producción
npm run preview
```

## Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

## Próximas Funcionalidades

- [ ] Subida real de archivos (documentos y diseños 3D)
- [ ] Visor 3D integrado
- [ ] Integración completa de Stripe
- [ ] Sistema de mensajería entre usuarios
- [ ] Notificaciones en tiempo real
- [ ] Sistema de valoraciones y reseñas
- [ ] Panel de administración
- [ ] App móvil (React Native)
- [ ] Búsqueda avanzada y filtros
- [ ] Recomendaciones personalizadas
- [ ] Exportación de datos
- [ ] API pública para integraciones

## Pagos y Escrow

Para información detallada sobre el sistema de pagos y escrow, consulta el archivo [PAYMENTS.md](./PAYMENTS.md).

Para configurar Stripe: https://bolt.new/setup/stripe

## Soporte

Para cualquier consulta o problema, contacta con el equipo de soporte.

## Licencia

Todos los derechos reservados © 2026 AutoMarket
