import express from 'express';
import { body, validationResult } from 'express-validator';
import { Application } from '../models/Application';
import { Job } from '../models/Job';
import { authenticate, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// Get user's applications
router.get('/my-applications', authenticate, async (req: AuthRequest, res) => {
  try {
    const applications = await Application.find({ userId: new mongoose.Types.ObjectId(req.user!.userId) })
      .populate('jobId')
      .sort({ dateApplied: -1 });

    res.json(applications.map(app => ({
      id: app._id.toString(),
      job: {
        id: (app.jobId as any)._id.toString(),
        title: (app.jobId as any).title,
        company: (app.jobId as any).company,
        location: (app.jobId as any).location,
        type: (app.jobId as any).type,
        pay: (app.jobId as any).pay,
        description: (app.jobId as any).description,
      },
      coverLetter: app.coverLetter,
      resumeUrl: app.resumeUrl,
      videoUrl: app.videoUrl,
      status: app.status,
      dateApplied: app.dateApplied,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create application
router.post(
  '/',
  authenticate,
  [
    body('jobId').notEmpty(),
    body('coverLetter').optional().trim(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { jobId, coverLetter, resumeUrl, videoUrl } = req.body;

      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ error: 'Invalid job ID' });
      }

      // Check if already applied
      const existing = await Application.findOne({
        jobId: new mongoose.Types.ObjectId(jobId),
        userId: new mongoose.Types.ObjectId(req.user!.userId),
      });

      if (existing) {
        return res.status(400).json({ error: 'Already applied to this job' });
      }

      const application = new Application({
        jobId: new mongoose.Types.ObjectId(jobId),
        userId: new mongoose.Types.ObjectId(req.user!.userId),
        coverLetter: coverLetter || undefined,
        resumeUrl: resumeUrl || undefined,
        videoUrl: videoUrl || undefined,
        status: 'Applied',
      });

      await application.save();

      res.status(201).json({
        id: application._id.toString(),
        jobId: application.jobId.toString(),
        status: application.status,
        dateApplied: application.dateApplied,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update application status
router.patch(
  '/:id/status',
  authenticate,
  [body('status').isIn(['Applied', 'Interviewing', 'Offer Received', 'Rejected'])],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid application ID' });
      }

      const { status } = req.body;
      const application = await Application.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      res.json({
        id: application._id.toString(),
        status: application.status,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
