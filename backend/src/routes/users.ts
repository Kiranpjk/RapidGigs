import express from 'express';
import { body, validationResult } from 'express-validator';
import { UserModel } from '../models/User';
import { Application } from '../models/Application';
import { Job } from '../models/Job';
import { ShortVideo } from '../models/ShortVideo';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import mongoose from 'mongoose';

const router = express.Router();

// Get user profile
router.get('/:id', async (req: express.Request, res: express.Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get stats
    const userId = new mongoose.Types.ObjectId(req.params.id);
    const applicationsSent = await Application.countDocuments({ userId });
    const jobsPosted = await Job.countDocuments({ postedBy: userId });
    const videosUploaded = await ShortVideo.countDocuments({ userId });

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      title: user.title,
      isStudent: user.isStudent,
      isRecruiter: user.isRecruiter,
      stats: {
        applicationsSent,
        jobsPosted,
        videosUploaded,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.patch(
  '/:id',
  authenticate,
  upload.single('avatar'),
  [
    body('name').optional().trim().notEmpty(),
    body('title').optional().trim(),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      if (req.params.id !== req.user!.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updateData: any = {};
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.file) {
        updateData.avatarUrl = `/uploads/avatars/${req.file.filename}`;
      }

      const user = await UserModel.update(req.user!.userId, updateData);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        title: user.title,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update avatar and banner URLs
router.patch(
  '/:id/images',
  authenticate,
  [
    body('avatarUrl').optional().isString(),
    body('bannerUrl').optional().isString(),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      if (req.params.id !== req.user!.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updateData: any = {};
      if (req.body.avatarUrl !== undefined) updateData.avatarUrl = req.body.avatarUrl;
      if (req.body.bannerUrl !== undefined) updateData.bannerUrl = req.body.bannerUrl;

      const user = await UserModel.update(req.user!.userId, updateData);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          bannerUrl: user.bannerUrl,
          title: user.title,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
