// ✅ FIXED: fetchWithAuth no longer force-sets Content-Type for FormData
//           (browser must set it with boundary for multipart uploads to work)
// ✅ FIXED: All direct fetch() calls in admin/candidates pages should use these helpers

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';

export { API_BASE_URL };

const getAuthToken = (): string | null => localStorage.getItem('authToken');

// ✅ FIXED: Don't set Content-Type when body is FormData — browser handles it
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Merge caller headers (caller can override Content-Type if needed)
  const mergedHeaders = { ...headers, ...(options.headers as Record<string, string> || {}) };

  const response = await fetch(url, { ...options, headers: mergedHeaders });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch {
      // Non-JSON response, use generic message
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  return {};
};

export const fetchBlobWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const mergedHeaders = { ...headers, ...(options.headers as Record<string, string> || {}) };
  const response = await fetch(url, { ...options, headers: mergedHeaders });
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch {
      // Ignore non-JSON error payloads
    }
    throw new Error(errorMessage);
  }
  return response.blob();
};

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authAPI = {
  register: async (data: {
    email: string;
    password: string;
    name: string;
    isStudent?: boolean;
    isRecruiter?: boolean;
  }) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      const msg = result.error || (result.errors && result.errors[0]?.msg) || 'Registration failed';
      throw new Error(msg);
    }
    if (result.token) {
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result;
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      const msg = result.error || (result.errors && result.errors[0]?.msg) || 'Login failed';
      throw new Error(msg);
    }
    if (result.token) {
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result;
  },

  googleLogin: async (credential: string, isRecruiter?: boolean) => {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, isRecruiter: !!isRecruiter }),
    });
    const result = await response.json();
    if (!response.ok) {
      const msg = result.error || (result.errors && result.errors[0]?.msg) || 'Google login failed';
      throw new Error(msg);
    }
    if (result.token) {
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => fetchWithAuth(`${API_BASE_URL}/auth/me`),

  forgotPassword: async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: 'Failed to send reset link' }));
      throw new Error(result.error || 'Failed to send reset link');
    }
    return response.json();
  },
};

// ─── Videos API ───────────────────────────────────────────────────────────────

export const videosAPI = {
  getAll: async () => fetchWithAuth(`${API_BASE_URL}/videos`),

  getMyVideos: async () => fetchWithAuth(`${API_BASE_URL}/videos/my-videos`),

  upload: async (formData: FormData) => {
    // ✅ Pass FormData directly — fetchWithAuth handles Content-Type correctly
    return fetchWithAuth(`${API_BASE_URL}/videos`, { method: 'POST', body: formData });
  },

  delete: async (videoId: string) =>
    fetchWithAuth(`${API_BASE_URL}/videos/${videoId}`, { method: 'DELETE' }),

  incrementView: async (videoId: string) =>
    fetchWithAuth(`${API_BASE_URL}/videos/${videoId}/view`, { method: 'PATCH' }),
};

// ─── Jobs API ─────────────────────────────────────────────────────────────────

