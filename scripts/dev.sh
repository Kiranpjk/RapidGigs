#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

npm run dev --prefix backend &
BACKEND_PID=$!

npm run dev --prefix frontend &
FRONTEND_PID=$!

wait -n "$BACKEND_PID" "$FRONTEND_PID"
