# 🎬 Crawler Workflow Examples

Real-world examples showing how to use the crawler system.

## Example 1: Quick Generate (Simplest - No Website Required)

Generate videos directly from a job description.

### The Request
```bash
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Full Stack Developer - React, Node.js, PostgreSQL. Work on our AI-powered platform. 3+ years experience. $110k-140k. Remote work available. Health benefits, 401k, equity."
  }'
```

### The Response (Immediate)
```json
{
  "message": "Video generation started",
  "jobDescription": "Full Stack Developer - React, Node.js..."
}
```

### What Happens Next (Background)
1. AI builds a video script with 3 segments from the description
2. Generates 3 videos in parallel:
   - Meta AI (segment 1)
   - ZSky (segment 2)
   - (Optional) Another service (segment 3)
3. Uploads all videos to Cloudinary
4. Returns Cloudinary URLs

### Check Results (30-60 seconds later)
```bash
curl http://localhost:5000/api/crawler/jobs | jq '.jobs[] | select(.title | contains("Full Stack"))'
```

### Response
```json
{
  "jobId": "job_1712000000_abc123",
  "status": "completed",
  "title": "Full Stack Developer - React, Node.js, PostgreSQL...",
  "videoCount": 3,
  "createdAt": "2024-04-14T12:00:00Z"
}
```

### Get Full Details with Video URLs
```bash
curl http://localhost:5000/api/crawler/status/job_1712000000_abc123 | jq '.videos'
```

```json
{
  "videos": [
    {
      "serviceUsed": "meta-ai",
      "videoUrl": "https://...",
      "cloudinaryUrl": "https://res.cloudinary.com/yourcloud/video/upload/...",
      "duration": 10,
      "generatedAt": "2024-04-14T12:00:30Z"
    },
    {
      "serviceUsed": "zsky",
      "videoUrl": "https://...",
      "cloudinaryUrl": "https://res.cloudinary.com/yourcloud/video/upload/...",
      "duration": 10,
      "generatedAt": "2024-04-14T12:00:45Z"
    },
    {
      "serviceUsed": "meta-ai",
      "videoUrl": "https://...",
      "cloudinaryUrl": "https://res.cloudinary.com/yourcloud/video/upload/...",
      "duration": 10,
      "generatedAt": "2024-04-14T12:01:00Z"
    }
  ]
}
```

---

## Example 2: Crawl Your Local Dev Server

Crawl `localhost:3000/jobs` page and generate videos from all job listings found.

### The Request
```bash
curl -X POST http://localhost:5000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/jobs",
    "pageCount": 1,
    "maxScrolls": 10,
    "videoDuration": 10,
    "includeServices": ["meta-ai", "zsky"]
  }'
```

### The Response (Immediate)
```json
{
  "message": "Crawl started",
  "targetUrl": "http://localhost:3000/jobs",
  "pageCount": 1
}
```

### What Happens in Background
1. Puppeteer launches headless browser
2. Navigates to `http://localhost:3000/jobs`
3. Scrolls down 10 times (or until no new content)
4. Finds all job cards using selectors
5. Extracts: title, description, metadata
6. For EACH job found:
   - Builds video script (3 segments)
   - Generates 3 videos (meta-ai, zsky, etc.)
   - Uploads to Cloudinary
   - Returns Cloudinary URLs
7. Returns summary of all generated videos

### Monitor Progress
```bash
watch curl -s http://localhost:5000/api/crawler/jobs | jq '.totalJobs'
```

