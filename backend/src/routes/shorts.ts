/**
 * shorts.ts — AI Video Generation Routes
 *
 * Video provider priority (30s+ native, no rate-limit issues):
 *   1. Meta AI — cookie-based, free, 30-60s videos, 3-4 outputs
 *   2. Pollinations.ai (via Vibe AI — free tier, gen.pollinations.ai)
 *   3. Modal.com (serverless GPU, if MODAL_ENDPOINT set)
 *
 * Prompt enhancement: see ../services/promptBuilder.ts
 * Flow:
 *   Job description → Cerebras → OpenRouter → Ollama → cinematic prompt → video provider → MP4
 */

import express from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ShortVideo } from '../models/ShortVideo';
import { authenticate, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { buildVideoPrompt } from '../services/promptBuilder';

/**
 * Build a video-specific prompt optimized for video models.
 * Reuses the shared cinematic prompt system but adds video-model-specific quality directives.
 */
function buildVideoModelPrompt(jobDescription: string, enhancedPrompt: string): string {
  // If we got a good enhanced prompt, optimize it further for video models
  // by adding pixel-perfect quality directives
  return `${enhancedPrompt || jobDescription}. Shot in 4K resolution, ultra-detailed photorealistic, smooth cinematic motion, professional color grading with warm golden tones, film grain texture, 24fps cinematic look.`;
}

const router = express.Router();

// ── In-memory job store (single instance — fine for Render free tier) ─────────
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface VideoJob {
  id: string;
  status: JobStatus;
  videoUrl?: string;
  error?: string;
  prompt: string;
  userId: string;
  createdAt: Date;
  provider?: string;
  progress?: number;
  debugInfo?: string;
}

const jobStore = new Map<string, VideoJob>();

// Clean up jobs older than 2 hours
setInterval(() => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  for (const [id, job] of jobStore.entries()) {
    if (job.createdAt < twoHoursAgo) jobStore.delete(id);
  }
}, 30 * 60 * 1000);

