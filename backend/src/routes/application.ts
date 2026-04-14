import express from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { Application } from '../models/Application';
import { Job } from '../models/Job';
import { Notification } from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { localStorageService } from '../services/localStorage';
import { uploadToCloudinary } from '../services/cloudinary';
import mongoose from 'mongoose';
import path from 'path';
import { promises as fs } from 'fs';

const router = express.Router();

const getFileNameFromUrl = (fileUrl: string) => {
  try {
    const pathname = new URL(fileUrl).pathname;
    return decodeURIComponent(path.basename(pathname)) || 'resume';
  } catch {
    return path.basename(fileUrl) || 'resume';
  }
};

const getMimeType = (fileName: string, fallback = 'application/octet-stream') => {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.doc') return 'application/msword';
  if (ext === '.docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return fallback;
};

// Get user's applications
router.get('/my-applications', authenticate, async (req: AuthRequest, res) => {
  try {
    const applications = await Application.find({ userId: new mongoose.Types.ObjectId(req.user!.userId) })
      .populate('jobId')
      .sort({ dateApplied: -1 });

    res.json(applications
      .filter(app => app.jobId != null)
      .map(app => ({
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

// Get applications for a specific job (recruiter view)
router.get('/job/:jobId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    // Verify the current user owns this job
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.postedBy.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the job poster can view applications' });
    }

    const applications = await Application.find({ jobId: new mongoose.Types.ObjectId(req.params.jobId) })
      .populate('userId', 'name email avatarUrl title')
      .sort({ createdAt: -1 });

    res.json(applications.map(app => ({
      _id: app._id.toString(),
      applicant: app.userId ? {
        id: (app.userId as any)._id.toString(),
        name: (app.userId as any).name,
        email: (app.userId as any).email,
        avatarUrl: (app.userId as any).avatarUrl,
        title: (app.userId as any).title,
      } : null,
      coverLetter: app.coverLetter,
      resumeUrl: app.resumeUrl,
      videoUrl: app.videoUrl,
      status: app.status,
      createdAt: (app as any).createdAt,
      dateApplied: app.dateApplied,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload resume/video files and return URLs (no application record created)
router.post(
  '/upload-attachments',
  authenticate,
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  async (req: AuthRequest, res) => {
    try {
      const files = req.files as Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
      if (!files || (Array.isArray(files) && files.length === 0)) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const result: { resumeUrl?: string; videoUrl?: string } = {};

      // Determine field files map
      const getFile = (name: string): Express.Multer.File | undefined => {
        if (Array.isArray(files)) return files.find(f => f.fieldname === name);
        return files[name]?.[0];
      };

      const resumeFile = getFile('resume');
      const videoFile = getFile('video');

      if (resumeFile) {
        // Force resumes to Cloudinary for consistent recruiter preview/download.
        const uploaded = await uploadToCloudinary(
          resumeFile.buffer,
          'resumes',
          resumeFile.originalname,
          'raw'
        );
        result.resumeUrl = uploaded.url;
      }

      if (videoFile) {
        const savedPath = await localStorageService.saveFile(videoFile.buffer, 'videos', videoFile.originalname);
        result.videoUrl = savedPath.startsWith('http') ? savedPath : localStorageService.getAbsoluteUrl(savedPath);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

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

      // Check if the job is still open for applications
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      if (job.status === 'Full') {
        return res.status(400).json({ error: 'This job has no more open positions' });
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
        status: 'pending',
      });

      await application.save();

      // Notify the recruiter
      try {
        const recruiterNotification = new Notification({
          userId: job.postedBy,
          type: 'application',
          title: 'New Job Application',
          message: `Someone just applied for your "${job.title}" position!`,
        });
        await recruiterNotification.save();
      } catch (err) {
        console.error('Failed to create recruiter notification:', err);
      }

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
  [body('status').isIn(['pending', 'reviewing', 'shortlisted', 'interviewing', 'accepted', 'rejected'])],
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

      // Find the current application first
      const currentApp = await Application.findById(req.params.id);
      if (!currentApp) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const previousStatus = currentApp.status;

      // Verify the current user owns the job
      const jobForAuth = await Job.findById(currentApp.jobId);
      if (!jobForAuth) {
        return res.status(404).json({ error: 'Associated job not found' });
      }
      if (jobForAuth.postedBy.toString() !== req.user!.userId) {
        return res.status(403).json({ error: 'Only the job poster can update application status' });
      }

      // Handle accepting: atomically increment filledSlots, reject if full
      if (status === 'accepted' && previousStatus !== 'accepted') {
        const job = await Job.findOneAndUpdate(
          { _id: currentApp.jobId, $expr: { $lt: ['$filledSlots', '$maxSlots'] } },
          { $inc: { filledSlots: 1 } },
          { new: true }
        );

        if (!job) {
          return res.status(409).json({ error: 'All positions for this job have been filled' });
        }

        // If filledSlots now equals maxSlots, mark job as Full
        if (job.filledSlots >= job.maxSlots) {
          await Job.findByIdAndUpdate(job._id, { status: 'Full' });
        }
      }

      // Handle un-accepting: decrement filledSlots and potentially reopen
      if (previousStatus === 'accepted' && status !== 'accepted') {
        const job = await Job.findByIdAndUpdate(
          currentApp.jobId,
          { $inc: { filledSlots: -1 } },
          { new: true }
        );
        if (job && job.filledSlots < job.maxSlots && job.status === 'Full') {
          await Job.findByIdAndUpdate(job._id, { status: 'Open' });
        }
      }

      const application = await Application.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Notify the student
      try {
        const statusNotification = new Notification({
          userId: currentApp.userId,
          type: 'status',
          title: 'Application Status Update',
          message: `Your application for "${jobForAuth.title}" has been updated to: ${status.toUpperCase()}`,
        });
        await statusNotification.save();
      } catch (err) {
        console.error('Failed to create status notification:', err);
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

// Re-upload resume for an existing application (student only, owner only)
const handleResumeReupload = async (req: AuthRequest, res: express.Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.userId.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized to update this resume' });
    }

    const uploaded = await uploadToCloudinary(
      file.buffer,
      'resumes',
      file.originalname,
      'raw'
    );

    application.resumeUrl = uploaded.url;
    await application.save();

    return res.json({
      id: application._id.toString(),
      resumeUrl: application.resumeUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

router.patch('/:id/resume', authenticate, upload.single('resume'), handleResumeReupload);
router.post('/:id/resume', authenticate, upload.single('resume'), handleResumeReupload);

// Stream resume bytes for authorized users with inline/download mode
router.get('/:id/resume', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    const mode = req.query.mode === 'download' ? 'download' : 'inline';
    const application = await Application.findById(req.params.id);
    if (!application || !application.resumeUrl) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const job = await Job.findById(application.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Associated job not found' });
    }

    const isApplicant = application.userId.toString() === req.user!.userId;
    const isJobOwner = job.postedBy.toString() === req.user!.userId;
    if (!isApplicant && !isJobOwner) {
      return res.status(403).json({ error: 'Unauthorized to access this resume' });
    }

    const sourceUrl = application.resumeUrl;
    let fileBuffer: Buffer;
    let fileName = 'resume';
    let contentType = 'application/octet-stream';

    if (sourceUrl.startsWith('/uploads/') || sourceUrl.startsWith('uploads/')) {
      const localPath = sourceUrl.startsWith('/')
        ? path.join(process.cwd(), sourceUrl.slice(1))
        : path.join(process.cwd(), sourceUrl);
      fileBuffer = await fs.readFile(localPath);
      fileName = path.basename(localPath);
      contentType = getMimeType(fileName);
    } else {
      const response = await axios.get(sourceUrl, { responseType: 'arraybuffer', timeout: 20000 });
      fileBuffer = Buffer.from(response.data);
      fileName = getFileNameFromUrl(sourceUrl);
      contentType = getMimeType(fileName, response.headers['content-type'] || 'application/octet-stream');
    }

    const safeName = fileName || 'resume';
    res.setHeader('Content-Type', contentType);
    if (mode === 'download') {
      res.setHeader('Content-Disposition', `attachment; filename="${safeName.replace(/"/g, '')}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.send(fileBuffer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
