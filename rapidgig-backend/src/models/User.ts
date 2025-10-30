export interface User {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: 'student' | 'recruiter';
  profile_picture?: string;
  created_at: Date;
  updated_at: Date;
  
  // Student-specific fields
  skills?: string[];
  university?: string;
  graduation_year?: number;
  
  // Recruiter-specific fields
  company_name?: string;
  company_logo?: string;
  company_description?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: 'student' | 'recruiter';
  skills?: string[];
  university?: string;
  graduation_year?: number;
  company_name?: string;
  company_description?: string;
}

export interface UpdateUserData {
  full_name?: string;
  profile_picture?: string;
  skills?: string[];
  university?: string;
  graduation_year?: number;
  company_name?: string;
  company_logo?: string;
  company_description?: string;
}