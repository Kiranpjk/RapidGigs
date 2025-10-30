export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: any; // JSON data for additional context
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
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

export interface CreateNotificationData {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: any;
}

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
  created_at: Date;
  updated_at: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string;
  variables: string[]; // Array of variable names used in template
  created_at: Date;
  updated_at: Date;
}

export interface NotificationWithUser extends Notification {
  user_name: string;
  user_email: string;
  user_preferences?: NotificationPreferences;
}