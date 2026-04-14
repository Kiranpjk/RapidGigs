# 🏗️ Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT / API CALLER                            │
│                                                                     │
│  curl / Postman / Frontend / Scripts                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP Requests
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS SERVER                                │
│                   (backend/src/server.ts)                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ HTTP Routes                                                  │  │
│  │                                                              │  │
│  │ POST   /api/crawler/crawl              ──────┐              │  │
│  │ POST   /api/crawler/quick-generate     ──────┼──┐           │  │
│  │ GET    /api/crawler/jobs               ──────┼──┼──┐        │  │
│  │ GET    /api/crawler/status/:jobId      ──────┼──┼──┼──┐     │  │
│  │ POST   /api/crawler/schedule           ──────┼──┼──┼──┼──┐  │  │
│  │                                             │  │  │  │  │  │  │
│  │                                             ▼  ▼  ▼  ▼  ▼  ▼  │  │
│  │ Routes File (routes/crawler.ts)                             │  │
│  │ ┌──────────────────────────────────────────────────────────┐ │  │
│  │ │ POST /crawl handler                                      │ │  │
│  │ │ POST /quick-generate handler                            │ │  │
│  │ │ GET /jobs handler                                       │ │  │
│  │ │ GET /status/:jobId handler                             │ │  │
│  │ │ POST /schedule handler                                 │ │  │
│  │ └────────┬──────────────────────────────────────────────┬─┘ │  │
│  └──────────┼──────────────────────────────────────────────┼──────┘  │
│             │                                              │          │
│             ▼                                              ▼          │
└─────────────────────────────────────────────────────────────────────┘
              │                                              │
              │ Requests jobs to crawl                       │ Saves jobs to memory
              │ and generate videos                         │ Returns status
              │                                              │
              ▼                                              ▼
    ┌──────────────────────────┐        ┌──────────────────────────┐
    │   WebsiteCrawler         │        │ VideoGenerationPipeline  │
    │ (services/websiteCrawler │        │ (services/                │
    │ .ts)                     │        │ videoGenerationPipeline  │
    │                          │        │ .ts)                     │
    │ ┌────────────────────┐   │        │                          │
    │ │ Puppeteer Browser  │   │        │ ┌──────────────────────┐ │
    │ │ • Launch           │   │        │ │ For each job:        │ │
    │ │ • Navigate URL     │   │        │ │                      │ │
    │ │ • Scroll page      │   │        │ │ 1. buildVideoScript()│ │
    │ │ • Extract jobs     │   │        │ │    (uses AI)         │ │
    │ │ • Return array     │   │        │ │                      │ │
    │ │                    │   │        │ │ 2. generateVideos()  │ │
    │ └────────────────────┘   │        │ │    • Meta AI         │ │
    │         │                │        │ │    • ZSky            │ │
    │         └────────────────┼───┐    │ │    • Parallel        │ │
    │                          │   │    │ │                      │ │
    │ Returns:                 │   │    │ │ 3. uploadCloudinary()│ │
    │ [                        │   │    │ │                      │ │
    │   {                      │   │    │ │ Returns: video URLs  │ │
    │     title: "...",        │   │    │ │                      │ │
    │     description: "...",  │   │    │ └──────────────────────┘ │
    │     url: "...",          │   │    │         │                │
    │     type: "job"          │   │    │         └──┬──────────┐  │
    │   }                      │   │    │            │          │  │
    │ ]                        │   │    │            ▼          ▼  │
    └──────────────────────────┘   │    └─────────────────────────┘
                                   │
                                   │ Jobs array
                                   │
                                   └──────────────────────────────┐
                                                                  │
              ┌───────────────────────────────────────────────────┘
              │
              ├─────────────────────┬──────────────┬────────────┐
              │                     │              │            │
              ▼                     ▼              ▼            ▼
    ┌──────────────────┐   ┌──────────────┐  ┌──────────┐  ┌──────────┐
    │ promptBuilder.ts │   │ metaAiVideo  │  │ zskyVideo│  │cloudinary│
    │ (EXISTING)       │   │ .ts          │  │.ts       │  │.ts       │
    │                  │   │ (EXISTING)   │  │(EXISTING)│  │(EXISTING)│
    │ Generates:       │   │              │  │          │  │          │
    │ 3-part video     │   │ Generates:   │  │Generates:│  │ Uploads: │
    │ script with      │   │ Video using  │  │Video using  │Videos to │
    │ visual prompts   │   │ Meta AI API  │  │ZSky SDK  │  │Cloudinary│
    │ and overlay text │   │              │  │          │  │          │
    │                  │   │ Uses:        │  │Uses:     │  │Returns:  │
    │ Uses: LLMs       │   │ Meta AI      │  │ZSky      │  │Secure URL│
    │ • OpenRouter     │   │ GraphQL API  │  │REST API  │  │          │
    │ • Cerebras       │   │ Browser      │  │          │  │          │
    │ • Ollama         │   │ automation   │  │          │  │          │
    │ • OpenAI         │   │              │  │          │  │          │
    └──────────────────┘   └──────────────┘  └──────────┘  └──────────┘
              │                     │              │            │
              └─────────────────────┴──────────────┴────────────┘
                                    │
                                    │ Generated Video URLs
                                    │
                                    ▼
                    ┌────────────────────────────┐
                    │   CLOUDINARY STORAGE       │
                    │                            │
                    │ https://res.cloudinary.com │
                    │ /yourcloud/...             │
                    │                            │
                    │ Videos persist here        │
                    └────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ START: User makes API request                                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
    ┌──────────────────┐      ┌────────────────────┐
    │ /crawl           │      │ /quick-generate    │
    │ (website URL)    │      │ (job description)  │
    └────────┬─────────┘      └──────────┬─────────┘
             │                           │
             ▼                           ▼
    ┌──────────────────┐      ┌────────────────────┐
    │ WebsiteCrawler   │      │ Create fake        │
    │ .crawlWebsite()  │      │ CrawledContent     │
    │                  │      │ object             │
    │ Returns:         │      └──────────┬─────────┘
    │ CrawledContent[] │                 │
    └────────┬─────────┘                 │
             │                           │
             └──────────────┬────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │ processContent(contentArray)│
              │                             │
              │ For each content item:      │
              └──────────────┬──────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ 1. buildVideoScript()    │
              │    (AI generates)        │
              │                          │
              │ Returns:                 │
              │ {                        │
              │   segments: [            │
              │     {                    │
              │       visualPrompt: "...",
              │       overlayText: "..."  │
              │     },                   │
              │     ...                  │
              │   ]                      │
              │ }                        │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ 2. generateVideosFrom    │
              │    Script()              │
              │                          │
              │ Parallel generation:     │
              │ ├─ Segment 1 → Meta AI   │
              │ ├─ Segment 2 → ZSky      │
              │ └─ Segment 3 → More...   │
              │                          │
              │ Returns:                 │
              │ GeneratedVideo[]         │
              │ [                        │
              │   {videoUrl, service,    │
              │    uploadedAt}           │
              │   ...                    │
              │ ]                        │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ 3. uploadVideoDirect()   │
              │    (for each video)      │
              │                          │
              │ Upload to Cloudinary     │
              │ Returns: cloudinary URL  │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ 4. Store in Pipeline     │
              │                          │
              │ VideoGenerationJob {     │
              │   contentId,             │
              │   status: 'completed',   │
              │   generatedVideos: [     │
              │     {...},               │
              │     {...}                │
              │   ]                      │
              │ }                        │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ Return to API Caller     │
              │                          │
              │ GET /jobs               │
              │ GET /status/:jobId       │
              │ (check videos)           │
              └──────────────────────────┘
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Time: T + 0ms                                                   │
│ User sends request                                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Time: T + 50ms                                                  │
│ API receives request, spawns background task, returns 202       │
│ (Accepted)                                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Time: T + 1-5s                                                  │
│ Background: WebsiteCrawler launches Puppeteer                  │
│ Navigates URL, scrolls page, extracts job listings             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Time: T + 10-15s                                                │
│ For first job:                                                  │
│ - promptBuilder generates video script (5-10s)                 │
│ - Starts 3 parallel video generations                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Time: T + 15-80s                                                │
│ 3 Videos generating in parallel:                               │
│ ├─ Meta AI (30-60s)                                            │
│ ├─ ZSky (10-30s)                                               │
│ └─ More... (varies)                                            │
│                                                                 │
│ All 3 videos upload to Cloudinary (5-15s each)                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Time: T + 80-150s                                               │
│ Repeat for remaining jobs (if any)                             │
│ All jobs run in sequence, but videos within each job parallel  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Time: T + Complete                                              │
│ All jobs finished, status: 'completed'                         │
│ Videos available in Cloudinary and via API                     │
└─────────────────────────────────────────────────────────────────┘

