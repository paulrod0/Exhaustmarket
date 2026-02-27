# Conectar AutoMarket Mobile con Expo Go en iOS

## Estado Actual
✅ Expo corriendo en modo túnel
✅ Metro Bundler activo
✅ Base de datos configurada

## URL de Conexión

**Usa esta URL en Expo Go:**
```
exp://automarket-8081.exp.direct
```

## Pasos para conectar desde iPhone/iPad

### 1. Descarga Expo Go
- Abre el **App Store** en tu iPhone/iPad
- Busca **"Expo Go"**
- Instala la app (es gratuita)

### 2. Conecta con la app

1. Abre **Expo Go**
2. En la pantalla principal, busca **"Enter URL manually"** (abajo)
3. Escribe exactamente:
   ```
   exp://automarket-8081.exp.direct
   ```
4. Toca **"Connect"**

### 3. Espera la carga
- La primera vez puede tardar 1-2 minutos
- Verás una pantalla de "Building JavaScript bundle"
- Luego aparecerá la app

## Qué deberías ver

Una vez conectado verás:
1. **Pantalla principal (Home)** con:
   - Logo de AutoMarket
   - Botones de "Iniciar Sesión" y "Registrarse"
2. Puedes navegar por la app

## Credenciales de prueba

Para probar el login:
```
Email: test@example.com
Password: test123456
```

## Pantallas disponibles

Después de iniciar sesión verás tabs en la parte inferior:
- **Inicio**: Dashboard principal
- **Marketplace**: Ver productos
- **Presupuestos**: Cotizaciones
- **Manuales**: Documentos
- **Diseños 3D**: Solo para usuarios profesionales/premium
- **Perfil**: Tu perfil de usuario

## Problemas comunes y soluciones

### "Unable to connect to Metro"

**Causa**: La URL está incorrecta o el servidor no está corriendo

**Solución**:
1. Verifica que pusiste exactamente: `exp://automarket-8081.exp.direct`
2. Verifica que el servidor está corriendo:
   ```bash
   cd mobile
   ./get-url.sh
   ```
3. Si no está corriendo, inicia Expo:
   ```bash
   node_modules/.bin/expo start --tunnel
   ```

### "Network request failed"

**Causa**: Problema de conectividad

**Solución**:
1. Verifica tu conexión a internet (WiFi o datos móviles)
2. Cierra completamente Expo Go (desliza hacia arriba en el app switcher)
3. Vuelve a abrir Expo Go
4. Intenta conectar de nuevo

### "Something went wrong"

**Causa**: Error en la carga de la app

**Solución**:
1. **Sacude tu iPhone/iPad** para abrir el menú de desarrollo
2. Toca **"Reload"**
3. Si el problema persiste:
   - Cierra Expo Go completamente
   - Vuelve a abrirlo
   - Reconecta con la URL

### "Cannot connect to Supabase" o errores de base de datos

**Causa**: Variables de entorno no cargadas

**Solución**:
1. Verifica que el archivo `.env` existe en `mobile/`
2. Reinicia el servidor de Expo:
   ```bash
   # Detener Expo
   pkill -f "expo start"

   # Iniciar de nuevo
   cd mobile
   node_modules/.bin/expo start --tunnel
   ```

### La app se queda en pantalla blanca

**Causa**: Error de JavaScript no manejado

**Solución**:
1. **Sacude el dispositivo**
2. Toca **"Debug Remote JS"**
3. Verás los errores en la terminal donde corre Expo
4. O simplemente toca **"Reload"**

### Tarda mucho en cargar

**Causa**: Primera carga siempre es lenta

**Solución**:
- **Primera vez**: Puede tardar 1-3 minutos (normal)
- **Cargas siguientes**: Deberían ser más rápidas (30-60 segundos)
- Si tarda más de 5 minutos:
  1. Cierra Expo Go
  2. Reinicia el servidor de Expo
  3. Vuelve a conectar

## Modo Desarrollo

Mientras usas la app:

### Abrir menú de desarrollo
**Sacude el dispositivo** (literalmente agítalo)

