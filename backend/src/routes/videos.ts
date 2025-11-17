import express from 'express';
import { body, validationResult } from 'express-validator';
import { ShortVideo } from '../models/ShortVideo';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as path from 'path';
import * as fs from 'fs';
import mongoose from 'mongoose';

const router = express.Router();

// Get all short videos
router.get('/', async (req, res) => {
  try {
    const videos = await ShortVideo.find()
      .populate('userId', 'name avatarUrl')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });

    res.json(videos.map(video => ({
      id: video._id.toString(),
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      author: {
        id: (video.userId as any)._id.toString(),
        name: (video.userId as any).name,
        avatarUrl: (video.userId as any).avatarUrl,
      },
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

// Get my videos (authenticated user's videos)
router.get('/my-videos', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    
    const videos = await ShortVideo.find({ userId })
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

// Upload video
router.post(
  '/',
  authenticate,
  (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    upload.single('video')(req, res, (err: any) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: err.message || 'File upload failed' });
      }
      next();
    });
  },
  [
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('categoryId').optional(),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
      }

      console.log('File received in memory, size:', req.file.size);

      const { title, description, categoryId } = req.body;
      
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `${uniqueSuffix}${path.extname(req.file.originalname)}`;
      
      // Ensure uploads directory exists - use try-catch
      const uploadsDir = path.join(process.cwd(), 'uploads', 'videos');
      try {
        if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
          fs.mkdirSync(path.join(process.cwd(), 'uploads'));
        }
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir);
        }
      } catch (err) {
        console.error('Error creating directory:', err);
      }
      
      // Save file from memory to disk
      const filePath = path.join(uploadsDir, filename);
      console.log('Saving to:', filePath);
      fs.writeFileSync(filePath, req.file.buffer);
      
      console.log('File saved to:', filePath);

      const videoUrl = `/uploads/videos/${filename}`;

      const video = new ShortVideo({
        userId: new mongoose.Types.ObjectId(req.user!.userId),
        title,
        description: description || undefined,
        videoUrl,
        categoryId: categoryId && mongoose.Types.ObjectId.isValid(categoryId)
          ? new mongoose.Types.ObjectId(categoryId)
          : undefined,
      });

      await video.save();

      console.log('Video saved to database:', video._id);

      res.status(201).json({
        id: video._id.toString(),
        title: video.title,
        videoUrl: video.videoUrl,
        createdAt: video.createdAt,
      });
    } catch (error: any) {
      console.error('Video upload error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Increment video views
router.patch('/:id/view', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const video = await ShortVideo.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ message: 'View counted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete video
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const videoId = req.params.id;
    const userId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    // Find video and check ownership
    const video = await ShortVideo.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if user owns this video
    if (video.userId.toString() !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this video' });
    }

    // Delete video file from filesystem
    if (video.videoUrl) {
      const videoPath = path.join(__dirname, '../../', video.videoUrl);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    // Delete thumbnail if exists
    if (video.thumbnailUrl) {
      const thumbnailPath = path.join(__dirname, '../../', video.thumbnailUrl);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // Delete from database
    await ShortVideo.findByIdAndDelete(videoId);

    res.json({ 
      success: true, 
      message: 'Video deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
