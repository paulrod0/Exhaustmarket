#!/bin/bash

# Script para verificar el estado del servidor Expo

LOG_FILE="/tmp/expo-keepalive.log"
MOBILE_DIR="/tmp/cc-agent/63103182/project/mobile"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "         ESTADO DEL SERVIDOR EXPO KEEP-ALIVE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar si el keep-alive está corriendo
if pgrep -f "keep-alive.sh" > /dev/null; then
    echo "✅ Keep-Alive: ACTIVO"
    KEEPALIVE_PID=$(pgrep -f "keep-alive.sh")
    echo "   PID: $KEEPALIVE_PID"
else
    echo "❌ Keep-Alive: NO ACTIVO"
fi

echo ""

# Verificar si Expo está corriendo
if pgrep -f "expo start" > /dev/null; then
    echo "✅ Expo Server: CORRIENDO"
    EXPO_PID=$(pgrep -f "expo start")
    echo "   PID: $EXPO_PID"
else
    echo "❌ Expo Server: NO CORRIENDO"
fi

echo ""

# Obtener URL del túnel
if [ -f "$MOBILE_DIR/.expo/settings.json" ]; then
    TUNNEL_URL=$(cat "$MOBILE_DIR/.expo/settings.json" 2>/dev/null | grep -o '"urlRandomness":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$TUNNEL_URL" ]; then
        echo "📱 URL del Túnel:"
        echo "   exp://${TUNNEL_URL}-anonymous-8081.exp.direct"
        echo ""

        # Verificar conectividad del túnel
        if curl -s --max-time 5 "https://${TUNNEL_URL}-anonymous-8081.exp.direct/status" 2>&1 | grep -q "running"; then
            echo "✅ Túnel: RESPONDIENDO"
        else
            echo "⚠️  Túnel: NO RESPONDE"
        fi
    fi
fi

echo ""

# Mostrar últimas líneas del log
if [ -f "$LOG_FILE" ]; then
    echo "📋 Últimas 5 entradas del log:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -5 "$LOG_FILE" | sed 's/^/   /'
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Para ver el log completo ejecuta:"
echo "   tail -f /tmp/expo-keepalive.log"
echo ""