### Sample Response (After Crawl Completes)
```json
{
  "totalJobs": 5,
  "jobs": [
    {
      "jobId": "job_1712000001_job1",
      "status": "completed",
      "title": "Senior Backend Engineer",
      "videoCount": 3,
      "createdAt": "2024-04-14T12:00:00Z"
    },
    {
      "jobId": "job_1712000001_job2",
      "status": "completed",
      "title": "Frontend Developer (React)",
      "videoCount": 3,
      "createdAt": "2024-04-14T12:01:00Z"
    },
    {
      "jobId": "job_1712000001_job3",
      "status": "completed",
      "title": "DevOps Engineer",
      "videoCount": 3,
      "createdAt": "2024-04-14T12:02:00Z"
    },
    {
      "jobId": "job_1712000001_job4",
      "status": "processing",
      "title": "Data Scientist",
      "videoCount": 1,
      "createdAt": "2024-04-14T12:03:00Z"
    },
    {
      "jobId": "job_1712000001_job5",
      "status": "pending",
      "title": "Product Manager",
      "videoCount": 0,
      "createdAt": "2024-04-14T12:04:00Z"
    }
  ]
}
```

---

## Example 3: Crawl Multiple Pages

Crawl pagination (if your site has separate pages).

### The Request
```bash
curl -X POST http://localhost:5000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/jobs",
    "pageCount": 3,
    "maxScrolls": 5,
    "videoDuration": 10,
    "includeServices": ["meta-ai", "zsky"]
  }'
```

### What Happens
1. Crawls `http://localhost:3000/jobs?page=1`
2. Waits 3 seconds
3. Crawls `http://localhost:3000/jobs?page=2`
4. Waits 3 seconds
5. Crawls `http://localhost:3000/jobs?page=3`
6. For each page's jobs, generates videos
7. Total: 3 pages × ~5-10 jobs per page = 15-30 videos generated

---

## Example 4: Schedule Daily Crawl

Run crawl automatically every day at 9 AM.

### The Request
```bash
curl -X POST http://localhost:5000/api/crawler/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "interval": "0 9 * * *",
    "targetUrl": "http://localhost:3000/jobs"
  }'
```

### Cron Expression Examples
```
0 9 * * *        Every day at 9:00 AM
0 9 * * 1-5      Weekdays only (Mon-Fri) at 9 AM
0 9 * * 6,0      Weekends only (Sat-Sun) at 9 AM
*/5 * * * *      Every 5 minutes
0 */6 * * *      Every 6 hours
0 0 * * 0        Once a week (Sunday midnight)
0 2 * * *        Daily at 2 AM
30 14 * * *      Daily at 2:30 PM
```

### The Response
```json
{
  "message": "Scheduled crawl created",
  "interval": "0 9 * * *",
  "targetUrl": "http://localhost:3000/jobs",
  "taskId": "..."
}
```

### What Happens Daily
- At 9:00 AM every day:
  1. Crawler automatically launches
  2. Crawls your jobs page
  3. Uses default settings (5 scrolls, meta-ai + zsky)
  4. Generates videos and uploads to Cloudinary
  5. Completely automatic - no manual intervention needed

---

## Example 5: Batch Generate from CSV

Generate videos from multiple job descriptions (script example).

### Script: `generate_from_csv.sh`
```bash
#!/bin/bash

# Read CSV file and generate videos from each row
while IFS=',' read -r title description salary locations; do
    echo "Generating video for: $title"
    
    curl -X POST http://localhost:5000/api/crawler/quick-generate \
      -H "Content-Type: application/json" \
      -d "{
        \"jobDescription\": \"$title. $description. $salary. Locations: $locations.\"
      }"
    
    sleep 2  # Avoid rate limits
done < jobs.csv

echo "✅ All videos submitted for generation"
```

### Usage
```bash
chmod +x generate_from_csv.sh
./generate_from_csv.sh
```

---

## Example 6: Monitor All Active Jobs

Check status of all jobs with filtering.

### Get All Jobs
```bash
curl http://localhost:5000/api/crawler/jobs | jq '.'
```

### Count Completed Videos
```bash
curl http://localhost:5000/api/crawler/jobs | jq '[.jobs[] | select(.status=="completed")] | length'
```

### Get Total Video Count
```bash
curl http://localhost:5000/api/crawler/jobs | jq '[.jobs[].videoCount] | add'
```

