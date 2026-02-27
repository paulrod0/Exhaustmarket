#!/bin/sh
# Start Expo tunnel server and print the tunnel URL to Railway logs.
# Expo runs as the MAIN process (via exec) to ensure container stays alive.

export CI=false

echo "=== Starting Expo tunnel server ==="

# Start a background subshell that polls ngrok API and prints the URL.
# This subshell is fully detached from expo's lifecycle.
(
  echo "URL watcher started, polling ngrok API..."
  for i in $(seq 1 60); do
    sleep 3
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
) &

# Replace this shell with expo as the MAIN process (keeps container alive).
exec npx expo start --tunnel --max-workers 2
