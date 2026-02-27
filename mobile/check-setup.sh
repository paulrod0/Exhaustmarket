#!/bin/bash

echo ""
echo "================================================"
echo "  Verificación de Configuración - AutoMarket"
echo "================================================"
echo ""

ERROR=0

# Check Node.js
echo "🔍 Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js instalado: $NODE_VERSION"

    # Check version (should be >= 18)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo "⚠️  Advertencia: Node.js versión $NODE_VERSION es antigua"
        echo "   Se recomienda Node.js 18 o superior"
        echo "   Descarga desde: https://nodejs.org"
    fi
else
    echo "❌ Node.js no encontrado"
    echo "   Instala desde: https://nodejs.org"
    ERROR=1
fi

echo ""

# Check npm
echo "🔍 Verificando npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm instalado: v$NPM_VERSION"
else
    echo "❌ npm no encontrado"
    ERROR=1
fi

echo ""

# Check if in mobile directory
echo "🔍 Verificando ubicación..."
if [ ! -f "package.json" ]; then
    echo "❌ No estás en la carpeta mobile/"
    echo "   Ejecuta: cd mobile"
    ERROR=1
elif grep -q "automarket-mobile" package.json; then
    echo "✅ En la carpeta correcta (mobile/)"
else
    echo "⚠️  Parece que no estás en la carpeta mobile/ correcta"
fi

echo ""

# Check node_modules
echo "🔍 Verificando dependencias..."
if [ -d "node_modules" ]; then
    if [ -d "node_modules/expo" ]; then
        echo "✅ Dependencias instaladas"
    else
        echo "⚠️  node_modules existe pero falta Expo"
        echo "   Ejecuta: npm install"
    fi
else
    echo "⚠️  Dependencias no instaladas"
    echo "   Ejecuta: npm install"
fi

echo ""

# Check .env file
echo "🔍 Verificando configuración..."
if [ -f ".env" ]; then
    if grep -q "EXPO_PUBLIC_SUPABASE_URL" .env && grep -q "EXPO_PUBLIC_SUPABASE_ANON_KEY" .env; then
        echo "✅ Archivo .env configurado"

        # Show values (first 50 chars only for security)
        URL=$(grep EXPO_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2 | head -c 50)
        echo "   URL: ${URL}..."
    else
        echo "⚠️  Archivo .env incompleto"
        echo "   Debe contener:"
        echo "   - EXPO_PUBLIC_SUPABASE_URL"
        echo "   - EXPO_PUBLIC_SUPABASE_ANON_KEY"
    fi
else
    echo "❌ Archivo .env no encontrado"
    echo "   Ejecuta ./start-for-client.sh para crearlo automáticamente"
fi

echo ""

# Check if Expo is already running
echo "🔍 Verificando si Expo está corriendo..."
if ps aux | grep -q "[n]ode.*expo start"; then
    echo "✅ Expo está corriendo"
    echo ""
    echo "   Para ver la URL de conexión:"
    echo "   ./get-url.sh"
else
    echo "⚠️  Expo no está corriendo"
    echo ""
    echo "   Para iniciar:"
    echo "   ./start-for-client.sh"
fi

echo ""
echo "================================================"

if [ $ERROR -eq 0 ]; then
    echo "✅ Todo está listo para iniciar!"
    echo ""
    echo "Próximos pasos:"
    echo "1. Si Expo no está corriendo: ./start-for-client.sh"
    echo "2. Obtener URL: ./get-url.sh"
    echo "3. Compartir URL con tu cliente"
else
    echo "❌ Hay problemas que debes resolver primero"
    echo ""
    echo "Lee QUICK_START_MAC.md para más información"
fi

echo "================================================"
echo ""
