#!/bin/sh
# Start Expo with CI=false and print the tunnel URL to stdout

export CI=false

echo "=== Starting Expo tunnel server ==="

# Start expo in background with stdin from /dev/null to avoid SIGTTIN
npx expo start --tunnel --max-workers 2 </dev/null &
EXPO_PID=$!

echo "Expo PID: $EXPO_PID"
echo "Waiting for ngrok tunnel to be ready..."

# Wait up to 60 seconds for ngrok API to become available
for i in $(seq 1 60); do
  sleep 2
  TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | node -e "
    let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        const j=JSON.parse(d);
        const t=j.tunnels&&j.tunnels[0];
        console.log(t?t.public_url:'');
      } catch(e){ console.log(''); }
    });
  " 2>/dev/null)

  if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo "============================================"
    echo "  EXPO TUNNEL URL (for Expo Go):"
    echo "  $TUNNEL_URL"
    echo "============================================"
    echo ""
    break
  fi
done

# Keep running as long as expo is alive
wait $EXPO_PID
