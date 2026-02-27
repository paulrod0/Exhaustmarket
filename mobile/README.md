# AutoMarket - App iOS/Android

Aplicación móvil nativa para iOS y Android del marketplace automotriz, construida con React Native y Expo.

## 🚀 Guías Rápidas

### ⚡ [**EMPIEZA AQUÍ**](./EMPEZAR_AQUI.md) ⚡

**¿Necesitas ejecutar la app desde tu Mac para mostrarla a un cliente?**
- 📋 [**Índice de Guías**](./GUIAS_INDEX.md) - Todas las guías disponibles
- 📱 [**Quick Start desde Mac**](./QUICK_START_MAC.md) - 3 pasos para iniciar
- 👥 [**Compartir con Cliente**](./COMPARTIR_CON_CLIENTE.md) - Guía completa para demos
- 📖 [**Despliegue desde Mac**](./DESPLEGAR_DESDE_MAC.md) - Todo lo que necesitas saber
- 🔗 [**Conectar con Expo Go**](./CONECTAR_EXPO_GO.md) - Instrucciones detalladas para iOS/Android
- ✅ [**Verificar configuración**](./check-setup.sh) - Script de verificación

### Scripts útiles

```bash
# Verificar que todo está configurado
./check-setup.sh

# Iniciar para compartir con cliente (acceso público)
./start-for-client.sh

# Obtener URL de conexión
./get-url.sh
```

---

## Características

- Autenticación segura con email y contraseña
- Navegación nativa con React Navigation
- Soporte para múltiples tipos de usuario (Estándar, Profesional, Taller, Premium)
- Marketplace de productos y servicios
- Sistema de presupuestos
- Gestión de perfil de usuario
- Planes de suscripción
- Acceso a diseños 3D (para usuarios Professional/Premium)
- Diseño oscuro (dark mode) optimizado para móviles

## Requisitos Previos

- Node.js 18 o superior
- npm o yarn
- Para iOS: macOS con Xcode instalado
- Para Android: Android Studio con SDK configurado
- Expo Go app (para desarrollo rápido)

## Instalación

1. **Navegar a la carpeta mobile**
   ```bash
   cd mobile
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**

   Las variables ya están configuradas en `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://lvakuprxeeobknnjdkzk.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   ```

## Desarrollo

### Iniciar el servidor de desarrollo

```bash
npm start
```

Esto abrirá Expo Dev Tools en tu navegador. Desde ahí puedes:

### Ejecutar en iOS

**Opción 1: Usando Expo Go (Recomendado para desarrollo)**
1. Instala la app Expo Go desde la App Store en tu iPhone
2. Escanea el código QR que aparece en la terminal
3. La app se cargará automáticamente en tu dispositivo

**Opción 2: Usando el simulador de iOS**
```bash
npm run ios
```
Nota: Requiere macOS con Xcode instalado

### Ejecutar en Android

**Opción 1: Usando Expo Go**
1. Instala la app Expo Go desde Google Play en tu dispositivo Android
2. Escanea el código QR que aparece en la terminal
3. La app se cargará automáticamente

**Opción 2: Usando el emulador de Android**
```bash
npm run android
```
Nota: Requiere Android Studio con un emulador configurado

## Estructura del Proyecto

```
mobile/
├── App.tsx                      # Punto de entrada principal
├── app.json                     # Configuración de Expo
├── package.json                 # Dependencias
├── tsconfig.json               # Configuración de TypeScript
├── .env                        # Variables de entorno
└── src/
    ├── lib/
    │   └── supabase.ts         # Cliente de Supabase
    ├── stores/
    │   └── authStore.ts        # Estado global de autenticación
    └── screens/
        ├── HomeScreen.tsx      # Pantalla de inicio
        ├── LoginScreen.tsx     # Iniciar sesión
        ├── RegisterScreen.tsx  # Registro
        ├── DashboardScreen.tsx # Panel principal
        ├── MarketplaceScreen.tsx # Marketplace
        ├── QuotesScreen.tsx    # Presupuestos
        ├── ProfileScreen.tsx   # Perfil de usuario
        ├── SubscriptionsScreen.tsx # Suscripciones
        └── Design3DScreen.tsx  # Diseños 3D
```

