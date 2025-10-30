import pool from '../config/database';
import { Notification, CreateNotificationData, NotificationPreferences, NotificationType } from '../models/Notification';
import { getSocketManager } from '../config/socket';
import { EmailService } from './emailService';

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationData): Promise<Notification> {
    const query = `
      INSERT INTO notifications (user_id, title, message, type, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      data.user_id,
      data.title,
      data.message,
      data.type,
      JSON.stringify(data.data || {})
    ]);
    
    const notification = result.rows[0];
    
    // Send real-time notification via Socket.io
    const socketManager = getSocketManager();
    if (socketManager) {
      socketManager.sendToUser(data.user_id, 'new_notification', notification);
    }
    
    // Check if user wants email notifications for this type
    const shouldSendEmail = await this.shouldSendEmailNotification(data.user_id, data.type);
    if (shouldSendEmail) {
      await this.sendEmailNotification(notification);
    }
    
    return notification;
  }
  
  /**
   * Get user's notifications with pagination
   */
  static async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ notifications: Notification[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    
    if (unreadOnly) {
      whereClause += ' AND is_read = FALSE';
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM notifications ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Get notifications
    const query = `
      SELECT * FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const result = await pool.query(query, [...params, limit, offset]);
    const notifications = result.rows;
    
    const hasMore = offset + notifications.length < total;
    
    return {
      notifications,
      total,
      hasMore
    };
  }
  
  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    const query = `
      UPDATE notifications 
      SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2
    `;
    
    await pool.query(query, [notificationId, userId]);
  }
  
  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const query = `
      UPDATE notifications 
      SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
      WHERE user_id = $1 AND is_read = FALSE
    `;
    
    await pool.query(query, [userId]);
  }
  
  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const query = 'DELETE FROM notifications WHERE id = $1 AND user_id = $2';
    await pool.query(query, [notificationId, userId]);
  }
  
  /**
   * Get unread notification count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE';
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }
  
  /**
   * Get or create notification preferences for user
   */
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    // Try to get existing preferences
    let query = 'SELECT * FROM notification_preferences WHERE user_id = $1';
    let result = await pool.query(query, [userId]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Create default preferences if they don't exist
    query = `
      INSERT INTO notification_preferences (user_id)
      VALUES ($1)
      RETURNING *
    `;
    
    result = await pool.query(query, [userId]);
    return result.rows[0];
  }
  
  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(preferences)) {
      if (key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramCount + 1}`);
        values.push(value);
        paramCount++;
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const query = `
      UPDATE notification_preferences 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, ...values]);
    return result.rows[0];
  }
  
  /**
   * Check if user should receive email notification for a specific type
   */
  private static async shouldSendEmailNotification(userId: string, type: NotificationType): Promise<boolean> {
    const preferences = await this.getNotificationPreferences(userId);
    
    if (!preferences.email_notifications) {
      return false;
    }
    
    // Check specific notification type preferences
    switch (type) {
      case 'job_application':
      case 'application_status':
        return preferences.application_updates;
      case 'new_message':
        return preferences.new_messages;
      case 'job_match':
        return preferences.job_matches;
      case 'profile_view':
      case 'video_like':
        return preferences.profile_activity;
      case 'system':
      case 'reminder':
        return true; // Always send system notifications
      default:
        return false;
    }
  }
  
  /**
   * Send email notification
   */
  private static async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      // Get user email
      const userQuery = 'SELECT email, full_name FROM users WHERE id = $1';
      const userResult = await pool.query(userQuery, [notification.user_id]);
      
      if (userResult.rows.length === 0) {
        console.error('User not found for notification:', notification.id);
        return;
      }
      
      const user = userResult.rows[0];
      
      // Determine email template based on notification type
      let templateName = 'system'; // Default template
      let templateData = {
        user_name: user.full_name,
        notification_title: notification.title,
        notification_message: notification.message,
        platform_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      };
      
      // Add notification-specific data
      if (notification.data) {
        templateData = { ...templateData, ...notification.data };
      }
      
      switch (notification.type) {
        case 'job_application':
          templateName = 'job_application_received';
          break;
        case 'application_status':
          templateName = 'application_status_update';
          break;
        case 'new_message':
          templateName = 'new_message';
          break;
        case 'job_match':
          templateName = 'job_match';
          break;
      }
      
      await EmailService.sendTemplateEmail(
        user.email,
        user.full_name,
        templateName,
        templateData
      );
      
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }
  
  /**
   * Create bulk notifications (for system-wide announcements)
   */
  static async createBulkNotifications(
    userIds: string[],
    title: string,
    message: string,
    type: NotificationType,
    data?: any
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO notifications (user_id, title, message, type, data)
        SELECT unnest($1::uuid[]), $2, $3, $4, $5
      `;
      
      await client.query(query, [
        userIds,
        title,
        message,
        type,
        JSON.stringify(data || {})
      ]);
      
      await client.query('COMMIT');
      
      // Send real-time notifications
      const socketManager = getSocketManager();
      if (socketManager) {
        userIds.forEach(userId => {
          socketManager.sendToUser(userId, 'new_notification', {
            title,
            message,
            type,
            data
          });
        });
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Clean up old notifications (run as background job)
   */
  static async cleanupOldNotifications(daysOld: number = 90): Promise<void> {
    const query = `
      DELETE FROM notifications 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
        AND is_read = TRUE
    `;
    
    const result = await pool.query(query);
    console.log(`Cleaned up ${result.rowCount} old notifications`);
  }
  
  /**
   * Get notification statistics
   */
  static async getNotificationStats(userId?: string): Promise<any> {
    let query = `
      SELECT 
        type,
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
      FROM notifications
    `;
    
    const params = [];
    
    if (userId) {
      query += ' WHERE user_id = $1';
      params.push(userId);
    }
    
    query += ' GROUP BY type ORDER BY total DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }
}