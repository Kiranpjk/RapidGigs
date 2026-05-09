#!/usr/bin/env bash
# exit on error
set -o errexit

echo "--- Installing dependencies ---"
npm install

echo "--- Building TypeScript ---"
npm run build

echo "--- Installing Chrome for Puppeteer ---"
npx puppeteer browsers install chrome

echo "--- Installing FFmpeg (Static) ---"
if [ ! -f "bin/ffmpeg" ]; then
  mkdir -p bin
  curl -L https://github.com/eugeneware/ffmpeg-static/releases/latest/download/linux-x64 -o bin/ffmpeg
  chmod +x bin/ffmpeg
fi

echo "--- Setup Complete ---"
