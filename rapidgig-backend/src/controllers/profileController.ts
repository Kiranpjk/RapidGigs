import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserService } from '../services/userService';
import { ProfileService } from '../services/profileService';
import pool from '../config/database';
import path from 'path';

export class ProfileController {
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.id || req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
      }
      
      const user = await UserService.findUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }
      
      // Get additional profile data
      const [preferences, stats] = await Promise.all([
        ProfileService.getUserPreferences(userId),
        ProfileService.getUserStats(userId)
      ]);
      
      // Increment profile views if viewing someone else's profile
      if (req.user?.userId !== userId) {
        await ProfileService.incrementUserStat(userId, 'profile_views');
      }
      
      res.json({
        success: true,
        data: {
          user,
          preferences,
          stats
        }
      });
      
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PROFILE_FAILED',
          message: 'Failed to retrieve profile'
        }
      });
    }
  }
  
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      
      const { 
        fullName, 
        skills, 
        university, 
        graduationYear, 
        companyName, 
        companyDescription,
        preferences 
      } = req.body;
      
      // Update user basic info
      const updateData: any = {};
      if (fullName) updateData.full_name = fullName;
      if (skills) updateData.skills = Array.isArray(skills) ? skills : skills.split(',').map((s: string) => s.trim());
      if (university) updateData.university = university;
      if (graduationYear) updateData.graduation_year = parseInt(graduationYear);
      if (companyName) updateData.company_name = companyName;
      if (companyDescription) updateData.company_description = companyDescription;
      
      let updatedUser = null;
      if (Object.keys(updateData).length > 0) {
        updatedUser = await UserService.updateUser(userId, updateData);
      }
      
      // Update preferences if provided
      let updatedPreferences = null;
      if (preferences) {
        try {
          updatedPreferences = await ProfileService.updateUserPreferences(userId, preferences);
        } catch (error) {
          // If preferences don't exist, create them
          await ProfileService.createUserPreferences({ user_id: userId, ...preferences });
          updatedPreferences = await ProfileService.getUserPreferences(userId);
        }
      }
      
      res.json({
        success: true,
        data: {
          user: updatedUser || await UserService.findUserById(userId),
          preferences: updatedPreferences
        },
        message: 'Profile updated successfully'
      });
      
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_PROFILE_FAILED',
          message: 'Failed to update profile'
        }
      });
    }
  }
  
  static async uploadProfilePicture(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No file was uploaded'
          }
        });
      }
      
      // Save file info to database
      const fileUpload = await ProfileService.createFileUpload({
        user_id: userId,
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        file_type: 'profile_picture'
      });
      
      // Update user's profile picture URL
      const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
      await UserService.updateUser(userId, { profile_picture: profilePictureUrl });
      
      res.json({
        success: true,
        data: {
          fileId: fileUpload.id,
          url: profilePictureUrl,
          originalName: req.file.originalname,
          size: req.file.size
        },
        message: 'Profile picture uploaded successfully'
      });
      
    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload profile picture'
        }
      });
    }
  }
  
  static async uploadCompanyLogo(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      
      // Check if user is a recruiter
      const user = await UserService.findUserById(userId);
      if (!user || user.role !== 'recruiter') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only recruiters can upload company logos'
          }
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No file was uploaded'
          }
        });
      }
      
      // Save file info to database
      const fileUpload = await ProfileService.createFileUpload({
        user_id: userId,
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        file_type: 'company_logo'
      });
      
      // Update user's company logo URL
      const companyLogoUrl = `/uploads/company-logos/${req.file.filename}`;
      await UserService.updateUser(userId, { company_logo: companyLogoUrl });
      
      res.json({
        success: true,
        data: {
          fileId: fileUpload.id,
          url: companyLogoUrl,
          originalName: req.file.originalname,
          size: req.file.size
        },
        message: 'Company logo uploaded successfully'
      });
      
    } catch (error) {
      console.error('Upload company logo error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload company logo'
        }
      });
    }
  }
  
  static async getUserFiles(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { fileType } = req.query;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      
      const files = await ProfileService.getUserFiles(userId, fileType as string);
      
      res.json({
        success: true,
        data: files
      });
      
    } catch (error) {
      console.error('Get user files error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FILES_FAILED',
          message: 'Failed to retrieve files'
        }
      });
    }
  }
  
  static async deleteFile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { fileId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      
      // Check if file belongs to user
      const file = await ProfileService.getFileUpload(fileId);
      if (!file || file.user_id !== userId) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found or access denied'
          }
        });
      }
      
      // Delete file from filesystem
      const fs = require('fs');
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }
      
      // Delete from database
      await ProfileService.deleteFileUpload(fileId);
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FILE_FAILED',
          message: 'Failed to delete file'
        }
      });
    }
  }
  
  static async searchUsers(req: AuthRequest, res: Response) {
    try {
      const { query, role, skills, location, page = 1, limit = 20 } = req.query;
      
      let searchQuery = `
        SELECT u.*, us.profile_views, us.average_rating, us.total_reviews
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        WHERE 1=1
      `;
      
      const values: any[] = [];
      let paramCount = 1;
      
      if (query) {
        searchQuery += ` AND (u.full_name ILIKE $${paramCount} OR u.company_name ILIKE $${paramCount})`;
        values.push(`%${query}%`);
        paramCount++;
      }
      
      if (role) {
        searchQuery += ` AND u.role = $${paramCount}`;
        values.push(role);
        paramCount++;
      }
      
      if (skills) {
        const skillsArray = Array.isArray(skills) ? skills : [skills];
        searchQuery += ` AND u.skills && $${paramCount}`;
        values.push(skillsArray);
        paramCount++;
      }
      
      // Add pagination
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      searchQuery += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(parseInt(limit as string), offset);
      
      const result = await pool.query(searchQuery, values);
      
      // Remove passwords from results
      const users = result.rows.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: users.length
          }
        }
      });
      
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search users'
        }
      });
    }
  }
}