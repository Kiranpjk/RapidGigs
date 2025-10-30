



export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'recruiter';
  profile_picture?: string;
  created_at: string;
  updated_at: string;

  // Student-specific fields
  skills?: string[];
  university?: string;
  graduation_year?: number;

  // Recruiter-specific fields
  company_name?: string;
  company_logo?: string;
  company_description?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
  message: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: 'student' | 'recruiter';
  skills?: string[];
  university?: string;
  graduationYear?: number;
  companyName?: string;
  companyDescription?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}