const generateJobId = () =>
  `vj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Meta AI Video Generator (cookie-based, free, 30-60s videos)
//
// Uses the metaai-api REST server (https://github.com/mir-ashiq/metaai-api)
//   POST http://localhost:8000/video/async — returns job_id
//   GET  /video/jobs/{job_id}              — poll until completed
// ─────────────────────────────────────────────────────────────────────────────

async function generateVideoFromMetaAI(
  prompt: string,
  jobId: string,
  _cookies: { datr: string; ecto_1_sess: string; abra_sess?: string }
): Promise<{ videoUrl: string; provider: string } | null> {
  const META_SERVER_URL = process.env.META_AI_API_URL || 'http://localhost:8000';

  try {
    console.log(`  [Meta AI] Sending video request to ${META_SERVER_URL}...`);

    // Submit async generation
    const asyncRes = await axios.post(
      `${META_SERVER_URL}/video/async`,
      { prompt },
      { timeout: 30_000 }
    );

    const { job_id } = asyncRes.data;
    console.log(`  [Meta AI] Job ${job_id} queued, polling...`);

    // Poll for result (max 3 min)
    for (let i = 0; i < 36; i++) {
      await new Promise(r => setTimeout(r, 5_000));

      const statusRes = await axios.get(
        `${META_SERVER_URL}/video/jobs/${job_id}`,
        { timeout: 15_000 }
      );

      if (statusRes.data.status === 'completed') {
        const rawUrls = statusRes.data.result?.video_urls || [];
        const rawUrl = rawUrls[0];
        if (!rawUrl) throw new Error('No video URL in result');

        // Download and save locally
        const uploadsDir = process.env.UPLOAD_DIR || './uploads';
        const videosDir = path.join(uploadsDir, 'videos');
        if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

        const filename = `${jobId}.mp4`;
        const filepath = path.join(videosDir, filename);

        const dlRes = await axios.get(rawUrl, {
          responseType: 'stream',
          timeout: 120_000,
          headers: { Referer: 'https://meta.ai/' },
        });
        const writer = fs.createWriteStream(filepath);
        dlRes.data.pipe(writer);
        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', reject);
        });

        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
        return { videoUrl: `${baseUrl}/uploads/videos/${filename}`, provider: 'metaai-api-server' };
      }

      if (statusRes.data.status === 'failed') {
        throw new Error(statusRes.data.error || 'Meta AI generation failed');
      }
    }

    throw new Error('Meta AI polling timeout (3 min)');
  } catch (e: any) {
    console.warn('  [Meta AI] Failed:', e.message);
  }

  return null;
}


// ── Step 2: Try each video provider in order ──────────────────────────────────
async function generateVideoUrl(
  prompt: string,
  jobId: string,
  callbackUrl?: string
): Promise<{ videoUrl: string; provider: string } | null> {

  const MODAL_URL = process.env.MODAL_ENDPOINT;

  // ── Provider 1: Meta AI (cookie-based, free, 30-60s videos) ────────────────
  {
    const META_COOKIES = process.env.META_AI_COOKIES; // JSON string or semicolon-separated
    if (META_COOKIES) {
      let cookies: Record<string, string>;
      try {
        cookies = JSON.parse(META_COOKIES);
      } catch {
        cookies = {};
        (META_COOKIES || '').split(';').forEach((pair) => {
          const [k, ...rest] = pair.trim().split('=');
          if (k && rest.length) cookies[k.trim()] = rest.join('=').trim();
        });
      }

      if (cookies.datr && cookies.ecto_1_sess) {
        try {
          console.log('Trying Meta AI video generation...');

          // Use the official SDK's generate_video_new endpoint
          // Meta AI generates 3-4 videos per prompt, each ~30-60 seconds
          const result = await generateVideoFromMetaAI(prompt, jobId, {
            datr: cookies.datr,
            ecto_1_sess: cookies.ecto_1_sess,
            abra_sess: cookies.abra_sess,
          });

          if (result) {
            console.log(`✅ Meta AI video saved: ${result.videoUrl}`);
            return result;
          }
        } catch (e: any) {
          console.warn('Meta AI video generation failed:', e.message);
        }
      } else {
        console.log('Meta AI skipped — set META_AI_COOKIES in .env (datr + ecto_1_sess required)');
      }
    } else {
      console.log('Meta AI skipped — no META_AI_COOKIES env var set');
    }
  }

  // ── Provider 2: Pollinations.ai (free tier, used by Vibe AI) ───────────────
  {
    // Try video models in order — Veo, Wan 2.6, Seedance (same as Vibe AI)
    const videoModels = ['wan', 'veo', 'seedance'];

    for (const model of videoModels) {
      try {
        console.log(`Trying Pollinations.ai (${model}, free tier)...`);
        const encodedPrompt = encodeURIComponent(prompt);
        const params = new URLSearchParams({
          model,
          duration: '10',
          aspectRatio: '16:9',
        });

        const videoUrl = `https://gen.pollinations.ai/video/${encodedPrompt}?${params.toString()}`;

        const res = await axios.get(videoUrl, {
          responseType: 'arraybuffer',
          timeout: 180_000,
        });

        if (res.status === 200 && res.data.byteLength > 1000) {
          const uploadsDir = process.env.UPLOAD_DIR || './uploads';
          const videosDir = path.join(uploadsDir, 'videos');
          if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

          const filename = `${jobId}.mp4`;
          const filepath = path.join(videosDir, filename);
          fs.writeFileSync(filepath, Buffer.from(res.data));

          const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
          const savedUrl = `${baseUrl}/uploads/videos/${filename}`;
          console.log(`✅ Pollinations (${model}) video saved: ${savedUrl}`);
          return { videoUrl: savedUrl, provider: `pollinations-${model}` };
        }
      } catch (e: any) {
        console.warn(`Pollinations (${model}, free) failed:`, e.message);
      }
    }
  }

  // ── Provider 3: Modal.com (serverless GPU fallback) ────────────────────────
  if (MODAL_URL) {
    try {
      console.log('Trying Modal.com...');
      const res = await axios.post(MODAL_URL, {
        prompt,
        num_frames: 73,
        height: 384,
        width: 640,
        job_id: jobId,
        callback_url: callbackUrl,
      }, { timeout: 660_000 });

      if (res.data.video_url && !res.data.video_url.startsWith('data:')) {
        return { videoUrl: res.data.video_url, provider: 'modal' };
      }

      if (res.data.video_url?.startsWith('data:')) {
        return { videoUrl: res.data.video_url, provider: 'modal' };
      }
    } catch (e: any) {
      console.warn('Modal failed:', e.message);
    }
  }

  // ── All providers exhausted ───────────────────────────────────────────────
  console.error('❌ All video providers failed. Diagnostics:');
  console.error(`   Meta AI:       ${process.env.META_AI_COOKIES ? 'cookies set — check cookie expiry' : 'NO cookies set'}`);
  console.error(`   Pollinations:  free tier — may be rate limited`);
  console.error(`   Modal:         ${MODAL_URL ? 'endpoint set' : 'not configured'}`);
  console.error(`   Tip: Refresh Meta AI cookies at https://meta.ai → F12 → Application → Cookies`);

  return null;
}


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shorts/generate
// Kicks off async generation, returns jobId immediately
// ─────────────────────────────────────────────────────────────────────────────
router.post('/generate', authenticate, async (req: AuthRequest, res) => {
  const { prompt, title, description } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt (job description) is required' });
  }

  const jobId = generateJobId();
  const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;
  const callbackUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/shorts/callback`;

  // ── Option A: Delegate to n8n (recommended for production) ────────────────
  if (N8N_WEBHOOK) {
    try {
      await axios.post(N8N_WEBHOOK, {
        job_id: jobId,
        job_description: prompt,
        title: title || 'AI Generated Short',
        description: description || prompt,
        user_id: req.user!.userId,
        callback_url: callbackUrl,
      }, { timeout: 10_000 });

      jobStore.set(jobId, {
        id: jobId,
        status: 'pending',
        prompt,
        userId: req.user!.userId,
        createdAt: new Date(),
        provider: 'n8n',
      });

      return res.status(202).json({
        message: 'Video generation queued via n8n',
        jobId,
        pollUrl: `/api/shorts/status/${jobId}`,
      });
    } catch (e: any) {
      console.warn('n8n webhook failed, falling back to direct generation:', e.message);
    }
  }

  // ── Option B: Direct generation (background, non-blocking) ────────────────
  jobStore.set(jobId, {
    id: jobId,
    status: 'processing',
    prompt,
    userId: req.user!.userId,
    createdAt: new Date(),
  });

  // Respond immediately — generation happens in background
  res.status(202).json({
    message: 'Video generation started',
    jobId,
    pollUrl: `/api/shorts/status/${jobId}`,
  });

  // Background processing (don't await)
  (async () => {
    try {
      // Step 1: Enhance prompt with Groq
      const videoPrompt = await buildVideoPrompt(prompt);

      // Step 2: Generate video
      const result = await generateVideoUrl(videoPrompt, jobId, callbackUrl);

      if (!result) {
        jobStore.set(jobId, {
          ...jobStore.get(jobId)!,
          status: 'failed',
          error: 'All video providers unavailable. Set MODAL_ENDPOINT, HELIOS_SERVICE_URL, or FAL_KEY.',
        });
        return;
      }

      // Step 3: Mark completed — do NOT save to ShortVideo here.
      // Videos only appear in the Shorts feed when created via /from-job
      // (which runs after the job is actually posted to the DB).
      // The standalone /generate is for pre-post preview only.

      jobStore.set(jobId, {
        ...jobStore.get(jobId)!,
        status: 'completed',
        videoUrl: result.videoUrl,
        provider: result.provider,
      });

      console.log(`Job ${jobId} completed via ${result.provider}`);
    } catch (err: any) {
      console.error(`Job ${jobId} failed:`, err.message);
      jobStore.set(jobId, {
        ...jobStore.get(jobId)!,
        status: 'failed',
        error: err.message,
      });
    }
  })();
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shorts/from-job/:jobId
// Reads a saved Job from DB, builds a rich prompt, generates video in background
// and patches the job's shortVideoUrl when done
// ─────────────────────────────────────────────────────────────────────────────
router.post('/from-job/:jobId', authenticate, async (req: AuthRequest, res) => {
  try {
    const jobDoc = await Job.findById(req.params.jobId);
    if (!jobDoc) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Only the job owner can trigger video gen
    if (jobDoc.postedBy.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the job poster can generate a video' });
    }

    // Build a rich context string from ALL job fields
    const richDescription = [
      `Role: ${jobDoc.title}`,
      `Company: ${jobDoc.company}`,
      `Location: ${jobDoc.location}`,
      `Work Type: ${jobDoc.type}`,
      `Salary/Pay: ${jobDoc.pay}`,
      jobDoc.description ? `Description: ${jobDoc.description}` : '',
    ].filter(Boolean).join('\n');

    const videoJobId = generateJobId();
    const callbackUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/shorts/callback`;

    // Store in job tracker
    jobStore.set(videoJobId, {
      id: videoJobId,
      status: 'processing',
      prompt: richDescription,
      userId: req.user!.userId,
      createdAt: new Date(),
    });

    // Respond immediately — video generates in the background
    res.status(202).json({
      message: 'Video generation started from job details',
      jobId: videoJobId,
      mongoJobId: jobDoc._id.toString(),
      pollUrl: `/api/shorts/status/${videoJobId}`,
    });

    // ── Background processing ──────────────────────────────────────────────
    (async () => {
      try {
        // Step 1: Enhance prompt using Ollama/Groq with full job context
        const videoPrompt = await buildVideoPrompt(richDescription);
        console.log(`[from-job] Enhanced prompt for "${jobDoc.title}": "${videoPrompt}"`);

        // Step 2: Generate video
        const result = await generateVideoUrl(videoPrompt, videoJobId, callbackUrl);

        if (!result) {
          jobStore.set(videoJobId, {
            ...jobStore.get(videoJobId)!,
            status: 'failed',
            error: 'All video providers unavailable.',
          });
          return;
        }

        // Step 3: Save as ShortVideo in DB (private — only visible to the recruiter)
        const newShort = new ShortVideo({
          userId: req.user!.userId,
          title: `${jobDoc.title} @ ${jobDoc.company}`,
          description: jobDoc.description,
          videoUrl: result.videoUrl,
          likes: 0,
          views: 0,
        });
        await newShort.save();

        // Step 4: Mark job as completed
        jobStore.set(videoJobId, {
          ...jobStore.get(videoJobId)!,
          status: 'completed',
          videoUrl: result.videoUrl,
          provider: result.provider,
        });

        console.log(`[from-job] Job ${videoJobId} completed via ${result.provider}`);
      } catch (err: any) {
        console.error(`[from-job] Job ${videoJobId} failed:`, err.message);
        jobStore.set(videoJobId, {
          ...jobStore.get(videoJobId)!,
          status: 'failed',
          error: err.message,
        });
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shorts/status/:jobId
// Frontend polls this every 5 seconds
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status/:jobId', authenticate, async (req: AuthRequest, res) => {
  const job = jobStore.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  if (job.userId !== req.user!.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(job);
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shorts/generate-long
// Generate a ~30-second video by stitching clips (multi-provider)
//
// Providers tried per clip (in order):
//   1. Meta AI          (cookie-based, free, 30-60s videos)
//   2. Pollinations.ai  (free tier — wan/veo/seedance)
//   3. Modal.com        (serverless GPU)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/generate-long', authenticate, async (req: AuthRequest, res) => {
  const { prompt, description, segments = 3, segmentDuration = 10 } = req.body;

  if (!prompt && !description) {
    return res.status(400).json({ error: 'prompt or description is required' });
  }

  // Meta AI generates 30s+ natively, so we try 1 segment first.
  // Falls back to multi-clip stitching if Meta AI is unavailable.
  const numSegments = Math.min(Math.max(Number(segments) || 1, 1), 5);
  const clipDuration = Math.min(Math.max(Number(segmentDuration) || 30, 10), 60);

  const jobId = uuidv4();
  const userId = req.user!.userId;
  const videoPrompt = prompt || description;

  // Create job entry
  jobStore.set(jobId, {
    id: jobId,
    status: 'processing',
    prompt: videoPrompt,
    userId,
    createdAt: new Date(),
    provider: 'multi-provider-stitched',
  });

  // Return job ID immediately — video generates in background
  res.json({ jobId, status: 'processing', estimatedDuration: numSegments * clipDuration });

  // Run generation async
  (async () => {
    try {
      const enhancedPrompt = await buildVideoPrompt(videoPrompt);

      const { generateStitchedVideo } = await import('../services/videoStitcher');
      const result = await generateStitchedVideo({
        prompt: enhancedPrompt,
        segments: numSegments,
        segmentDuration: clipDuration,
        onProgress: (step, progress) => {
          console.log(`[StitchedVideo ${jobId}] ${step} (${Math.round(progress * 100)}%)`);
          const jobEntry = jobStore.get(jobId);
          if (jobEntry) {
            jobEntry.progress = progress;
            jobEntry.debugInfo = step;
          }
        },
      });

      // Save to database
      const short = new ShortVideo({
        title: videoPrompt.substring(0, 100),
        description: videoPrompt,
        videoUrl: result.videoUrl,
        userId: new mongoose.Types.ObjectId(userId),
        duration: result.duration,
        status: 'ready',
      });
      await short.save();

      // Update job store
      const jobEntry = jobStore.get(jobId);
      if (jobEntry) {
        jobEntry.status = 'completed';
        jobEntry.videoUrl = result.videoUrl;
        jobEntry.provider = result.providers.join(' → ');
      }

      console.log(`[StitchedVideo ${jobId}] ✅ Done — ${result.clips} clips, ${result.duration}s total`);
      console.log(`[StitchedVideo ${jobId}] Providers: ${result.providers.join(' → ')}`);
    } catch (err: any) {
      console.error(`[StitchedVideo ${jobId}] ❌ Failed:`, err.message);
      const jobEntry = jobStore.get(jobId);
      if (jobEntry) {
        jobEntry.status = 'failed';
        jobEntry.error = err.message;
      }
    }
  })();
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shorts/callback
// Called by Modal, n8n, or Helios when async generation completes
// ─────────────────────────────────────────────────────────────────────────────
router.post('/callback', async (req, res) => {
  // Verify callback secret
  const secret = req.headers['x-callback-secret'] || req.headers['x-webhook-secret'];
  const expectedSecret = process.env.CALLBACK_SECRET || process.env.N8N_WEBHOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return res.status(403).json({ error: 'Unauthorized callback' });
  }

  const { job_id, status, video_url, user_id, title, description } = req.body;

  if (!job_id) return res.status(400).json({ error: 'job_id required' });

  try {
    if (status === 'completed' && video_url) {
      // Save to DB if not already saved (n8n path)
      const existing = await ShortVideo.findOne({ videoUrl: video_url });
      if (!existing && user_id) {
        const newShort = new ShortVideo({
          userId: user_id,
          title: title || 'AI Generated Short',
          description: description || '',
          videoUrl: video_url,
          likes: 0,
          views: 0,
        });
        await newShort.save();
      }

      // Update job store
      const existingJob = jobStore.get(job_id);
      if (existingJob) {
        jobStore.set(job_id, {
          ...existingJob,
          status: 'completed',
          videoUrl: video_url,
        });
      }
    } else if (status === 'failed') {
      const existingJob = jobStore.get(job_id);
      if (existingJob) {
        jobStore.set(job_id, {
          ...existingJob,
          status: 'failed',
          error: req.body.error || 'Generation failed',
        });
      }
    }

    res.json({ message: 'Callback received' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// Shorts feed (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
import { Job } from '../models/Job';
import { User } from '../models/User';

router.get('/feed', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.userId);
    const isStudent = user?.role === 'student' || user?.isStudent;
    const isRecruiter = user?.role === 'recruiter' || user?.role === 'admin' || user?.isRecruiter;
    let feedItems: any[] = [];

    if (isStudent) {
      // Students should never see recruiter-generated intro videos.
      // Only show student-created ShortVideo entries if they exist.
      const studentVideos = await ShortVideo.find()
        .populate({ path: 'userId', select: 'name avatarUrl role' })
        .sort({ createdAt: -1 })
        .limit(20);

      feedItems = studentVideos
        .filter(v => (v.userId as any)?.role === 'student')
        .map(v => ({
          type: 'student_intro',
          id: v._id.toString(),
          title: v.title,
          description: v.description || '',
          videoUrl: v.videoUrl,
          likes: v.likes || 0,
          views: v.views || 0,
          createdAt: v.createdAt,
          authorId: (v.userId as any)._id?.toString(),
          author: {
            id: (v.userId as any)._id?.toString(),
            name: (v.userId as any).name,
            avatar: (v.userId as any).avatarUrl,
          }
        }));
    } else if (isRecruiter) {
      // 1. Fetch the recruiter's own generated videos (shorts they created for their jobs)
      const myShortVideos = await ShortVideo.find({ userId: req.user!.userId })
        .populate({ path: 'userId', select: 'name avatarUrl title role' })
        .sort({ createdAt: -1 })
        .limit(20);

      // 2. Fetch their own jobs (no video filter — job details shown without video)
      const myJobs = await Job.find({ postedBy: req.user!.userId })
        .populate('postedBy', 'name avatarUrl')
        .sort({ updatedAt: -1 })
        .limit(10);

      const formattedCandidates = myShortVideos
        .map(v => ({
          type: 'candidate_intro',
          id: v._id.toString(),
          title: v.title,
          description: v.description || '',
          videoUrl: v.videoUrl,
          likes: v.likes || 0,
          views: v.views || 0,
          createdAt: v.createdAt,
          authorId: (v.userId as any)._id?.toString(),
          author: {
            id: (v.userId as any)._id?.toString(),
            name: (v.userId as any).name,
            avatar: (v.userId as any).avatarUrl,
            title: (v.userId as any).title || '',
          }
        }));

      const formattedJobs = myJobs.map(job => ({
        type: 'job',
        id: job._id.toString(),
        jobId: job._id.toString(),
        title: job.title,
        company: job.company,
        description: job.description,
        videoUrl: job.shortVideoUrl,
        likes: job.likes || 10,
        views: (job.likes || 0) * 5 + 50,
        comments: job.comments || 0,
        shares: job.shares || 0,
        pay: job.pay,
        createdAt: job.createdAt,
        postedById: job.postedBy ? (job.postedBy as any)._id?.toString() || job.postedBy.toString() : null,
        author: {
          id: job.postedBy ? (job.postedBy as any)._id?.toString() || job.postedBy.toString() : null,
          name: job.company,
          avatar: (job.postedBy as any)?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}`,
        }
      }));

      feedItems = [...formattedCandidates, ...formattedJobs];
    }

    const now = new Date();
    feedItems = feedItems
      .map(item => {
        const hoursOld = Math.max(0.5, (now.getTime() - new Date(item.createdAt).getTime()) / 3_600_000);
        const score = ((item.likes || 0) * 2 + (item.views || 0)) / Math.pow(hoursOld + 2, 1.2);
        return { ...item, score };
      })
      .sort((a, b) => b.score - a.score);

    res.json(feedItems);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
