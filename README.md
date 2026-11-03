# RapidGig

A video-first job platform connecting freelancers and recruiters with AI-powered video generation.

## Live Demo

[https://rapid-gigs.vercel.app/](https://rapid-gigs.vercel.app/)

## Features

- **AI Video Generation** — 30-second promotional videos stitched from cinematic prompts using multi-provider failover (Pollinations, Replicate, fal.ai)
- **Video Shorts Feed** — TikTok-style vertical video feed for job introductions
- **User Authentication** — Email/password + Google OAuth login
- **Job Listings** — Create, browse, filter, and apply to jobs
- **Applications** — Students apply with resumes and video introductions; recruiters review and manage applicant status
- **Real-time Messaging** — Built-in chat between students and recruiters
- **Role-based Access** — Separate dashboards for students and recruiters
- **Cloud Storage** — File uploads stored on Cloudinary (persistent across deploys)
- **Milestone Payments** — Java/Spring Boot escrow service: clients fund milestones, freelancers submit work, payment is released on approval ([details](payment-service/README.md))

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, TailwindCSS, Vite |
| Backend | Node.js, Express, TypeScript, MongoDB, Mongoose |
| Payment Service | Java 21, Spring Boot 3.3, Spring Data MongoDB, JUnit 5 |
| AI Services | Groq, OpenRouter, Ollama (text), Wan 2.1/Kling/Seedance (video) |
| Storage | Cloudinary |
| Auth | JWT + Google OAuth |
| Real-time | Socket.IO |
| Deployment | Vercel (frontend), Render (backend) |

## Architecture

```
┌─────────────┐     HTTPS     ┌─────────────────┐
│  Vercel     │ ────────────▶ │     Render      │
│  (React)    │               │  (Express API)  │
│             │ ◀──────────── │                 │
└─────────────┘   JSON/API    └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
           ┌────────────────┐  ┌──────────────┐  ┌──────────────┐
           │ payment-service│  │  MongoDB     │  │  Cloudinary  │
           │ (Spring Boot)  │─▶│  Atlas       │  │  (files)     │
           └────────────────┘  └──────────────┘  └──────────────┘
```

## Getting Started

### Prerequisites

- Node.js 22+
- MongoDB (local or Atlas URI)
- Java 21 + Maven (only for the payment service) — or just Docker

### Quick Start

```bash
git clone https://github.com/Kiranpjk/RapidGigs.git
cd RapidGigs
npm run dev
```

This starts:
- Backend API on `http://localhost:3001`
- Frontend app on `http://localhost:5173`

### Manual Setup

**Backend:**
```bash
cd backend
npm install
# Create .env (see Configuration below)
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Run parts separately:
```bash
npm run dev:backend   # backend only
npm run dev:frontend  # frontend only
```

**Payment service (Java):**
```bash
cd payment-service
PAYMENT_SERVICE_KEY=dev mvn spring-boot:run
mvn test   # escrow state-machine tests
```

Or run the whole stack: `docker compose up --build`

### Configuration

Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/rapidgig
JWT_SECRET=your_secret_here
CORS_ORIGIN=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Cloudinary (free tier: 25GB)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI Services (free tiers)
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
FAL_KEY=your_fal_key
REPLICATE_API_TOKEN=your_replicate_token
POLLINATIONS_KEY=your_pollinations_key

# Payment service (same key in both services)
PAYMENT_SERVICE_URL=http://localhost:8081
PAYMENT_SERVICE_KEY=dev
```

Create `frontend/.env`:
```env
VITE_API_BASE=http://localhost:3001/api
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/google` | Google OAuth login |
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create job |
| GET | `/api/videos` | List videos |
| POST | `/api/videos` | Upload video |
| GET | `/api/shorts/feed` | Shorts video feed |
| POST | `/api/shorts/generate` | AI video generation |
| GET | `/api/applications/job/:id` | View job applications |
| POST | `/api/applications` | Apply to job |
| GET | `/api/users/search?q=` | Search users |
| PATCH | `/api/users/:id` | Update profile |
| GET | `/api/messages/threads` | Message threads |
| POST | `/api/messages` | Send message |
| POST | `/api/payments/contracts` | Create milestone contract |
| GET | `/api/payments/contracts/:id` | View contract |
| POST | `/api/payments/contracts/:id/milestones/:index/{fund,submit,approve,reject}` | Milestone escrow steps |

## AI Video Pipeline

1. **Prompt Enhancement** — Job description → cinematic video prompt via OpenRouter → Groq → Ollama
2. **Clip Generation** — 3×10s segments via multi-provider failover:
   - Pollinations (free)
   - Replicate (free tier)
   - Hugging Face Router
   - fal.ai (pay-per-use)
3. **Image-to-Video Stitching** — Last frame of each clip feeds the next for continuity
4. **Concatenation** — ffmpeg stitches clips into one 30s video

## Deployment

- **Frontend**: Vercel — auto-deploys on push to `main`
- **Backend**: Render — build: `npm install && npm run build`, start: `npm start`
- **Payment Service**: Docker (`payment-service/Dockerfile`), needs `PAYMENT_SERVICE_KEY` and `MONGO_URI`
- **Database**: MongoDB Atlas (free tier, 512MB)
- **Storage**: Cloudinary (free tier, 25GB)
