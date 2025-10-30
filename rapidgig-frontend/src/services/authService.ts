import api from './api';
import type { AuthResponse, LoginData, RegisterData, ForgotPasswordData, ResetPasswordData } from '../types/index';



export class AuthService {
  static async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data;
  }

  static async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  }

  static async logout(): Promise<void> {
    await api.post('/auth/logout');
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  static async forgotPassword(data: ForgotPasswordData): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  }

  static async resetPassword(data: ResetPasswordData): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  }

  static saveAuthData(authResponse: AuthResponse): void {
    localStorage.setItem('token', authResponse.data.token);
    localStorage.setItem('refreshToken', authResponse.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(authResponse.data.user));
  }

  static getStoredUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  static getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  static isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }
}