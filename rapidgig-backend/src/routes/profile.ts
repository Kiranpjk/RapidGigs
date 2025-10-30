import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';
import { authenticateToken } from '../middleware/auth';
import { uploadProfilePicture, uploadCompanyLogo } from '../middleware/upload';

const router = Router();

// All profile routes require authentication
router.use(authenticateToken);

// GET /api/profile - Get current user's profile
router.get('/', ProfileController.getProfile);

// GET /api/profile/:id - Get specific user's profile
router.get('/:id', ProfileController.getProfile);

// PUT /api/profile - Update current user's profile
router.put('/', ProfileController.updateProfile);

// POST /api/profile/upload/avatar - Upload profile picture
router.post('/upload/avatar', uploadProfilePicture, ProfileController.uploadProfilePicture);

// POST /api/profile/upload/company-logo - Upload company logo
router.post('/upload/company-logo', uploadCompanyLogo, ProfileController.uploadCompanyLogo);

// GET /api/profile/files - Get user's uploaded files
router.get('/files', ProfileController.getUserFiles);

// DELETE /api/profile/files/:fileId - Delete a file
router.delete('/files/:fileId', ProfileController.deleteFile);

// GET /api/profile/search - Search users
router.get('/search', ProfileController.searchUsers);

export default router;