# Website Crawler & Video Generation Pipeline

A complete system to crawl your RapidGigs website, automatically generate AI videos from job descriptions, and save them to Cloudinary.

## Overview

The pipeline consists of three main components:

1. **WebsiteCrawler** (`websiteCrawler.ts`) — Puppeteer-based crawler that:
   - Navigates your website
   - Scrolls through content
   - Extracts job listings and descriptions

2. **VideoGenerationPipeline** (`videoGenerationPipeline.ts`) — Orchestrates video generation:
   - Builds video scripts from job descriptions using AI (promptBuilder)
   - Generates videos in parallel from multiple video services
   - Uploads to Cloudinary
   - Stores metadata in database

3. **Crawler Routes** (`routes/crawler.ts`) — RESTful API endpoints for control

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

This installs:
- `puppeteer` — Headless browser automation
- `node-cron` — Schedule recurring crawls
- (All other video generation services already installed)

### 2. Environment Variables

Add to your `.env`:

```env
# Meta AI Video Generation
META_AI_COOKIE_DATR=your_datr_cookie
META_AI_ECTO_1_SESS=your_ecto_1_sess_cookie
META_AI_RD_CHALLENGE=your_rd_challenge_cookie

# ZSky AI Video Generation
ZSKY_API_KEY=your_zsky_api_key
ZSKY_BASE_URLS=https://zsky.ai/api/v1/videos/generate

# Cloudinary Upload
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# LLM for Video Script Building
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-oss-120b:free

# Optional: Ollama for local LLM
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:latest
```

### 3. Start the Backend

```bash
npm run dev
```

The API will be available at `http://localhost:5000` (or your configured port).

## API Endpoints

### 1. **Crawl Website & Generate Videos**

**POST** `/api/crawler/crawl`

Crawl your website and automatically generate videos from job listings.

**Request Body:**
```json
{
  "targetUrl": "http://localhost:3000/jobs",
  "pageCount": 1,
  "maxScrolls": 10,
  "videoDuration": 10,
  "includeServices": ["meta-ai", "zsky"]
}
```

**Response:**
```json
{
  "message": "Crawl started",
  "targetUrl": "http://localhost:3000/jobs",
  "pageCount": 1
}
```

**How it works:**
1. Puppeteer crawls the target URL
2. Scrolls through the page collecting job listings
3. Extracts job title and description
4. For each job:
   - Builds a 3-segment video script using AI (promptBuilder)
   - Generates 3 videos in parallel using different services
   - Uploads each video to Cloudinary
   - Returns video URLs

**Note:** This runs asynchronously. Videos are generated in the background.

---

### 2. **Quick Generate (From Description)**

**POST** `/api/crawler/quick-generate`

Generate videos directly from a job description without crawling.

**Request Body:**
```json
{
  "jobDescription": "Senior Full Stack Engineer needed at innovative tech startup. Build scalable web applications using Node.js and React. 5+ years experience required. $120k-150k salary, remote work available.",
  "url": "optional-source-url"
}
```

**Response:**
```json
{
  "message": "Video generation started",
  "jobDescription": "Senior Full Stack Engineer needed..."
}
```

---

### 3. **Check Job Status**

**GET** `/api/crawler/status/:jobId`

Get the status and generated videos for a specific job.

**Response:**
```json
{
  "jobId": "job_1712000000_abc123",
  "status": "completed",
  "title": "Senior Developer",
  "videoCount": 3,
  "progress": 1,
  "videos": [
    {
      "serviceUsed": "meta-ai",
      "videoUrl": "https://...",
      "cloudinaryUrl": "https://res.cloudinary.com/...",
      "duration": 10,
      "generatedAt": "2024-04-14T12:00:00Z"
    },
    // ... more videos
  ]
}
```

---

### 4. **List All Active Jobs**

**GET** `/api/crawler/jobs`

Get a summary of all active and completed generation jobs.

