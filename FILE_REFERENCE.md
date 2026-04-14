# 📋 File Reference - What Everything Does

## Core Implementation Files

### 1. `backend/src/services/websiteCrawler.ts`
**What it does**: Crawls websites using Puppeteer

**Key Methods**:
- `initialize()` - Start headless browser
- `crawlWebsite()` - Crawl single page with scrolling
- `crawlMultiplePages()` - Crawl multiple paginated pages
- `crawlJobListings()` - Specialized job listing extraction
- `closeBrowser()` - Clean up resources

**Usage**:
```typescript
import { websiteCrawler } from './services/websiteCrawler';

const content = await websiteCrawler.crawlWebsite({
  targetUrl: 'http://localhost:3000/jobs',
  maxScrolls: 10,
});
```

---

### 2. `backend/src/services/videoGenerationPipeline.ts`
**What it does**: Orchestrates video generation from job descriptions

**Key Methods**:
- `buildVideoScript()` - AI script generation
- `generateSingleVideo()` - Generate one video
- `downloadVideo()` - Download from URL to local file
- `uploadVideoDirect()` - Upload to Cloudinary
- `generateVideosFromScript()` - Generate 3 videos in parallel
- `processContent()` - Full pipeline (crawled content → videos)

**Usage**:
```typescript
import { videoGenerationPipeline } from './services/videoGenerationPipeline';

const jobs = await videoGenerationPipeline.processContent(
  crawledContent,
  { maxParallelGeneration: 3, includeServices: ['meta-ai', 'zsky'] }
);
```

---

### 3. `backend/src/routes/crawler.ts`
**What it does**: REST API endpoints for the crawler system

**Endpoints**:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/crawl` | POST | Crawl website + generate videos |
| `/quick-generate` | POST | Generate from job description |
| `/jobs` | GET | List all active jobs |
| `/status/:jobId` | GET | Get detailed job status |
| `/schedule` | POST | Schedule recurring crawls |

**Example Route Handler**:
```typescript
router.post('/crawl', async (req, res) => {
  const { targetUrl, pageCount, videoDuration } = req.body;
  // Crawl website
  // Generate videos
  // Return response
});
```

---

## Configuration Files

### 4. `backend/src/server.ts` (Modified)
**What changed**:
- Added import: `import crawlerRoutes from './routes/crawler';`
- Added route: `app.use('/api/crawler', crawlerRoutes);`

**Where to find it**:
- Import section: Line ~17 (with other route imports)
- Route usage: Line ~118 (with other app.use() calls)

---

### 5. `backend/package.json` (Modified)
**What changed**:
- Added dependency: `"node-cron": "^3.0.3"`
- Added dev dependency: `"@types/node-cron": "^3.0.11"`

**Purpose**: Enable scheduled crawls using cron expressions

---

## Documentation Files

### 6. `CRAWLER_SETUP.md`
**What it is**: Quick start guide (5-10 minutes)

**Contains**:
- Installation steps
- Environment variable setup
- Running the backend
- Quick testing
- Configuration basics
- File structure overview

**Read this first for**: Getting started immediately

---

### 7. `CRAWLER_GUIDE.md`
**What it is**: Comprehensive documentation

**Contains**:
- Complete setup instructions
- All 5 API endpoints with examples
- Request/response examples
- How it works (flow diagram)
- Video generation services
- Customization options
- Troubleshooting section
- Database integration examples
- Performance tips

**Read this for**: Understanding everything in detail

---

### 8. `CRAWLER_EXAMPLES.md`
**What it is**: Real-world usage examples

**Contains**:
- Example 1: Quick generate (simplest)
- Example 2: Crawl local dev server
- Example 3: Crawl multiple pages
- Example 4: Schedule daily crawl
- Example 5: Batch generate from CSV
- Example 6: Monitor active jobs
- Example 7: Different video durations
- Example 8: Single video service
- Example 9: Database integration
- Performance benchmarks
- Troubleshooting examples

**Read this for**: Real examples you can copy-paste

---

### 9. `CRAWLER_SUMMARY.md`
**What it is**: High-level overview

**Contains**:
- What was delivered
- Core components table
- Features list
- Quick start
- How it works (diagram)
- API overview
- Key capabilities table
- Testing checklist
- Troubleshooting quick table
- Next steps

**Read this for**: Getting the big picture

---

## Utility Files

### 10. `crawler-quickstart.sh`
**What it is**: Automated quick start script

**Does**:
1. Checks if backend is running
2. Tests quick-generate endpoint
3. Lists active jobs
4. Optionally schedules a crawl
5. Provides next steps

**Usage**:
```bash
chmod +x crawler-quickstart.sh
./crawler-quickstart.sh
```

---

### 11. `crawler_api_postman.json`
**What it is**: Postman API collection

**Contains**:
- All 5 API endpoints pre-configured
- Example request bodies
- Headers pre-set
- Ready to import into Postman

**Usage**:
1. Open Postman
2. File → Import
3. Select `crawler_api_postman.json`
4. All endpoints ready to use

---

## Dependencies Added

### `node-cron` (^3.0.3)
**Purpose**: Schedule recurring crawls using cron expressions
**Used in**: `/api/crawler/schedule` endpoint

**Example**:
```typescript
cron.schedule('0 9 * * *', () => {
  // Run this every day at 9 AM
  websiteCrawler.crawlWebsite(...);
});
```

---

## How Files Connect

```
User Request
    ↓
