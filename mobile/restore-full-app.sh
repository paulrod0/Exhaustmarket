#!/bin/bash

echo "========================================"
echo "RESTAURAR APP COMPLETA"
echo "========================================"
echo ""

# Detener servidor
echo "1. Deteniendo servidor..."
pkill -f expo 2>/dev/null
pkill -f metro 2>/dev/null
sleep 2

# Restaurar app original
if [ -f "App.full.tsx" ]; then
    echo "2. Restaurando versión completa..."
    cp App.full.tsx App.tsx
    echo "✅ App completa restaurada"
else
    echo "❌ Error: No se encontró el backup App.full.tsx"
    exit 1
fi

echo ""
echo "3. Iniciando servidor con app completa..."
echo ""

npm start
