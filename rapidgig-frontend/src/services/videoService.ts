import api from './api';
import type { Video, CreateVideoData, UpdateVideoData, VideoComment, VideoUploadProgress } from '../types/index';

// DEBUG: VideoService loaded
console.log('DEBUG: VideoService - imports loaded');

export class VideoService {
  static async uploadVideo(
    data: CreateVideoData,
    onProgress?: (progress: VideoUploadProgress) => void
  ): Promise<Video> {
    const formData = new FormData();
    formData.append('video', data.file);
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('tags', data.tags.join(','));

    const response = await api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: VideoUploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          };
          onProgress(progress);
        }
      },
    });

    return response.data.data;
  }

  static async getVideo(id: string): Promise<Video> {
    const response = await api.get(`/videos/${id}`);
    return response.data.data;
  }

  static async getUserVideos(userId?: string, page: number = 1, limit: number = 20): Promise<{
    videos: Video[];
    pagination: any;
  }> {
    const url = userId ? `/videos/user/${userId}` : '/videos/user';
    const response = await api.get(url, {
      params: { page, limit },
    });
    return response.data.data;
  }

  static async getVideosFeed(page: number = 1, limit: number = 20, category?: string): Promise<{
    videos: Video[];
    pagination: any;
  }> {
    const response = await api.get('/videos/feed', {
      params: { page, limit, category },
    });
    return response.data.data;
  }

  static async searchVideos(params: {
    q?: string;
    category?: string;
    tags?: string[];
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    videos: Video[];
    pagination: any;
  }> {
    const searchParams = {
      ...params,
      tags: params.tags?.join(','),
    };
    
    const response = await api.get('/videos/search', { params: searchParams });
    return response.data.data;
  }

  static async updateVideo(id: string, data: UpdateVideoData): Promise<Video> {
    const response = await api.put(`/videos/${id}`, data);
    return response.data.data;
  }

  static async deleteVideo(id: string): Promise<void> {
    await api.delete(`/videos/${id}`);
  }

  static async likeVideo(id: string, type: 'like' | 'dislike'): Promise<{ likes: number; dislikes: number }> {
    const response = await api.post(`/videos/${id}/like`, { type });
    return response.data.data;
  }

  static async removeLike(id: string): Promise<{ likes: number; dislikes: number }> {
    const response = await api.delete(`/videos/${id}/like`);
    return response.data.data;
  }

  static async addComment(id: string, content: string, parentId?: string): Promise<VideoComment> {
    const response = await api.post(`/videos/${id}/comments`, { content, parentId });
    return response.data.data;
  }

  static async getComments(id: string, page: number = 1, limit: number = 50): Promise<{
    comments: VideoComment[];
    pagination: any;
  }> {
    const response = await api.get(`/videos/${id}/comments`, {
      params: { page, limit },
    });
    return response.data.data;
  }

  static async getCategories(): Promise<string[]> {
    const response = await api.get('/videos/categories');
    return response.data.data;
  }

  static async getTrendingVideos(limit: number = 20): Promise<Video[]> {
    const response = await api.get('/videos/trending', {
      params: { limit },
    });
    return response.data.data;
  }
}