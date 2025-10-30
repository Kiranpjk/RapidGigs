import { Router } from 'express';
import { VideoController } from '../controllers/videoController';
import { authenticateToken } from '../middleware/auth';
import { videoUpload, handleVideoUploadError } from '../middleware/videoUpload';

const router = Router();

// Public routes (no authentication required)
router.get('/feed', VideoController.getVideosFeed);
router.get('/trending', VideoController.getTrendingVideos);
router.get('/categories', VideoController.getCategories);
router.get('/search', VideoController.searchVideos);
router.get('/:id', VideoController.getVideo);
router.get('/:id/comments', VideoController.getComments);

// Protected routes (authentication required)
router.use(authenticateToken);

// POST /api/videos/upload - Upload a new video
router.post('/upload', videoUpload.single('video'), handleVideoUploadError, VideoController.uploadVideo);

// GET /api/videos/user/:userId - Get user's videos
// GET /api/videos/user - Get current user's videos
router.get('/user/:userId', VideoController.getUserVideos);
router.get('/user', VideoController.getUserVideos);

// PUT /api/videos/:id - Update video metadata
router.put('/:id', VideoController.updateVideo);

// DELETE /api/videos/:id - Delete video
router.delete('/:id', VideoController.deleteVideo);

// POST /api/videos/:id/like - Like/dislike video
router.post('/:id/like', VideoController.likeVideo);

// DELETE /api/videos/:id/like - Remove like/dislike
router.delete('/:id/like', VideoController.removeLike);

// POST /api/videos/:id/comments - Add comment
router.post('/:id/comments', VideoController.addComment);

export default router;