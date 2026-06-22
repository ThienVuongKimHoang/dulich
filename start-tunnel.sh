#!/usr/bin/env bash
# Start Cloudflare quick tunnel for backend and update frontend .env

set -e

BACKEND_PORT=8000
FRONTEND_ENV="/Users/vuongkimhoangthien/dulich/frontend/.env"
LOG_FILE="/tmp/cloudflared-tunnel.log"

echo "🚇  Starting Cloudflare tunnel on port $BACKEND_PORT..."

# Kill any existing cloudflared process
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Start tunnel in background, capture output
cloudflared tunnel --url "http://localhost:$BACKEND_PORT" > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

echo "  PID: $TUNNEL_PID — waiting for URL..."

# Wait up to 30s for the URL to appear
TUNNEL_URL=""
for i in $(seq 1 30); do
    TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -1)
    if [ -n "$TUNNEL_URL" ]; then break; fi
    sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
    echo "❌  Could not detect tunnel URL. Check $LOG_FILE"
    exit 1
fi

echo "✅  Tunnel URL: $TUNNEL_URL"

# Update frontend .env
echo "VITE_API_URL=$TUNNEL_URL" > "$FRONTEND_ENV"
echo "  Updated $FRONTEND_ENV"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backend tunnel : $TUNNEL_URL"
echo "  Frontend env   : $FRONTEND_ENV"
echo "  Tunnel PID     : $TUNNEL_PID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To stop: kill $TUNNEL_PID"
