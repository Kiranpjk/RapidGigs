import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/authController';

const router = Router();

// POST /api/auth/register
router.post('/register', AuthController.register);

// POST /api/auth/login
router.post('/login', AuthController.login);

// POST /api/auth/logout
router.post('/logout', AuthController.logout);

// POST /api/auth/forgot-password
router.post('/forgot-password', AuthController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', AuthController.resetPassword);

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  AuthController.googleCallback
);

export default router;