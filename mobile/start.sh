#!/bin/sh
# Railway hace el proxy HTTPS directamente a Metro en puerto 8081
# No necesitamos ngrok ni localtunnel — la URL de Railway es permanente
export CI=false
export REACT_NATIVE_PACKAGER_HOSTNAME=exhaustmarket-production.up.railway.app

echo "============================================"
echo "  ABRE EN EXPO GO con esta URL (permanente):"
echo "  exp://exhaustmarket-production.up.railway.app"
echo "============================================"

exec npx expo start --port 8081 --max-workers 2
