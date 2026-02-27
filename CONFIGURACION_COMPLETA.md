# Configuración Completa del Sistema

## Usuario de Prueba

Se ha creado un usuario de prueba con acceso completo a todas las funcionalidades:

- **Email:** test@test.com
- **Contraseña:** test123456
- **Suscripción:** Premium (activa hasta enero 2027)

Este usuario puede:
- Acceder a todas las secciones de la aplicación
- Ver y descargar todos los manuales (sin importar el tier requerido)
- Subir nuevos manuales
- Acceder a diseños 3D
- Solicitar y recibir presupuestos

## Servidor Expo (App Móvil)

El servidor Expo está corriendo y accesible mediante:

**URL del Túnel:** `exp://lSpVeIE-anonymous-8081.exp.direct`

### Para conectarte desde tu iPhone:

1. **Instalar Expo Go:**
   - Descarga la app "Expo Go" desde el App Store
   - Es gratuita y no requiere cuenta

2. **Conectarte al servidor:**
   - **Opción 1 - Entrada Manual:**
     - Abre Expo Go
     - Toca "Enter URL manually"
     - Pega: `exp://lSpVeIE-anonymous-8081.exp.direct`

   - **Opción 2 - Código QR:**
     - Genera el QR ejecutando: `npx qrcode-terminal "exp://lSpVeIE-anonymous-8081.exp.direct"`
     - Escanéalo con Expo Go

### Estado del Servidor:

- **Estado:** Corriendo
- **PID del proceso:** Verificar con `ps aux | grep "expo start"`
- **Logs:** Ver con `tail -f /tmp/expo-direct.log`

### Para mantener el servidor activo:

El servidor se está ejecutando en segundo plano. Si necesitas verificar su estado:

```bash
# Ver procesos de expo
ps aux | grep "expo start"

# Ver logs en tiempo real
tail -f /tmp/expo-direct.log

# Reiniciar si es necesario
pkill -f "expo start" && npx expo start --tunnel > /tmp/expo-direct.log 2>&1 &
```

## Sección de Manuales

Se ha agregado una nueva sección de **Manuales** tanto en la app web como móvil.

### Características:

- **Búsqueda:** Por título, marca o modelo de coche
- **Filtros:** Por tipo de manual:
  - Manual de Coche
  - Instalación de Escape
  - Mantenimiento
  - Otros

- **Funcionalidad:**
  - Visualización de todos los manuales disponibles
  - Descarga de PDFs
  - Control de acceso basado en suscripción

### Tipos de Manuales:

1. **car_manual** - Manual de Coche
2. **exhaust_installation** - Instalación de Escape
3. **maintenance** - Mantenimiento
4. **other** - Otros

### Niveles de Acceso:

- **standard:** Acceso a manuales básicos gratuitos
- **professional:** Acceso a manuales básicos y profesionales
- **workshop:** Acceso a manuales básicos, profesionales y de taller
- **premium:** Acceso completo a todos los manuales

El usuario de prueba (test@test.com) tiene acceso **premium**, por lo que puede ver y descargar todos los manuales.

## Agregar Manuales

Para agregar manuales a la base de datos, puedes usar SQL:

```sql
-- Insertar un manual de ejemplo
INSERT INTO manuals (
  title,
  description,
  car_brand,
  car_model,
  manual_type,
  file_url,
  file_size,
  required_tier,
  uploaded_by
) VALUES (
  'Manual de Usuario BMW Serie 3 2023',
  'Manual completo de usuario para BMW Serie 3 modelo 2023. Incluye todas las especificaciones, mantenimiento y características del vehículo.',
  'BMW',
  'Serie 3',
  'car_manual',
  'path/to/file.pdf',
  2500000,
  'standard',
  (SELECT id FROM auth.users WHERE email = 'test@test.com')
);
```

### Subir archivos PDF:

Los archivos PDF se almacenan en Supabase Storage en el bucket `manuals`. Para subirlos:

1. **Desde la interfaz web:**
   - La funcionalidad está preparada en el código
   - Solo necesitas agregar un formulario de subida en la página

2. **Manualmente via Supabase:**
   - Ve al panel de Supabase > Storage > manuals
   - Sube el PDF
   - Copia la ruta del archivo
   - Agrégala a la tabla `manuals` en el campo `file_url`

## Estructura de la Base de Datos

### Tabla: manuals

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | ID único del manual |
| title | text | Título del manual |
| description | text | Descripción detallada |
| car_brand | text | Marca del coche (ej: BMW, Audi) |
| car_model | text | Modelo del coche (ej: Serie 3, A4) |
| manual_type | text | Tipo de manual |
| file_url | text | Ruta del archivo en storage |
| file_size | bigint | Tamaño del archivo en bytes |
| thumbnail_url | text | URL de miniatura (opcional) |
| required_tier | text | Tier mínimo requerido |
| uploaded_by | uuid | ID del usuario que lo subió |
| created_at | timestamptz | Fecha de creación |
| updated_at | timestamptz | Fecha de actualización |

## Tiers de Suscripción Disponibles

1. **standard** - Gratis
   - Funcionalidades básicas
   - Manuales gratuitos

2. **professional** - $29.99/mes
   - Subir productos
   - Acceso a diseños 3D
   - Manuales profesionales

3. **workshop** - $49.99/mes
   - Gestión de talleres
   - Recibir presupuestos
   - Manuales de taller

4. **premium** - $99.99/mes
   - Acceso completo
   - API access
   - Todos los manuales

## Verificar Todo Funciona

### App Web:
```bash
cd /tmp/cc-agent/63103182/project
npm run build  # Compilar
# El servidor de desarrollo se inicia automáticamente
```

### App Móvil:
```bash
# Verificar que expo está corriendo
ps aux | grep "expo start"

# Ver la URL del túnel
cat /tmp/cc-agent/63103182/project/mobile/.expo/settings.json
```

## Comandos Útiles

```bash
# Ver logs de Expo
tail -f /tmp/expo-direct.log

# Verificar procesos
ps aux | grep expo

# Reiniciar servidor Expo
pkill -f "expo start"
cd /tmp/cc-agent/63103182/project/mobile
npx expo start --tunnel > /tmp/expo-direct.log 2>&1 &

# Build de la app web
cd /tmp/cc-agent/63103182/project
npm run build
```

## Notas Importantes

1. **El servidor Expo se mantendrá activo** mientras no se reinicie el sistema o se detenga manualmente
2. **El usuario de prueba tiene acceso completo** - úsalo para probar todas las funcionalidades
3. **Los manuales necesitan ser agregados manualmente** - el sistema está listo, solo falta agregar contenido
4. **El storage de Supabase está configurado** - puedes subir PDFs directamente al bucket `manuals`

## Próximos Pasos

Para agregar tus manuales:

1. Prepara los PDFs de los manuales
2. Súbelos al bucket `manuals` en Supabase Storage
3. Agrega los registros en la tabla `manuals` con la información correspondiente
4. Los usuarios podrán verlos y descargarlos según su nivel de suscripción

¡Todo está listo para empezar a usar! 🚀
