import express from 'express';
import { body, validationResult } from 'express-validator';
import { Job } from '../models/Job';
import { Category } from '../models/Category';
import { authenticate, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

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
      query.location = { $regex: req.query.location, $options: 'i' };
    }

    const jobs = await Job.find(query)
      .populate('categoryId', 'name')
      .populate('postedBy', 'name avatarUrl')
      .sort({ createdAt: -1 });

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
      likes: job.likes || 0,
      comments: job.comments || 0,
      shares: job.shares || 0,
      postedAgo: job.postedAgo,
      createdAt: job.createdAt,
    })));
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
      likes: job.likes || 0,
      comments: job.comments || 0,
      shares: job.shares || 0,
      postedAgo: job.postedAgo,
      createdAt: job.createdAt,
    });
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
        postedBy: new mongoose.Types.ObjectId(req.user!.userId),
      });

      await job.save();

      res.status(201).json({
        id: job._id.toString(),
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        pay: job.pay,
        description: job.description,
        createdAt: job.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update job likes/comments/shares
router.patch('/:id/engagement', async (req, res) => {
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

export default router;
