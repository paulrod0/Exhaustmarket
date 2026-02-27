# Cómo Conectar tu iPhone a la App Móvil

## Estado del Servidor

✅ **El servidor Expo está corriendo correctamente**

## URL de Conexión

**URL para conectar:**
```
exp://automarket-anonymous-8081.exp.direct
```

## Pasos para Conectar desde iPhone

### 1. Instalar Expo Go

1. Abre el **App Store** en tu iPhone
2. Busca "**Expo Go**"
3. Descarga e instala la aplicación (es gratuita)

### 2. Conectar a la App

Tienes dos opciones:

#### Opción A: Ingresar URL Manualmente (Recomendado)

1. Abre la app **Expo Go**
2. En la pantalla principal, busca y toca **"Enter URL manually"**
3. Copia y pega esta URL:
   ```
   exp://automarket-anonymous-8081.exp.direct
   ```
4. Presiona **"Connect"**

#### Opción B: Escanear Código QR

1. En tu computadora, ejecuta:
   ```bash
   cd /tmp/cc-agent/63103182/project/mobile
   npx qrcode-terminal "exp://automarket-anonymous-8081.exp.direct"
   ```
2. Abre **Expo Go** en tu iPhone
3. Toca **"Scan QR Code"**
4. Escanea el código que aparece en la terminal

## Credenciales de Prueba

Una vez que la app se cargue en tu iPhone, usa estas credenciales:

- **Email:** test@test.com
- **Contraseña:** test123456

## Funcionalidades Disponibles

Con este usuario de prueba tendrás acceso a:

- ✅ Dashboard
- ✅ Marketplace
- ✅ Presupuestos
- ✅ **Manuales** (Nueva sección)
- ✅ Diseños 3D
- ✅ Perfil y configuración

## Verificar Estado del Servidor

Para verificar que el servidor sigue corriendo:

```bash
# Ver procesos activos
ps aux | grep "expo start" | grep -v grep

# Ver logs en tiempo real
tail -f /tmp/expo-tunnel.log

# Ver estado del túnel
cat /tmp/cc-agent/63103182/project/mobile/.expo/settings.json
```

## Si el Servidor se Detiene

Si por alguna razón el servidor se detiene, reinícialo con:

```bash
cd /tmp/cc-agent/63103182/project/mobile
npm run start:tunnel > /tmp/expo-tunnel.log 2>&1 &
```

Espera 60-90 segundos para que el túnel se establezca completamente.

## Problemas Comunes

### "No se puede conectar"

1. Verifica que tu iPhone tenga conexión a Internet
2. Asegúrate de haber copiado la URL completa
3. Intenta cerrar y volver a abrir Expo Go

### "El servidor no responde"

1. Verifica que el proceso de Expo esté corriendo (comando arriba)
2. Revisa los logs: `tail -f /tmp/expo-tunnel.log`
3. Reinicia el servidor si es necesario

### "Error al cargar la app"

1. El túnel puede tardar 60-90 segundos en establecerse
2. Espera un poco más e intenta de nuevo
3. Verifica los logs para errores específicos

## Mantener el Servidor Activo

El servidor se mantendrá activo en segundo plano. Para detenerlo manualmente:

```bash
# Detener todos los procesos de Expo
pkill -f "expo start"
```

## Agregar Manuales

Para que aparezcan manuales en la sección, necesitas:

1. Subir PDFs al bucket `manuals` en Supabase Storage
2. Agregar registros en la tabla `manuals` con la información

El usuario de prueba tiene suscripción **Premium** y puede ver todos los manuales.

---

**Nota:** La URL del túnel es pública pero única para esta sesión. Permanecerá válida mientras el servidor esté corriendo.
