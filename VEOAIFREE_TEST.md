# 🧪 VeoAiFree Testing Guide

Quick steps to test VeoAiFree video generation.

## Prerequisites

1. Backend running: `npm run dev`
2. VeoAiFree API key: https://veoaifree.com/
3. `.env` configured with `VEOAIFREE_API_KEY=xxx`
4. Cloudinary configured (for uploading test videos)

## Step-by-Step Testing

### Step 1: Verify API Key is Set

```bash
# Check if VEOAIFREE_API_KEY is in your .env
grep VEOAIFREE_API_KEY .env
```

Should output:
```
VEOAIFREE_API_KEY=your_api_key_here
```

If not, add it:
```bash
echo "VEOAIFREE_API_KEY=your_key_here" >> .env
```

### Step 2: Start Backend (if not already running)

```bash
cd backend
npm run dev
```

You should see:
```
✅ Express server running on port 5000
```

### Step 3: Test VeoAiFree Configuration

Most important test - checks if API key works:

```bash
curl -X POST http://localhost:5000/api/crawler/test-veoaifree \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Professional working at desk in modern office"
  }'
```

Response should be:
```json
{
  "message": "VeoAiFree test started",
  "prompt": "Professional working at desk in modern office"
}
```

### Step 4: Monitor Test Progress

Watch server logs (in the terminal where you ran `npm run dev`):

```
[VeoAiFree] Generating 5-second video...
[VeoAiFree] Starting generation...
[VeoAiFree] Polling for video...
[VeoAiFree Test] VeoAiFree: Generating... (PROCESSING) (10%)
[VeoAiFree Test] VeoAiFree: Generating... (PROCESSING) (20%)
[VeoAiFree Test] VeoAiFree: Polling for video... (50%)
...
[VeoAiFree Test] VeoAiFree: Video ready! (95%)
[VeoAiFree] Downloading video from: https://...
[VeoAiFree] ✅ Saved to: /path/to/uploads/tmp/veoaifree_1712000000.mp4
[CrawlerRoute] ✅ VeoAiFree test successful!
[CrawlerRoute] Cloudinary URL: https://res.cloudinary.com/yourcloud/...
```

### Step 5: Verify Video in Cloudinary

1. Go to https://cloudinary.com/console
2. Look for folder: `rapidgig/test-videos/`
3. You should see: `veoaifree-test-TIMESTAMP.mp4`
4. Click to preview - it should be a 5-second video

### Step 6: Test with Quick Generate

```bash
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Senior Full Stack Engineer. React, Node.js, PostgreSQL. Remote. $130k-160k."
  }'
```

Check results:
```bash
curl http://localhost:5000/api/crawler/jobs | jq '.jobs[0]'
```

Should show:
```json
{
  "jobId": "job_1712000000_xxx",
  "status": "completed",
  "title": "Senior Full Stack Engineer...",
  "videoCount": 3,
  "createdAt": "2024-04-14T12:00:00Z"
}
```

### Step 7: Check Generated Videos

```bash
curl http://localhost:5000/api/crawler/status/job_1712000000_xxx | jq '.videos'
```

Look for VeoAiFree videos:
```json
{
  "serviceUsed": "veoaifree",
  "videoUrl": "https://veoaifree.com/...",
  "cloudinaryUrl": "https://res.cloudinary.com/yourcloud/video/upload/...",
  "duration": 5,
  "generatedAt": "2024-04-14T12:00:45Z"
}
```

---

## Expected Timeline

| Time | Event |
|------|-------|
| T+0ms | API request received |
| T+50ms | Response returned (job starts in background) |
| T+5s | VeoAiFree API accepts request, returns task ID |
| T+10-30s | VeoAiFree backend generates video |
| T+30-45s | Video ready, downloads to local temp |
| T+45-60s | Uploads to Cloudinary |
| T+60-90s | Complete, ready to use |

---

## Troubleshooting Tests

### Test Fails: "VEOAIFREE_API_KEY not configured"

**Problem**: Environment variable not set

**Solution**:
```bash
# Add to .env
echo "VEOAIFREE_API_KEY=your_actual_key" >> backend/.env

# Restart backend
npm run dev
```

### Test Fails: "VeoAiFree generation failed"

**Problem**: API key invalid or VeoAiFree API is down

**Solution**:
1. Verify API key from https://veoaifree.com/
2. Check if VeoAiFree website is accessible
3. Try a different prompt (simpler)

### Test Fails: No Video in Logs

**Problem**: Service is timing out

**Solution**:
1. Check internet connection
2. Try with longer timeout (default is 15 min)
3. Check VeoAiFree API status

### Video Generated but No Cloudinary URL

**Problem**: Cloudinary upload failed

**Solution**:
1. Check Cloudinary credentials in `.env`
2. Verify account has upload quota
3. Check server logs for Cloudinary error

---

## Success Checklist

- [ ] `VEOAIFREE_API_KEY` is set in `.env`
- [ ] Backend starts: `npm run dev`
- [ ] Test endpoint returns 200: `POST /api/crawler/test-veoaifree`
- [ ] Server logs show "VeoAiFree test started"
- [ ] After 1-2 min, logs show "✅ VeoAiFree test successful!"
- [ ] Cloudinary shows new video in `rapidgig/test-videos/` folder
- [ ] Video is 5 seconds long
- [ ] Quick generate works with veoaifree in services list

---

## Next: Use in Production

Once testing passes:

```bash
# Generate videos with VeoAiFree from job descriptions
curl -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d '{"jobDescription":"Your job description..."}'

# Or crawl your website and use VeoAiFree
curl -X POST http://localhost:5000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/jobs",
    "includeServices": ["veoaifree", "meta-ai", "zsky"]
  }'
```

---

**All tests passing? Great! VeoAiFree is ready to use. 🎉**

See: `VEOAIFREE_SETUP.md` for full documentation.