### Opciones del menú:
- **Reload**: Recarga la app
- **Debug Remote JS**: Ver errores en la terminal
- **Toggle Performance Monitor**: Monitor de rendimiento
- **Toggle Inspector**: Inspeccionar elementos

## Hot Reload (Recarga automática)

La app se recarga automáticamente cuando hay cambios:
- **Fast Refresh**: Mantiene el estado de la app
- **Full Reload**: Si cambia algo estructural

Si los cambios no aparecen:
1. Sacude el dispositivo
2. Toca **"Reload"**

## Ver logs en tiempo real

En la terminal donde corre Expo:
```bash
# Ver todos los logs
tail -f /tmp/expo-full.log

# Ver solo errores
tail -f /tmp/expo-full.log | grep -i error
```

## Verificar estado del servidor

Ejecuta este script para ver si todo está corriendo:
```bash
cd mobile
./get-url.sh
```

Te mostrará:
- ✅ Si Expo está corriendo
- 📱 La URL exacta para conectar
- 📝 Instrucciones de conexión

## Reiniciar desde cero

Si nada funciona:

```bash
# 1. Detener Expo
pkill -f "expo start"

# 2. Limpiar cache
cd mobile
rm -rf .expo
rm -rf node_modules/.cache

# 3. Reiniciar Expo
node_modules/.bin/expo start --tunnel --clear
```

## Cambiar entre app simple y completa

### Usar app simple (solo para probar conexión):
```bash
cd mobile
cp App.simple-test.tsx App.tsx
```

### Usar app completa (la app real):
```bash
cd mobile
cp App.full.tsx App.tsx
```

Después de cambiar, el servidor recargará automáticamente.

## Probar app en versión simple

Si tienes problemas con la app completa, prueba la versión simple:

```bash
cd mobile
mv App.tsx App.backup.tsx
mv App.simple-test.tsx App.tsx
```

Esto cargará una versión minimalista que solo muestra texto.
Si esta versión funciona, el problema está en el código de la app completa.

Para volver a la versión completa:
```bash
mv App.backup.tsx App.tsx
```

## Estructura de la app

```
mobile/
├── App.tsx                    # App principal
├── App.simple-test.tsx        # Versión simple para pruebas
├── .env                       # Variables de entorno (Supabase)
├── get-url.sh                 # Script para obtener URL
├── src/
│   ├── screens/              # Pantallas de la app
│   ├── stores/               # Estado global (Zustand)
│   └── lib/                  # Utilidades (Supabase)
└── .expo/                    # Config de Expo (generado)
```

## Información técnica

- **Framework**: React Native con Expo
- **Navegación**: React Navigation
- **Estado**: Zustand
- **Backend**: Supabase
- **Túnel**: Expo Tunnel (ngrok)
- **Puerto**: 8081 (Metro Bundler)

## Comandos útiles

```bash
# Obtener URL de conexión
cd mobile && ./get-url.sh

# Iniciar Expo con túnel
node_modules/.bin/expo start --tunnel

# Iniciar con caché limpio
node_modules/.bin/expo start --tunnel --clear

# Ver logs
tail -f /tmp/expo-full.log

# Detener Expo
pkill -f "expo start"

# Verificar si está corriendo
ps aux | grep "expo start"
```

## Próximos pasos después de conectar

Una vez que la app funcione:

1. **Explora la interfaz** y todas las pantallas
2. **Prueba el login** con las credenciales de prueba
3. **Navega entre tabs** en la parte inferior
4. **Prueba las funcionalidades** básicas
5. **Reporta cualquier error** que encuentres

## Soporte

Si después de seguir todos estos pasos aún no funciona:

1. Ejecuta `./get-url.sh` y guarda la salida
2. Ejecuta `tail -100 /tmp/expo-full.log` y guarda los últimos logs
3. Describe exactamente qué error ves en el iPhone
4. Indica en qué paso te quedaste

---

**URL actual de conexión:**
```
exp://automarket-8081.exp.direct
```

**El servidor debe estar corriendo para que funcione!**
