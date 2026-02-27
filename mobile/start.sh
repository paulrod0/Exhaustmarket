#!/bin/sh
# Minimal start script - exec expo as main process with CI=false
export CI=false
echo "=== Starting Expo (exec mode, CI=false) ==="
exec npx expo start --tunnel --max-workers 2
