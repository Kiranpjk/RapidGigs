import api from './api';
import type { Job, Application, CreateJobData, UpdateJobData, JobCategory, JobFilters } from '../types/index';

// DEBUG: JobService loaded
console.log('DEBUG: JobService - imports loaded');

export class JobService {
  // Job Management
  static async createJob(data: CreateJobData): Promise<Job> {
    const response = await api.post('/jobs', data);
    return response.data.data;
  }

  static async getJob(id: string): Promise<Job> {
    const response = await api.get(`/jobs/${id}`);
    return response.data.data;
  }

  static async getJobs(filters: JobFilters & { page?: number; limit?: number } = {}): Promise<{
    jobs: Job[];
    pagination: any;
  }> {
    const params = {
      ...filters,
      requiredSkills: filters.requiredSkills?.join(','),
    };
    
    const response = await api.get('/jobs', { params });
    return response.data.data;
  }

  static async getRecruiterJobs(params: { status?: string; page?: number; limit?: number } = {}): Promise<{
    jobs: Job[];
    pagination: any;
  }> {
    const response = await api.get('/jobs/recruiter/my-jobs', { params });
    return response.data.data;
  }

  static async updateJob(id: string, data: UpdateJobData): Promise<Job> {
    const response = await api.put(`/jobs/${id}`, data);
    return response.data.data;
  }

  static async deleteJob(id: string): Promise<void> {
    await api.delete(`/jobs/${id}`);
  }

  // Application Management
  static async applyToJob(jobId: string, coverLetter?: string): Promise<Application> {
    const response = await api.post(`/jobs/${jobId}/apply`, { coverLetter });
    return response.data.data;
  }

  static async getJobApplications(jobId: string, status?: string): Promise<Application[]> {
    const params = status ? { status } : {};
    const response = await api.get(`/jobs/${jobId}/applications`, { params });
    return response.data.data;
  }

  static async getStudentApplications(status?: string): Promise<Application[]> {
    const params = status ? { status } : {};
    const response = await api.get('/jobs/applications/my-applications', { params });
    return response.data.data;
  }

  static async updateApplicationStatus(applicationId: string, status: string): Promise<Application> {
    const response = await api.put(`/jobs/applications/${applicationId}/status`, { status });
    return response.data.data;
  }

  static async withdrawApplication(applicationId: string): Promise<void> {
    await api.put(`/jobs/applications/${applicationId}/withdraw`);
  }

  // Saved Jobs
  static async saveJob(jobId: string): Promise<void> {
    await api.post(`/jobs/${jobId}/save`);
  }

  static async unsaveJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}/save`);
  }

  static async getSavedJobs(): Promise<Job[]> {
    const response = await api.get('/jobs/saved/my-saved');
    return response.data.data;
  }

  // Utility Methods
  static async getJobCategories(): Promise<JobCategory[]> {
    const response = await api.get('/jobs/categories');
    return response.data.data;
  }

  static async getRecommendedJobs(limit: number = 10): Promise<Job[]> {
    const response = await api.get('/jobs/recommendations/for-me', {
      params: { limit },
    });
    return response.data.data;
  }

  static async getTrendingJobs(limit: number = 10): Promise<Job[]> {
    const response = await api.get('/jobs/trending', {
      params: { limit },
    });
    return response.data.data;
  }

  static async getSimilarJobs(jobId: string, limit: number = 10): Promise<Job[]> {
    const response = await api.get(`/jobs/${jobId}/similar`, {
      params: { limit },
    });
    return response.data.data;
  }

  static async getNearbyJobs(location: string, radius: number = 50, limit: number = 20): Promise<Job[]> {
    const response = await api.get('/jobs/nearby', {
      params: { location, radius, limit },
    });
    return response.data.data;
  }

  static async getTrendingJobsByCategory(category: string, limit: number = 10): Promise<Job[]> {
    const response = await api.get(`/jobs/trending/${category}`, {
      params: { limit },
    });
    return response.data.data;
  }

  // Additional methods for application management
  static async getMyApplications(): Promise<Application[]> {
    const response = await api.get('/jobs/applications/my-applications');
    return response.data.data;
  }

  static async getRecruiterApplications(): Promise<Application[]> {
    const response = await api.get('/jobs/applications/received');
    return response.data.data;
  }

  static async getExpiringJobs(limit: number = 10): Promise<Job[]> {
    const response = await api.get('/jobs/expiring/soon', {
      params: { limit },
    });
    return response.data.data;
  }

  static async getJobAnalytics(jobId: string): Promise<any> {
    const response = await api.get(`/jobs/${jobId}/analytics`);
    return response.data.data;
  }

  static async getPersonalizedRecommendations(type: 'personalized' | 'history' = 'personalized', limit: number = 10): Promise<Job[]> {
    const response = await api.get('/jobs/recommendations/for-me', {
      params: { type, limit },
    });
    return response.data.data;
  }
}