## Compilación para Producción

### Compilar para iOS (requiere cuenta de Apple Developer)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Iniciar sesión en Expo
eas login

# Configurar el proyecto
eas build:configure

# Compilar para iOS
eas build --platform ios
```

### Compilar para Android

```bash
# Compilar para Android
eas build --platform android

# Para generar un APK
eas build --platform android --profile preview
```

### Publicar actualizaciones OTA (Over The Air)

```bash
# Publicar actualizaciones sin recompilar
eas update --branch production
```

## Tecnologías Utilizadas

- **React Native** - Framework para apps nativas
- **Expo** - Plataforma y herramientas para React Native
- **TypeScript** - Tipado estático
- **React Navigation** - Navegación nativa
- **Supabase** - Backend y base de datos
- **Zustand** - Gestión de estado
- **AsyncStorage** - Almacenamiento local persistente

## Componentes Clave

### Autenticación
- Login y registro con email/password
- Persistencia de sesión con AsyncStorage
- Manejo automático de tokens
- Recuperación de sesión al abrir la app

### Navegación
- Stack Navigation para flujo de pantallas
- Tab Navigation para navegación principal
- Protección de rutas según autenticación
- Deep linking configurado

### Supabase
- Cliente configurado para React Native
- Row Level Security (RLS) habilitado
- Consultas en tiempo real (opcional)
- Manejo de errores robusto

## Características de iOS

### Optimizaciones iOS
- Safe Area Context para iPhone con notch
- Teclado adaptativo con KeyboardAvoidingView
- Gestos nativos de iOS
- Compatibilidad con Dark Mode
- StatusBar configurada para iOS

### Permisos iOS (Configurar en app.json si es necesario)
- Cámara (para subir fotos de documentos)
- Galería de fotos
- Notificaciones push

## Características de Android

### Optimizaciones Android
- Back button handling nativo
- Splash screen adaptativo
- Compatibilidad con diferentes tamaños de pantalla
- Material Design components

## Solución de Problemas

### Error: "Unable to resolve module"
```bash
# Limpiar caché
npm start -- --clear

# O reinstalar dependencias
rm -rf node_modules
npm install
```

### Error en iOS: "Unable to boot simulator"
```bash
# Reiniciar simuladores
xcrun simctl shutdown all
xcrun simctl erase all
```

### Error en Android: "SDK location not found"
Configura la variable de entorno `ANDROID_HOME`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
```

## Testing

### Testing en dispositivo físico
1. Descarga Expo Go en tu dispositivo
2. Asegúrate de estar en la misma red WiFi
3. Escanea el código QR
4. La app se recargará automáticamente al hacer cambios

### Testing de producción
Usa TestFlight (iOS) o Google Play Internal Testing (Android) para probar builds de producción antes de publicar.

## Publicación

### App Store (iOS)
1. Configura tu cuenta de Apple Developer
2. Crea un App ID y provisioning profiles
3. Compila con `eas build --platform ios`
4. Sube a App Store Connect
5. Envía para revisión

### Google Play (Android)
1. Crea una cuenta de Google Play Developer
2. Configura el bundle identifier
3. Compila con `eas build --platform android`
4. Sube el AAB a Google Play Console
5. Publica en Play Store

## Próximas Funcionalidades

- [ ] Notificaciones push
- [ ] Modo offline con sincronización
- [ ] Caché de imágenes optimizado
- [ ] Visor 3D nativo
- [ ] Subida de fotos para documentos
- [ ] Compartir diseños con otros usuarios
- [ ] Chat en tiempo real
- [ ] Pagos in-app con Stripe

## Recursos

- [Documentación de Expo](https://docs.expo.dev/)
- [Documentación de React Native](https://reactnative.dev/)
- [Documentación de React Navigation](https://reactnavigation.org/)
- [Documentación de Supabase](https://supabase.com/docs)
- [Guías de publicación de Expo](https://docs.expo.dev/submit/introduction/)

## Soporte

Para cualquier problema o pregunta:
- Revisa la documentación
- Consulta los logs en la terminal
- Usa Expo Diagnostics: `expo doctor`

## Licencia

Todos los derechos reservados © 2026 AutoMarket
