# 🎥 VeoAiFree Video Generation Setup

VeoAiFree (https://veoaifree.com/) integration for generating 5-second videos.

## Quick Setup

### 1. Get VeoAiFree API Key

1. Go to https://veoaifree.com/
2. Sign up for an account
3. Get your API key from dashboard
4. Copy the API key

### 2. Add to Environment Variables

Update `.env` in your backend folder:

```env
VEOAIFREE_API_KEY=your_api_key_here
VEOAIFREE_API_BASE=https://veoaifree.com/api
```

### 3. Test the Configuration

Quick test to verify VeoAiFree is working:

```bash
curl -X POST http://localhost:5000/api/crawler/test-veoaifree \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Professional working in a modern tech office"
  }'
```

Response:
```json
{
  "message": "VeoAiFree test started",
  "prompt": "Professional working in a modern tech office"
}
```

Check server logs for progress. Video will be generated and uploaded to Cloudinary in background.

---

## Using VeoAiFree for Video Generation

### Generate Single Video from Text

```bash
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Senior Developer role. React, Node.js. Remote work. $120k-150k."
  }'
```

This will generate videos using your configured services (meta-ai, zsky, veoaifree, etc.)

### Crawl Website with VeoAiFree Only

```bash
curl -X POST http://localhost:5000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/jobs",
    "pageCount": 1,
    "maxScrolls": 5,
    "videoDuration": 5,
    "includeServices": ["veoaifree"]
  }'
```

### Crawl with Multiple Services (Including VeoAiFree)

```bash
curl -X POST http://localhost:5000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/jobs",
    "pageCount": 1,
    "maxScrolls": 5,
    "videoDuration": 5,
    "includeServices": ["veoaifree", "meta-ai", "zsky"]
  }'
```

---

## Specifications

### VeoAiFree Features
- **Duration**: 5 seconds (standard)
- **Aspect Ratio**: 9:16 (vertical - perfect for TikTok/Reels)
- **Format**: MP4
- **Speed**: 10-30 seconds per video (typically fastest)
- **Quality**: Good, realistic video

### API Details
- **Base URL**: https://veoaifree.com/api
- **Endpoint**: `/generate`
- **Method**: POST
- **Auth**: Bearer token in Authorization header
- **Response**: Returns task ID or immediate video URL

---

## Checking Results

### Monitor All Jobs

```bash
curl http://localhost:5000/api/crawler/jobs | jq '.jobs[] | select(.videoCount > 0)'
```

### Get Videos for Specific Job

```bash
curl http://localhost:5000/api/crawler/status/job_xxx | jq '.videos[] | select(.serviceUsed=="veoaifree")'
```

Example output:
```json
{
  "serviceUsed": "veoaifree",
  "videoUrl": "https://...",
  "cloudinaryUrl": "https://res.cloudinary.com/yourcloud/video/upload/...",
  "duration": 5,
  "generatedAt": "2024-04-14T12:00:00Z"
}
```

---

## Troubleshooting

### "VEOAIFREE_API_KEY not configured"

Add to `.env`:
```env
VEOAIFREE_API_KEY=your_api_key
```

### "VeoAiFree generation failed"

1. Check API key is correct
2. Verify VEOAIFREE_API_BASE is set correctly
3. Check server logs for detailed error
4. Run test endpoint to debug

### "Video not downloading"

Possible causes:
- Video generation timed out (VeoAiFree is slow)
- Video URL is invalid
- Network issue

Check logs: `npm run dev` shows detailed progress

---

## Performance

### Expected Times
- Test video generation: 15-45 seconds
- Per video: 10-30 seconds (usually faster than Meta AI)
- Vertical format (9:16): Optimized for TikTok/Reels
- Upload to Cloudinary: 5-10 seconds per video

### Tips for Faster Generation
1. Use VeoAiFree alone (no parallel loading)
2. Batch generate multiple in sequence (not parallel)
3. Use 5-second duration (default)
4. Ensure API key is valid (no rate limiting)

---

## Comparison with Other Services

| Service | Duration | Speed | Quality | Cost |
|---------|----------|-------|---------|------|
| **VeoAiFree** | 5s | ⚡ Fast | Good | Depends on plan |
| Meta AI | 5-10s | 🐢 Slow | Excellent | Free |
| ZSky | 5s | ⚡ Fast | Good | Depends on plan |

---

## Full Example: Generate from Job List

```bash
# 1. Start backend
npm run dev

# 2. Test VeoAiFree setup
curl -X POST http://localhost:5000/api/crawler/test-veoaifree \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Tech professional working"}'

# 3. Wait for test to complete (check logs)
# Expected: Video generated and uploaded to Cloudinary

# 4. Generate videos from job description
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{"jobDescription":"Senior Developer needed at startup..."}'

# 5. Check results
curl http://localhost:5000/api/crawler/jobs | jq '.jobs[0]'

# 6. Done! Videos are in Cloudinary
```

---

## Integration with Database

Save VeoAiFree videos to your Job model:

```typescript
const job = await Job.create({ title, description });

const generatedJobs = await videoGenerationPipeline.processContent(
  [{ title, description, url: `/jobs/${job._id}`, type: 'job' }],
  { includeServices: ['veoaifree'] }
);

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

## Next Steps

1. Get VEOAIFREE_API_KEY from https://veoaifree.com/
2. Add to `.env`: `VEOAIFREE_API_KEY=xxx`
3. Test: `curl -X POST http://localhost:5000/api/crawler/test-veoaifree`
4. Monitor: Check server logs for "✅ VeoAiFree test successful!"
5. Use: Include in `includeServices` when generating videos

---

**Questions?** Check server logs with `npm run dev` for detailed error messages.
