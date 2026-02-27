# 🚀 EMPIEZA AQUÍ

## Para ejecutar AutoMarket Mobile desde tu Mac y compartirla con un cliente

### Paso 1: Instalar dependencias (solo primera vez)
```bash
cd mobile
npm install
```

### Paso 2: Iniciar Expo
```bash
./start-for-client.sh
```

### Paso 3: Obtener URL
```bash
# En otra terminal
./get-url.sh
```

### Paso 4: Compartir URL con tu cliente
```
exp://automarket-8081.exp.direct
```

---

## Para tu cliente

**Envíale esto:**

> 1. Instala **Expo Go** desde App Store (iOS) o Play Store (Android)
> 2. Abre Expo Go → "Enter URL manually"
> 3. Pega: `exp://automarket-8081.exp.direct`
> 4. Toca "Connect"
>
> Login: `test@example.com` / `test123456`

---

## ¿Necesitas más ayuda?

- 📖 [Todas las guías](./GUIAS_INDEX.md)
- 🔧 [Verificar setup](./check-setup.sh)
- 🐛 [Solucionar problemas](./CONECTAR_EXPO_GO.md)

---

**Importante:** Tu Mac debe estar encendida con Expo corriendo mientras el cliente usa la app.
