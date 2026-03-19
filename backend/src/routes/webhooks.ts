import express from 'express';
import { Notification } from '../models/Notification';
import { Application } from '../models/Application';
import { Job } from '../models/Job';
import { User } from '../models/User';

const router = express.Router();

// Verify webhook secret for all endpoints
router.use((req, res, next) => {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Invalid webhook secret' });
  }
  next();
});

// Get new applications since last check (n8n polls this)
router.get('/new-applications', async (req, res) => {
  try {
    const since = req.query.since
      ? new Date(req.query.since as string)
      : new Date(Date.now() - 3600000); // default: last hour

    const apps = await Application.find({ dateApplied: { $gte: since } })
      .populate('userId', 'name email')
      .populate({
        path: 'jobId',
        select: 'title company postedBy',
        populate: { path: 'postedBy', select: 'name email' },
      })
      .sort({ dateApplied: -1 });

    res.json(apps.map(app => ({
      id: app._id.toString(),
      applicant: app.userId ? {
        name: (app.userId as any).name,
        email: (app.userId as any).email,
      } : null,
      job: app.jobId ? {
        title: (app.jobId as any).title,
        company: (app.jobId as any).company,
        recruiterEmail: (app.jobId as any).postedBy?.email,
        recruiterName: (app.jobId as any).postedBy?.name,
      } : null,
      status: app.status,
      dateApplied: app.dateApplied,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get status changes (for email notifications)
router.get('/status-changes', async (req, res) => {
  try {
    const since = req.query.since
      ? new Date(req.query.since as string)
      : new Date(Date.now() - 3600000);

    const apps = await Application.find({ updatedAt: { $gte: since } })
      .populate('userId', 'name email')
      .populate('jobId', 'title company')
      .sort({ updatedAt: -1 });

    res.json(apps.map(app => ({
      id: app._id.toString(),
      applicant: app.userId ? {
        name: (app.userId as any).name,
        email: (app.userId as any).email,
      } : null,
      job: app.jobId ? {
        title: (app.jobId as any).title,
        company: (app.jobId as any).company,
      } : null,
      status: app.status,
      updatedAt: (app as any).updatedAt,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Find matching freelancers for a new job
router.post('/match-freelancers', async (req, res) => {
  try {
    const { jobId } = req.body;

    const job = await Job.findById(jobId).populate('categoryId', 'name');
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Simple matching: find active students
    const candidates = await User.find({
      role: 'student',
      isActive: true,
    })
      .select('name email title')
      .limit(50);

    res.json({
      job: {
        id: job._id.toString(),
        title: job.title,
        company: job.company,
        category: (job.categoryId as any)?.name,
      },
      matchingCandidates: candidates.map(c => ({
        name: c.name,
        email: c.email,
        title: c.title,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create in-app notification (called by n8n after sending email)
router.post('/create-notification', async (req, res) => {
  try {
    const { userId, type, title, message } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title, and message are required' });
    }

    const notification = new Notification({
      userId,
      type: type || 'system',
      title,
      message,
    });

    await notification.save();
    res.status(201).json({ success: true, id: notification._id.toString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
