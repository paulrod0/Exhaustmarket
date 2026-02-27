# Inicio Rápido - AutoMarket iOS

## Pasos para ejecutar la app en tu iPhone

### 1. Instalar Expo Go

- Ve a la App Store en tu iPhone
- Busca "Expo Go"
- Descarga e instala la aplicación

### 2. Instalar dependencias

En tu computadora, abre la terminal y ejecuta:

```bash
cd mobile
npm install
```

### 3. Iniciar la aplicación

```bash
npm start
```

### 4. Abrir en tu iPhone

1. Abre la app Expo Go en tu iPhone
2. Escanea el código QR que aparece en la terminal
3. ¡La app se cargará automáticamente!

**Nota:** Asegúrate de que tu iPhone y computadora estén en la misma red WiFi

## Usuarios de Prueba

Puedes crear tu propia cuenta o usar estos usuarios de prueba:

**Usuario Estándar:**
- Email: user@test.com
- Contraseña: test123

**Profesional:**
- Email: professional@test.com
- Contraseña: test123

**Taller:**
- Email: workshop@test.com
- Contraseña: test123

## Características según tipo de usuario

### Usuario Estándar (Gratis)
- Ver marketplace de productos y servicios
- Solicitar presupuestos a talleres
- Gestionar perfil

### Profesional (29.99€/mes)
- Todo lo de Estándar
- Vender productos y materiales
- Acceso a biblioteca de diseños 3D
- Gestionar catálogo de productos

### Taller (49.99€/mes)
- Todo lo de Estándar
- Ofrecer servicios de escape
- Recibir y responder presupuestos
- Comprar materiales de profesionales

### Premium (99.99€/mes)
- Acceso completo a todas las funcionalidades
- Subir diseños 3D propios
- Listados ilimitados

## Compilar para producción (Opcional)

Si quieres crear una versión standalone para tu iPhone:

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login en Expo
eas login

# Compilar para iOS
eas build --platform ios
```

Esto creará un archivo IPA que puedes instalar en tu dispositivo o subir a TestFlight/App Store.

## Solución de Problemas Comunes

### La app no se conecta a la base de datos
- Verifica que el archivo `.env` tenga las credenciales correctas
- Asegúrate de que tu dispositivo tenga conexión a internet

### El código QR no funciona
- Verifica que ambos dispositivos estén en la misma red WiFi
- Intenta usar la opción "Connect via LAN" en Expo Go

### La app se cierra inmediatamente
- Revisa los logs en la terminal
- Ejecuta `npm start -- --clear` para limpiar el caché

### Errores de TypeScript
- Ejecuta `npm install` nuevamente
- Verifica que tengas Node.js 18 o superior

## Próximos Pasos

1. **Explora la aplicación**: Navega por todas las pantallas
2. **Crea tu cuenta**: Registra un usuario según tu tipo
3. **Prueba funcionalidades**: Explora el marketplace, solicita presupuestos
4. **Personaliza tu perfil**: Añade tu información y datos de empresa
5. **Explora diseños 3D**: Si eres Professional o Premium

## Recursos Útiles

- [Documentación de Expo](https://docs.expo.dev/)
- [Guía de React Native](https://reactnative.dev/docs/getting-started)
- [Supabase React Native](https://supabase.com/docs/guides/getting-started/quickstarts/react-native)

## Contacto

Para soporte o preguntas, consulta el README principal o la documentación completa.
