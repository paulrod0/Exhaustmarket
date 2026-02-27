# Iniciar la App en iOS con Expo Go

## Pasos:

### 1. Abre la terminal en la carpeta `mobile`:
```bash
cd mobile
```

### 2. Inicia el servidor de Expo:
```bash
npm start
```

### 3. Cuando veas el menú de Expo:
- Presiona `s` para cambiar el modo de conexión a **Tunnel** (esto permite conexión desde cualquier red)
- O inicia directamente con: `npx expo start --tunnel`

### 4. En tu iPhone:
- Abre **Expo Go**
- Escanea el código QR que aparece en la terminal
- O ve a la pestaña "Projects" y busca el proyecto que aparece automáticamente

### Solución de Problemas:

**Si Expo Go te pide iniciar sesión:**
- No necesitas cuenta de Expo para desarrollo local
- Simplemente escanea el QR que aparece en tu terminal
- O usa la pestaña "Projects" en lugar de "Home"

**Si el QR no funciona:**
- Asegúrate de estar en la misma red WiFi
- Intenta con el modo tunnel: `npx expo start --tunnel`
- Copia la URL que aparece (exp://...) y pégala en Expo Go

**Para ver la URL directa:**
- En el menú de Expo en la terminal
- Busca la línea que dice "Metro waiting on..."
- O presiona `i` para abrir en iOS simulator (si lo tienes instalado)
