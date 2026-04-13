#!/usr/bin/env bash
# start.sh — Start the Express backend

set -e

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BACKEND_DIR"

# ── Start Express Backend (port $PORT) ──
echo "=== Starting Express Backend ==="
exec node dist/server.js
