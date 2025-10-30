import { Router } from 'express';
import authRoutes from './auth';
import profileRoutes from './profile';
import videoRoutes from './videos';
import jobRoutes from './jobs';
import messageRoutes from './messages';
import notificationRoutes from './notifications';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/videos', videoRoutes);
router.use('/jobs', jobRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);

export default router;