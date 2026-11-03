# 🎥 RapidGigs Website Crawler & Video Generation System

## What Was Created

A complete **web crawler → AI video generation → Cloudinary upload** pipeline that:

1. **Crawls** your website using Puppeteer (headless browser)
2. **Extracts** job listings from your pages
3. **Generates** 3-segment video scripts using AI (promptBuilder)
4. **Creates** videos in parallel using **Meta AI** and **ZSky** services
5. **Uploads** to **Cloudinary** for cloud storage
6. **Provides** REST API endpoints for control

---

## Files Created/Modified

### 📁 Services
- **`src/services/websiteCrawler.ts`** — Puppeteer-based crawler
  - Navigates websites
  - Scrolls through infinite scroll
  - Extracts job cards and descriptions

- **`src/services/videoGenerationPipeline.ts`** — Video orchestrator
  - Builds video scripts from descriptions
  - Generates videos in parallel (3 at a time)
  - Uploads to Cloudinary
  - Tracks job status

### 📁 Routes
- **`src/routes/crawler.ts`** — REST API endpoints
  - `POST /api/crawler/crawl` — Crawl website
  - `POST /api/crawler/quick-generate` — Generate from text
  - `GET /api/crawler/jobs` — List all jobs
  - `GET /api/crawler/status/:jobId` — Check job progress
  - `POST /api/crawler/schedule` — Schedule recurring crawls

### 📁 Config
- **`src/server.ts`** — Updated to include crawler routes
- **`backend/package.json`** — Added `node-cron` dependency

### 📄 Documentation
- **`CRAWLER_GUIDE.md`** — Complete guide with examples
- **`crawler-quickstart.sh`** — Quick start script
- **`crawler_api_postman.json`** — Postman API collection

---

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set Environment Variables
Add to `.env` in your backend folder:
```env
# Meta AI (Required)
META_AI_COOKIE_DATR=xxx
META_AI_ECTO_1_SESS=xxx

# ZSky (Optional but recommended)
ZSKY_API_KEY=xxx

# Cloudinary (Required)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# AI LLM for script generation (Required)
OPENROUTER_API_KEY=xxx
```

### 3. Start Backend
```bash
npm run dev
```

### 4. Try It Out

**Option A: Quick Generate (Easiest)**
```bash
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Senior Developer role. React, Node.js, TypeScript. Remote. $100k-140k."
  }'
```

**Option B: Crawl Your Website**
```bash
curl -X POST http://localhost:5000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/jobs",
    "pageCount": 1,
    "maxScrolls": 5,
    "videoDuration": 10,
    "includeServices": ["meta-ai", "zsky"]
  }'
```

**Option C: Use the Quick Start Script**
```bash
chmod +x crawler-quickstart.sh
./crawler-quickstart.sh
```

### 5. Check Results
```bash
# Get all jobs
curl http://localhost:5000/api/crawler/jobs

# Get specific job details
curl http://localhost:5000/api/crawler/status/job_1712000000_xyz
```

---

## 📊 How It Works

```
┌─────────────────────────────────────────────┐
│  Your Website (localhost:3000/jobs)         │
└────────────────┬────────────────────────────┘
                 │
                 ▼ (Puppeteer Crawlers)
┌─────────────────────────────────────────────┐
│  Extract Job Listings                       │
│  • Title: "Senior Developer"                │
│  • Description: "5+ years React..."         │
└────────────────┬────────────────────────────┘
                 │
                 ▼ (promptBuilder AI)
┌─────────────────────────────────────────────┐
│  Generate 3-Part Video Script               │
│  Segment 1: Job title + workplace          │
│  Segment 2: Day-to-day tasks               │
│  Segment 3: Requirements + perks           │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┼────────┐
        │        │        │
        ▼        ▼        ▼
    [Meta AI] [ZSky] [More...]  (Parallel generation)
        │        │        │
        └────────┼────────┘
                 │
                 ▼ (Download if needed)
┌─────────────────────────────────────────────┐
│  Upload to Cloudinary                       │
│  Get secure URLs back                       │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  Return Results                             │
│  • 3 video URLs from Cloudinary            │
│  • Service used (meta-ai, zsky)            │
│  • Duration, timestamps                    │
└─────────────────────────────────────────────┘
```

