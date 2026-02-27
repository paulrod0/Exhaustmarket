# Desplegar AutoMarket Mobile desde tu Mac

## Guía completa para ejecutar la app en tu móvil y compartirla con clientes

Esta guía te permitirá ejecutar la app desde tu Mac y que sea accesible desde cualquier lugar del mundo (no solo tu red local).

---

## 📋 Requisitos previos

### En tu Mac:
- **Node.js** (versión 18 o superior)
- **npm** (viene con Node.js)
- **Git** (para clonar el proyecto)

### En el móvil (tuyo o del cliente):
- **Expo Go** (descarga gratis desde App Store/Play Store)
- Conexión a internet (WiFi o datos móviles)

---

## 🚀 Paso 1: Preparar el proyecto en tu Mac

### 1.1 Descargar el proyecto

Si tienes el proyecto en Git:
```bash
git clone [URL_DEL_REPOSITORIO]
cd [NOMBRE_DEL_PROYECTO]
```

O simplemente asegúrate de tener la carpeta del proyecto en tu Mac.

### 1.2 Verificar Node.js

```bash
node --version
# Debe mostrar v18.x.x o superior
```

Si no tienes Node.js:
1. Ve a https://nodejs.org
2. Descarga la versión LTS
3. Instala y reinicia la terminal

---

## 🔧 Paso 2: Instalar dependencias

### 2.1 Instalar dependencias del proyecto web (opcional)

```bash
# En la raíz del proyecto
npm install
```

### 2.2 Instalar dependencias de la app móvil

```bash
cd mobile
npm install
```

Esto tomará unos minutos. Instalará:
- Expo SDK
- React Native
- React Navigation
- Supabase client
- Todas las dependencias necesarias

---

## 🔐 Paso 3: Configurar variables de entorno

El archivo `.env` ya existe en `mobile/.env` con las credenciales de Supabase:

```bash
# Verificar que existe
cat mobile/.env
```

Deberías ver:
```
EXPO_PUBLIC_SUPABASE_URL=https://lvakuprxeeobknnjdkzk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Si no existe**, créalo con estos valores.

---

## 🌐 Paso 4: Iniciar Expo con acceso público

### 4.1 Opción A: Usando el túnel integrado de Expo (RECOMENDADO)

Desde la carpeta `mobile/`:

```bash
npm run start:tunnel
```

O directamente:

```bash
npx expo start --tunnel
```

**Ventajas:**
- ✅ Accesible desde cualquier lugar del mundo
- ✅ No requiere configuración adicional
- ✅ Funciona detrás de firewalls/routers
- ✅ Perfecto para mostrar a clientes

### 4.2 Qué verás en la terminal

Después de unos segundos verás algo como:

```
Starting Metro Bundler
Tunnel connected.
Tunnel ready.

› Metro waiting on http://localhost:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Using Expo Go
› Press s │ switch to development build
› Press r │ reload app
› Press m │ toggle menu
```

**Importante:** Busca la URL que comienza con `exp://`

---

## 📱 Paso 5: Obtener la URL de conexión

### 5.1 Usando el script incluido

```bash
# Desde mobile/
chmod +x get-url.sh
./get-url.sh
```

Te mostrará:
```
📱 URL para Expo Go:

  exp://automarket-8081.exp.direct
```

### 5.2 Manualmente

La URL será algo como:
```
exp://[NOMBRE_UNICO]-8081.exp.direct
```

Donde `[NOMBRE_UNICO]` es el identificador de tu túnel (en este caso "automarket").

---

## 📲 Paso 6: Conectar desde tu móvil

### 6.1 Instalar Expo Go

1. Abre **App Store** (iOS) o **Play Store** (Android)
2. Busca **"Expo Go"**
3. Instala (es gratis)

### 6.2 Conectar con la URL

**Opción A: Escanear QR** (más fácil)
1. Abre Expo Go
2. Toca "Scan QR code"
3. Escanea el QR que aparece en tu terminal

**Opción B: Ingresar URL manualmente** (más confiable)
1. Abre Expo Go
2. Toca "Enter URL manually"
3. Pega: `exp://automarket-8081.exp.direct`
4. Toca "Connect"

