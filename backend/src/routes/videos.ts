import express from 'express';
import { body, validationResult } from 'express-validator';
import { ShortVideo } from '../models/ShortVideo';
import { Category } from '../models/Category';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { localStorageService } from '../services/localStorage';
import { config } from '../config/env';
import mongoose from 'mongoose';

const router = express.Router();

// ─── GET all videos ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const videos = await ShortVideo.find()
      .populate('userId', 'name avatarUrl')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(videos.map(video => ({
      id: video._id.toString(),
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      author: video.userId ? {
        id: (video.userId as any)._id.toString(),
        name: (video.userId as any).name,
        avatarUrl: (video.userId as any).avatarUrl,
      } : { id: '', name: 'Deleted User', avatarUrl: null },
      category: (video.categoryId as any)?.name || null,
      views: video.views || 0,
      likes: video.likes || 0,
      duration: video.duration,
      createdAt: video.createdAt,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET my videos ───────────────────────────────────────────────────────────
router.get('/my-videos', authenticate, async (req: AuthRequest, res) => {
  try {
    const videos = await ShortVideo.find({ userId: req.user!.userId })
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });

    res.json(videos.map(video => ({
      _id: video._id.toString(),
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      category: (video.categoryId as any)?.name || null,
      views: video.views || 0,
      likes: video.likes || 0,
      duration: video.duration,
      createdAt: video.createdAt,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST upload video ────────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    upload.single('video')(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err.message || 'File upload failed' });
      next();
    });
  },
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
    body('categoryId').optional(),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });

      const { title, description, categoryId } = req.body;
      let videoUrl: string;

      // Save video to Cloudinary (or local disk fallback)
      const savedPath = await localStorageService.saveFile(req.file.buffer, 'videos', req.file.originalname);
      // Cloudinary returns a full URL; local returns a relative path
      videoUrl = savedPath.startsWith('http') ? savedPath : localStorageService.getAbsoluteUrl(savedPath);

      const video = new ShortVideo({
        userId: new mongoose.Types.ObjectId(req.user!.userId),
        title,
        description: description || undefined,
        videoUrl,
        categoryId:
          categoryId && mongoose.Types.ObjectId.isValid(categoryId)
            ? new mongoose.Types.ObjectId(categoryId)
            : undefined,
      });

      await video.save();

      res.status(201).json({
        id: video._id.toString(),
        title: video.title,
        videoUrl: video.videoUrl,
        createdAt: video.createdAt,
        storage: 'local',
      });
    } catch (error: any) {
      console.error('Video upload error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ─── PATCH view count ─────────────────────────────────────────────────────────
router.patch('/:id/view', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid video ID' });

    const video = await ShortVideo.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ message: 'View counted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE video ─────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'Invalid video ID' });

    const video = await ShortVideo.findById(id);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    if (video.userId.toString() !== req.user!.userId)
      return res.status(403).json({ error: 'Forbidden' });

    // Delete local file if it's a local URL
    if (video.videoUrl?.includes('/uploads/')) {
      let urlPath: string;
      try {
        urlPath = new URL(video.videoUrl).pathname;
      } catch {
        urlPath = video.videoUrl;
      }
      localStorageService.deleteFile(urlPath);
    }

    await ShortVideo.findByIdAndDelete(id);
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
