# Índice de Guías - AutoMarket Mobile

## 🎯 ¿Qué necesitas hacer?

### 📱 Ejecutar la app desde tu Mac
👉 [**QUICK_START_MAC.md**](./QUICK_START_MAC.md)
- 3 pasos rápidos
- Para desarrolladores
- Setup inicial

### 👥 Compartir con un cliente
👉 [**COMPARTIR_CON_CLIENTE.md**](./COMPARTIR_CON_CLIENTE.md)
- Cómo mostrar la app a tu cliente
- Acceso desde cualquier ubicación
- Tips para demos profesionales

### 📖 Guía completa de despliegue
👉 [**DESPLEGAR_DESDE_MAC.md**](./DESPLEGAR_DESDE_MAC.md)
- Todos los detalles técnicos
- Troubleshooting completo
- Alternativas avanzadas

### 🔗 Conectar con Expo Go
👉 [**CONECTAR_EXPO_GO.md**](./CONECTAR_EXPO_GO.md)
- Instrucciones para iOS/Android
- Solución de todos los problemas comunes
- Modo desarrollo y hot reload

### 📋 README Principal
👉 [**README.md**](./README.md)
- Documentación técnica completa
- Arquitectura del proyecto
- Deployment a producción

---

## 🔧 Scripts disponibles

### Verificar configuración
```bash
./check-setup.sh
```
Verifica que Node.js, npm, dependencias y .env estén correctos.

### Iniciar para cliente (acceso público)
```bash
./start-for-client.sh
```
Inicia Expo con túnel y configura todo automáticamente.

### Obtener URL de conexión
```bash
./get-url.sh
```
Muestra la URL exacta para compartir con clientes.

---

## 🚀 Flujo de trabajo recomendado

### Primera vez:

1. Lee [QUICK_START_MAC.md](./QUICK_START_MAC.md)
2. Ejecuta `./check-setup.sh`
3. Ejecuta `./start-for-client.sh`
4. Ejecuta `./get-url.sh`
5. Conecta desde tu móvil para probar

### Para compartir con cliente:

1. Lee [COMPARTIR_CON_CLIENTE.md](./COMPARTIR_CON_CLIENTE.md)
2. Ejecuta `./start-for-client.sh`
3. Ejecuta `./get-url.sh`
4. Envía URL e instrucciones al cliente

### Si algo falla:

1. Consulta [CONECTAR_EXPO_GO.md](./CONECTAR_EXPO_GO.md)
2. Revisa la sección "Problemas comunes"
3. O consulta [DESPLEGAR_DESDE_MAC.md](./DESPLEGAR_DESDE_MAC.md)

---

## 📚 Contenido de cada guía

### QUICK_START_MAC.md
- ✅ Setup en 3 pasos
- ✅ Comandos esenciales
- ✅ Mensaje para el cliente
- 📄 ~50 líneas

### COMPARTIR_CON_CLIENTE.md
- ✅ Cómo funciona el túnel
- ✅ Flujo completo de demo
- ✅ Troubleshooting durante demos
- ✅ Tips profesionales
- 📄 ~300 líneas

### DESPLEGAR_DESDE_MAC.md
- ✅ Guía paso a paso detallada
- ✅ Requisitos previos
- ✅ Configuración de entorno
- ✅ Todos los problemas posibles
- ✅ Alternativas avanzadas
- 📄 ~500 líneas

### CONECTAR_EXPO_GO.md
- ✅ Instrucciones iOS/Android
- ✅ Credenciales de prueba
- ✅ Solución exhaustiva de problemas
- ✅ Estructura de la app
- ✅ Comandos útiles
- 📄 ~400 líneas

### README.md
- ✅ Documentación técnica
- ✅ Arquitectura completa
- ✅ Compilación para producción
- ✅ Testing y publicación
- 📄 ~270 líneas

---

## 🎯 Guía por nivel de experiencia

### Principiante (nunca has usado Expo)
1. [QUICK_START_MAC.md](./QUICK_START_MAC.md) - Empieza aquí
2. [CONECTAR_EXPO_GO.md](./CONECTAR_EXPO_GO.md) - Si tienes problemas
3. [COMPARTIR_CON_CLIENTE.md](./COMPARTIR_CON_CLIENTE.md) - Cuando funcione

### Intermedio (conoces Expo, necesitas compartir)
1. [COMPARTIR_CON_CLIENTE.md](./COMPARTIR_CON_CLIENTE.md) - Lee esto
2. [DESPLEGAR_DESDE_MAC.md](./DESPLEGAR_DESDE_MAC.md) - Si necesitas más detalles

### Avanzado (problemas específicos)
1. [DESPLEGAR_DESDE_MAC.md](./DESPLEGAR_DESDE_MAC.md) - Referencia completa
2. [README.md](./README.md) - Documentación técnica

---

## ❓ Preguntas frecuentes

### "¿Por dónde empiezo?"
👉 [QUICK_START_MAC.md](./QUICK_START_MAC.md)

### "¿Cómo comparto con mi cliente?"
👉 [COMPARTIR_CON_CLIENTE.md](./COMPARTIR_CON_CLIENTE.md)

### "¿La app no carga en el móvil?"
👉 [CONECTAR_EXPO_GO.md](./CONECTAR_EXPO_GO.md) - Sección "Problemas comunes"

### "¿Cómo funciona el túnel?"
👉 [COMPARTIR_CON_CLIENTE.md](./COMPARTIR_CON_CLIENTE.md) - Sección "Cómo funciona"

### "¿Es seguro compartir la URL?"
👉 [COMPARTIR_CON_CLIENTE.md](./COMPARTIR_CON_CLIENTE.md) - Sección "Seguridad"

### "¿Cuánto cuesta?"
👉 [COMPARTIR_CON_CLIENTE.md](./COMPARTIR_CON_CLIENTE.md) - Sección "Costos"

### "¿Cómo compilar para la App Store?"
👉 [README.md](./README.md) - Sección "Compilación para Producción"

### "¿Problemas con variables de entorno?"
👉 [DESPLEGAR_DESDE_MAC.md](./DESPLEGAR_DESDE_MAC.md) - Paso 3

---

## 🔗 Links rápidos

| Acción | Comando |
|--------|---------|
| Verificar setup | `./check-setup.sh` |
| Iniciar Expo | `./start-for-client.sh` |
| Ver URL | `./get-url.sh` |
| Detener Expo | `Ctrl+C` en la terminal |
| Limpiar caché | `npx expo start --tunnel --clear` |
| Reinstalar | `rm -rf node_modules && npm install` |

---

## 📞 Soporte

Si después de leer las guías sigues con problemas:

1. Ejecuta `./check-setup.sh` y guarda la salida
2. Ejecuta `./get-url.sh` y guarda la salida
3. Anota exactamente qué error ves
4. Indica en qué paso te quedaste

---

**URL actual de conexión:**
```
exp://automarket-8081.exp.direct
```

**Tu Mac debe estar encendida con Expo corriendo para que funcione.**