Routes (crawler.ts)
    ↓
Services:
    ├─ websiteCrawler.ts (gets content from website)
    │   ↓
    └─ videoGenerationPipeline.ts (generates videos)
        ├─ promptBuilder.ts (exists - AI script)
        ├─ metaAiVideo.ts (exists - video gen)
        ├─ zskyVideo.ts (exists - video gen)
        └─ cloudinary.ts (exists - upload)
    ↓
Response (video URLs)
```

---

## Quick Reference

### To Crawl a Website
1. User calls: `POST /api/crawler/crawl`
2. Routes (`crawler.ts`) receives request
3. Calls `websiteCrawler.crawlWebsite()`
4. Gets array of job listings
5. Calls `videoGenerationPipeline.processContent()`
6. Returns video URLs from Cloudinary

### To Generate Videos Directly
1. User calls: `POST /api/crawler/quick-generate`
2. Routes creates fake `CrawledContent` object
3. Calls `videoGenerationPipeline.processContent()`
4. Returns video URLs

### To Schedule Recurring Crawl
1. User calls: `POST /api/crawler/schedule`
2. Routes uses `node-cron` to schedule
3. At specified time, crawl + generate runs automatically

---

## Testing Each Part

### Test WebsiteCrawler Independently
```typescript
import { websiteCrawler } from './services/websiteCrawler';

const content = await websiteCrawler.crawlWebsite({
  targetUrl: 'http://localhost:3000/jobs',
});
console.log(content); // See what it extracted
```

### Test VideoGenerationPipeline Independently
```typescript
import { videoGenerationPipeline } from './services/videoGenerationPipeline';

const jobs = await videoGenerationPipeline.processContent(content);
console.log(jobs); // See generated videos
```

### Test API Endpoints
```bash
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{"jobDescription":"..."}'
```

---

## If You Need to Modify

### Change Job Card Selectors
- File: `backend/src/services/websiteCrawler.ts`
- Method: `crawlJobListings()`
- Line: ~130 (adjust `querySelectorAll()` selectors)

### Add New Video Service
- File: `backend/src/services/videoGenerationPipeline.ts`
- Method: `generateSingleVideo()`
- Add new `case` statement for your service

### Adjust Parallel Generation Count
- File: `backend/src/services/videoGenerationPipeline.ts`
- Method: `generateVideosFromScript()`
- Change: `Math.min(config.maxParallelGeneration || 3, ...)`

### Add Custom Error Handling
- File: `backend/src/routes/crawler.ts`
- Add error handlers in try-catch blocks

---

## Integration Checklist

- [ ] Backend can start: `npm run dev`
- [ ] Post to `/quick-generate`: works
- [ ] Check `/jobs`: returns data
- [ ] Videos upload to Cloudinary: ✅
- [ ] Schedule endpoint: works
- [ ] Save URLs to database: your code
- [ ] Display videos on frontend: your code

---

**For detailed explanations, see the documentation files.**

Quick Reference:
- **Getting started?** → Read `CRAWLER_SETUP.md`
- **Need details?** → Read `CRAWLER_GUIDE.md`
- **Want examples?** → Read `CRAWLER_EXAMPLES.md`
- **Big picture?** → Read `CRAWLER_SUMMARY.md`
