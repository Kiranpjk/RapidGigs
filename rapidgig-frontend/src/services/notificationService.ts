import api from './api';
import type { Notification, NotificationPreferences, NotificationStats } from '../types/index';

// DEBUG: NotificationService loaded
console.log('DEBUG: NotificationService - imports loaded');

export class NotificationService {
  /**
   * Get user's notifications
   */
  static async getNotifications(
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ notifications: Notification[]; total: number; hasMore: boolean }> {
    const response = await api.get('/notifications', {
      params: { page, limit, unread_only: unreadOnly }
    });
    return response.data.data;
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count');
    return response.data.data.unread_count;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<void> {
    await api.put('/notifications/mark-all-read');
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  }

  /**
   * Get notification preferences
   */
  static async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get('/notifications/preferences');
    return response.data.data;
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await api.put('/notifications/preferences', preferences);
    return response.data.data;
  }

  /**
   * Get notification statistics
   */
  static async getStats(): Promise<NotificationStats[]> {
    const response = await api.get('/notifications/stats');
    return response.data.data;
  }
}