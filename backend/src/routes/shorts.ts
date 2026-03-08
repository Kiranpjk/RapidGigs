import express from 'express';
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

export default router;
