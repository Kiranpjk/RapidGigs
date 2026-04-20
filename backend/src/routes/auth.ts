import express from 'express';
import { body, validationResult } from 'express-validator';
import { User, UserModel } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getPermissionsForRole } from '../config/permissions';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env';
import crypto from 'crypto';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { sendResetEmail } from '../services/email';

/** Helper — set the JWT as an httpOnly cookie */
const setTokenCookie = (res: express.Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.maxAge,
  });
};

const router = express.Router();

// Initialize Google OAuth client (only client_id needed for ID token verification)
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number'),
    body('name').trim().notEmpty(),
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, isStudent, isRecruiter } = req.body;

      // Prevent both flags being true simultaneously
      const studentFlag = !!isStudent && !isRecruiter;
      const recruiterFlag = !!isRecruiter;

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
        isStudent: studentFlag,
        isRecruiter: recruiterFlag,
        role,
        permissions,
        isActive: true,
      });

      const token = generateToken({ userId: user._id.toString(), email: user.email });

      // Set httpOnly cookie (production) + return token in body (dev / mobile)
      setTokenCookie(res, token);

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
          isActive: user.isActive !== false,
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

      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await comparePassword(password, user.password);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken({ userId: user._id.toString(), email: user.email });

      // Set httpOnly cookie (production) + return token in body (dev / mobile)
      setTokenCookie(res, token);

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
          isActive: user.isActive !== false,
        },
        token,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Logout — clear cookie
router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
  });
  res.json({ message: 'Logged out successfully' });
});

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
      isActive: user.isActive !== false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot password — generate reset token and send email
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

      // Even if user doesn't exist, don't reveal it (security best practice)
      if (!user) {
        return res.json({
          message: 'If an account exists with this email, a password reset link has been sent.',
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      // Remove any existing tokens for this user
      await PasswordResetToken.deleteMany({ userId: user._id });

      // Save new token
      await PasswordResetToken.create({
        userId: user._id,
        token: crypto.createHash('sha256').update(resetToken).digest('hex'),
        expiresAt,
      });

      // Send email
      try {
        await sendResetEmail(user.email, resetToken);
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
      }

      res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Reset password — verify token and update password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number'),
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password } = req.body;
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const resetTokenDoc = await PasswordResetToken.findOne({ token: hashedToken });
      if (!resetTokenDoc) {
        return res.status(400).json({ error: 'Invalid or expired reset token.' });
      }
      if (resetTokenDoc.expiresAt < new Date()) {
        await PasswordResetToken.deleteOne({ token: hashedToken });
        return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
      }

      const user = await UserModel.findById(resetTokenDoc.userId.toString());
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      user.password = await hashPassword(password);
      await user.save();

      // Delete the used token
      await PasswordResetToken.deleteOne({ token: hashedToken });

      // Login the user after reset
      const jwtToken = generateToken({ userId: user._id.toString(), email: user.email });
      setTokenCookie(res, jwtToken);

      res.json({
        message: 'Password reset successfully.',
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
          isActive: user.isActive !== false,
        },
        token: jwtToken,
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
    const isRecruiter = req.body.isRecruiter === true;

    // Check if user exists
    let user = await UserModel.findByEmail(email);

    if (!user) {
      // Create new user — use role passed from the signup form
      const role = isRecruiter ? 'recruiter' : 'student';
      const permissions = getPermissionsForRole(role);

      user = await UserModel.create({
        email,
        password: await hashPassword(googleId), // Use Google ID as password (won't be used)
        name: name || email.split('@')[0],
        avatarUrl: picture,
        isStudent: !isRecruiter,
        isRecruiter,
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

    // Set httpOnly cookie (same as regular login)
    setTokenCookie(res, token);

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
        isActive: user.isActive !== false,
      },
      token,
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

export default router;