export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: any;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 
  | 'job_application'
  | 'application_status'
  | 'new_message'
  | 'job_match'
  | 'profile_view'
  | 'video_like'
  | 'system'
  | 'reminder';

export interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  job_applications: boolean;
  application_updates: boolean;
  new_messages: boolean;
  job_matches: boolean;
  profile_activity: boolean;
  marketing_emails: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationStats {
  type: NotificationType;
  total: number;
  unread: number;
  last_24h: number;
}