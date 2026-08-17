# Guía de Despliegue en AWS para ExhaustMarket

Esta guía explica cómo mover el proyecto de Railway/Ngrok a **AWS** para tener una URL global y profesional. Usaremos **AWS App Runner** para el servidor móvil y **AWS Amplify** para la web.

---

## 📱 Despliegue del Servidor Móvil (Proxy de Metro)

AWS App Runner es el servicio más sencillo para desplegar contenedores con HTTPS automático.

### 1. Preparación
He creado un `mobile/Dockerfile` que empaqueta todo lo necesario.

### 2. Pasos en AWS Console
1. Ve al servicio **App Runner** en AWS.
2. Haz clic en **Create service**.
3. En **Source**, selecciona **Source code repository** y conecta tu cuenta de GitHub.
4. Selecciona tu repositorio y la rama principal.
5. En **Deployment settings**, elige **Automatic**.
6. En **Build settings**:
   - **Runtime**: `Docker`.
   - **Build command**: (Déjalo vacío, lo lee del Dockerfile).
   - **Start command**: (Déjalo vacío, lo lee del Dockerfile).
   - **Port**: `8081`.

### 3. Variables de Entorno (IMPORTANTE)
En la sección **Configuration**, añade estas variables:
- `PUBLIC_HOST`: La URL que AWS te asigne (ej: `xxxxx.aws-region.awsapprunner.com`).
- `PORT`: `8081`.

### 4. Acceso desde el móvil
Una vez desplegado, usa la URL de AWS en Expo Go:
`exp://tu-url-de-aws.awsapprunner.com`

---

## 🌐 Despliegue del Frontend Web

AWS Amplify es perfecto para aplicaciones Vite/React.

### 1. Pasos en AWS Console
1. Ve al servicio **AWS Amplify**.
2. Haz clic en **Create new app** -> **GitHub**.
3. Selecciona tu repositorio y la rama.
4. Amplify detectará automáticamente que es un proyecto Vite.
5. He añadido un archivo `amplify.yml` en la raíz para asegurar que el proceso de "build" sea correcto.
6. Haz clic en **Next** y luego en **Save and Deploy**.

### 2. Beneficios
- **HTTPS automático** con certificado gratuito de AWS.
- **CI/CD**: Cada vez que hagas `git push`, AWS actualizará la web automáticamente.
- **Global**: La web se servirá desde la red CDN de Amazon (CloudFront) para máxima velocidad.

---

## 💡 Alternativa: Localtunnel (Si no quieres AWS todavía)

Si prefieres algo inmediato sin AWS ni Ngrok:
1. Instala localtunnel: `npm install -g localtunnel`
2. Corre Expo: `npm run dev` (en el puerto 8081)
3. Abre el túnel: `lt --port 8081`

**Nota:** Localtunnel es gratuito y no tiene los límites molestos de Ngrok, pero AWS es la solución "pro" que pediste para producción.
