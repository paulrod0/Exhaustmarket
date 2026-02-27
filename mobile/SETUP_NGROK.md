# Configuración de ngrok para Expo

## ¿Por qué ngrok?

Ngrok crea un túnel público que permite que tu dispositivo móvil se conecte a tu servidor Expo incluso si no están en la misma red WiFi.

## Paso 1: Crear cuenta de ngrok (GRATIS)

1. Ve a: https://dashboard.ngrok.com/signup
2. Regístrate con tu email o GitHub
3. Verifica tu email

## Paso 2: Obtener tu authtoken

1. Ve a: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copia tu authtoken (se ve así: `2a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u`)

## Paso 3: Configurar ngrok

Ejecuta este comando con TU token:

```bash
/tmp/ngrok authtoken TU_TOKEN_AQUI
```

Ejemplo:
```bash
/tmp/ngrok authtoken 2a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u
```

## Paso 4: Iniciar Expo con ngrok

```bash
cd /tmp/cc-agent/63103182/project/mobile
./start-with-ngrok.sh
```

Verás algo como:
```
✅ Túnel ngrok activo:
   https://abc123.ngrok.io

En Expo Go:
  Ingresa: exp://abc123.ngrok.io:8081
```

## Limitaciones del plan gratuito

- ✅ Túneles ilimitados
- ✅ Conexiones HTTP/HTTPS
- ⚠️ El túnel expira después de unas horas (necesitas reiniciarlo)
- ⚠️ La URL cambia cada vez que reinicias el túnel

## Alternativas si no quieres usar ngrok

1. **LAN (más simple):**
   - Ambos dispositivos en la misma WiFi
   - Usa: `npm start` y escanea el QR

2. **Emulador:**
   - Android Studio (Android)
   - Xcode Simulator (iOS/Mac)
   - No necesita configuración de red

3. **Expo Dev Client:**
   - Más estable que Expo Go
   - Requiere compilar la app

## Problemas comunes

### "Authentication failed"
- No configuraste tu authtoken
- Ejecuta: `/tmp/ngrok authtoken TU_TOKEN`

### "Session expired"
- El túnel gratuito expiró
- Reinicia: `./start-with-ngrok.sh`

### "Could not connect"
- Verifica que Expo esté corriendo
- Revisa los logs en la terminal

## Verificar que ngrok funciona

```bash
# Prueba el túnel
/tmp/ngrok http 8081

# En otra terminal, verifica:
curl http://localhost:4040/api/tunnels
```

Deberías ver una URL pública como `https://abc123.ngrok.io`
