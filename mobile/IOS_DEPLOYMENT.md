# Guía de Publicación en App Store

Esta guía te llevará paso a paso para publicar la app AutoMarket en la App Store de Apple.

## Requisitos Previos

### 1. Cuenta de Apple Developer
- Costo: $99 USD/año
- Regístrate en: https://developer.apple.com/programs/

### 2. Herramientas necesarias
- macOS (Monterey o superior)
- Xcode (última versión)
- Node.js 18 o superior
- Cuenta de Expo (gratis)

## Paso 1: Configurar Apple Developer

### 1.1 Crear App ID

1. Ve a [Apple Developer Portal](https://developer.apple.com/account)
2. Navega a "Certificates, Identifiers & Profiles"
3. Selecciona "Identifiers" → "+" (nuevo)
4. Selecciona "App IDs" → Continuar
5. Configuración:
   - Description: AutoMarket
   - Bundle ID: `com.automarket.app` (debe coincidir con app.json)
   - Capabilities: Habilita las que necesites (Push Notifications, etc.)
6. Registrar

### 1.2 Crear Provisioning Profile

1. En "Certificates, Identifiers & Profiles"
2. Selecciona "Profiles" → "+" (nuevo)
3. Selecciona "App Store" → Continuar
4. Selecciona tu App ID (AutoMarket)
5. Selecciona tu certificado de distribución
6. Dale un nombre: "AutoMarket App Store"
7. Generar y descargar

## Paso 2: Configurar App Store Connect

### 2.1 Crear App en App Store Connect

1. Ve a [App Store Connect](https://appstoreconnect.apple.com/)
2. Selecciona "My Apps" → "+" → "New App"
3. Configuración:
   - Platform: iOS
   - Name: AutoMarket
   - Primary Language: Spanish (Spain) o Spanish (Mexico)
   - Bundle ID: Selecciona `com.automarket.app`
   - SKU: `automarket-ios` (identificador único)
4. Crear

### 2.2 Completar información de la app

#### Información de la App
- **Subtitle**: "Marketplace Automotriz"
- **Category**: Business o Shopping
- **Secondary Category** (opcional): Lifestyle

#### Descripción
```
AutoMarket es la plataforma definitiva para el sector automotriz.
Conecta usuarios, profesionales y talleres en un marketplace seguro.

CARACTERÍSTICAS PRINCIPALES:
• Marketplace completo de productos y servicios
• Sistema de presupuestos personalizado
• Planes flexibles según tu necesidad
• Acceso a diseños 3D (planes Professional/Premium)
• Transacciones seguras con sistema escrow
• Verificación de talleres y profesionales

TIPOS DE USUARIO:
• Estándar: Solicita presupuestos y explora el marketplace
• Profesional: Vende productos y accede a diseños 3D
• Taller: Ofrece servicios de escape personalizado
• Premium: Acceso completo a todas las funcionalidades
```

#### Keywords (separadas por comas)
```
automotive, marketplace, taller, escape, profesional, diseño 3d, presupuesto, automóvil, coches, servicios
```

#### Support URL
```
https://automarket.com/support
```

#### Marketing URL (opcional)
```
https://automarket.com
```

#### Privacy Policy URL (REQUERIDO)
```
https://automarket.com/privacy
```

### 2.3 Capturas de Pantalla

Necesitas capturas para diferentes tamaños de iPhone:

**iPhone 6.7"** (iPhone 14 Pro Max, 15 Pro Max)
- Resolución: 1290 x 2796 pixels
- Mínimo 3, máximo 10 capturas

**iPhone 6.5"** (iPhone 11 Pro Max, XS Max)
- Resolución: 1242 x 2688 pixels

**iPhone 5.5"** (iPhone 8 Plus)
- Resolución: 1242 x 2208 pixels

Toma capturas de:
1. Pantalla de inicio
2. Login/Registro
3. Dashboard
4. Marketplace
5. Sistema de presupuestos
6. Perfil de usuario

## Paso 3: Compilar la App con EAS

### 3.1 Instalar y configurar EAS

```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Login en Expo
eas login

# Navegar a la carpeta del proyecto
cd mobile

# Configurar EAS
eas build:configure
```

### 3.2 Configurar eas.json

El comando anterior crea `eas.json`. Edítalo:

```json
{
  "build": {
    "production": {
      "ios": {
        "bundleIdentifier": "com.automarket.app",
        "buildConfiguration": "Release"
      }
    },
    "preview": {
      "ios": {
        "simulator": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "tu@email.com",
        "ascAppId": "TU_APP_ID",
        "appleTeamId": "TU_TEAM_ID"
      }
    }
  }
}
```

### 3.3 Compilar para producción

```bash
# Compilar para iOS
eas build --platform ios --profile production

# Espera (puede tomar 10-20 minutos)
# Recibirás un enlace para descargar el IPA
```

## Paso 4: Subir a App Store Connect

### Opción A: Subida automática con EAS

```bash
eas submit --platform ios --profile production
```

### Opción B: Subida manual

1. Descarga el archivo IPA del build de EAS
2. Abre Application Loader o Transporter (app de macOS)
3. Arrastra el archivo IPA
4. Espera la confirmación de subida

## Paso 5: Preparar para Revisión

### 5.1 Información de Versión

1. Ve a App Store Connect → Tu App → "Prepare for Submission"
2. Completa:
   - **What's New in This Version**: Descripción de la versión
   - **Build**: Selecciona el build que subiste
   - **Rating**: Completa el cuestionario de contenido

### 5.2 App Review Information

- **Sign-in required**: YES
- **Demo Account**:
  - Username: `demo@automarket.com`
  - Password: `Demo123!`
  - Notes: "Usuario de prueba con acceso completo"

### 5.3 Contact Information

- First Name: Tu nombre
- Last Name: Tu apellido
- Phone: Tu teléfono
- Email: Tu email de contacto

### 5.4 Notes (opcional)

```
Esta app requiere conexión a internet para funcionar.
Las transacciones de pago están pendientes de implementación.
Sistema de verificación de usuarios para profesionales y talleres.
```

## Paso 6: Enviar para Revisión

1. Revisa toda la información
2. Haz clic en "Submit for Review"
3. Acepta los términos de exportación
4. ¡Enviado!

**Tiempo de revisión**: Típicamente 1-3 días

## Paso 7: Después de la Aprobación

### Publicación automática vs manual

En App Store Connect puedes elegir:
- **Automática**: Se publica inmediatamente tras aprobación
- **Manual**: Tú decides cuándo publicar

### Configurar precios

1. Ve a "Pricing and Availability"
2. Selecciona "Free" (la app es gratis, las suscripciones son in-app)
3. Configura territorios (países donde estará disponible)

## Actualizaciones OTA (Over The Air)

Para actualizaciones menores sin recompilar:

```bash
# Publicar actualización
eas update --branch production --message "Correción de bugs"
```

Esto actualiza la app sin pasar por App Store Review (para cambios JavaScript/React Native, no nativos).

## Checklist Final

- [ ] Cuenta de Apple Developer activa
- [ ] App ID creado
- [ ] App creada en App Store Connect
- [ ] Toda la información completada
- [ ] Capturas de pantalla subidas
- [ ] Privacy Policy publicada
- [ ] Build compilado y subido
- [ ] Cuenta de prueba configurada
- [ ] Enviado para revisión

## Solución de Problemas

### Error: "Invalid Bundle"
- Verifica que el Bundle ID coincida en todos lados
- Revisa que las capacidades (capabilities) estén configuradas

### Error: "Missing Export Compliance"
- Completa el formulario de Export Compliance en App Store Connect
- Para apps sin encriptación: selecciona "No"

### Rechazo: "Insufficient Information"
- Asegúrate de proporcionar notas detalladas para el revisor
- Incluye credenciales de prueba que funcionen

### Rechazo: "Broken Links"
- Verifica que todas las URLs (support, privacy, marketing) funcionen
- Asegúrate de que la Privacy Policy esté accesible

## Recursos

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Guía de Expo Submit](https://docs.expo.dev/submit/ios/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)

## Próximos Pasos Después de Publicar

1. **Monitorea reseñas**: Responde a los usuarios
2. **Analiza métricas**: Usa App Store Connect Analytics
3. **Planea actualizaciones**: Mantén la app actualizada
4. **Marketing**: Promociona tu app
5. **Iteración**: Mejora basándote en feedback

¡Buena suerte con tu publicación!
