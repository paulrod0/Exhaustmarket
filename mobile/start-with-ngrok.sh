#!/bin/bash

echo "========================================"
echo "INICIANDO EXPO CON NGROK"
echo "========================================"
echo ""

# Verificar si ngrok está configurado
echo "Verificando configuración de ngrok..."
if [ ! -f ~/.config/ngrok/ngrok.yml ] && [ ! -f ~/.ngrok2/ngrok.yml ]; then
    echo ""
    echo "❌ ERROR: ngrok no está configurado"
    echo ""
    echo "PASOS PARA CONFIGURAR:"
    echo ""
    echo "1. Crea una cuenta en ngrok (gratis):"
    echo "   https://dashboard.ngrok.com/signup"
    echo ""
    echo "2. Obtén tu authtoken:"
    echo "   https://dashboard.ngrok.com/get-started/your-authtoken"
    echo ""
    echo "3. Configura tu authtoken:"
    echo "   /tmp/ngrok authtoken TU_TOKEN_AQUI"
    echo ""
    echo "4. Vuelve a ejecutar este script"
    echo ""
    echo "Ver instrucciones completas en: SETUP_NGROK.md"
    echo ""
    exit 1
fi

# Detener procesos previos
echo "1. Deteniendo procesos anteriores..."
pkill -f ngrok 2>/dev/null
pkill -f expo 2>/dev/null
pkill -f metro 2>/dev/null
sleep 3

# Iniciar ngrok en background
echo "2. Iniciando túnel ngrok..."
/tmp/ngrok http 8081 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Esperar a que ngrok inicie
echo "3. Esperando a que ngrok esté listo..."
sleep 8

# Obtener la URL pública de ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'https://[^"]*' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Error: No se pudo obtener la URL de ngrok"
    echo ""
    echo "Logs de ngrok:"
    cat /tmp/ngrok.log | tail -20
    echo ""
    echo "Si ves 'authentication failed', configura tu authtoken:"
    echo "  /tmp/ngrok authtoken TU_TOKEN"
    echo ""
    echo "Ver: SETUP_NGROK.md"
    echo ""
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo "✅ Túnel ngrok activo:"
echo "   $NGROK_URL"
echo ""

# Extraer el host sin https://
NGROK_HOST=$(echo $NGROK_URL | sed 's|https://||')

# Configurar variable de entorno para Expo
export REACT_NATIVE_PACKAGER_HOSTNAME=$NGROK_HOST

echo "4. Iniciando servidor Expo..."
echo ""
echo "========================================"
echo "INSTRUCCIONES:"
echo "========================================"
echo ""
echo "URL del túnel: $NGROK_URL"
echo "Host: $NGROK_HOST"
echo ""
echo "En Expo Go:"
echo "  1. Escanea el código QR, O"
echo "  2. Ingresa manualmente: exp://$NGROK_HOST:8081"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - El túnel ngrok expira después de unas horas"
echo "   - Necesitas una cuenta de ngrok (gratis)"
echo ""
echo "========================================"
echo ""

# Iniciar Expo
cd /tmp/cc-agent/63103182/project/mobile
npm start

# Cleanup cuando se detenga
kill $NGROK_PID 2>/dev/null
