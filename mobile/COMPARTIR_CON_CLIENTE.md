# Compartir AutoMarket con tu Cliente

## Resumen rápido

Esta guía te ayuda a compartir la app móvil con tu cliente para que la pruebe desde su propio teléfono, **sin importar dónde esté ubicado**.

---

## 🎯 Objetivo

Tu cliente podrá:
- ✅ Ver la app en **su propio iPhone o Android**
- ✅ Probarla en **tiempo real** mientras haces cambios
- ✅ Acceder desde **cualquier lugar del mundo** (no necesita estar en tu red WiFi)
- ✅ **Sin necesidad de instalar nada permanente** (usa Expo Go)

---

## 📊 Cómo funciona

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Tu Mac    │────────▶│  Expo Tunnel │────────▶│ Móvil Cliente   │
│             │         │   (ngrok)    │         │   (Expo Go)     │
│ npm start   │         │              │         │                 │
│  --tunnel   │         │  Internet    │         │  Cualquier      │
│             │         │   Público    │         │   ubicación     │
└─────────────┘         └──────────────┘         └─────────────────┘
```

**Ventaja:** No importa si tu cliente está en otra ciudad u otro país. Mientras tu Mac esté encendida con Expo corriendo, cualquiera con la URL puede acceder.

---

## 🚀 Pasos para ti (desarrollador)

### 1. Preparar el entorno (solo primera vez)

```bash
cd mobile
npm install
```

### 2. Iniciar Expo con túnel

```bash
./start-for-client.sh
```

O manualmente:
```bash
npm run start:tunnel
```

Verás algo como:
```
Starting Metro Bundler
Tunnel connected.
Tunnel ready.
Waiting on http://localhost:8081
```

### 3. Obtener la URL de conexión

En **otra terminal** (no cierres la anterior):

```bash
cd mobile
./get-url.sh
```

Te mostrará:
```
📱 URL para Expo Go:

  exp://automarket-8081.exp.direct
```

### 4. Compartir con tu cliente

Copia esa URL y envíasela por WhatsApp, Email, Slack, etc.

---

## 📱 Pasos para tu cliente

### Mensaje que puedes copiar y pegar:

```
Hola! Para ver la app AutoMarket en tu móvil:

PASO 1: Instala Expo Go
• iOS: Abre App Store, busca "Expo Go" e instala
• Android: Abre Play Store, busca "Expo Go" e instala
  (Es una app gratuita y segura)

PASO 2: Abre Expo Go
• En la pantalla principal, busca "Enter URL manually"
• Pega esta URL exactamente:

  exp://automarket-8081.exp.direct

• Toca "Connect"

PASO 3: Espera
• La primera vez tarda 1-2 minutos cargando
• Luego verás la app AutoMarket

PARA PROBAR EL LOGIN:
• Email: test@example.com
• Password: test123456

¡Cualquier problema me avisas!
```

---

## 🔄 Durante la demostración

### Lo que puedes hacer mientras tu cliente prueba:

1. **Hacer cambios en vivo**
   - Edita código en tu Mac
   - Los cambios se reflejarán automáticamente en el móvil del cliente
   - No necesita reconectar

2. **Ver logs en tiempo real**
   - Todo lo que pasa en el móvil del cliente aparece en tu terminal
   - Puedes ver errores y debuggear en vivo

3. **Recargar la app remotamente**
   - Presiona `r` en tu terminal
   - La app se recargará en el móvil del cliente

### Comandos útiles durante la demo:

En la terminal donde corre Expo, presiona:
- `r` - Recargar la app en todos los dispositivos conectados
- `m` - Abrir menú de desarrollo
- `Ctrl+C` - Detener el servidor (esto desconecta a todos)

---

## ⚠️ Cosas importantes a recordar

### ✅ SÍ debes:
- Mantener tu Mac **encendida** mientras el cliente prueba
- Mantener la **terminal abierta** con Expo corriendo
- Tener **conexión a internet** estable

### ❌ NO debes:
- Cerrar la terminal donde corre Expo
- Apagar o suspender tu Mac
- Desconectarte de internet

### 💡 Tip: Si tu Mac se va a dormir

Evita que tu Mac se duerma durante la demo:
```bash
# Mantener Mac despierta mientras corre Expo
caffeinate -d
```

---

## 🐛 Solución de problemas comunes

### Cliente: "No puedo conectar"

**Posibles causas:**

1. **URL incorrecta**
   ```
   ✅ Correcto: exp://automarket-8081.exp.direct
   ❌ Incorrecto: http://automarket-8081.exp.direct
   ```

2. **Expo no está corriendo en tu Mac**
   - Verifica en tu terminal que veas "Tunnel ready"
   - Ejecuta `./get-url.sh` para verificar estado

3. **Cliente sin internet**
   - Pide que revise su WiFi o datos móviles

**Solución rápida:**
```bash
# En tu Mac:
# 1. Detener Expo (Ctrl+C)
# 2. Reiniciar con caché limpio
npx expo start --tunnel --clear
# 3. Obtener nueva URL
./get-url.sh
# 4. Enviar nueva URL al cliente
```

### Cliente: "La app se carga muy lento"

**Normal:**
- Primera conexión: 1-3 minutos
- Conexiones siguientes: 30-60 segundos

**Si tarda más de 5 minutos:**
1. Cliente: Cierra Expo Go completamente
2. Tú: Reinicia Expo en tu Mac
3. Cliente: Vuelve a conectar

### Cliente: "Veo pantalla blanca"

**Solución:**
1. Cliente: Sacude el teléfono (literalmente agítalo)
2. Toca "Reload" en el menú que aparece
3. O presiona `r` en tu terminal para recargar remotamente

### Cliente: "Error de conexión con Supabase"

**Causa:** Variables de entorno no cargadas

**Solución en tu Mac:**
```bash
# Verifica que .env existe
cat mobile/.env

