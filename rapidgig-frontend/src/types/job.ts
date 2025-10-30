export interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  pay_rate: number;
  pay_type: 'hourly' | 'fixed' | 'negotiable';
  location: string;
  work_type: 'remote' | 'onsite' | 'hybrid';
  required_skills: string[];
  recruiter_id: string;
  status: 'active' | 'closed' | 'draft';
  applications_count: number;
  views: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  
  // Additional fields from joins
  recruiter_name?: string;
  recruiter_avatar?: string;
  company_name?: string;
  company_logo?: string;
  is_saved?: boolean;
}

export interface Application {
  id: string;
  job_id: string;
  student_id: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn';
  cover_letter?: string;
  applied_at: string;
  updated_at: string;
  
  // Additional fields from joins
  student_name?: string;
  student_avatar?: string;
  student_skills?: string[];
  job_title?: string;
}

export interface CreateJobData {
  title: string;
  description: string;
  category: string;
  duration: string;
  payRate: number;
  payType: 'hourly' | 'fixed' | 'negotiable';
  location: string;
  workType: 'remote' | 'onsite' | 'hybrid';
  requiredSkills: string[];
  expiresAt?: string;
}

export interface UpdateJobData {
  title?: string;
  description?: string;
  category?: string;
  duration?: string;
  payRate?: number;
  payType?: 'hourly' | 'fixed' | 'negotiable';
  location?: string;
  workType?: 'remote' | 'onsite' | 'hybrid';
  requiredSkills?: string[];
  status?: 'active' | 'closed' | 'draft';
  expiresAt?: string;
}

export interface JobCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface JobFilters {
  category?: string;
  workType?: string;
  payType?: string;
  location?: string;
  requiredSkills?: string[];
  minPay?: number;
  maxPay?: number;
  search?: string;
}