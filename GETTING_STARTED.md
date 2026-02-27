# Comenzar con AutoMarket

Este proyecto incluye dos versiones de la aplicación: Web y Móvil (iOS/Android).

## 🌐 Aplicación Web

### Características
- Acceso desde cualquier navegador
- Interfaz completa y optimizada para desktop
- Desarrollo y despliegue más rápido
- No requiere instalación

### Cómo empezar
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# La app estará disponible en http://localhost:5173
```

### Stack Tecnológico
- React 18 + TypeScript
- Vite
- Supabase
- React Router
- Zustand

Consulta el [README.md](README.md) principal para más detalles.

---

## 📱 Aplicación Móvil (iOS/Android)

### Características
- Aplicación nativa para iOS y Android
- Experiencia móvil optimizada
- Notificaciones push (futuro)
- Funcionalidades offline (futuro)
- Gestos nativos
- Rendimiento optimizado

### Cómo empezar
```bash
# Navegar a la carpeta mobile
cd mobile

# Instalar dependencias
npm install

# Iniciar con Expo
npm start

# Escanea el código QR con Expo Go en tu dispositivo
```

### Stack Tecnológico
- React Native
- Expo
- TypeScript
- React Navigation
- Supabase
- Zustand

Consulta [mobile/README.md](mobile/README.md) para instrucciones detalladas.

### Inicio Rápido iOS
Para empezar rápidamente en iOS, consulta [mobile/QUICK_START.md](mobile/QUICK_START.md)

### Publicación en App Store
Para publicar en la App Store, consulta [mobile/IOS_DEPLOYMENT.md](mobile/IOS_DEPLOYMENT.md)

---

## 🤔 ¿Cuál versión elegir?

### Elige la Web App si:
- ✅ Quieres desarrollo y despliegue más rápido
- ✅ Necesitas acceso desde cualquier dispositivo
- ✅ Prefieres no pasar por el proceso de App Store
- ✅ Quieres evitar costos de Apple Developer ($99/año)
- ✅ Necesitas actualizaciones instantáneas

### Elige la App Móvil si:
- ✅ Quieres presencia en App Store y Google Play
- ✅ Necesitas funcionalidades nativas (notificaciones push, offline)
- ✅ Buscas mejor rendimiento en móviles
- ✅ Quieres aprovechar gestos y patrones nativos
- ✅ Tu audiencia principal usa móviles

### ¿Por qué no ambas?
Puedes mantener ambas versiones:
- Misma lógica de negocio (Supabase backend)
- Código compartible en stores y utilidades
- Web para usuarios desktop
- Móvil para usuarios que prefieren apps nativas

---

## 🔧 Configuración Inicial (Ambas Versiones)

Ambas versiones comparten la misma base de datos Supabase.

### 1. Base de Datos
La base de datos ya está configurada y las migraciones aplicadas. Incluye:
- ✅ Tablas de usuarios y perfiles
- ✅ Sistema de suscripciones
- ✅ Marketplace (productos y servicios)
- ✅ Sistema de presupuestos
- ✅ Diseños 3D
- ✅ Transacciones y escrow
- ✅ Documentos de verificación

### 2. Variables de Entorno
Ambas apps ya tienen las variables configuradas en sus respectivos archivos `.env`

**Web**: `.env`
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_SUPABASE_ANON_KEY=...
```

**Mobile**: `mobile/.env`
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Autenticación
Ambas versiones usan Supabase Auth con:
- Email/Password
- Persistencia de sesión
- Row Level Security (RLS)

---

## 📚 Estructura del Proyecto

```
automarket/
├── src/                      # Web App
│   ├── components/          # Componentes React
│   ├── pages/               # Páginas/Rutas
│   ├── stores/              # Estado global (Zustand)
│   ├── lib/                 # Utilidades
│   └── types/               # Tipos TypeScript
├── mobile/                   # Mobile App
│   ├── src/
│   │   ├── screens/         # Pantallas React Native
│   │   ├── stores/          # Estado global
│   │   └── lib/             # Utilidades
│   ├── App.tsx              # Entrada principal
│   └── app.json             # Configuración Expo
├── supabase/
│   └── migrations/          # Migraciones de BD
├── README.md                # Documentación web
├── PAYMENTS.md              # Info de pagos
└── GETTING_STARTED.md       # Este archivo
```

---

## 🚀 Desarrollo

### Desarrollo Web
```bash
# Terminal 1: Web app
npm run dev
```

### Desarrollo Móvil
```bash
# Terminal 2: Mobile app
cd mobile
npm start
```

Puedes ejecutar ambas simultáneamente ya que usan la misma base de datos.

---

## 📦 Compilación

### Web
```bash
npm run build
# Output: dist/
```

### iOS/Android
```bash
cd mobile
eas build --platform ios
eas build --platform android
```

---

## 🎯 Próximos Pasos

### Para Desarrollo
1. ✅ Explora la aplicación web
2. ✅ Prueba la aplicación móvil
3. ⬜ Configura Stripe para pagos
4. ⬜ Personaliza diseño y marca
5. ⬜ Añade funcionalidades adicionales

### Para Producción
1. ⬜ Configura dominio personalizado (web)
2. ⬜ Configura Apple Developer (iOS)
3. ⬜ Configura Google Play Developer (Android)
4. ⬜ Implementa analytics
5. ⬜ Configura monitoring y logs
6. ⬜ Añade tests automatizados

---

## 🔐 Seguridad

Ambas versiones implementan:
- ✅ Row Level Security (RLS)
- ✅ Autenticación segura
- ✅ Validación de datos
- ✅ Protección contra SQL injection
- ✅ HTTPS obligatorio
- ⬜ Rate limiting (pendiente)
- ⬜ 2FA (pendiente)

---

## 💳 Pagos (Stripe)

Para configurar pagos, necesitas:
1. Crear cuenta en Stripe
2. Obtener API keys
3. Configurar webhooks
4. Ver [PAYMENTS.md](PAYMENTS.md) para detalles

Instrucciones: https://bolt.new/setup/stripe

---

## 📖 Documentación Adicional

- [README.md](README.md) - Documentación principal web
- [mobile/README.md](mobile/README.md) - Documentación móvil
- [mobile/QUICK_START.md](mobile/QUICK_START.md) - Inicio rápido iOS
- [mobile/IOS_DEPLOYMENT.md](mobile/IOS_DEPLOYMENT.md) - Publicación iOS
- [PAYMENTS.md](PAYMENTS.md) - Sistema de pagos

---

## 🆘 Soporte

### Problemas Comunes

**Web: Puerto 5173 ocupado**
```bash
# Cambiar puerto en vite.config.ts
server: { port: 3000 }
```

**Mobile: No se conecta a Supabase**
- Verifica variables de entorno en `.env`
- Asegúrate de estar en la misma red WiFi
- Reinicia Expo con `npm start -- --clear`

**Base de Datos: Error de permisos**
- Verifica que RLS esté configurado
- Revisa las políticas de seguridad
- Comprueba que el usuario esté autenticado

### Recursos
- [Documentación Supabase](https://supabase.com/docs)
- [Documentación React Native](https://reactnative.dev/)
- [Documentación Expo](https://docs.expo.dev/)
- [Documentación Vite](https://vitejs.dev/)

---

## 📝 Licencia

Todos los derechos reservados © 2026 AutoMarket

---

¡Disfruta construyendo tu marketplace automotriz! 🚗
