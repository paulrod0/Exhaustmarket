#!/bin/bash

echo ""
echo "================================================"
echo "  AutoMarket Mobile - Iniciar para Cliente"
echo "================================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  Dependencias no instaladas"
    echo ""
    echo "Instalando dependencias..."
    npm install
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Archivo .env no encontrado"
    echo ""
    echo "Creando .env con configuración de Supabase..."
    cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://lvakuprxeeobknnjdkzk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YWt1cHJ4ZWVvYmtubmpka3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjcyNzgsImV4cCI6MjA4NTIwMzI3OH0.ZSUfPWFrGD7YgqxvfT0OygEuVKhTrzh_0zFRldhP86w
EOF
    echo "✅ Archivo .env creado"
    echo ""
fi

echo "✅ Todo listo para iniciar"
echo ""
echo "Iniciando Expo con túnel público..."
echo "Esto permitirá que cualquiera con la URL pueda acceder"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start Expo with tunnel
npx expo start --tunnel

# This will keep running until you press Ctrl+C
