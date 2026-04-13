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
import { Notification } from '../models/Notification';
import { Job } from '../models/Job';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { buildVideoPrompt } from '../services/promptBuilder';
import { getVideoProviderStatus } from '../services/videoEngine';

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
  script: any,
  jobId: string,
  mongoJobId?: string,
  provider: string = 'auto'
): Promise<{ videoUrl: string; provider: string } | null> {
  try {
    const { generateStitchedVideo } = await import('../services/videoStitcher');
    const { Job } = await import('../models/Job');

    const result = await generateStitchedVideo({
      script,
      provider: provider as any,
      jobId,
      onProgress: async (step, progress) => {
        console.log(`[VideoGen ${jobId}] ${step} (${Math.round(progress * 100)}%)`);
        
        // Update in-memory store
        const jobEntry = jobStore.get(jobId);
        if (jobEntry) {
          jobEntry.progress = progress;
          jobEntry.debugInfo = step;
        }

        // Update MongoDB if mongoJobId provided
        if (mongoJobId) {
          try {
            await Job.findByIdAndUpdate(mongoJobId, {
              videoGenStatus: 'Processing',
              videoGenProgress: Math.round(progress * 100),
              videoGenStage: step
            });
          } catch (e) { /* ignore DB update errors */ }
        }
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
  const { prompt, title, description, provider = 'auto' } = req.body;

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
    provider: provider,
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
      // Step 1: Enhance prompt with Groq to build Structured Script
      const videoScript = await buildVideoPrompt(prompt);

    // Step 2: Generate video (no Mongo job backing this preview flow)
    const result = await generateVideoUrl(videoScript, jobId, undefined, provider);

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

      // Notify the user
      try {
        const videoNotification = new Notification({
          userId: jobStore.get(jobId)!.userId,
          type: 'video',
          title: 'AI Video Ready',
          message: 'Your 30-second AI pitch video is ready for preview!',
        });
        await videoNotification.save();
      } catch (err) {
        console.error('Failed to create video notification:', err);
      }

      console.log(`Job ${jobId} completed via ${result.provider}`);
    } catch (err: any) {
      console.error(`Job ${jobId} failed:`, err.message);
      jobStore.set(jobId, {
        ...jobStore.get(jobId)!,
        status: 'failed',
        error: err.message,
      });

      // Notify the user of failure
      try {
        const failNotification = new Notification({
          userId: jobStore.get(jobId)!.userId,
          type: 'video',
          title: 'Video Generation Failed',
          message: `Sorry, we couldn't generate your video: ${err.message}`,
        });
        await failNotification.save();
      } catch (nErr) {
        console.error('Failed to create failure notification:', nErr);
      }
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
        // Step 1: Enhance prompt using Ollama/Groq with full job context to get VideoScript
        const videoScript = await buildVideoPrompt(richDescription);
        console.log(`[from-job] Enhanced script for "${jobDoc.title}" generated successfully.`);

        // Step 2: Generate video (passing mongoJobId for status tracking)
        const result = await generateVideoUrl(videoScript, videoJobId, jobDoc._id.toString());

        if (!result) {
          jobStore.set(videoJobId, {
            ...jobStore.get(videoJobId)!,
            status: 'failed',
            error: 'All video providers unavailable.',
          });
          
          await Job.findByIdAndUpdate(jobDoc._id, {
            videoGenStatus: 'Failed',
            videoGenStage: 'Final Provider Failure'
          });
          return;
        }

        // Step 3: Save as ShortVideo in DB
        let finalVideoUrl = result.videoUrl;

        const newShort = new ShortVideo({
          userId: req.user!.userId,
          jobId: jobDoc._id,
          title: `${jobDoc.title} @ ${jobDoc.company}`,
          description: jobDoc.description,
          videoUrl: finalVideoUrl,
          likes: 0,
          views: 0,
        });
        await newShort.save();

        // Step 3.1: Also update the original Job document so it has the video link
        jobDoc.shortVideoUrl = finalVideoUrl;
        jobDoc.videoGenStatus = 'Completed';
        jobDoc.videoGenProgress = 100;
        jobDoc.videoGenStage = 'All Done!';
        await jobDoc.save();

        // Step 4: Mark job as completed
        jobStore.set(videoJobId, {
          ...jobStore.get(videoJobId)!,
          status: 'completed',
          videoUrl: finalVideoUrl,
          provider: result.provider,
        });

        // Notify the user
        try {
          const jobVideoNotification = new Notification({
            userId: req.user!.userId,
            type: 'video',
            title: 'Job Video Generated',
            message: `The AI video for your job "${jobDoc.title}" is now live!`,
          });
          await jobVideoNotification.save();
        } catch (err) {
          console.error('Failed to create job video notification:', err);
        }

        console.log(`[from-job] Job ${videoJobId} completed via ${result.provider}`);
      } catch (err: any) {
        console.error(`[from-job] Job ${videoJobId} failed:`, err.message);
        jobStore.set(videoJobId, {
          ...videoJobId.startsWith('vj_') ? jobStore.get(videoJobId) : { status: 'failed' } as any,
          status: 'failed',
          error: err.message,
        });
        
        await Job.findByIdAndUpdate(jobDoc._id, {
          videoGenStatus: 'Failed',
          videoGenStage: `Error: ${err.message}`
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
// Generate a longer-form (~5-10s) marketing video
// using the same provider engine as other endpoints.
// Currently generates a single continuous clip rather than
// physically stitching multiple clips.
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
  res.json({ jobId, status: 'processing', estimatedDuration: 5 });

  // Run generation async
  (async () => {
    try {
      const videoScript = await buildVideoPrompt(videoPrompt);

      const { generateStitchedVideo } = await import('../services/videoStitcher');
      const result = await generateStitchedVideo({
        script: videoScript,
        onProgress: (step, progress) => {
          console.log(`[StitchedVideo ${jobId}] ${step} (${Math.round(progress * 100)}%)`);
          const jobEntry = jobStore.get(jobId);
          if (jobEntry) {
            jobEntry.progress = progress;
            jobEntry.debugInfo = step;
          }
        },
      });

      let finalVideoUrl = result.videoUrl;

      // Save to database
      const short = new ShortVideo({
        title: videoPrompt.substring(0, 100),
        description: videoPrompt,
        videoUrl: finalVideoUrl,
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

        // Notify the user
        try {
          const longVideoNotification = new Notification({
            userId: userId,
            type: 'video',
            title: 'Long Video Generated',
            message: 'Your complete AI short film has been generated successfully!',
          });
          await longVideoNotification.save();
        } catch (err) {
          console.error('Failed to create long video notification:', err);
        }
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
// Called by n8n or webhooks when async generation completes
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

// ── Specific Video Generation Endpoints (Requested) ─────────────────────────

/** POST /api/shorts/text-to-video */
router.post('/text-to-video', authenticate, async (req: AuthRequest, res) => {
  const { prompt, provider = 'auto' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const jobId = generateJobId();
  jobStore.set(jobId, {
    id: jobId,
    status: 'processing',
    prompt,
    userId: req.user!.userId,
    createdAt: new Date(),
    provider,
  });

  res.status(202).json({ success: true, jobId, pollUrl: `/api/shorts/status/${jobId}` });

  // Background
  (async () => {
    try {
      const result = await generateVideoUrl({ segments: [{ visualPrompt: prompt, overlayText: '' }] }, jobId, undefined, provider);
      if (result) {
        const job = jobStore.get(jobId);
        if (job) {
          job.status = 'completed';
          job.videoUrl = result.videoUrl;
          job.provider = result.provider;
        }
      } else {
        const job = jobStore.get(jobId);
        if (job) { job.status = 'failed'; job.error = 'Generation failed'; }
      }
    } catch(e: any) {
      const job = jobStore.get(jobId);
      if (job) { job.status = 'failed'; job.error = e.message; }
    }
  })();
});

/** POST /api/shorts/image-to-video */
router.post('/image-to-video', authenticate, async (req: AuthRequest, res) => {
  const { prompt, imageUrl, provider = 'auto' } = req.body;
  if (!prompt || !imageUrl) return res.status(400).json({ error: 'prompt and imageUrl are required' });

  const jobId = generateJobId();
  jobStore.set(jobId, {
    id: jobId,
    status: 'processing',
    prompt,
    userId: req.user!.userId,
    createdAt: new Date(),
    provider,
  });

  res.status(202).json({ success: true, jobId, pollUrl: `/api/shorts/status/${jobId}` });

  // Background
  (async () => {
    try {
      const { generateStitchedVideo } = await import('../services/videoStitcher');
      const result = await generateStitchedVideo({
        script: { segments: [{ visualPrompt: prompt, overlayText: '' }] },
        coverImageUrl: imageUrl,
        jobId,
        provider: provider as any
      });
      
      const job = jobStore.get(jobId);
      if (job && result) {
        job.status = 'completed';
        job.videoUrl = result.videoUrl;
        job.provider = result.providers[0];
      }
    } catch(e: any) {
      const job = jobStore.get(jobId);
      if (job) { job.status = 'failed'; job.error = e.message; }
    }
  })();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shorts/health (Alias for /api/video/health)
// Returns which video generation providers are configured and active
// ─────────────────────────────────────────────────────────────────────────────
router.get(['/health', '/providers'], authenticate, (req, res) => {
  const providers = getVideoProviderStatus();
  res.json({
    status: 'ok',
    providers: {
      magichour: providers['magic-hour'] ? 'ok' : 'no_key',
      fal: providers['fal.ai'] ? 'ok' : 'no_key',
      zsky: 'ok',
      meta: providers['meta-ai'] ? 'ok' : 'no_cookies'
    }
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Shorts feed (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/feed', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.userId);
    const isStudent = user?.role === 'student' || user?.isStudent;
    const isRecruiter = user?.role === 'recruiter' || user?.role === 'admin' || user?.isRecruiter;
    let feedItems: any[] = [];

    if (isStudent) {
      // Students see BOTH student intro videos AND job marketing videos (from recruiters)
      const allVideos = await ShortVideo.find()
        .populate({ path: 'userId', select: 'name avatarUrl role' })
        .populate({ path: 'jobId', select: 'title company pay description' })
        .sort({ createdAt: -1 })
        .limit(30);

      feedItems = allVideos.map(v => {
        const user = v.userId as any;
        const job = v.jobId as any;
        
        // If it has a jobId, it's a job marketing video
        if (job) {
          return {
            type: 'job',
            id: v._id.toString(),
            jobId: job._id.toString(),
            title: job.title,
            company: job.company,
            description: v.description || job.description || '',
            videoUrl: v.videoUrl,
            likes: v.likes || 0,
            views: v.views || 0,
            pay: job.pay,
            createdAt: v.createdAt,
            authorId: user?._id?.toString(),
            author: {
              id: user?._id?.toString(),
              name: job.company || user?.name,
              avatar: user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company || 'C')}`,
            }
          };
        }

        // Otherwise it's a student intro (only show if author is indeed a student)
        if (user?.role === 'student' || user?.isStudent) {
          return {
            type: 'student_intro',
            id: v._id.toString(),
            title: v.title,
            description: v.description || '',
            videoUrl: v.videoUrl,
            likes: v.likes || 0,
            views: v.views || 0,
            createdAt: v.createdAt,
            authorId: user?._id?.toString(),
            author: {
              id: user?._id?.toString(),
              name: user?.name,
              avatar: user?.avatarUrl,
            }
          };
        }
        return null;
      }).filter(Boolean);

      // Also include recruiter job videos that exist on Job.shortVideoUrl
      // even if a ShortVideo document is missing for older posts.
      const jobsWithShorts = await Job.find({ shortVideoUrl: { $exists: true, $ne: '' } })
        .populate('postedBy', 'name avatarUrl')
        .sort({ createdAt: -1 })
        .limit(30);

      const existingJobIds = new Set(
        feedItems
          .filter(item => item?.type === 'job' && item?.jobId)
          .map(item => item.jobId)
      );

      const fallbackJobItems = jobsWithShorts
        .filter(job => !existingJobIds.has(job._id.toString()))
        .map(job => ({
          type: 'job',
          id: `job_${job._id.toString()}`,
          jobId: job._id.toString(),
          title: job.title,
          company: job.company,
          description: job.description || '',
          videoUrl: job.shortVideoUrl,
          likes: job.likes || 0,
          views: (job.likes || 0) * 3 + 25,
          pay: job.pay,
          createdAt: job.createdAt,
          authorId: job.postedBy ? ((job.postedBy as any)._id?.toString() || job.postedBy.toString()) : null,
          author: {
            id: job.postedBy ? ((job.postedBy as any)._id?.toString() || job.postedBy.toString()) : null,
            name: job.company || (job.postedBy as any)?.name || 'Company',
            avatar: (job.postedBy as any)?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company || 'C')}`,
          }
        }));

      feedItems = [...feedItems, ...fallbackJobItems];
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
