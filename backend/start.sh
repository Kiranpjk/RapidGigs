#!/usr/bin/env bash
# start.sh — Build and Start the Express backend with all services

set -e

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BACKEND_DIR"

# ── Build TypeScript if needed ──
if [ ! -d "dist" ] || [ "src" -nt "dist" ]; then
    echo "🔨 Building TypeScript..."
    npm run build
    echo "✅ Build complete"
fi

# ── Start Express Backend (loads all services) ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting RapidGigs Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Services Ready:"
echo "   ✅ Website Crawler (Puppeteer)"
echo "   ✅ Video Generation Pipeline"
echo "   ✅ VeoAIFree Web Automation"
echo "   ✅ Meta AI Integration"
echo "   ✅ ZSky AI Integration"
echo "   ✅ Cloudinary Upload"
echo "   ✅ MongoDB Database"
echo ""
echo "🔗 API Endpoints:"
echo "   POST /api/crawler/quick-generate       — Generate video from description"
echo "   GET  /api/crawler/jobs                 — List active generation jobs"
echo "   GET  /api/crawler/status/:jobId        — Check generation progress"
echo ""
exec node dist/server.js