### Find Failed Jobs
```bash
curl http://localhost:5000/api/crawler/jobs | jq '.jobs[] | select(.status=="failed")'
```

### Get Processing Time per Job
```bash
curl http://localhost:5000/api/crawler/jobs | jq '.jobs[] | {title, createdAt, videoCount}'
```

---

## Example 7: Generate 10-Second vs 5-Second Videos

### Request 10-Second Videos (Default)
```bash
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "...",
  }'
```

Results in 10-second videos (longer, more content, better for TikTok/Reels)

### Request 5-Second Videos
For quicker generation, adjust in the service (ZSky generates 5s by default):

```bash
curl -X POST http://localhost:5000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/jobs",
    "videoDuration": 5,
    "includeServices": ["zsky"]
  }'
```

---

## Example 8: Use Only One Video Service

### Meta AI Only (Higher quality, slower)
```bash
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "..."
  }'
```

Edit `videoGenerationPipeline.ts`:
```typescript
includeServices: ['meta-ai']  // Only Meta AI
```

### ZSky Only (Faster, less resource intensive)
```typescript
includeServices: ['zsky']  // Only ZSky
```

---

## Example 9: Integration with Your Database

After getting Cloudinary URLs, save to your database:

```typescript
// In your job creation route
import { videoGenerationPipeline } from '../services/videoGenerationPipeline';

const job = await Job.create({
  title: jobData.title,
  description: jobData.description,
  // ... other fields
});

// Generate videos
const content = {
  title: job.title,
  description: job.description,
  url: `/jobs/${job._id}`,
  type: 'job',
};

const generatedJobs = await videoGenerationPipeline.processContent([content], {
  uploadToCloudinary: true,
});

// Save video URLs to job
if (generatedJobs[0]?.generatedVideos.length > 0) {
  job.generatedVideos = generatedJobs[0].generatedVideos.map(v => ({
    url: v.cloudinaryUrl,
    service: v.serviceUsed,
    duration: v.duration,
  }));
  await job.save();
}
```

---

## Performance Benchmarks

### Expected Timing

| Operation | Time | Notes |
|-----------|------|-------|
| Quick Generate API call | <100ms | Returns immediately |
| Video script generation | 5-10s | AI script building |
| Single video generation (Meta AI) | 30-60s | Per video |
| Single video generation (ZSky) | 10-30s | Usually faster |
| Cloudinary upload | 5-15s | Per video (varies by size) |
| Total for 3 parallel videos | ~60-120s | 3 videos in parallel |
| Crawl 10-job page | ~20-30s | Website traversal + scrolling |
| Generate videos for 10 jobs | ~10-20 min | 3 videos × 10 jobs |

### Optimization Tips
1. **Parallel generation is enabled** - 3 videos at once
2. **Use ZSky + Meta AI** - Different services in parallel
3. **Schedule crawls off-peak** - Late night runs won't block day traffic
4. **Batch jobs** - Process multiple jobs to amortize startup time
5. **Adjust scrolls** - Fewer scrolls = faster crawl

---

## Troubleshooting Examples

### "No videos in the response"

```bash
# Check job status
curl http://localhost:5000/api/crawler/status/job_xxx | jq '.status'

# If "failed", check error
curl http://localhost:5000/api/crawler/status/job_xxx | jq '.error'

# Common causes:
# 1. Cloudinary credentials not set
# 2. Meta AI cookies expired (update .env)
# 3. ZSky API key invalid
# 4. No OpenRouter API key for script generation
```

### "Crawler found 0 items"

```bash
# Check if target URL is accessible
curl http://localhost:3000/jobs

# Try manually scrolling on the site
# Adjust selectors in websiteCrawler.ts

# Alternative: Use quick-generate instead
curl -X POST http://localhost:5000/api/crawler/quick-generate ...
```

### "Browser not found"

```bash
# Reinstall Puppeteer
cd backend
npm install puppeteer --force
npm run dev
```

---

**For more details, see: CRAWLER_GUIDE.md**
