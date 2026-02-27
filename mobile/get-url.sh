#!/bin/bash

echo "==================================="
echo "AutoMarket - URL de Conexión iOS"
echo "==================================="
echo ""

# Check if Expo is running
if ! ps aux | grep -q "[n]ode.*expo start"; then
    echo "❌ Expo no está corriendo"
    echo ""
    echo "Inicia Expo primero con:"
    echo "  cd mobile && node_modules/.bin/expo start --tunnel"
    exit 1
fi

echo "✅ Expo está corriendo"
echo ""

# Get the tunnel URL from settings
RANDOMNESS=$(cat .expo/settings.json | grep urlRandomness | cut -d'"' -f4)

if [ -z "$RANDOMNESS" ]; then
    echo "⚠️  No se pudo obtener el identificador del túnel"
    echo ""
    echo "URL probable (prueba esta):"
    echo "  exp://automarket-8081.exp.direct"
else
    echo "📱 URL para Expo Go:"
    echo ""
    echo "  exp://${RANDOMNESS}-8081.exp.direct"
    echo ""
fi

echo ""
echo "Pasos para conectar desde iPhone:"
echo "1. Abre Expo Go en tu iPhone"
echo "2. Toca 'Enter URL manually'"
echo "3. Pega la URL de arriba"
echo "4. Toca 'Connect'"
echo ""
echo "==================================="
