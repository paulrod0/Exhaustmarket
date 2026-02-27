# Quick Start - Ejecutar desde tu Mac

## 3 pasos rápidos para mostrar la app a tu cliente

### Paso 1: Instalar dependencias (solo la primera vez)

```bash
cd mobile
npm install
```

### Paso 2: Iniciar Expo con túnel público

```bash
chmod +x start-for-client.sh
./start-for-client.sh
```

O manualmente:
```bash
npm run start:tunnel
```

### Paso 3: Obtener URL y compartir

```bash
# En otra terminal:
cd mobile
./get-url.sh
```

Envía la URL a tu cliente:
```
exp://automarket-8081.exp.direct
```

---

## Instrucciones para tu cliente

Envíale este mensaje:

> **Para ver AutoMarket en tu móvil:**
>
> 1. Instala **Expo Go** desde:
>    - iOS: App Store
>    - Android: Play Store
>
> 2. Abre Expo Go y toca **"Enter URL manually"**
>
> 3. Pega esta URL:
>    ```
>    exp://automarket-8081.exp.direct
>    ```
>
> 4. Toca **"Connect"** y espera 1-2 minutos
>
> **Para probar el login:**
> - Email: `test@example.com`
> - Password: `test123456`

---

## ¿Problemas?

Lee la guía completa en: `DESPLEGAR_DESDE_MAC.md`

---

## Comandos útiles

```bash
# Iniciar (con auto-configuración)
./start-for-client.sh

# Obtener URL de conexión
./get-url.sh

# Limpiar caché y reiniciar
npx expo start --tunnel --clear

# Detener
# Presiona Ctrl+C en la terminal donde corre Expo
```

---

## Requisitos

- **Node.js 18+** (https://nodejs.org)
- **npm** (viene con Node.js)
- **Internet** en tu Mac y en el móvil del cliente

---

## Importante

- ⚠️ Tu Mac debe estar **encendida** mientras el cliente usa la app
- ⚠️ No cierres la terminal donde corre Expo
- ✅ El túnel permite acceso desde **cualquier lugar del mundo**
- ✅ Solo quien tiene la URL puede acceder

---

¡Listo! Con estos 3 pasos tu cliente puede ver la app desde su móvil.