export const jobsAPI = {
  getAll: async (filters?: { category?: string; type?: string; location?: string; search?: string; sort?: string }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sort) params.append('sort', filters.sort);
    const qs = params.toString();
    return fetchWithAuth(`${API_BASE_URL}/jobs${qs ? `?${qs}` : ''}`);
  },

  getMyJobs: async () => fetchWithAuth(`${API_BASE_URL}/jobs/my-jobs`),

  getById: async (jobId: string) => fetchWithAuth(`${API_BASE_URL}/jobs/${jobId}`),

  create: async (jobData: any) =>
    fetchWithAuth(`${API_BASE_URL}/jobs`, { method: 'POST', body: JSON.stringify(jobData) }),

  update: async (jobId: string, jobData: any) =>
    fetchWithAuth(`${API_BASE_URL}/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    }),

  updateEngagement: async (
    jobId: string,
    data: { likes?: number; comments?: number; shares?: number }
  ) =>
    fetchWithAuth(`${API_BASE_URL}/jobs/${jobId}/engagement`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: async (jobId: string) =>
    fetchWithAuth(`${API_BASE_URL}/jobs/${jobId}`, { method: 'DELETE' }),

  parseDescription: async (text: string) =>
    fetchWithAuth(`${API_BASE_URL}/jobs/parse-description`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};

// ─── Applications API ─────────────────────────────────────────────────────────

export const applicationsAPI = {
  getMyApplications: async () =>
    fetchWithAuth(`${API_BASE_URL}/applications/my-applications`),

  getJobApplications: async (jobId: string) =>
    fetchWithAuth(`${API_BASE_URL}/applications/job/${jobId}`),

  uploadAttachments: async (formData: FormData) =>
    fetchWithAuth(`${API_BASE_URL}/applications/upload-attachments`, { method: 'POST', body: formData }),

  create: async (applicationData: {
    jobId: string;
    coverLetter?: string;
    resumeUrl?: string;
    videoUrl?: string;
  }) =>
    fetchWithAuth(`${API_BASE_URL}/applications`, {
      method: 'POST',
      body: JSON.stringify(applicationData),
    }),

  updateStatus: async (applicationId: string, status: string, aiMatchResult?: any) =>
    fetchWithAuth(`${API_BASE_URL}/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(aiMatchResult ? { aiMatchResult } : {}) }),
    }),

  scheduleInterview: async (applicationId: string, interviewData: { timeSlots: string[], meetingType: string, meetingLink?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/applications/${applicationId}/interview`, {
      method: 'POST',
      body: JSON.stringify(interviewData),
    }),

  submitFeedback: async (applicationId: string, feedback: { wasAiWrong: boolean; reasonCode: string }) =>
    fetchWithAuth(`${API_BASE_URL}/applications/${applicationId}/feedback`, {
      method: 'PATCH',
      body: JSON.stringify(feedback),
    }),

  reuploadResume: async (applicationId: string, file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return fetchWithAuth(`${API_BASE_URL}/applications/${applicationId}/resume`, {
      method: 'POST',
      body: formData,
    });
  },

  getResumeEndpoint: (applicationId: string, mode: 'inline' | 'download' = 'inline') =>
    `${API_BASE_URL}/applications/${applicationId}/resume?mode=${mode}`,
};

// ─── Messages API ─────────────────────────────────────────────────────────────

// ─── Messages API ─────────────────────────────────────────────────────────────

export const messagesAPI = {
  getThreads: async () => fetchWithAuth(`${API_BASE_URL}/messages/threads`),

  getThread: async (userId: string) =>
    fetchWithAuth(`${API_BASE_URL}/messages/threads/${userId}`),

  send: async (receiverId: string, message: string) =>
    fetchWithAuth(`${API_BASE_URL}/messages`, {
      method: 'POST',
      body: JSON.stringify({ receiverId, message }),
    }),
};

// ─── Notifications API ────────────────────────────────────────────────────────

export const notificationsAPI = {
  getAll: async () => fetchWithAuth(`${API_BASE_URL}/notifications`),

  markAsRead: async (notificationId: string) =>
    fetchWithAuth(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: async () =>
    fetchWithAuth(`${API_BASE_URL}/notifications/read-all`, { method: 'PATCH' }),
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersAPI = {
  search: async (query: string) =>
    fetchWithAuth(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`),

  getProfile: async (userId: string) =>
    fetchWithAuth(`${API_BASE_URL}/users/${userId}`),

  updateProfile: async (userId: string, formData: FormData) =>
    fetchWithAuth(`${API_BASE_URL}/users/${userId}`, { method: 'PATCH', body: formData }),

  updateImages: async (userId: string, data: { avatarUrl?: string; bannerUrl?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/users/${userId}/images`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ─── Images API ───────────────────────────────────────────────────────────────

export const imagesAPI = {
  generateAvatar: async (userId: string, userName: string) =>
    fetchWithAuth(
      `${API_BASE_URL}/images/avatar/${userId}?name=${encodeURIComponent(userName)}`
    ),

  generateBanner: async (userId: string) =>
    fetchWithAuth(`${API_BASE_URL}/images/banner/${userId}`),
};

// ─── Categories API ───────────────────────────────────────────────────────────

export const categoriesAPI = {
  getAll: async () => fetchWithAuth(`${API_BASE_URL}/categories`),
};

// ─── Shorts API ───────────────────────────────────────────────────────────────

export const shortsAPI = {
  getFeed: async () => fetchWithAuth(`${API_BASE_URL}/shorts/feed`),

  generateAI: async (data: { prompt: string; title?: string; description?: string; aspectRatio?: string }) =>
    fetchWithAuth(`${API_BASE_URL}/shorts/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Generate a 30-second video by stitching 3×10s clips (multi-provider) */
  generateLong: async (data: {
    prompt: string;
    description?: string;
    segments?: number;
    segmentDuration?: number;
    aspectRatio?: string;
  }) =>
    fetchWithAuth(`${API_BASE_URL}/shorts/generate-long`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getJobStatus: async (jobId: string) =>
    fetchWithAuth(`${API_BASE_URL}/shorts/status/${jobId}`),

  generateFromJob: async (jobId: string, aspectRatio: string = '9:16') =>
    fetchWithAuth(`${API_BASE_URL}/shorts/from-job/${jobId}`, {
      method: 'POST',
      body: JSON.stringify({ aspectRatio }),
    }),

  /** Track engagement action (like, share, save, view, apply_click) */
  engage: async (shortId: string, data: {
    action: 'view' | 'like' | 'unlike' | 'share' | 'save' | 'unsave' | 'apply_click';
    watchTimeMs?: number;
    completionRate?: number;
  }) =>
    fetchWithAuth(`${API_BASE_URL}/shorts/${shortId}/engage`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Upload company logo URL (recruiter only) */
  uploadLogo: async (logoUrl: string) =>
    fetchWithAuth(`${API_BASE_URL}/shorts/upload-logo`, {
      method: 'POST',
      body: JSON.stringify({ logoUrl }),
    }),
};

// ─── AI API ───────────────────────────────────────────────────────────────────

export const aiAPI = {
  enhancePrompt: async (text: string) =>
    fetchWithAuth(`${API_BASE_URL}/ai/enhance-prompt`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  generateText: async (prompt: string) =>
    fetchWithAuth(`${API_BASE_URL}/ai/generate-text`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
};

// ─── AI Matching API ──────────────────────────────────────────────────────────

export const matchingAPI = {
  /** Compute AI match score for a single application */
  computeMatch: async (applicationId: string, refresh = false) =>
    fetchWithAuth(`${API_BASE_URL}/matching/${applicationId}${refresh ? '?refresh=true' : ''}`, {
      method: 'POST',
    }),

  /** Get cached match result (no re-computation) */
  getCachedMatch: async (applicationId: string) =>
    fetchWithAuth(`${API_BASE_URL}/matching/${applicationId}`),

  /** Compute match scores for all applications of a job */
  batchMatch: async (jobId: string) =>
    fetchWithAuth(`${API_BASE_URL}/matching/batch/${jobId}`, {
      method: 'POST',
    }),
};

// ─── Admin API — ✅ FIXED: now uses fetchWithAuth instead of raw fetch ─────────

export const adminAPI = {
  getUsers: async (role?: string) => {
    const qs = role ? `?role=${role}` : '';
    return fetchWithAuth(`${API_BASE_URL}/admin/users${qs}`);
  },

  getApplications: async () => fetchWithAuth(`${API_BASE_URL}/admin/applications`),

  getUserWithApplications: async (userId: string) =>
    fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}`),
};
