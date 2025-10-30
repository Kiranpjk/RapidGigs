export interface UserPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  job_alerts: boolean;
  marketing_emails: boolean;
  preferred_job_types?: string[];
  preferred_locations?: string[];
  salary_range_min?: number;
  salary_range_max?: number;
  availability_status: 'available' | 'busy' | 'not_looking';
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  profile_views: number;
  jobs_applied: number;
  jobs_completed: number;
  total_earnings: number;
  average_rating: number;
  total_reviews: number;
  videos_uploaded: number;
  videos_views: number;
  connections_count: number;
  created_at: string;
  updated_at: string;
}

export interface FileUpload {
  id: string;
  user_id: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: 'profile_picture' | 'company_logo' | 'video' | 'document' | 'other';
  upload_status: 'uploading' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ProfileData {
  user: any; // Will be typed as User when imported
  preferences?: UserPreferences;
  stats?: UserStats;
}

export interface UpdateProfileData {
  fullName?: string;
  skills?: string[];
  university?: string;
  graduationYear?: number;
  companyName?: string;
  companyDescription?: string;
  preferences?: Partial<UserPreferences>;
}