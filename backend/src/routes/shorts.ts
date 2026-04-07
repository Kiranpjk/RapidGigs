/**
 * shorts.ts — AI Video Generation Routes
 *
 * Video providers (free tier):
 *   1. Meta AI (cookie-based, free)
 *   2. VEO AI Free (veoaifree.com — Google Veo 3.1, free)
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

// ── Generate video using parallel Meta AI + VEO AI (via videoStitcher) ───────
async function generateVideoUrl(
  prompt: string,
  jobId: string,
  callbackUrl?: string
): Promise<{ videoUrl: string; provider: string } | null> {
  try {
    const { generateStitchedVideo } = await import('../services/videoStitcher');

    const result = await generateStitchedVideo({
      prompt,
      onProgress: (step, progress) => {
        console.log(`[VideoGen ${jobId}] ${step} (${Math.round(progress * 100)}%)`);
      },
    });

    return {
      videoUrl: result.videoUrl,
      provider: result.providers.join(' → '),
    };
  } catch (e: any) {
    console.error('❌ Video generation failed:', e.message);
    return null;
  }
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
          error: 'All video providers unavailable.',
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
        // Overlay job details text on the video first
        const { addJobTextOverlays } = await import('../services/videoStitcher');
        let finalVideoUrl = result.videoUrl;

        try {
          // Download the generated video, overlay text, re-upload
          const fs = await import('fs');
          const pathModule = await import('path');
          const { localStorageService } = await import('../services/localStorage');

          const tempPath = pathModule.join(process.cwd(), 'uploads', 'temp', `text-overlay-${videoJobId}-in.mp4`);
          const outPath = pathModule.join(process.cwd(), 'uploads', 'temp', `text-overlay-${videoJobId}-out.mp4`);

          // Download video
          const vidResp = await axios.get(result.videoUrl, { responseType: 'arraybuffer', timeout: 120_000 });
          fs.writeFileSync(tempPath, Buffer.from(vidResp.data));

          // Add text overlays
          await addJobTextOverlays(
            tempPath,
            outPath,
            {
              title: jobDoc.title,
              company: jobDoc.company,
              location: jobDoc.location,
              pay: jobDoc.pay,
              type: jobDoc.type,
            },
            (step) => console.log(`  [Overlay] ${step}`)
          );

          // Upload the overlaid video
          const fileBuffer = fs.readFileSync(outPath);
          const uploadPath = await (localStorageService as any).saveFile(fileBuffer, 'ai-videos', `job-${jobDoc._id}.mp4`);
          finalVideoUrl = uploadPath.startsWith('http') ? uploadPath : `${process.env.API_BASE_URL || 'http://localhost:3001'}${uploadPath}`;

          // Clean up temp files
          try { fs.unlinkSync(tempPath); } catch {}
          try { fs.unlinkSync(outPath); } catch {}

          console.log(`  [Overlay] ✅ Added job details to video`);
        } catch (overlayErr: any) {
          console.warn(`  [Overlay] Failed to add text overlay, using original video:`, overlayErr.message);
        }

        const newShort = new ShortVideo({
          userId: req.user!.userId,
          title: `${jobDoc.title} @ ${jobDoc.company}`,
          description: jobDoc.description,
          videoUrl: finalVideoUrl,
          likes: 0,
          views: 0,
        });
        await newShort.save();

        // Step 4: Mark job as completed
        jobStore.set(videoJobId, {
          ...jobStore.get(videoJobId)!,
          status: 'completed',
          videoUrl: finalVideoUrl,
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
// Generate a ~20-30s video using parallel Meta AI + VEO AI stitching
// ─────────────────────────────────────────────────────────────────────────────
router.post('/generate-long', authenticate, async (req: AuthRequest, res) => {
  const { prompt, description } = req.body;

  if (!prompt && !description) {
    return res.status(400).json({ error: 'prompt or description is required' });
  }

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
    provider: 'parallel-meta-veo',
  });

  // Return job ID immediately — video generates in background
  res.json({ jobId, status: 'processing', estimatedDuration: 30 });

  // Run generation async
  (async () => {
    try {
      const enhancedPrompt = await buildVideoPrompt(videoPrompt);

      const { generateStitchedVideo } = await import('../services/videoStitcher');
      const result = await generateStitchedVideo({
        prompt: enhancedPrompt,
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