**Response:**
```json
{
  "totalJobs": 5,
  "jobs": [
    {
      "jobId": "job_1712000000_abc123",
      "status": "completed",
      "title": "Senior Developer",
      "videoCount": 3,
      "createdAt": "2024-04-14T12:00:00Z"
    },
    // ... more jobs
  ]
}
```

---

### 5. **Schedule Recurring Crawls**

**POST** `/api/crawler/schedule`

Set up a recurring crawl (e.g., daily at 9 AM).

**Request Body:**
```json
{
  "interval": "0 9 * * *",
  "targetUrl": "http://localhost:3000/jobs"
}
```

Uses cron expression format:
- `0 9 * * *` → Daily at 9 AM
- `*/5 * * * *` → Every 5 minutes
- `0 */6 * * *` → Every 6 hours
- `0 0 * * 0` → Weekly on Sunday

**Response:**
```json
{
  "message": "Scheduled crawl created",
  "interval": "0 9 * * *",
  "targetUrl": "http://localhost:3000/jobs",
  "taskId": "..."
}
```

---

## Usage Examples

### Example 1: Crawl Local Dev Server

```bash
curl -X POST http://localhost:5000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/jobs",
    "pageCount": 2,
    "maxScrolls": 5,
    "videoDuration": 10,
    "includeServices": ["meta-ai", "zsky"]
  }'
```

### Example 2: Generate Videos from Text

```bash
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Seeking passionate Frontend Developer. React, TypeScript, Tailwind CSS. Remote position. $80k-110k."
  }'
```

### Example 3: Check Status

```bash
curl http://localhost:5000/api/crawler/status/job_1712000000_abc123
```

### Example 4: Schedule Daily Crawl

```bash
curl -X POST http://localhost:5000/api/crawler/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "interval": "0 9 * * *",
    "targetUrl": "http://productive.yoursite.com/jobs"
  }'
```

---

## How It Works (Flow Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. API Request (/api/crawler/crawl)                          │
│    Provide: targetUrl, video services, duration              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. WebsiteCrawler (Puppeteer)                                │
│    • Launch headless browser                                  │
│    • Navigate to targetUrl                                    │
│    • Scroll through infinite scroll / pagination              │
│    • Extract job cards (title, description)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼  [Array of CrawledContent]
┌──────────────────────────────────────────────────────────────┐
│ 3. VideoGenerationPipeline.processContent()                 │
│    For each crawled job:                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
    ┌─────────────────────┐  ┌──────────────────────────────┐
    │ 4. promptBuilder    │  │ Store Job Metadata           │
    │ (AI Script Gen)     │  │ • Title, description         │
    │                     │  │ • createdAt timestamp        │
    │ Generates:          │  └──────────────────────────────┘
    │ • 3-segment script  │
    │ • Visual prompts    │
    │ • Overlay text      │
    └────────┬────────────┘
             │
             ▼ [VideoScript with 3 segments]
    ┌────────────────────────────────────────────┐
    │ 5. Generate Videos (Parallel - 3 at a time)│
    │    seg 1 → meta-ai    }                     │
    │    seg 2 → zsky       } Run in parallel    │
    │    seg 3 → ...        }                     │
    └──────────────┬────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    [Video1]  [Video2]  [Video3]
        │          │          │
        └──────────┼──────────┘
                   │
                   ▼
    ┌─────────────────────────────────────────┐
    │ 6. Upload to Cloudinary                 │
    │    • Download video (if needed)          │
    │    • Upload buffer to Cloudinary         │
    │    • Get secure_url back                │
    └──────────────┬──────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │ 7. Return Results                    │
    │    • Cloudinary URLs                 │
    │    • Service used (meta-ai, zsky...) │
    │    • Duration, timestamps            │
    │    • Status: completed               │
    └──────────────────────────────────────┘
