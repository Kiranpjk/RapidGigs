#!/usr/bin/env bash
# start.sh — Run both Meta AI API and Express backend on one Render instance

set -e

# ── Install Python deps for metaai-api (only on fresh builds) ──
META_DIR="$(cd "$(dirname "$0")" && pwd)/metaai-api"
VENV="$META_DIR/.venv"

if [ ! -d "$VENV" ]; then
  echo "=== Creating Python virtualenv for Meta AI API ==="
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --upgrade pip
  "$VENV/bin/pip" install \
    "fastapi>=0.95.2" \
    "uvicorn[standard]>=0.22.0" \
    "python-dotenv>=1.0.0" \
    "python-multipart>=0.0.21" \
    "requests>=2.31.0" \
    "beautifulsoup4>=4.9.0" \
    "lxml-html-clean>=0.1.1"
  echo "=== Python deps installed ==="
fi

# ── Start Meta AI API (port 8000) ──
echo "=== Starting Meta AI API on :8000 ==="
"$VENV/bin/uvicorn" metaai_api.api_server:app \
  --host 127.0.0.1 \
  --port 8000 \
  --log-level warning &
META_PID=$!

# Wait for metaai-api to accept connections
echo "Waiting for Meta AI API to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/healthz > /dev/null 2>&1; then
    echo "✅ Meta AI API is ready"
    break
  fi
  sleep 2
done

# ── Start Express Backend (port $PORT) ──
echo "=== Starting Express Backend ==="
exec node dist/server.js
