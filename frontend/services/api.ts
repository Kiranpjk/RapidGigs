const API_BASE_URL = 'https://rapidgigs.onrender.com/api';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Helper function to make authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

// Auth API
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
    if (!response.ok) throw new Error(result.error || 'Registration failed');

    // Store token
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
    if (!response.ok) throw new Error(result.error || 'Login failed');

    // Store token
    if (result.token) {
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result;
  },

  googleLogin: async (credential: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Google login failed');

    // Store token
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

  getCurrentUser: async () => {
    return fetchWithAuth(`${API_BASE_URL}/auth/me`);
  },

  forgotPassword: async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return response.json();
  },
};

// Videos API
export const videosAPI = {
  getAll: async () => {
    return fetchWithAuth(`${API_BASE_URL}/videos`);
  },

  getMyVideos: async () => {
    return fetchWithAuth(`${API_BASE_URL}/videos/my-videos`);
  },

  upload: async (formData: FormData) => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(result.error || `Upload failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_RESET')) {
        throw new Error('Connection to server failed. Please check if the backend is running.');
      }
      throw error;
    }
  },

  delete: async (videoId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/videos/${videoId}`, {
      method: 'DELETE',
    });
  },

  incrementView: async (videoId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/videos/${videoId}/view`, {
      method: 'PATCH',
    });
  },
};

// Jobs API
export const jobsAPI = {
  getAll: async (filters?: { category?: string; type?: string; location?: string }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.location) params.append('location', filters.location);

    const url = `${API_BASE_URL}/jobs${params.toString() ? `?${params.toString()}` : ''}`;
    return fetchWithAuth(url);
  },

  getById: async (jobId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/jobs/${jobId}`);
  },

  create: async (jobData: any) => {
    return fetchWithAuth(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  },

  updateEngagement: async (jobId: string, data: { likes?: number; comments?: number; shares?: number }) => {
    return fetchWithAuth(`${API_BASE_URL}/jobs/${jobId}/engagement`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Applications API
export const applicationsAPI = {
  getMyApplications: async () => {
    return fetchWithAuth(`${API_BASE_URL}/applications/my-applications`);
  },

  create: async (applicationData: {
    jobId: string;
    coverLetter?: string;
    resumeUrl?: string;
    videoUrl?: string;
  }) => {
    return fetchWithAuth(`${API_BASE_URL}/applications`, {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  },

  updateStatus: async (applicationId: string, status: string) => {
    return fetchWithAuth(`${API_BASE_URL}/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// Messages API
export const messagesAPI = {
  getThreads: async () => {
    return fetchWithAuth(`${API_BASE_URL}/messages/threads`);
  },

  getThread: async (userId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/messages/threads/${userId}`);
  },

  send: async (receiverId: string, message: string) => {
    return fetchWithAuth(`${API_BASE_URL}/messages`, {
      method: 'POST',
      body: JSON.stringify({ receiverId, message }),
    });
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    return fetchWithAuth(`${API_BASE_URL}/notifications`);
  },

  markAsRead: async (notificationId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: async () => {
    return fetchWithAuth(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
    });
  },
};

// Users API
export const usersAPI = {
  getProfile: async (userId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
  },

  updateProfile: async (userId: string, formData: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Update failed');
    return result;
  },

  updateImages: async (userId: string, data: { avatarUrl?: string; bannerUrl?: string }) => {
    return fetchWithAuth(`${API_BASE_URL}/users/${userId}/images`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Images API
export const imagesAPI = {
  generateAvatar: async (userId: string, userName: string) => {
    return fetchWithAuth(`${API_BASE_URL}/images/avatar/${userId}?name=${encodeURIComponent(userName)}`);
  },

  generateBanner: async (userId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/images/banner/${userId}`);
  },
};

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    return fetchWithAuth(`${API_BASE_URL}/categories`);
  },
};
