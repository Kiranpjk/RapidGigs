import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';

export class NotificationController {
  /**
   * Get user's notifications
   */
  static async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { page = 1, limit = 20, unread_only = false } = req.query;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      const result = await NotificationService.getUserNotifications(
        userId,
        parseInt(page as string),
        parseInt(limit as string),
        unread_only === 'true'
      );
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_NOTIFICATIONS_FAILED',
          message: 'Failed to retrieve notifications'
        }
      });
    }
  }
  
  /**
   * Get unread notification count
   */
  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      const count = await NotificationService.getUnreadCount(userId);
      
      res.json({
        success: true,
        data: { unread_count: count }
      });
      
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_UNREAD_COUNT_FAILED',
          message: 'Failed to get unread count'
        }
      });
    }
  }
  
  /**
   * Mark notification as read
   */
  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      await NotificationService.markAsRead(id, userId);
      
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
      
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MARK_READ_FAILED',
          message: 'Failed to mark notification as read'
        }
      });
    }
  }
  
  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      await NotificationService.markAllAsRead(userId);
      
      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
      
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MARK_ALL_READ_FAILED',
          message: 'Failed to mark all notifications as read'
        }
      });
    }
  }
  
  /**
   * Delete notification
   */
  static async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      await NotificationService.deleteNotification(id, userId);
      
      res.json({
        success: true,
        message: 'Notification deleted'
      });
      
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_NOTIFICATION_FAILED',
          message: 'Failed to delete notification'
        }
      });
    }
  }
  
  /**
   * Get notification preferences
   */
  static async getPreferences(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      const preferences = await NotificationService.getNotificationPreferences(userId);
      
      res.json({
        success: true,
        data: preferences
      });
      
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PREFERENCES_FAILED',
          message: 'Failed to get notification preferences'
        }
      });
    }
  }
  
  /**
   * Update notification preferences
   */
  static async updatePreferences(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const preferences = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      const updatedPreferences = await NotificationService.updateNotificationPreferences(
        userId,
        preferences
      );
      
      res.json({
        success: true,
        data: updatedPreferences
      });
      
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_PREFERENCES_FAILED',
          message: 'Failed to update notification preferences'
        }
      });
    }
  }
  
  /**
   * Get notification statistics (admin only)
   */
  static async getStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
      }
      
      // For now, allow users to see their own stats
      const stats = await NotificationService.getNotificationStats(userId);
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_STATS_FAILED',
          message: 'Failed to get notification statistics'
        }
      });
    }
  }
}