```

---

## Video Generation Services

The system supports multiple parallel video generation services:

### MetaAi (meta-ai)
- **Status**: ✅ Fully integrated
- **Duration**: ~5-10 seconds
- **Quality**: High
- **Cost**: Free (requires Meta AI credentials)
- **Setup**: Set `META_AI_*` env vars

### ZSky (zsky)
- **Status**: ✅ Fully integrated
- **Duration**: 5 seconds
- **Quality**: Good
- **Cost**: Depends on plan
- **Setup**: Set `ZSKY_API_KEY`

### MagicHour (wavespeed, magic-hour)
- **Status**: Available, not parallelized yet
- **Duration**: 7-15 seconds
- **Quality**: High
- **Cost**: Depends on plan

---

## Customization

### Change Video Selectors

Edit [websiteCrawler.ts](websiteCrawler.ts) to customize job card extraction:

```typescript
// Current selectors (adjust for your markup):
const jobElements = document.querySelectorAll(
  '[data-testid="job-card"], .job-card, [class*="job-listing"], .position-card'
);
```

### Change Video Duration

When calling the API, set `videoDuration`:

```json
{
  "videoDuration": 15  // 15 seconds instead of 10
}
```

### Add More Services

Edit [videoGenerationPipeline.ts](videoGenerationPipeline.ts), method `generateSingleVideo()`:

```typescript
case 'wavespeed':
  const waveResult = await generateVideoWavespeed(prompt);
  if (waveResult?.videoUrl) {
    return { success: true, videoUrl: waveResult.videoUrl };
  }
  break;
```

---

## Troubleshooting

### ❌ "No videos generated"

1. Check Cloudinary credentials in `.env`
2. Verify Meta AI cookies are fresh (update if expired)
3. Check video service API keys
4. Look at server logs for specific errors

### ❌ "Crawler found 0 items"

1. Check if `targetUrl` is correct
2. Adjust `maxScrolls` if pagination is slow
3. Update job card selectors in `websiteCrawler.ts`
4. Try targeting a simpler page first

### ❌ "404: Puppeteer browser not found"

```bash
# Reinstall Chromium binary
npm install puppeteer --force
```

### ❌ "Rate limit exceeded"

The system already has rate limiting on expensive endpoints. Wait 1 hour or scale up your video generation accounts.

---

## Performance Tips

1. **Run 3 videos in parallel** (default) — adjust with `maxParallelGeneration`
2. **Use ZSky + Meta AI together** — different model = better diversity
3. **Batch crawl multiple pages** — crawl 3-5 pages at once
4. **Schedule off-peak** — run crawls late night when servers are less busy

---

## Database Integration

Videos are currently returned as JSON. To persist to database:

**Option 1:** Add to your Job or ShortVideo model:
```typescript
interface Job {
  title: string;
  description: string;
  generatedVideos?: {
    url: string;
    service: string;
    duration: number;
  }[];
}
```

**Option 2:** Create a new `GeneratedVideo` collection:
```typescript
interface GeneratedVideo {
  jobId: ObjectId;
  cloudinaryUrl: string;
  service: 'meta-ai' | 'zsky';
  duration: number;
  createdAt: Date;
}
```

---

## Next Steps

1. ✅ Start backend: `npm run dev`
2. ✅ Test with: `curl http://localhost:5000/api/crawler/jobs`
3. ✅ Try quick-generate first (simpler than crawling)
4. ✅ Set up Cloudinary credentials
5. ✅ Crawl your dev server at `http://localhost:3000`
6. ✅ Check Cloudinary dashboard for uploaded videos

---

## File Structure

```
backend/src/
├── services/
│   ├── websiteCrawler.ts          # Puppeteer crawling logic
│   ├── videoGenerationPipeline.ts # Video generation orchestration
│   ├── promptBuilder.ts           # (existing) AI script generation
│   ├── metaAiVideo.ts             # (existing) Meta AI integration
│   ├── zskyVideo.ts               # (existing) ZSky integration
│   └── cloudinary.ts              # (existing) Cloudinary upload
├── routes/
│   └── crawler.ts                 # ← NEW: API route endpoints
└── server.ts                      # (updated) Added /api/crawler route
```

---

**Happy crawling! 🚀**
