#!/bin/sh
# Usa localtunnel en lugar de ngrok → URL estable que no cambia al reiniciar
export CI=false
export REACT_NATIVE_PACKAGER_HOSTNAME=exhaustmarket-expo.loca.lt

echo "=== Iniciando localtunnel (reemplaza ngrok) ==="
./node_modules/.bin/lt --port 8081 --subdomain exhaustmarket-expo &

# Espera a que localtunnel conecte
sleep 5

echo "============================================"
echo "  ABRE EN EXPO GO con esta URL estable:"
echo "  exp://exhaustmarket-expo.loca.lt"
echo "============================================"

exec npx expo start --port 8081 --max-workers 2
