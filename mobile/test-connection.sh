#!/bin/bash

echo "========================================"
echo "PRUEBA DE CONEXIÓN - APP MÓVIL"
echo "========================================"
echo ""

# Detener procesos existentes
echo "1. Deteniendo procesos de Expo..."
pkill -f expo 2>/dev/null
pkill -f metro 2>/dev/null
sleep 2

# Hacer backup de la app original
if [ -f "App.tsx" ] && [ ! -f "App.full.tsx" ]; then
    echo "2. Guardando versión completa..."
    cp App.tsx App.full.tsx
fi

# Usar versión simple
if [ -f "App.simple.tsx" ]; then
    echo "3. Activando versión simple de prueba..."
    cp App.simple.tsx App.tsx
else
    echo "❌ Error: App.simple.tsx no existe"
    exit 1
fi

# Limpiar cache
echo "4. Limpiando cache..."
rm -rf .expo/web-cache 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null

# Iniciar servidor
echo "5. Iniciando servidor Expo..."
echo ""
echo "========================================"
echo "INSTRUCCIONES:"
echo "========================================"
echo ""
echo "1. Espera a que aparezca el código QR"
echo "2. Escanéalo con Expo Go"
echo ""
echo "Si la app simple funciona:"
echo "  ✅ La conexión está OK"
echo "  → El problema es con Supabase"
echo ""
echo "Si NO funciona:"
echo "  ❌ Problema de red/conectividad"
echo "  → Verifica que estés en la misma WiFi"
echo ""
echo "Para restaurar la app completa:"
echo "  ./restore-full-app.sh"
echo ""
echo "========================================"
echo ""

# Iniciar en modo LAN (más confiable)
npm start

# El script continúa corriendo hasta que se cancele con Ctrl+C
