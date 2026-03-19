/**
 * shorts.ts — AI Video Generation Routes
 *
 * Provider priority (swap via env vars — zero code changes needed):
 *   HELIOS_SERVICE_URL set  → self-hosted Helios (local GPU via Cloudflare tunnel)
 *   MODAL_ENDPOINT set      → Modal.com serverless GPU (recommended for production)
 *   N8N_WEBHOOK_URL set     → delegate entire pipeline to n8n (async, recommended)
 *   FAL_KEY set             → fal.ai cloud fallback (~$0.05/video)
 *   None set                → returns 503 with setup instructions
 *
 * Flow:
 *   Job description → Groq (free) → cinematic prompt → video model → MP4
 */

import express from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { fal } from '@fal-ai/client';
import { ShortVideo } from '../models/ShortVideo';
import { authenticate, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

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


// ── Step 1: Use Groq (free) to convert job description → cinematic prompt ─────
async function buildVideoPrompt(jobDescription: string): Promise<string> {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    console.log('GROQ_API_KEY not set — using raw description as prompt');
    return jobDescription;
  }

  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 120,
        temperature: 0.7,
        messages: [{
          role: 'system',
          content: 'You convert job descriptions into cinematic video prompts. Output ONLY the prompt, nothing else. No quotes, no explanation.',
        }, {
          role: 'user',
          content: `Convert this job description into a short cinematic video prompt (2 sentences max, visuals only, no text overlays, no subtitles, professional and inspiring mood):

"${jobDescription.slice(0, 500)}"`,
        }],
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      }
    );
    const prompt = res.data.choices[0]?.message?.content?.trim();
    console.log(`Groq prompt: "${prompt}"`);
    return prompt || jobDescription;
  } catch (err: any) {
    console.warn('Groq prompt generation failed, using raw description:', err.message);
    return jobDescription;
  }
}


// ── Step 2: Try each video provider in order ──────────────────────────────────
async function generateVideoUrl(
  prompt: string,
  jobId: string,
  callbackUrl?: string
): Promise<{ videoUrl: string; provider: string } | null> {

  const HELIOS_URL   = process.env.HELIOS_SERVICE_URL;
  const MODAL_URL    = process.env.MODAL_ENDPOINT;
  const FAL_KEY      = process.env.FAL_KEY;

  // ── Provider 1: Modal.com (serverless GPU — best for production) ──────────
  if (MODAL_URL) {
    try {
      console.log('Trying Modal.com...');
      const res = await axios.post(MODAL_URL, {
        prompt,
        num_frames: 73,   // ~30 seconds @ 24fps
        height: 384,
        width: 640,
        job_id: jobId,
        callback_url: callbackUrl,
      }, { timeout: 660_000 }); // 11 min timeout

      if (res.data.video_url && !res.data.video_url.startsWith('data:')) {
        return { videoUrl: res.data.video_url, provider: 'modal' };
      }

      // Handle base64 response — save to cloudinary or local
      if (res.data.video_url?.startsWith('data:')) {
        console.log('Modal returned base64 — upload handling needed');
        // For now return a placeholder; handle upload in production
        return { videoUrl: res.data.video_url, provider: 'modal' };
      }
    } catch (e: any) {
      console.warn('Modal failed:', e.message);
    }
  }

  // ── Provider 2: Self-hosted Helios (local GPU via Cloudflare tunnel) ──────
  if (HELIOS_URL) {
    try {
      console.log('Trying self-hosted Helios at', HELIOS_URL);
      const res = await axios.post(
        `${HELIOS_URL}/generate`,
        { prompt, num_frames: 73, job_id: jobId },
        { timeout: 660_000 }
      );
      let videoUrl = res.data.video_url;
      if (videoUrl?.startsWith('/')) videoUrl = `${HELIOS_URL}${videoUrl}`;
      return { videoUrl, provider: 'helios-local' };
    } catch (e: any) {
      console.warn('Local Helios failed:', e.message);
    }
  }

  // ── Provider 3: fal.ai (pay-per-use cloud fallback) ───────────────────────
  if (FAL_KEY) {
    try {
      console.log('Trying fal.ai (Hunyuan Video)...');

      // Configure client
      fal.config({ credentials: FAL_KEY });

      // Submit to queue
      const { request_id } = await fal.queue.submit('fal-ai/hunyuan-video', {
        input: {
          prompt,
          num_frames: '85',      // short test (~3-4s)
          resolution: '480p',    // cheapest
          aspect_ratio: '16:9',
        }
      });

      console.log('fal.ai request_id:', request_id);

      // Poll until done (max 5 min)
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000));

        const status = await fal.queue.status('fal-ai/hunyuan-video', {
          requestId: request_id,
          logs: false,
        });

        console.log('fal.ai status:', status.status);

        if (status.status === 'COMPLETED') {
          const result = await fal.queue.result('fal-ai/hunyuan-video', {
            requestId: request_id,
          });
          const videoUrl = (result.data as any)?.video?.url;
          if (videoUrl) return { videoUrl, provider: 'fal.ai' };
          throw new Error('No video URL in result');
        }

        // Check for common failure indicators in logs or status if any
        if ((status as any).status === 'FAILED' || (status as any).error) {
          throw new Error('fal.ai generation failed');
        }
      }
      throw new Error('fal.ai polling timeout after 5 minutes');

    } catch (e: any) {
      console.warn('fal.ai failed:', e.message);
    }
  }

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

      // Step 3: Save to MongoDB
      const newShort = new ShortVideo({
        userId: req.user!.userId,
        title: title || 'AI Generated Short',
        description: description || prompt,
        videoUrl: result.videoUrl,
        likes: 0,
        views: 0,
      });
      await newShort.save();

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

  res.json({
    jobId: job.id,
    status: job.status,
    videoUrl: job.videoUrl || null,
    error: job.error || null,
    provider: job.provider || null,
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shorts/callback
// Called by Modal, n8n, or Helios when async generation completes
// ─────────────────────────────────────────────────────────────────────────────
router.post('/callback', async (req, res) => {
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
    const isRecruiter = user?.role === 'recruiter' || user?.isRecruiter;
    let feedItems: any[] = [];

    if (isStudent) {
      const jobsWithVideos = await Job.find({ shortVideoUrl: { $exists: true, $ne: '' } })
        .populate('postedBy', 'name avatarUrl role')
        .sort({ updatedAt: -1 })
        .limit(20);

      feedItems = jobsWithVideos.map(job => ({
        type: 'job',
        id: job._id.toString(),
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
        author: {
          name: job.company,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}`,
        }
      }));
    } else if (isRecruiter) {
      const candidateVideos = await ShortVideo.find()
        .populate({ path: 'userId', match: { role: 'student' }, select: 'name avatarUrl title' })
        .sort({ createdAt: -1 })
        .limit(40);

      feedItems = candidateVideos
        .filter(v => v.userId !== null)
        .map(v => ({
          type: 'candidate_intro',
          id: v._id.toString(),
          title: v.title,
          description: v.description || '',
          videoUrl: v.videoUrl,
          likes: v.likes || 0,
          views: v.views || 0,
          createdAt: v.createdAt,
          author: {
            name: (v.userId as any).name,
            avatar: (v.userId as any).avatarUrl,
          }
        }));
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
