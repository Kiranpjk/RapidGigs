export interface Video {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  duration: number;
  file_url: string;
  thumbnail_url: string;
  user_id: string;
  views: number;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
  
  // Additional fields from joins
  user_name?: string;
  user_avatar?: string;
  likes?: number;
  dislikes?: number;
  comments_count?: number;
}

export interface CreateVideoData {
  title: string;
  description: string;
  tags: string[];
  category: string;
  file: File;
}

export interface UpdateVideoData {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
}

export interface VideoComment {
  id: string;
  video_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_avatar?: string;
}

export interface VideoUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}