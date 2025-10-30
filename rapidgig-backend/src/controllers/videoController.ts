import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { VideoService } from '../services/videoService';
import { ProfileService } from '../services/profileService';
import { VideoProcessor } from '../utils/videoProcessing';
import path from 'path';
import fs from 'fs';

export class VideoController {
  static async uploadVideo(req: AuthRequest, res: Response) {
    let tempFilePath: string | null = null;
    
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
            message: 'No video file was uploaded'
          }
        });
      }
      
      const { title, description, tags, category } = req.body;
      
      // Validation
      if (!title || !category) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Title and category are required'
          }
        });
      }
      
      tempFilePath = req.file.path;
      
      // Process video
      const videoOutputDir = path.join(process.cwd(), 'uploads', 'videos');
      const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      
      const processedVideo = await VideoProcessor.processVideo(
        tempFilePath,
        videoOutputDir,
        uniqueFilename
      );
      
      // Create video record with processing status
      const videoData = {
        title,
        description: description || '',
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
        category,
        duration: processedVideo.metadata.duration,
        file_url: `/uploads/videos/${path.basename(processedVideo.videoPath)}`,
        thumbnail_url: `/uploads/videos/${path.basename(processedVideo.thumbnailPath)}`,
        user_id: userId,
        status: 'ready' as const
      };
      
      const video = await VideoService.createVideo(videoData);
      
      // Save file info to file_uploads table
      await ProfileService.createFileUpload({
        user_id: userId,
        file_name: path.basename(processedVideo.videoPath),
        original_name: req.file.originalname,
        file_path: processedVideo.videoPath,
        file_size: processedVideo.metadata.size,
        mime_type: req.file.mimetype,
        file_type: 'video'
      });
      
      // Cleanup temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      res.status(201).json({
        success: true,
        data: video,
        message: 'Video uploaded and processed successfully'
      });
      
    } catch (error: any) {
      console.error('Video upload error:', error);
      
      // Cleanup temp file on error
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_PROCESSING_FAILED',
          message: error.message || 'Failed to upload and process video'
        }
      });
    }
  }
  
  static async getVideo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const ipAddress = req.ip;
      
      const video = await VideoService.getVideoById(id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VIDEO_NOT_FOUND',
            message: 'Video not found'
          }
        });
      }
      
      // Increment view count (async, don't wait)
      VideoService.incrementViews(id, userId, ipAddress).catch(console.error);
      
      // Get likes and comments count
      const [likes, comments] = await Promise.all([
        VideoService.getVideoLikes(id),
        VideoService.getVideoComments(id, 1, 0) // Just get count
      ]);
      
      res.json({
        success: true,
        data: {
          ...video,
          likes: likes.likes,
          dislikes: likes.dislikes,
          comments_count: comments.length
        }
      });
      
    } catch (error) {
      console.error('Get video error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_VIDEO_FAILED',
          message: 'Failed to retrieve video'
        }
      });
    }
  }
  
  static async getUserVideos(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId || req.user?.userId;
      const { page = 1, limit = 20 } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
      }
      
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const videos = await VideoService.getUserVideos(userId, parseInt(limit as string), offset);
      
      res.json({
        success: true,
        data: {
          videos,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: videos.length
          }
        }
      });
      
    } catch (error) {
      console.error('Get user videos error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_USER_VIDEOS_FAILED',
          message: 'Failed to retrieve user videos'
        }
      });
    }
  }
  
  static async getVideosFeed(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20, category } = req.query;
      
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const videos = await VideoService.getVideosFeed(
        parseInt(limit as string), 
        offset, 
        category as string
      );
      
      res.json({
        success: true,
        data: {
          videos,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: videos.length
          }
        }
      });
      
    } catch (error) {
      console.error('Get videos feed error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FEED_FAILED',
          message: 'Failed to retrieve videos feed'
        }
      });
    }
  }
  
  static async searchVideos(req: AuthRequest, res: Response) {
    try {
      const { q, category, tags, userId, page = 1, limit = 20 } = req.query;
      
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const videos = await VideoService.searchVideos(q as string, {
        category: category as string,
        tags: tags ? (tags as string).split(',') : undefined,
        userId: userId as string,
        limit: parseInt(limit as string),
        offset
      });
      
      res.json({
        success: true,
        data: {
          videos,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: videos.length
          }
        }
      });
      
    } catch (error) {
      console.error('Search videos error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search videos'
        }
      });
    }
  }
  
  static async updateVideo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const { title, description, tags, category } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      
      // Check if video belongs to user
      const existingVideo = await VideoService.getVideoById(id);
      if (!existingVideo || existingVideo.user_id !== userId) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VIDEO_NOT_FOUND',
            message: 'Video not found or access denied'
          }
        });
      }
      
      const updateData: any = {};
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (tags) updateData.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
      if (category) updateData.category = category;
      
      const updatedVideo = await VideoService.updateVideo(id, updateData);
      
      res.json({
        success: true,
        data: updatedVideo,
        message: 'Video updated successfully'
      });
      
    } catch (error) {
      console.error('Update video error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_VIDEO_FAILED',
          message: 'Failed to update video'
        }
      });
    }
  }
  
  static async deleteVideo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
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
      
      const deleted = await VideoService.deleteVideo(id, userId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VIDEO_NOT_FOUND',
            message: 'Video not found or access denied'
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Video deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_VIDEO_FAILED',
          message: 'Failed to delete video'
        }
      });
    }
  }
  
  static async likeVideo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { type } = req.body; // 'like' or 'dislike'
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
      
      if (!['like', 'dislike'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LIKE_TYPE',
            message: 'Like type must be "like" or "dislike"'
          }
        });
      }
      
      await VideoService.likeVideo(id, userId, type);
      const likes = await VideoService.getVideoLikes(id);
      
      res.json({
        success: true,
        data: likes,
        message: `Video ${type}d successfully`
      });
      
    } catch (error) {
      console.error('Like video error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LIKE_VIDEO_FAILED',
          message: 'Failed to like video'
        }
      });
    }
  }
  
  static async removeLike(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
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
      
      await VideoService.removeLike(id, userId);
      const likes = await VideoService.getVideoLikes(id);
      
      res.json({
        success: true,
        data: likes,
        message: 'Like removed successfully'
      });
      
    } catch (error) {
      console.error('Remove like error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REMOVE_LIKE_FAILED',
          message: 'Failed to remove like'
        }
      });
    }
  }
  
  static async addComment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { content, parentId } = req.body;
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
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CONTENT',
            message: 'Comment content is required'
          }
        });
      }
      
      const comment = await VideoService.addComment(id, userId, content.trim(), parentId);
      
      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment added successfully'
      });
      
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ADD_COMMENT_FAILED',
          message: 'Failed to add comment'
        }
      });
    }
  }
  
  static async getComments(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const comments = await VideoService.getVideoComments(id, parseInt(limit as string), offset);
      
      res.json({
        success: true,
        data: {
          comments,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: comments.length
          }
        }
      });
      
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_COMMENTS_FAILED',
          message: 'Failed to retrieve comments'
        }
      });
    }
  }
  
  static async getCategories(req: AuthRequest, res: Response) {
    try {
      const categories = await VideoService.getVideoCategories();
      
      res.json({
        success: true,
        data: categories
      });
      
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_CATEGORIES_FAILED',
          message: 'Failed to retrieve categories'
        }
      });
    }
  }
  
  static async getTrendingVideos(req: AuthRequest, res: Response) {
    try {
      const { limit = 20 } = req.query;
      
      const videos = await VideoService.getTrendingVideos(parseInt(limit as string));
      
      res.json({
        success: true,
        data: videos
      });
      
    } catch (error) {
      console.error('Get trending videos error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TRENDING_FAILED',
          message: 'Failed to retrieve trending videos'
        }
      });
    }
  }
}