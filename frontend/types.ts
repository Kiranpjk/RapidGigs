import type { ReactNode } from 'react';

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
  | 'job_application';

export interface User {
  id: number;
  name: string;
  avatarUrl: string;
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
  id: number;
  title: string;
  company: string;
  // FIX: Replaced React.ReactNode with imported ReactNode to fix missing namespace error.
  logo: ReactNode;
  location: string;
  type: 'Remote' | 'On-site' | 'Hybrid';
  city?: string;
  pay: string;
  description: string;
  postedAgo: string;
  companyVideoUrl?: string;
  freelancerVideoUrl?: string;
  shortVideoUrl?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  companyBrief?: CompanyBrief;
}

export interface ShortVideo {
  id: number;
  title: string;
  author: User;
  thumbnailUrl: string;
  views: number;
  likes: number;
  duration: string;
}

export interface MessageThread {
  id: number;
  user: User;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  messages: { sender: 'me' | 'them'; text: string; time: string }[];
}

export interface Notification {
  id: number;
  // FIX: Replaced React.ReactNode with imported ReactNode to fix missing namespace error.
  icon: ReactNode;
  // FIX: Replaced React.ReactNode with imported ReactNode to fix missing namespace error.
  text: ReactNode;
  time: string;
}

export interface Category {
  id: number;
  name: string;
}

export type ApplicationStatus = 'Applied' | 'Interviewing' | 'Offer Received' | 'Rejected';

export interface Application {
  id: number;
  job: Job;
  dateApplied: string;
  status: ApplicationStatus;
}