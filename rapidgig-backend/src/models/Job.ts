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
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
  
  // Additional fields from joins
  recruiter_name?: string;
  recruiter_avatar?: string;
  company_name?: string;
  company_logo?: string;
}

export interface Application {
  id: string;
  job_id: string;
  student_id: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn';
  cover_letter?: string;
  applied_at: Date;
  updated_at: Date;
  
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
  pay_rate: number;
  pay_type: 'hourly' | 'fixed' | 'negotiable';
  location: string;
  work_type: 'remote' | 'onsite' | 'hybrid';
  required_skills: string[];
  recruiter_id: string;
  expires_at?: Date;
}

export interface UpdateJobData {
  title?: string;
  description?: string;
  category?: string;
  duration?: string;
  pay_rate?: number;
  pay_type?: 'hourly' | 'fixed' | 'negotiable';
  location?: string;
  work_type?: 'remote' | 'onsite' | 'hybrid';
  required_skills?: string[];
  status?: 'active' | 'closed' | 'draft';
  expires_at?: Date;
}

export interface CreateApplicationData {
  job_id: string;
  student_id: string;
  cover_letter?: string;
}

export interface UpdateApplicationData {
  status?: 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn';
  cover_letter?: string;
}