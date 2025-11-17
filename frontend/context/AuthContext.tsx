import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  bannerUrl?: string;
  title?: string;
  isStudent: boolean;
  isRecruiter: boolean;
  role: string;
  permissions: string[];
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    isStudent?: boolean;
    isRecruiter?: boolean;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token is still valid
          const currentUser = await authAPI.getCurrentUser();
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      setUser(response.user);
      setToken(response.token);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const googleLogin = async (credential: string) => {
    try {
      const response = await authAPI.googleLogin(credential);
      setUser(response.user);
      setToken(response.token);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Google login failed');
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
    isStudent?: boolean;
    isRecruiter?: boolean;
  }) => {
    try {
      const response = await authAPI.register(data);
      setUser(response.user);
      setToken(response.token);
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setToken(null);
    // Clear job-related data on logout
    localStorage.removeItem('savedJobs');
    localStorage.removeItem('applications');
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    googleLogin,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
