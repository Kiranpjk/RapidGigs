# 🚀 Quick Start - RapidGigs with Meta AI

Setup is complete! Here's how to start developing in 30 seconds.

## Option 1: Run Both Services Together (Production-Ready)

```bash
cd backend
bash start.sh
```

That's it! Both services + Meta AI bridge will start automatically.

---

## Option 2: Run Separately (Better for Development) ⭐ RECOMMENDED

Open **3 terminal windows:**

### Terminal 1 — Meta AI Bridge (with hot-reload)
```bash
cd backend
bash run-metaai-bridge.sh
```
**Output:** `Uvicorn running on http://0.0.0.0:8000`

### Terminal 2 — Backend Server (with hot-reload)
```bash
cd backend
npm run dev
```
**Output:** `Server running on http://localhost:3001`

### Terminal 3 — Frontend
```bash
cd frontend
npm run dev
```
**Output:** `Local: http://localhost:5173`

---

## Then Open in Browser

Go to **http://localhost:5173** and:

1. ✅ Sign in / Create account
2. ✅ Post a job with title, company, location, salary, description
3. ✅ Click "Generate Video" 🎬
4. ✅ Watch the video generate in real-time!

---

## Verify Setup

```bash
cd backend
bash test-metaai-setup.sh
```

Should output: `✅ All checks passed!`

---

## Documentation

- **Full Setup Guide:** `META_AI_SETUP.md`
- **Setup Complete Summary:** `SETUP_COMPLETE.md`
- **Troubleshooting:** See `META_AI_SETUP.md` → Troubleshooting section

---

## Key Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React app |
| Backend | http://localhost:3001 | Express API |
| Meta AI Bridge | http://localhost:8000 | Python FastAPI |
| Bridge Health | http://localhost:8000/healthz | Check bridge status |

---

## Example: Test Video Generation via Command Line

```bash
# Test Meta AI bridge is working
curl http://localhost:8000/healthz

# Generate a test video
curl -X POST http://localhost:8000/video \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A beautiful sunset over mountains","auto_poll":true}'
```

---

## Commands Reference

```bash
# One time setup
bash setup-dev.sh

# Verify everything
bash test-metaai-setup.sh

# Development
npm run dev                    # Backend
npm run build                  # Build TypeScript
bash run-metaai-bridge.sh      # Meta AI bridge
bash start.sh                  # Both together

# Production
NODE_ENV=production npm run build
NODE_ENV=production bash start.sh
```

---

## Storage

Generated videos are saved to: `backend/uploads/ai-videos/`

You can access them via: `http://localhost:3001/uploads/ai-videos/video-xyz.mp4`

---

That's it! You're ready to generate AI videos! 🎬

Questions? Check `META_AI_SETUP.md` for detailed documentation.
