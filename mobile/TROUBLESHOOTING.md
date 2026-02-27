# Solución de Problemas - App Móvil

## Problema: "Opening project..." se queda cargando y da error

### Posibles causas y soluciones:

### 1. Problema de Red / Conectividad

**Síntomas:**
- La app se queda en "Opening project..."
- Error 404 o timeout

**Solución:**

a) **Verifica que ambos dispositivos estén en la misma WiFi:**
```bash
# En tu computadora, verifica tu IP:
cd /tmp/cc-agent/63103182/project/mobile
node -e "console.log(require('os').networkInterfaces())"
```

b) **Usa la IP correcta:**
- Si tu IP local es diferente a `169.254.8.1`, usa esa IP
- La URL debe ser: `exp://TU_IP_LOCAL:8081`

### 2. Cache de Expo

**Solución:**
```bash
# En la carpeta mobile:
rm -rf .expo
rm -rf node_modules/.cache
npm start -- --clear
```

### 3. Puerto ocupado

**Solución:**
```bash
# Mata todos los procesos de Metro/Expo:
pkill -f metro
pkill -f expo
# Reinicia:
npm start
```

### 4. Problema con Supabase (más común)

Si la app se queda cargando, puede ser que no puede conectar con Supabase desde el móvil.

**Diagnóstico:**
- El servidor Metro está corriendo (puerto 8081)
- Pero la app no puede completar la inicialización

**Solución temporal - Modo sin conexión:**

Vamos a crear una versión simplificada que no requiere Supabase para probar la conexión:

```bash
# Crea un archivo de prueba
cd /tmp/cc-agent/63103182/project/mobile
cat > App.test.tsx << 'EOF'
import { View, Text } from 'react-native'

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <Text style={{ color: '#fff', fontSize: 24, marginBottom: 16 }}>
        ✅ App Conectada!
      </Text>
      <Text style={{ color: '#94a3b8', fontSize: 16 }}>
        La conexión Expo funciona correctamente
      </Text>
    </View>
  )
}
EOF

# Renombra los archivos para probar
mv App.tsx App.backup.tsx
mv App.test.tsx App.tsx

# Reinicia el servidor
pkill -f expo
npm start
```

Si esta versión simplificada funciona, el problema está en la configuración de Supabase.

### 5. Verificar que el servidor esté corriendo

```bash
# Debe mostrar: packager-status:running
curl http://localhost:8081/status
```

### 6. Logs en tiempo real

Para ver qué está pasando cuando intentas conectar:

```bash
# En la carpeta mobile:
npm start
# Deja esta terminal abierta y observa los mensajes cuando intentes conectarte desde el móvil
```

### 7. Reinicio completo

```bash
cd /tmp/cc-agent/63103182/project/mobile

# Limpieza completa
rm -rf node_modules
rm -rf .expo
npm cache clean --force

# Reinstalar
npm install

# Reiniciar servidor
npm start
```

## Verificación de URL

La URL debe verse así:
- ✅ `exp://192.168.1.100:8081` (IP local)
- ❌ `exp://169.254.8.1:8081` (puede no funcionar)
- ❌ URLs con ngrok (requieren cuenta de pago)

## Alternativas

Si nada funciona:

1. **Usa un emulador:**
   - Android Studio (Android)
   - Xcode Simulator (iOS/Mac)

2. **Expo Dev Client** en lugar de Expo Go

3. **LAN con IP estática** configurada en tu router
