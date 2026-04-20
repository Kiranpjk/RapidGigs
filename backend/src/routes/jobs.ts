import express from 'express';
import { body, validationResult } from 'express-validator';
import { Job } from '../models/Job';
import { Application } from '../models/Application';
import { ShortVideo } from '../models/ShortVideo';
import { Category } from '../models/Category';
import { authenticate, AuthRequest } from '../middleware/auth';
import { formatTimestamp } from '../utils/formatTimestamp';
import mongoose from 'mongoose';
import { parseJobDescription } from '../services/jobParser';

const router = express.Router();

// Get all jobs with filters
router.get('/', async (req, res) => {
  try {
    const query: any = {};

    if (req.query.category) {
      const category = await Category.findOne({ name: req.query.category });
      if (category) {
        query.categoryId = category._id;
      }
    }

    if (req.query.type) {
      query.type = req.query.type;
    }

    if (req.query.location) {
      const escaped = (req.query.location as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.location = { $regex: escaped, $options: 'i' };
    }

    // Text search across title, company, and description
    if (req.query.search) {
      const escaped = (req.query.search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { title: searchRegex },
        { company: searchRegex },
        { description: searchRegex },
      ];
    }

    // Sort: default is latest, 'popular' sorts by likes
    let sortOption: any = { createdAt: -1 };
    if (req.query.sort === 'popular') {
      sortOption = { likes: -1, createdAt: -1 };
    }

    const jobs = await Job.find(query)
      .populate('categoryId', 'name')
      .populate('postedBy', 'name avatarUrl')
      .sort(sortOption)
      .limit(100);

    res.json(jobs.map(job => ({
      id: job._id.toString(),
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      pay: job.pay,
      description: job.description,
      category: (job.categoryId as any)?.name || null,
      companyVideoUrl: job.companyVideoUrl,
      freelancerVideoUrl: job.freelancerVideoUrl,
      shortVideoUrl: job.shortVideoUrl,
      maxSlots: job.maxSlots || 1,
      filledSlots: job.filledSlots || 0,
      status: job.status || 'Open',
      likes: job.likes || 0,
      comments: job.comments || 0,
      shares: job.shares || 0,
      postedAgo: formatTimestamp(job.createdAt),
      createdAt: job.createdAt,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get jobs posted by current user (recruiter view)
router.get('/my-jobs', authenticate, async (req: AuthRequest, res) => {
  try {
    const jobs = await Job.find({ postedBy: new mongoose.Types.ObjectId(req.user!.userId) })
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });

    const jobsWithCounts = await Promise.all(jobs.map(async (job) => {
      const applicationCount = await Application.countDocuments({ jobId: job._id });
      return {
        _id: job._id.toString(),
        id: job._id.toString(),
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        pay: job.pay,
        description: job.description,
        maxSlots: job.maxSlots || 1,
        filledSlots: job.filledSlots || 0,
        status: job.status || 'Open',
        applicationCount,
        createdAt: job.createdAt,
      };
    }));

    res.json(jobsWithCounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const job = await Job.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('postedBy', 'name avatarUrl');

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job._id.toString(),
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      pay: job.pay,
      description: job.description,
      category: (job.categoryId as any)?.name || null,
      companyVideoUrl: job.companyVideoUrl,
      freelancerVideoUrl: job.freelancerVideoUrl,
      shortVideoUrl: job.shortVideoUrl,
      maxSlots: job.maxSlots || 1,
      filledSlots: job.filledSlots || 0,
      status: job.status || 'Open',
      likes: job.likes || 0,
      comments: job.comments || 0,
      shares: job.shares || 0,
      postedAgo: formatTimestamp(job.createdAt),
      createdAt: job.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Parse job description text into structured fields
router.post('/parse-description', authenticate, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided to parse' });
    }

    const parsed = await parseJobDescription(text);
    if (!parsed) {
      return res.status(500).json({ error: 'AI failed to parse the description' });
    }

    res.json(parsed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Create job (authenticated)
router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty(),
    body('company').trim().notEmpty(),
    body('location').trim().notEmpty(),
    body('type').isIn(['Remote', 'On-site', 'Hybrid']),
    body('pay').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('maxSlots').optional().isInt({ min: 1 }).toInt(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        company,
        location,
        type,
        pay,
        description,
        categoryId,
        companyVideoUrl,
        freelancerVideoUrl,
        shortVideoUrl,
        maxSlots,
      } = req.body;

      const job = new Job({
        title,
        company,
        location,
        type,
        pay,
        description,
        categoryId: categoryId ? new mongoose.Types.ObjectId(categoryId) : undefined,
        companyVideoUrl,
        freelancerVideoUrl,
        shortVideoUrl,
        maxSlots: maxSlots || 1,
        postedBy: new mongoose.Types.ObjectId(req.user!.userId),
      });

      await job.save();

      // If recruiter already attached a generated short while posting,
      // mirror it into ShortVideo feed so students can see it in Shorts.
      if (shortVideoUrl) {
        const existingOrphanedShort = await ShortVideo.findOne({ videoUrl: shortVideoUrl });
        
        if (existingOrphanedShort) {
          // It was generated by our AI and is sitting in the feed; link it to this job!
          existingOrphanedShort.jobId = job._id as any;
          existingOrphanedShort.title = `${job.title} @ ${job.company}`;
          await existingOrphanedShort.save();
        } else {
          // User pasted a manual link that hasn't been added to the feed yet
          const existingShortByJob = await ShortVideo.findOne({ jobId: job._id });
          if (!existingShortByJob) {
            await new ShortVideo({
              userId: new mongoose.Types.ObjectId(req.user!.userId),
              jobId: job._id as any,
              title: `${job.title} @ ${job.company}`,
              description: job.description,
              videoUrl: shortVideoUrl,
              likes: 0,
              views: 0,
            }).save();
          }
        }
      }

      res.status(201).json({
        id: job._id.toString(),
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        pay: job.pay,
        description: job.description,
        maxSlots: job.maxSlots,
        filledSlots: job.filledSlots,
        status: job.status,
        createdAt: job.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update job likes/comments/shares
router.patch('/:id/engagement', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const { likes, comments, shares } = req.body;
    const updates: any = {};

    if (likes !== undefined) updates.likes = likes;
    if (comments !== undefined) updates.comments = comments;
    if (shares !== undefined) updates.shares = shares;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const job = await Job.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      likes: job.likes,
      comments: job.comments,
      shares: job.shares,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update job (authenticated, owner only)
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Verify ownership
    if (job.postedBy.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this job' });
    }

    const {
      title,
      company,
      location,
      type,
      pay,
      description,
      categoryId,
      companyVideoUrl,
      freelancerVideoUrl,
      shortVideoUrl,
    } = req.body;

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      {
        title,
        company,
        location,
        type,
        pay,
        description,
        categoryId: categoryId ? new mongoose.Types.ObjectId(categoryId) : job.categoryId,
        companyVideoUrl,
        freelancerVideoUrl,
        shortVideoUrl,
      },
      { new: true }
    );

    res.json(updatedJob);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete job (authenticated, owner only)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Verify ownership
    if (job.postedBy.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this job' });
    }

    await Job.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