User can poll /api/crawler/jobs to monitor progress at any time
```

---

## File Dependencies

```
express server.ts
    │
    ├─→ routes/auth.ts
    ├─→ routes/jobs.ts
    ├─→ routes/users.ts
    ├─→ ... (other routes)
    │
    └─→ routes/crawler.ts ✨ NEW
        │
        ├─→ services/websiteCrawler.ts ✨ NEW
        │   └─→ puppeteer (npm)
        │   └─→ puppeteer-extra
        │   └─→ puppeteer-extra-plugin-stealth
        │
        ├─→ services/videoGenerationPipeline.ts ✨ NEW
        │   ├─→ services/promptBuilder.ts (existing)
        │   │   └─→ axios
        │   │   └─→ openrouter API
        │   │
        │   ├─→ services/metaAiVideo.ts (existing)
        │   │   └─→ axios
        │   │   └─→ uuid
        │   │
        │   ├─→ services/zskyVideo.ts (existing)
        │   │   └─→ axios
        │   │
        │   ├─→ services/cloudinary.ts (existing)
        │   │   └─→ cloudinary (npm)
        │   │
        │   └─→ fs (built-in)
        │   └─→ path (built-in)
        │   └─→ axios
        │
        └─→ node-cron ✨ NEW
            └─→ for scheduling
```

---

## Environment Variable Flow

```
.env file
├─ META_AI_COOKIE_DATR           → metaAiVideo.ts
├─ META_AI_ECTO_1_SESS           → metaAiVideo.ts
├─ ZSKY_API_KEY                  → zskyVideo.ts
├─ CLOUDINARY_CLOUD_NAME         → cloudinary.ts
├─ CLOUDINARY_API_KEY            → cloudinary.ts
├─ CLOUDINARY_API_SECRET         → cloudinary.ts
└─ OPENROUTER_API_KEY            → promptBuilder.ts
```

---

## Deployment Architecture

```
Production Server
│
├─ Backend (Node.js/Express)
│  ├─ routes/crawler.ts
│  ├─ services/websiteCrawler.ts (uses Puppeteer)
│  └─ services/videoGenerationPipeline.ts
│
├─ Database (MongoDB)
│  └─ Job collection (optional)
│
├─ External Services
│  ├─ Meta AI (meta.ai)
│  ├─ ZSky (zsky.ai)
│  └─ Cloudinary (cloud storage)
│
└─ Scheduled Tasks
   └─ node-cron (scheduling within process)
```

---

**For detailed information, see:**
- `FILE_REFERENCE.md` - What each file does
- `CRAWLER_GUIDE.md` - Complete documentation
- `CRAWLER_EXAMPLES.md` - Usage examples
