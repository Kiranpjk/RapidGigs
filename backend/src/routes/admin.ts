import express from 'express';
import { requireAdmin } from '../middleware/rbac';
import { authenticate } from '../middleware/auth';
import { Application } from '../models/Application';
import { User } from '../models/User';
import { Job } from '../models/Job';
import mongoose from 'mongoose';

const router = express.Router();

router.use(authenticate);

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
