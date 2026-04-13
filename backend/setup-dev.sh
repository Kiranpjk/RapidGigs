#!/usr/bin/env bash
# setup-dev.sh — Set up RapidGigs backend for development

set -e

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 RapidGigs Backend Setup"
echo "================================"

# ── Install Node dependencies ──
echo "✓ Installing Node dependencies..."
cd "$BACKEND_DIR"
npm install --loglevel=error
echo "  Dependencies installed"

# ── Check .env file ──
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "⚠️  .env file not found!"
  echo "  Please copy .env.example to .env"
  exit 1
fi

# ── Build TypeScript ──
echo "✓ Building TypeScript..."
npm run build --silent
echo "  Build complete"

echo ""
echo "================================"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  npm run dev"
echo ""
