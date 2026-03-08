import express from 'express';
import { requireAdmin } from '../middleware/rbac';
import { authenticate } from '../middleware/auth';
import { Application } from '../models/Application';
import { User } from '../models/User';
import { Job } from '../models/Job';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import { generateJobVideoFromJD } from '../services/jdVideoService';

const router = express.Router();

router.use(authenticate);

router.post(
  '/jobs/create-from-jd',
  requireAdmin,
  [
    body('title').trim().notEmpty(),
    body('company').trim().notEmpty(),
    body('location').trim().notEmpty(),
    body('type').isIn(['Remote', 'On-site', 'Hybrid']),
    body('pay').trim().notEmpty(),
    body('description').trim().isLength({ min: 40 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, company, location, type, pay, description } = req.body;

      const videoPlan = await generateJobVideoFromJD({
        title,
        company,
        location,
        type,
        pay,
        description,
      });

      const job = new Job({
        title,
        company,
        location,
        type,
        pay,
        description,
        postedBy: new mongoose.Types.ObjectId((req as any).user.userId),
        shortVideoUrl: videoPlan.shortVideoUrl || undefined,
        shortVideoScript: videoPlan.narrationScript,
        shortVideoScenes: videoPlan.scenes,
        shortVideoStatus: videoPlan.status,
      });

      await job.save();

      return res.status(201).json({
        job: {
          id: job._id.toString(),
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          pay: job.pay,
          description: job.description,
          shortVideoUrl: job.shortVideoUrl,
          shortVideoScript: job.shortVideoScript,
          shortVideoScenes: job.shortVideoScenes,
          shortVideoStatus: job.shortVideoStatus,
          createdAt: job.createdAt,
        },
        videoProvider: videoPlan.provider,
        videoGenerationError: videoPlan.error,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// List users (with optional filter by role)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).sort({ createdAt: -1 }).select('-password');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single user with their applications
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const applications = await Application.find({ userId: user._id }).populate('jobId');
    res.json({ user, applications });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List all applications with populated user and job
router.get('/applications', requireAdmin, async (req, res) => {
  try {
    const apps = await Application.find()
      .populate('userId', 'name email avatarUrl title isStudent isRecruiter')
      .populate('jobId', 'title company location')
      .sort({ dateApplied: -1 });

    res.json(apps.map(a => ({
      id: a._id.toString(),
      job: a.jobId,
      applicant: a.userId,
      coverLetter: a.coverLetter,
      resumeUrl: a.resumeUrl,
      videoUrl: a.videoUrl,
      status: a.status,
      dateApplied: a.dateApplied,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single application
router.get('/applications/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const app = await Application.findById(req.params.id)
      .populate('userId', 'name email avatarUrl title isStudent isRecruiter')
      .populate('jobId', 'title company location');
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json(app);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to generate video from job description using external Gemini API (placeholder)
router.post('/generate-video', requireAdmin, async (req, res) => {
  try {
    const { text, model = 'gemini' } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    // Check for API key in server env
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // For now, return a mocked URL and 501 notice
      return res.status(501).json({ error: 'GEMINI_API_KEY not configured', mockVideoUrl: null });
    }

    // Real implementation would call the Gemini API here.
    // We'll respond with 501 until the key and integration details are provided.
    return res.status(501).json({ error: 'Gemini integration not implemented in this build' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
