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
  created_at: Date;
  updated_at: Date;
}

export interface CreateVideoData {
  title: string;
  description: string;
  tags: string[];
  category: string;
  duration: number;
  file_url: string;
  thumbnail_url?: string;
  user_id: string;
  status?: 'processing' | 'ready' | 'failed';
}

export interface UpdateVideoData {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  duration?: number;
  file_url?: string;
  thumbnail_url?: string;
  status?: 'processing' | 'ready' | 'failed';
}