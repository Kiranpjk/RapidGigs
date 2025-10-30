import { Router } from 'express';
import { JobController } from '../controllers/jobController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.get('/', JobController.getJobs);
router.get('/categories', JobController.getJobCategories);
router.get('/trending', JobController.getTrendingJobs);
router.get('/:id', JobController.getJob);

// Protected routes (authentication required)
router.use(authenticateToken);

// Job management (recruiters only)
router.post('/', requireRole(['recruiter']), JobController.createJob);
router.get('/recruiter/my-jobs', requireRole(['recruiter']), JobController.getRecruiterJobs);
router.put('/:id', requireRole(['recruiter']), JobController.updateJob);
router.delete('/:id', requireRole(['recruiter']), JobController.deleteJob);

// Application management
router.post('/:id/apply', requireRole(['student']), JobController.applyToJob);
router.get('/:id/applications', requireRole(['recruiter']), JobController.getJobApplications);
router.get('/applications/my-applications', requireRole(['student']), JobController.getStudentApplications);
router.put('/applications/:id/status', requireRole(['recruiter']), JobController.updateApplicationStatus);
router.put('/applications/:id/withdraw', requireRole(['student']), JobController.withdrawApplication);

// Saved jobs (students only)
router.post('/:id/save', requireRole(['student']), JobController.saveJob);
router.delete('/:id/save', requireRole(['student']), JobController.unsaveJob);
router.get('/saved/my-saved', requireRole(['student']), JobController.getSavedJobs);

// Recommendations (students only)
router.get('/recommendations/for-me', requireRole(['student']), JobController.getRecommendedJobs);

// Enhanced matching endpoints
router.get('/:id/similar', JobController.getSimilarJobs);
router.get('/nearby', JobController.getNearbyJobs);
router.get('/trending/:category', JobController.getTrendingJobsByCategory);

// Application workflow management
router.get('/applications/:id/history', JobController.getApplicationWithHistory);
router.get('/applications/stats', JobController.getApplicationStats);
router.put('/applications/bulk-update', requireRole(['recruiter']), JobController.bulkUpdateApplications);
router.get('/applications/requiring-attention', requireRole(['recruiter']), JobController.getApplicationsRequiringAttention);
router.get('/applications/recommended-actions', requireRole(['recruiter']), JobController.getRecommendedActions);

export default router;