---

## 📋 API Examples

### Generate Videos from Job Description
```bash
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Looking for experienced DevOps engineer to manage AWS infrastructure. 7+ years required. $150k-180k, full benefits."
  }'
```

### Crawl Multiple Pages
```bash
curl -X POST http://localhost:5000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/jobs",
    "pageCount": 3,
    "maxScrolls": 10,
    "videoDuration": 10,
    "includeServices": ["meta-ai", "zsky"]
  }'
```

### Schedule Daily Crawl
```bash
curl -X POST http://localhost:5000/api/crawler/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "interval": "0 9 * * *",
    "targetUrl": "http://localhost:3000/jobs"
  }'
```

### Check Job Progress
```bash
curl http://localhost:5000/api/crawler/status/job_XXXX_YYYY
```

---

## ⚙️ Configuration

### Video Duration
Set `videoDuration` in the request (default: 10 seconds):
```json
{
  "videoDuration": 15
}
```

### Parallel Generation
Edit `videoGenerationPipeline.ts` to change parallel count:
```typescript
maxParallelGeneration: 3  // Generate 3 videos simultaneously
```

### Video Services
Choose which services to use:
```json
{
  "includeServices": ["meta-ai", "zsky", "wavespeed"]
}
```

### Crawl Scope
Adjust scrolling and pagination:
```json
{
  "maxScrolls": 20,     // How many times to scroll down
  "pageCount": 5        // How many pages to crawl
}
```

---

## 🔧 Customization

### Adjust Job Card Selectors
Edit `websiteCrawler.ts` to match your website's markup:

```typescript
// Find your job cards (inspect element on website)
const jobElements = document.querySelectorAll(
  '[data-testid="job-card"],     // Your custom selector
   .job-card,                     // CSS class
   [class*="job-listing"],       // Any class containing "job-listing"
   .position-card'               // Another variant
);
```

### Add More Video Services
Edit `videoGenerationPipeline.ts`:

```typescript
case 'your-service':
  const result = await generateVideoYourService(prompt);
  if (result?.videoUrl) {
    return { success: true, videoUrl: result.videoUrl };
  }
  break;
```

---

## 📚 Full Documentation

See **`CRAWLER_GUIDE.md`** for:
- Detailed API documentation
- Environment setup
- Troubleshooting
- Database integration examples
- Performance tips
- All configuration options

---

## ✅ What's Included

- ✅ Puppeteer web crawler (handles infinite scroll + pagination)
- ✅ Multi-service parallel video generation (Meta AI + ZSky + more)
- ✅ Automatic Cloudinary upload
- ✅ REST API with full CRUD operations
- ✅ Job status tracking
- ✅ Scheduled crawls (cron-based)
- ✅ Comprehensive error handling
- ✅ Type-safe TypeScript
- ✅ Full documentation + examples
- ✅ Postman collection

---

## 🎯 Next Steps

1. **Copy your `.env` variables** from production/dev config
2. **Start the backend**: `npm run dev`
3. **Test quick-generate first** (doesn't need crawling)
4. **Check Cloudinary dashboard** for uploaded videos
5. **Crawl your live site** when ready
6. **Set up scheduled crawls** for daily automatic generation

---

## 🐛 Troubleshooting

**"Videos not generating?"**
- Check that Cloudinary env vars are set
- Verify Meta AI credentials are fresh
- Look at server logs for specific errors

**"No content found during crawl?"**
- Verify the target URL is correct
- Adjust job card selectors in `websiteCrawler.ts`
- Try a simpler page first

**"Puppeteer not found?"**
- Run: `npm install puppeteer --force`

---

**Happy video generation! 🚀**

For questions or issues, check `CRAWLER_GUIDE.md` or server logs.
