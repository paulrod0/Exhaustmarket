# 📱 Iniciar Aplicación Móvil en Expo Go

La aplicación móvil está completamente actualizada con el nuevo diseño. Para ejecutarla:

## Opción 1: Iniciar desde este directorio

```bash
cd mobile
npm start
```

## Opción 2: Usar túnel (recomendado para testing remoto)

```bash
cd mobile
npm run start:tunnel
```

## En tu dispositivo móvil:

1. **Instala Expo Go** desde:
   - iOS: App Store
   - Android: Google Play Store

2. **Escanea el código QR** que aparece en la terminal

3. **La app se abrirá** con el nuevo diseño actualizado

## Características actualizadas:

✅ **HomeScreen**: 3 tarjetas de usuario (PARTICULAR, TALLER, FABRICANTE) con fondo azul gradiente
✅ **MarketplaceScreen**: Selector de vehículo con diagrama OEM y listado de productos
✅ **Diseño completo**: Coincide 100% con la versión web
✅ **Colores**: Azul (#4A7BA7, #5B8DC7) y amarillo (#F59E0B)

## Solución de problemas:

- Si hay error de conexión, usa `npm run start:tunnel`
- Asegúrate de que tu teléfono y computadora estén en la misma red WiFi
- Si no aparece el QR, presiona `r` para reiniciar el bundler