### 6.3 Esperar la carga

- Primera vez: 1-3 minutos (descarga el bundle de JavaScript)
- Verás "Building JavaScript bundle..."
- Luego aparecerá la app

---

## 👥 Paso 7: Compartir con tu cliente

### 7.1 Obtén la URL exacta

```bash
cd mobile
./get-url.sh
```

Copia la URL que aparece, por ejemplo:
```
exp://automarket-8081.exp.direct
```

### 7.2 Envía instrucciones al cliente

Puedes enviarle este mensaje:

---

**Mensaje para el cliente:**

> Hola! Para ver la app AutoMarket en tu móvil:
>
> **1. Instala Expo Go:**
> - iOS: https://apps.apple.com/app/expo-go/id982107779
> - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
>
> **2. Abre Expo Go y conéctate:**
> - Toca "Enter URL manually"
> - Pega esta URL: `exp://automarket-8081.exp.direct`
> - Toca "Connect"
>
> **3. Espera 1-2 minutos** mientras carga la primera vez
>
> **Credenciales para probar:**
> - Email: test@example.com
> - Password: test123456
>
> Cualquier problema, avísame!

---

### 7.3 Compartir por QR (alternativa)

Si tu cliente está contigo:
1. Muéstrale el QR en tu terminal
2. Que lo escanee con Expo Go
3. Listo!

---

## 🔍 Verificar que todo funciona

### Checklist antes de compartir:

```bash
# 1. Verificar que Expo está corriendo
ps aux | grep "expo start"
# Debe mostrar un proceso corriendo

# 2. Obtener URL
cd mobile && ./get-url.sh

# 3. Probar en tu propio móvil primero
# Sigue los pasos del Paso 6

# 4. Una vez que funcione en tu móvil, compartir con el cliente
```

---

## 🛠️ Comandos útiles

```bash
# Iniciar con túnel (acceso público)
npm run start:tunnel

# Iniciar limpiando caché (si hay problemas)
npx expo start --tunnel --clear

# Ver logs en tiempo real
# Los verás directamente en la terminal donde corrió expo start

# Detener Expo
# Presiona Ctrl+C en la terminal

# Verificar estado
cd mobile && ./get-url.sh

# Reiniciar desde cero
# Ctrl+C para detener
# Luego: npx expo start --tunnel --clear
```

---

## ⚠️ Problemas comunes

### "Cannot connect to Metro"

**Causa:** El servidor Expo no está corriendo en tu Mac

**Solución:**
```bash
cd mobile
npx expo start --tunnel
```

### "Network request failed" en el móvil

**Causa:** El cliente no tiene internet o la URL es incorrecta

**Solución:**
1. Verifica que la URL comience con `exp://`
2. Verifica conexión a internet del cliente
3. Pide al cliente que cierre y reabra Expo Go

### "Tunnel connection failed"

**Causa:** Firewall o problemas de red en tu Mac

**Solución:**
```bash
# Detener Expo (Ctrl+C)

# Intentar de nuevo con reset
npx expo start --tunnel --clear

# Si persiste, verifica firewall de macOS:
# System Settings > Network > Firewall
# Asegúrate que permite conexiones de entrada
```

### "Unable to resolve module"

**Causa:** Dependencias no instaladas correctamente

**Solución:**
```bash
cd mobile

# Limpiar e reinstalar
rm -rf node_modules
rm -rf .expo
npm install

# Reiniciar Expo
npx expo start --tunnel --clear
```

### La app muestra errores de Supabase

**Causa:** Variables de entorno no cargadas

**Solución:**
```bash
# Verificar .env
cat mobile/.env

# Debe mostrar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY

# Si no existe, créalo
echo 'EXPO_PUBLIC_SUPABASE_URL=https://lvakuprxeeobknnjdkzk.supabase.co' > mobile/.env
echo 'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YWt1cHJ4ZWVvYmtubmpka3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjcyNzgsImV4cCI6MjA4NTIwMzI3OH0.ZSUfPWFrGD7YgqxvfT0OygEuVKhTrzh_0zFRldhP86w' >> mobile/.env

# Reiniciar Expo
```

