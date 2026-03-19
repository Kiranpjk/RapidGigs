// ✅ FIXED: All IDs changed from number → string to match MongoDB ObjectId
// ✅ FIXED: Removed ReactNode from Job.logo (was breaking localStorage serialization)

export type Page =
  | 'login'
  | 'signup'
  | 'forgot_password'
  | 'dashboard'
  | 'shorts'
  | 'jobs'
  | 'profile'
  | 'messages'
  | 'notifications'
  | 'upload_video'
  | 'job_application'
  | 'admin'
  | 'post_job'
  | 'review_applications'
  | 'candidates';

export interface User {
  id: string; // ✅ was: number
  name: string;
  avatarUrl?: string;
  title?: string;
}

export interface CompanyBrief {
  about: string;
  culture: string;
  benefits: string[];
  size: string;
  industry: string;
  website?: string;
  instagramReelUrl?: string;
}

export interface Job {
  id: string; // ✅ was: number — MongoDB returns string ObjectIds
  title: string;
  company: string;
  // ✅ FIXED: Removed logo: ReactNode — ReactNode can't be serialized to localStorage
  // Logo is now derived from company name initials in the UI
  location: string;
  type: 'Remote' | 'On-site' | 'Hybrid';
  city?: string;
  pay: string;
  description: string;
  postedAgo: string;
  category?: string;
  companyVideoUrl?: string;
  freelancerVideoUrl?: string;
  shortVideoUrl?: string;
  maxSlots?: number;
  filledSlots?: number;
  status?: 'Open' | 'Full' | 'Closed';
  likes?: number;
  comments?: number;
  shares?: number;
  companyBrief?: CompanyBrief;
}

export interface ShortVideo {
  id: string; // ✅ was: number
  title: string;
  author: User;
  thumbnailUrl: string;
  views: number;
  likes: number;
  duration: string;
}

export interface MessageThread {
  id: string; // ✅ was: number
  user: User;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  messages: { sender: 'me' | 'them'; text: string; time: string }[];
}

export interface Notification {
  id: string; // ✅ was: number
  type?: string;
  title?: string;
  // ✅ FIXED: text is now string (not ReactNode) so it can be serialized safely
  text: string;
  time: string;
  isRead?: boolean;
}

export interface Category {
  id: string; // ✅ was: number
  name: string;
}

export type ApplicationStatus =
  | 'pending'
  | 'reviewing'
  | 'shortlisted'
  | 'interviewing'
  | 'accepted'
  | 'rejected';

export interface Application {
  id: string; // ✅ was: number
  _id?: string;
  job?: Job;
  jobId?: Job; // populated by backend
  dateApplied?: string;
  createdAt?: string;
  status: ApplicationStatus;
  coverLetter?: string;
  resumeUrl?: string;
  videoUrl?: string;
}
