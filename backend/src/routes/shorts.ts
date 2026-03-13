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

  try {
    const HELIOS_SERVICE_URL = process.env.HELIOS_SERVICE_URL || 'http://localhost:8000';
    
    // Call Helios Microservice
    const response = await axios.post(`${HELIOS_SERVICE_URL}/generate`, {
      prompt,
      num_frames: 132 // Helios multiple of 33
    });

    const { video_url } = response.data;

    // Create a new Short Video entry in DB
    const newShort = new ShortVideo({
      userId: req.user!.userId,
      title: title || 'AI Generated Short',
      description: description || prompt,
      videoUrl: `${HELIOS_SERVICE_URL}${video_url}`, // Full URL to Helios service
      likes: 0,
      views: 0
    });

    await newShort.save();

    res.status(201).json({
      message: 'Video generated successfully via Helios',
      short: newShort
    });

  } catch (error: any) {
    console.error('Helios generation error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate video', 
      details: error.response?.data?.detail || error.message 
    });
  }
});

export default router;