### El cliente ve pantalla blanca

**Solución:**
```bash
# En tu Mac, en la terminal de Expo, presiona:
r  # para reload

# O pide al cliente que:
# 1. Sacuda el dispositivo
# 2. Toque "Reload" en el menú que aparece
```

---

## 🎯 Flujo de trabajo recomendado

### Para desarrollo diario:

```bash
# 1. Abrir terminal en la carpeta del proyecto
cd /ruta/al/proyecto/mobile

# 2. Iniciar Expo
npm run start:tunnel

# 3. Conectar desde tu móvil para probar
# Usar Expo Go con la URL

# 4. Hacer cambios en el código
# Los cambios se recargarán automáticamente en el móvil

# 5. Cuando termines, Ctrl+C para detener
```

### Para demos con clientes:

```bash
# 1. Asegúrate que la app funciona bien
# Pruébala en tu móvil primero

# 2. Deja Expo corriendo en tu Mac
npm run start:tunnel

# 3. Obtén la URL
./get-url.sh

# 4. Envía la URL al cliente con las instrucciones

# 5. Mantén tu Mac encendida mientras el cliente prueba
# (el túnel necesita estar activo)
```

---

## 📊 Información técnica

### ¿Por qué usar túnel?

- **LAN (red local):** Solo funciona si tu móvil y Mac están en la misma WiFi
- **Tunnel:** Funciona desde cualquier lugar del mundo
  - Usa ngrok internamente
  - Perfecto para clientes remotos
  - Funciona detrás de firewalls

### ¿Es seguro el túnel?

- ✅ Sí, Expo usa conexiones encriptadas
- ✅ Solo quien tiene la URL puede acceder
- ✅ La URL es única y temporal
- ✅ El túnel se cierra cuando detienes Expo

### ¿Cuánto dura el túnel?

- Mientras tu Mac tenga Expo corriendo
- Si cierras Expo (Ctrl+C), el túnel se cierra
- Si reinicias Expo, la URL sigue siendo la misma (usa el identificador "automarket")

---

## 🚀 Alternativas avanzadas

### Opción B: Usar ngrok directamente

Si el túnel de Expo no funciona:

```bash
# 1. Instalar ngrok
brew install ngrok

# 2. Crear túnel manualmente
ngrok http 8081

# 3. Usar la URL que te da ngrok
# Pero es más complejo, no recomendado para principiantes
```

### Opción C: Desplegar en Expo EAS

Para producción (no para demos):

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Crear cuenta en Expo
eas login

# 3. Configurar proyecto
eas build:configure

# 4. Hacer build para App Store/Play Store
eas build --platform ios
```

---

## 📝 Checklist final

Antes de compartir con el cliente:

- [ ] Node.js instalado en tu Mac
- [ ] Proyecto clonado/descargado
- [ ] `npm install` ejecutado en `mobile/`
- [ ] Archivo `.env` configurado
- [ ] Expo corriendo: `npm run start:tunnel`
- [ ] URL obtenida: `./get-url.sh`
- [ ] Probado en tu propio móvil primero
- [ ] Instrucciones enviadas al cliente
- [ ] Mac encendida durante la demo

---

## 🆘 Necesitas ayuda?

Si algo no funciona:

1. **Revisa los logs en la terminal** donde corre Expo
2. **Ejecuta `./get-url.sh`** para verificar estado
3. **Prueba primero en tu móvil** antes de compartir
4. **Lee la sección de problemas comunes** arriba
5. **Reinicia Expo con caché limpio:** `npx expo start --tunnel --clear`

---

## 🎉 ¡Listo!

Ahora tu app móvil está:
- ✅ Corriendo desde tu Mac
- ✅ Accesible desde cualquier lugar del mundo
- ✅ Lista para compartir con clientes
- ✅ Con hot reload para desarrollo

**URL actual:** `exp://automarket-8081.exp.direct`

**Recuerda:** Tu Mac debe estar encendida con Expo corriendo mientras alguien use la app.