# Debe mostrar las URLs de Supabase
# Si no existe, corre:
./start-for-client.sh
# Este script lo crea automáticamente
```

---

## 📈 Flujo completo de una demo típica

### Antes de la reunión (5 min):

```bash
# 1. Verificar configuración
./check-setup.sh

# 2. Iniciar Expo
./start-for-client.sh

# 3. Obtener URL
./get-url.sh

# 4. Enviar URL al cliente por adelantado
```

### Durante la reunión:

1. **Cliente abre Expo Go** y pega la URL
2. **Esperas 1-2 minutos** mientras carga
3. **Cliente ve la pantalla de inicio** ✅
4. **Guías al cliente** por las funcionalidades:
   - Login con credenciales de prueba
   - Navegar por las tabs
   - Ver marketplace, presupuestos, etc.
5. **Haces cambios en vivo** si es necesario
6. **Cliente ve los cambios automáticamente**

### Después de la reunión:

- Puedes dejar Expo corriendo si el cliente quiere seguir probando
- O presiona `Ctrl+C` para detener

---

## 🔒 Seguridad

### ¿Es seguro compartir con el cliente?

✅ **Sí, es seguro:**
- Solo quien tiene la URL puede acceder
- La URL es única y temporal
- Cuando detienes Expo, la URL deja de funcionar
- No expones datos sensibles (las credenciales de DB están en variables de entorno)

### ¿Qué ve el cliente?

- Solo la interfaz de la app
- Las funcionalidades que implementaste
- Los datos de prueba en Supabase

### ¿Qué NO ve el cliente?

- Tu código fuente
- Tus credenciales
- Tu sistema de archivos
- Otras aplicaciones en tu Mac

---

## 💰 Costos

### Todo es gratuito:
- ✅ Expo (gratis)
- ✅ Expo Go app (gratis)
- ✅ Túnel público (gratis con límites generosos)
- ✅ Supabase (plan gratuito)

### Límites del túnel gratuito:
- Conexiones concurrentes: ~10-20 personas
- Ancho de banda: Suficiente para demos
- Tiempo: Ilimitado mientras no abuses

**Para este caso de uso (mostrar a un cliente) es más que suficiente.**

---

## 🎓 Próximos pasos

Una vez que el cliente apruebe:

### Para seguir desarrollando:
- Mantén el mismo flujo con el túnel
- El cliente puede reconectar cuando quiera ver avances

### Para producción (cuando esté listo):
```bash
# Compilar para App Store / Play Store
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

Pero eso es para después. **Para demos, el túnel de Expo es perfecto.**

---

## 📚 Recursos relacionados

- [QUICK_START_MAC.md](./QUICK_START_MAC.md) - Inicio rápido
- [DESPLEGAR_DESDE_MAC.md](./DESPLEGAR_DESDE_MAC.md) - Guía completa
- [CONECTAR_EXPO_GO.md](./CONECTAR_EXPO_GO.md) - Troubleshooting detallado
- [check-setup.sh](./check-setup.sh) - Verificación automática

---

## ✨ Tips profesionales

### Para demos impresionantes:

1. **Prueba todo antes** de la llamada con el cliente
2. **Ten las credenciales a mano** para compartir pantalla si es necesario
3. **Prepara una lista de features** que quieres mostrar
4. **Ten abierta tu terminal** para ver logs en tiempo real
5. **Graba la sesión** (con permiso) para referencia futura

### Para problemas de último minuto:

Siempre ten este comando listo:
```bash
pkill -f "expo start" && cd mobile && npx expo start --tunnel --clear
```

Esto reinicia todo desde cero si algo falla.

---

## 🎉 ¡Listo!

Ahora puedes:
- ✅ Ejecutar la app desde tu Mac
- ✅ Compartirla con clientes en cualquier parte del mundo
- ✅ Hacer demos en vivo con hot reload
- ✅ Solucionar problemas comunes
- ✅ Lucir profesional en las demos

**¿Dudas? Lee las otras guías o ejecuta `./check-setup.sh` para diagnosticar problemas.**

---

**URL actual para compartir:**
```
exp://automarket-8081.exp.direct
```

**Recuerda:** Tu Mac debe estar encendida con Expo corriendo para que funcione.
