import api from './api';
import type { ProfileData, UpdateProfileData, FileUpload } from '../types/index';

// DEBUG: ProfileService loaded
console.log('DEBUG: ProfileService - imports loaded');

export class ProfileService {
  static async getProfile(userId?: string): Promise<ProfileData> {
    const url = userId ? `/profile/${userId}` : '/profile';
    const response = await api.get(url);
    return response.data.data;
  }

  static async updateProfile(data: UpdateProfileData): Promise<ProfileData> {
    const response = await api.put('/profile', data);
    return response.data.data;
  }

  static async uploadProfilePicture(file: File): Promise<{ url: string; fileId: string }> {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await api.post('/profile/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  static async uploadCompanyLogo(file: File): Promise<{ url: string; fileId: string }> {
    const formData = new FormData();
    formData.append('companyLogo', file);

    const response = await api.post('/profile/upload/company-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  static async getUserFiles(fileType?: string): Promise<FileUpload[]> {
    const params = fileType ? { fileType } : {};
    const response = await api.get('/profile/files', { params });
    return response.data.data;
  }

  static async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/profile/files/${fileId}`);
  }

  static async searchUsers(params: {
    query?: string;
    role?: string;
    skills?: string[];
    location?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: any[]; pagination: any }> {
    const response = await api.get('/profile/search', { params });
    return response.data.data;
  }
}