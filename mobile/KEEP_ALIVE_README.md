# Sistema Keep-Alive para Expo (12 horas)

## Estado Actual

✅ **El servidor está corriendo y se mantendrá activo durante 12 horas**

- **Inicio:** 08:33 UTC - 29 Enero 2026
- **Finalización:** 20:33 UTC - 29 Enero 2026

## URL de Conexión

**URL del túnel:** `exp://zd618sk-anonymous-8081.exp.direct`

## Cómo Conectarse desde tu iPhone

### Opción 1: Escanear QR
1. Abre la app **Expo Go** en tu iPhone
2. Toca el botón de escanear
3. Escanea el código QR que se mostró arriba

### Opción 2: Entrada Manual
1. Abre **Expo Go** en tu iPhone
2. Toca "Enter URL manually"
3. Pega: `exp://zd618sk-anonymous-8081.exp.direct`

## Características del Sistema Keep-Alive

El sistema de keep-alive monitorea automáticamente el servidor y:

- ✅ Verifica cada 60 segundos que el servidor esté respondiendo
- ✅ Reinicia automáticamente si detecta problemas
- ✅ Registra todos los eventos en logs
- ✅ Se ejecuta en segundo plano durante 12 horas completas

## Comandos Útiles

### Ver el Estado Actual
```bash
./check-status.sh
```

### Ver Logs en Tiempo Real
```bash
tail -f /tmp/expo-keepalive.log
```

### Ver Logs de Expo
```bash
tail -f /tmp/expo-sdk54.log
```

## Notas Importantes

- El sistema se detendrá automáticamente después de 12 horas
- Si necesitas detenerlo antes, ejecuta:
  ```bash
  pkill -f "keep-alive.sh"
  ```
- Si el servidor se cae, se reiniciará automáticamente en menos de 60 segundos
- Todos los reinicios quedan registrados en el log

## Resolución de Problemas

Si tienes problemas para conectarte:

1. Ejecuta `./check-status.sh` para verificar el estado
2. Revisa que tu iPhone esté conectado a Internet
3. Asegúrate de estar usando Expo Go versión actualizada
4. Si el túnel no responde, espera 1 minuto - el sistema lo reiniciará automáticamente

## Arquitectura

```
keep-alive.sh (Proceso supervisor)
    └── Monitorea cada 60s
        ├── Verifica proceso de Expo
        ├── Verifica respuesta del túnel
        └── Reinicia si es necesario
            └── expo start --tunnel
                ├── Metro Bundler
                └── ngrok tunnel
```

¡Todo está configurado y funcionando! 🚀
