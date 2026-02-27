# CONEXIÓN ACTIVA - Expo con ngrok

## Estado
✅ Expo está corriendo
✅ Túnel ngrok activo
✅ Metro Bundler: http://localhost:8081

## Información de conexión

**URL del túnel ngrok:**
```
https://clasping-adularescent-antonia.ngrok-free.dev
```

**Host para Expo:**
```
clasping-adularescent-antonia.ngrok-free.dev
```

## Cómo conectar desde Expo Go

### Opción 1: URL Manual (RECOMENDADO)

1. Abre **Expo Go** en tu móvil
2. Ve a la pestaña de conexión manual
3. Ingresa esta URL:
   ```
   exp://clasping-adularescent-antonia.ngrok-free.dev:8081
   ```
4. Presiona "Connect"

### Opción 2: Desde terminal (si tienes la app de Expo Go instalada)

Si estás conectado a través de USB o la misma red, puedes usar:

```bash
npx expo start --tunnel
```

## Verificar que funciona

1. El bundler debería empezar a cargar
2. Verás el progreso en la terminal
3. La app debería cargar en tu dispositivo

## Notas importantes

- El túnel ngrok es GRATUITO pero tiene limitaciones:
  - La URL expira después de unas horas
  - Si se cierra el túnel, necesitas reiniciarlo

- Si necesitas reiniciar:
  ```bash
  cd /tmp/cc-agent/63103182/project/mobile
  ./start-with-ngrok.sh
  ```

## Procesos corriendo

- ngrok: Túnel HTTP en puerto 8081
- Metro Bundler: http://localhost:8081
- Expo: Escuchando conexiones

## Problemas comunes

### "Unable to connect"
- Verifica que pusiste la URL correcta
- Asegúrate de incluir `exp://` al inicio
- Verifica que el puerto sea `:8081`

### "Tunnel expired"
- El túnel gratuito de ngrok expiró
- Ejecuta de nuevo: `./start-with-ngrok.sh`

### "Network error"
- Verifica tu conexión a internet
- El dispositivo móvil necesita internet para conectarse al túnel

## Logs en tiempo real

Para ver los logs de Expo:
```bash
tail -f /tmp/expo-final.log
```

Para ver los logs de ngrok:
```bash
tail -f /tmp/ngrok-test.log
```
