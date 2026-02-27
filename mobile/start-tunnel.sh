#!/bin/bash
cd /tmp/cc-agent/63103182/project/mobile
export EXPO_NO_DOTENV=1
npx expo start --tunnel > /tmp/expo-output.log 2>&1 &
sleep 20
echo "Tunnel URL:"
curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4
