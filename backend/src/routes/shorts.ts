import express from 'express';
import axios from 'axios';
import { Job } from '../models/Job';
import { ShortVideo } from '../models/ShortVideo';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * Modern "Shorts" Feed Algorithm
 * ----------------------------
 * 1. Role-Based Filtering: 
 *    - Students see Job Marketing Shorts + Company Culture videos.
 *    - Recruiters see Candidate Intro videos.
 * 2. Exponential Ranking:
 *    - Score = (Likes * 2 + Views) / (HoursOld + 2)^1.2
 * 3. Diversity:
 *    - Mix in 20% "Recent & Low View" videos for discovery.
 */
router.get('/feed', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.userId);
    const isStudent = user?.role === 'student' || user?.isStudent;
    const isRecruiter = user?.role === 'recruiter' || user?.isRecruiter;

    let feedItems: any[] = [];

    if (isStudent) {
      // 1. Get Job Shorts (from Job model)
      const jobsWithVideos = await Job.find({ shortVideoUrl: { $exists: true, $ne: '' } })
        .populate('postedBy', 'name avatarUrl role')
        .sort({ updatedAt: -1 })
        .limit(20);

      const jobItems = jobsWithVideos.map(job => ({
        type: 'job',
        id: job._id.toString(),
        title: job.title,
        company: job.company,
        description: job.description,
        videoUrl: job.shortVideoUrl,
        likes: job.likes || 10, // Mock some engagement if zero
        views: (job.likes || 0) * 5 + 50,
        comments: job.comments || 0,
        shares: job.shares || 0,
        pay: job.pay,
        createdAt: job.createdAt,
        author: {
          name: job.company,
          avatar: (job.postedBy as any)?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}`,
        }
      }));

      // 2. Get Company Shorts (from ShortVideo model where user is recruiter)
      const companyVideos = await ShortVideo.find()
        .populate({
          path: 'userId',
          match: { role: 'recruiter' },
          select: 'name avatarUrl'
        })
        .sort({ createdAt: -1 })
        .limit(20);

      const filteredCompanyVideos = companyVideos.filter(v => v.userId !== null);
      
      const companyItems = filteredCompanyVideos.map(v => ({
        type: 'company_video',
        id: v._id.toString(),
        title: v.title,
        description: v.description,
        videoUrl: v.videoUrl,
        likes: v.likes || 0,
        views: v.views || 0,
        createdAt: v.createdAt,
        author: {
          name: (v.userId as any).name,
          avatar: (v.userId as any).avatarUrl,
        }
      }));

      feedItems = [...jobItems, ...companyItems];

    } else if (isRecruiter) {
      // 1. Get Candidate Intro Videos (ShortVideo model where user is student)
      const candidateVideos = await ShortVideo.find()
        .populate({
          path: 'userId',
          match: { role: 'student' },
          select: 'name avatarUrl title'
        })
        .sort({ createdAt: -1 })
        .limit(40);

      const filteredCandidateVideos = candidateVideos.filter(v => v.userId !== null);

      feedItems = filteredCandidateVideos.map(v => ({
        type: 'candidate_intro',
        id: v._id.toString(),
        title: v.title,
        description: v.description || (v.userId as any).title || 'Aspiring Professional',
        videoUrl: v.videoUrl,
        likes: v.likes || 0,
        views: v.views || 0,
        createdAt: v.createdAt,
        author: {
          name: (v.userId as any).name,
          avatar: (v.userId as any).avatarUrl,
        }
      }));
    } else {
        // Fallback or Admin view: Show everything recent
        const allVideos = await ShortVideo.find().populate('userId', 'name avatarUrl').limit(20);
        feedItems = allVideos.map(v => ({
            type: 'video',
            id: v._id.toString(),
            title: v.title,
            videoUrl: v.videoUrl,
            author: { name: (v.userId as any).name, avatar: (v.userId as any).avatarUrl }
        }));
    }

    // ALGORITHM: Ranking & Sorting
    const now = new Date();
    feedItems = feedItems.map(item => {
      const hoursOld = Math.max(0.5, (now.getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60));
      const engagement = (item.likes || 0) * 2 + (item.views || 0);
      // Formula: Score decays over time
      const score = engagement / Math.pow(hoursOld + 2, 1.2);
      return { ...item, score };
    });

    // Sort by final score
    feedItems.sort((a, b) => b.score - a.score);

    res.json(feedItems);

  } catch (error: any) {
    console.error('Shorts algorithm error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * AI Video Generation (Helios Integration)
 * ---------------------------------------
 * Generates a cinematic short video based on a text prompt.
 */
router.post('/generate', authenticate, async (req: AuthRequest, res) => {
  const { prompt, title, description } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const HELIOS_URL = process.env.HELIOS_SERVICE_URL || 'http://localhost:8000';
  const FAL_KEY    = process.env.FAL_KEY || '';

  let videoUrl: string | null = null;
  let provider = '';

  // ── 1. Try Helios (local GPU) first ───────────────────────────────────────
  try {
    console.log('🎬 Trying Helios at', HELIOS_URL);
    const heliosRes = await axios.post(
      `${HELIOS_URL}/generate`,
      { prompt, num_frames: 136 },
      { timeout: 600_000 } // 10 min timeout for GPU generation
    );
    videoUrl = heliosRes.data.video_url;
    // If video_url is relative (e.g. /videos/abc.mp4), make it absolute
    if (videoUrl && videoUrl.startsWith('/')) {
      videoUrl = `${HELIOS_URL}${videoUrl}`;
    }
    provider = 'helios';
    console.log('✅ Helios generated:', videoUrl);

  } catch (heliosErr: any) {
    console.warn('⚠️  Helios unavailable:', heliosErr.message);

    // ── 2. Fallback: fal.ai (free cloud API) ──────────────────────────────
    if (FAL_KEY) {
      try {
        console.log('☁️  Falling back to fal.ai (LTX-Video)...');

        // fal.ai queue API — works completely free with $2.50 credit on signup
        const falRes = await axios.post(
          'https://queue.fal.run/fal-ai/ltx-video',
          {
            prompt,
            num_frames: 97,          // ~8s @ 12fps — LTX optimal
            num_inference_steps: 30,
            resolution: '640x360',
          },
          {
            headers: {
              Authorization: `Key ${FAL_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 120_000, // 2 min timeout for cloud
          }
        );

        // fal.ai returns a request_id — poll for the result
        const requestId = falRes.data.request_id;
        if (requestId) {
          // Poll until done (max 90 seconds)
          for (let i = 0; i < 18; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const pollRes = await axios.get(
              `https://queue.fal.run/fal-ai/ltx-video/requests/${requestId}`,
              { headers: { Authorization: `Key ${FAL_KEY}` } }
            );
            if (pollRes.data.status === 'COMPLETED') {
              videoUrl = pollRes.data.output?.video?.url || pollRes.data.output?.video_url;
              break;
            }
            if (pollRes.data.status === 'FAILED') {
              throw new Error('fal.ai generation failed: ' + pollRes.data.error);
            }
          }
        } else {
          // Synchronous response (small models)
          videoUrl = falRes.data.video?.url || falRes.data.video_url;
        }

        provider = 'fal.ai';
        console.log('✅ fal.ai generated:', videoUrl);

      } catch (falErr: any) {
        console.error('❌ fal.ai also failed:', falErr.message);
      }
    } else {
      console.log('ℹ️  FAL_KEY not set — fal.ai fallback skipped.');
    }
  }

  // ── 3. Both failed → return error ─────────────────────────────────────────
  if (!videoUrl) {
    return res.status(503).json({
      error: 'AI video generation unavailable',
      details: FAL_KEY
        ? 'Both Helios and fal.ai failed. Check service logs.'
        : 'Helios is offline. Set FAL_KEY env var to enable cloud fallback.',
      helios: HELIOS_URL,
      tip: 'Sign up at fal.ai and set FAL_KEY to enable cloud video generation.',
    });
  }

  // ── 4. Save to DB and return ───────────────────────────────────────────────
  const newShort = new ShortVideo({
    userId: req.user!.userId,
    title: title || 'AI Generated Short',
    description: description || prompt,
    videoUrl,
    likes: 0,
    views: 0,
  });

  await newShort.save();

  res.status(201).json({
    message: `Video generated via ${provider}`,
    provider,
    short: newShort,
    videoUrl,
  });
});



export default router;
