import express from 'express';
import { body, validationResult } from 'express-validator';
import { UserModel } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getPermissionsForRole } from '../config/permissions';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173'
);

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, isStudent, isRecruiter } = req.body;

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const hashedPassword = await hashPassword(password);
      
      // Determine role based on user type
      let role = 'student';
      if (isRecruiter) {
        role = 'recruiter';
      }
      
      // Get permissions for the role
      const permissions = getPermissionsForRole(role);
      
      const user = await UserModel.create({
        email,
        password: hashedPassword,
        name,
        isStudent: Boolean(isStudent),
        isRecruiter: Boolean(isRecruiter),
        role,
        permissions,
        isActive: true,
      });

      const token = generateToken({ userId: user._id.toString(), email: user.email });

      res.status(201).json({
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          bannerUrl: user.bannerUrl,
          title: user.title,
          isStudent: user.isStudent,
          isRecruiter: user.isRecruiter,
          role: user.role,
          permissions: user.permissions,
        },
        token,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await comparePassword(password, user.password);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken({ userId: user._id.toString(), email: user.email });

      res.json({
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          bannerUrl: user.bannerUrl,
          title: user.title,
          isStudent: user.isStudent,
          isRecruiter: user.isRecruiter,
          role: user.role,
          permissions: user.permissions,
        },
        token,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await UserModel.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      title: user.title,
      isStudent: user.isStudent,
      isRecruiter: user.isRecruiter,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot password
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req: express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const user = await UserModel.findByEmail(email);

      // Don't reveal if email exists for security
      res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Google OAuth Login
router.post('/google', async (req: express.Request, res: express.Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists
    let user = await UserModel.findByEmail(email);

    if (!user) {
      // Create new user
      const role = 'student'; // Default role for Google sign-ups
      const permissions = getPermissionsForRole(role);

      user = await UserModel.create({
        email,
        password: await hashPassword(googleId), // Use Google ID as password (won't be used)
        name: name || email.split('@')[0],
        avatarUrl: picture,
        isStudent: true,
        isRecruiter: false,
        role,
        permissions,
        isActive: true,
        googleId,
      });
    } else {
      // Update avatar if changed
      if (picture && user.avatarUrl !== picture) {
        user.avatarUrl = picture;
        await user.save();
      }
    }

    const token = generateToken({ userId: user._id.toString(), email: user.email });

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        title: user.title,
        isStudent: user.isStudent,
        isRecruiter: user.isRecruiter,
        role: user.role,
        permissions: user.permissions,
      },
      token,
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

export default router;