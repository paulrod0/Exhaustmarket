#!/bin/bash

# Script para mantener Expo corriendo durante 12 horas
# Monitorea y reinicia automáticamente si el servidor se detiene

DURATION=$((12 * 60 * 60))  # 12 horas en segundos
END_TIME=$(($(date +%s) + DURATION))
LOG_FILE="/tmp/expo-keepalive.log"
EXPO_LOG="/tmp/expo-sdk54.log"
MOBILE_DIR="/tmp/cc-agent/63103182/project/mobile"
CHECK_INTERVAL=60  # Verificar cada 60 segundos

echo "=== Expo Keep-Alive iniciado ===" | tee -a "$LOG_FILE"
echo "Tiempo de inicio: $(date)" | tee -a "$LOG_FILE"
echo "Durará hasta: $(date -d @$END_TIME)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Función para iniciar Expo
start_expo() {
    echo "[$(date)] Iniciando Expo con túnel..." | tee -a "$LOG_FILE"
    cd "$MOBILE_DIR"
    npx expo start --tunnel > "$EXPO_LOG" 2>&1 &
    EXPO_PID=$!
    echo "[$(date)] Expo iniciado con PID: $EXPO_PID" | tee -a "$LOG_FILE"
    sleep 30  # Dar tiempo para que se inicie completamente
}

# Función para verificar si Expo está corriendo
check_expo() {
    # Verificar si el proceso existe
    if ! ps -p $EXPO_PID > /dev/null 2>&1; then
        return 1
    fi

    # Verificar si el túnel responde
    TUNNEL_URL=$(cat "$MOBILE_DIR/.expo/settings.json" 2>/dev/null | grep -o '"urlRandomness":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$TUNNEL_URL" ]; then
        if curl -s --max-time 5 "https://${TUNNEL_URL}-anonymous-8081.exp.direct/status" 2>&1 | grep -q "running"; then
            return 0
        fi
    fi

    return 1
}

# Iniciar Expo por primera vez
start_expo

# Loop principal de monitoreo
while [ $(date +%s) -lt $END_TIME ]; do
    sleep $CHECK_INTERVAL

    if ! check_expo; then
        echo "[$(date)] ⚠️  Expo no responde. Reiniciando..." | tee -a "$LOG_FILE"

        # Matar proceso anterior si existe
        if [ -n "$EXPO_PID" ]; then
            kill -9 $EXPO_PID 2>/dev/null || true
        fi

        # Limpiar procesos Expo zombies
        pkill -9 -f "expo start" 2>/dev/null || true
        pkill -9 -f "Metro" 2>/dev/null || true

        sleep 5
        start_expo
    else
        TUNNEL_URL=$(cat "$MOBILE_DIR/.expo/settings.json" 2>/dev/null | grep -o '"urlRandomness":"[^"]*"' | cut -d'"' -f4)
        echo "[$(date)] ✓ Expo corriendo correctamente - exp://${TUNNEL_URL}-anonymous-8081.exp.direct" >> "$LOG_FILE"
    fi

    # Mostrar tiempo restante cada hora
    REMAINING=$((END_TIME - $(date +%s)))
    if [ $((REMAINING % 3600)) -lt $CHECK_INTERVAL ]; then
        HOURS=$((REMAINING / 3600))
        MINUTES=$(((REMAINING % 3600) / 60))
        echo "[$(date)] 📊 Tiempo restante: ${HOURS}h ${MINUTES}m" | tee -a "$LOG_FILE"
    fi
done

echo "" | tee -a "$LOG_FILE"
echo "=== Keep-Alive completado ===" | tee -a "$LOG_FILE"
echo "Tiempo de finalización: $(date)" | tee -a "$LOG_FILE"

# Limpiar al finalizar
if [ -n "$EXPO_PID" ]; then
    kill $EXPO_PID 2>/dev/null || true
fi
