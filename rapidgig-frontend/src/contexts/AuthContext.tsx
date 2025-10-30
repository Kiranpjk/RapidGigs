import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types/index';
import { AuthService } from '../services/authService';

// DEBUG: AuthContext loaded
console.log('DEBUG: AuthContext - imports loaded');

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = AuthService.getStoredUser();
    const token = AuthService.getStoredToken();
    
    console.log('AuthContext: Checking stored auth', { storedUser, hasToken: !!token });
    
    if (storedUser && token) {
      setUser(storedUser);
      console.log('AuthContext: User restored from storage', storedUser);
    }
    
    setIsLoading(false);
  }, []);

  const login = (userData: User, token: string, refreshToken: string) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};