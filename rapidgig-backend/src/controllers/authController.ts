import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { ProfileService } from '../services/profileService';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { CreateUserData } from '../models/User';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, fullName, role, skills, university, graduationYear, companyName, companyDescription } = req.body;
      
      // Validation
      if (!email || !password || !fullName || !role) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Email, password, full name, and role are required'
          }
        });
      }
      
      if (!['student', 'recruiter'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Role must be either student or recruiter'
          }
        });
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Please provide a valid email address'
          }
        });
      }
      
      // Password validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password must be at least 8 characters long'
          }
        });
      }
      
      const userData: CreateUserData = {
        email: email.toLowerCase(),
        password,
        full_name: fullName,
        role,
        skills: role === 'student' ? skills : undefined,
        university: role === 'student' ? university : undefined,
        graduation_year: role === 'student' ? graduationYear : undefined,
        company_name: role === 'recruiter' ? companyName : undefined,
        company_description: role === 'recruiter' ? companyDescription : undefined
      };
      
      const user = await UserService.createUser(userData);
      
      // Initialize user profile data
      try {
        await ProfileService.initializeUserProfile(user.id);
      } catch (error) {
        console.error('Failed to initialize user profile:', error);
        // Don't fail registration if profile initialization fails
      }
      
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);
      
      res.status(201).json({
        success: true,
        data: {
          user,
          token,
          refreshToken
        },
        message: 'User registered successfully'
      });
      
    } catch (error: any) {
      if (error.message === 'Email already exists') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists'
          }
        });
      }
      
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to register user'
        }
      });
    }
  }
  
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Email and password are required'
          }
        });
      }
      
      const user = await UserService.findUserByEmailForAuth(email.toLowerCase());
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }
      
      const isValidPassword = await UserService.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }
      
      // Remove password from user object
      const { password_hash: _, ...userWithoutPassword } = user;
      
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);
      
      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          token,
          refreshToken
        },
        message: 'Login successful'
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Failed to login'
        }
      });
    }
  }
  
  static async logout(req: Request, res: Response) {
    // In a production app, you might want to blacklist the token
    // For now, we'll just return a success response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
  
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_EMAIL',
            message: 'Email is required'
          }
        });
      }
      
      const user = await UserService.findUserByEmail(email.toLowerCase());
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent'
        });
      }
      
      const resetToken = await UserService.createPasswordResetToken(user.id);
      
      // TODO: Send email with reset link
      // For now, we'll just log it (in production, integrate with email service)
      console.log(`Password reset token for ${email}: ${resetToken}`);
      console.log(`Reset link: http://localhost:5173/reset-password?token=${resetToken}`);
      
      res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      });
      
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FORGOT_PASSWORD_FAILED',
          message: 'Failed to process password reset request'
        }
      });
    }
  }
  
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Token and new password are required'
          }
        });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password must be at least 8 characters long'
          }
        });
      }
      
      const userId = await UserService.validatePasswordResetToken(token);
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token'
          }
        });
      }
      
      await UserService.updatePassword(userId, newPassword);
      await UserService.markPasswordResetTokenAsUsed(token);
      
      res.json({
        success: true,
        message: 'Password reset successfully'
      });
      
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RESET_PASSWORD_FAILED',
          message: 'Failed to reset password'
        }
      });
    }
  }

  static async googleAuth(req: Request, res: Response) {
    // This will be handled by passport middleware
  }

  static async googleCallback(req: Request, res: Response) {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
      }

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify(user))}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
    }
  }
}