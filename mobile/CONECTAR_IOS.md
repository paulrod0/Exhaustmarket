# Conectar desde iOS con Expo Go

## Estado Actual
✅ Expo corriendo con túnel
✅ Metro Bundler activo
✅ Túnel Expo: `https://automarket-anonymous-8081.exp.direct`

## Pasos para conectar desde iPhone/iPad

### 1. Instala Expo Go
Si no lo tienes, descárgalo desde el App Store:
- Busca "Expo Go" en el App Store
- Instala la aplicación gratuita

### 2. Conecta a la app

**Opción A: URL Manual (Recomendado para iOS)**

1. Abre **Expo Go** en tu iPhone/iPad
2. En la pantalla principal, busca la opción "**Enter URL manually**"
3. Ingresa exactamente esta URL:
   ```
   exp://automarket-anonymous-8081.exp.direct
   ```
4. Presiona **Connect**

**Opción B: Escanear código QR**

Si tienes acceso a una terminal con GUI, puedes generar un código QR escaneándolo con la cámara de tu iPhone.

## Verificación

Una vez conectado deberías ver:
1. **Splash screen** o pantalla de carga
2. La pantalla de **Login/Register** de la app
3. Puedes navegar entre las diferentes pantallas

## Probar la aplicación

La app tiene las siguientes pantallas:
- **Home**: Pantalla principal
- **Login**: Iniciar sesión
- **Register**: Crear cuenta
- **Dashboard**: Panel de usuario
- **Marketplace**: Ver productos
- **Quotes**: Cotizaciones
- **3D Design**: Diseño 3D
- **Manuals**: Manuales
- **Subscriptions**: Suscripciones
- **Profile**: Perfil de usuario

## Usuario de prueba

Para probar el login, usa:
- **Email**: `test@example.com`
- **Password**: `test123456`

## Troubleshooting

### "Unable to connect to Metro"
- Verifica que pusiste la URL correcta
- Asegúrate de incluir `exp://` al inicio
- Verifica tu conexión a internet

### "Network request failed"
- El túnel de Expo puede tardar un momento en conectarse
- Cierra y vuelve a abrir Expo Go
- Intenta ingresar la URL nuevamente

### "Something went wrong"
- Refresca la app sacudiendo el dispositivo
- Selecciona "Reload" del menú de desarrollo
- O cierra y vuelve a abrir Expo Go

### Errores en la app
- Sacude el dispositivo para abrir el menú de desarrollo
- Selecciona "Debug Remote JS" para ver errores
- Los logs aparecerán en la terminal donde corriste Expo

## Modo desarrollo en la app

Mientras usas la app en Expo Go:
- **Sacude el dispositivo** para abrir el menú de desarrollo
- **Recarga la app**: Presiona "Reload"
- **Debug**: Activa "Debug Remote JS"
- **Performance**: Puedes ver el monitor de performance

## Hot Reload

La app tiene **hot reload** activado:
- Los cambios en el código se reflejan automáticamente
- No necesitas recargar manualmente (en la mayoría de casos)
- Si algo no se actualiza, sacude y presiona "Reload"

## Logs en tiempo real

Para ver qué está pasando en la app desde la terminal:
```bash
tail -f /tmp/expo-ios.log
```

## Cerrar la app

Cuando termines:
1. Simplemente cierra Expo Go en tu iPhone
2. El servidor seguirá corriendo para reconexiones

## Reiniciar el servidor

Si necesitas reiniciar Expo:
```bash
pkill -f "expo start"
cd /tmp/cc-agent/63103182/project/mobile
npx expo start --tunnel
```

---

**URL de conexión actual:**
```
exp://automarket-anonymous-8081.exp.direct
```

**Válida hasta:** El túnel estará activo mientras el servidor esté corriendo.
