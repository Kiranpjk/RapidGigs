import { Page } from '../types';

export type Role = 'student' | 'recruiter' | 'moderator' | 'admin';

const COMMON_AUTH_PAGES: Page[] = ['profile', 'messages', 'notifications'];
const CREATOR_PAGES: Page[] = ['upload_video'];
const RECRUITER_PAGES: Page[] = ['post_job', 'review_applications', 'candidates', 'upload_video'];

const ROLE_PAGE_ACCESS: Record<Role, Page[]> = {
  student: ['dashboard', 'shorts', 'jobs', 'job_application', ...COMMON_AUTH_PAGES, ...CREATOR_PAGES],
  recruiter: ['dashboard', 'shorts', 'jobs', 'job_application', ...COMMON_AUTH_PAGES, ...RECRUITER_PAGES],
  moderator: ['dashboard', 'admin', ...COMMON_AUTH_PAGES],
  admin: ['dashboard', 'admin', ...COMMON_AUTH_PAGES],
};

export const getRole = (role?: string): Role => {
  if (role === 'admin' || role === 'moderator' || role === 'recruiter' || role === 'student') {
    return role;
  }

  return 'student';
};

export const canAccessPage = (role: string | undefined, page: Page): boolean => {
  if (page === 'login' || page === 'signup' || page === 'forgot_password') {
    return true;
  }

  const normalizedRole = getRole(role);
  return ROLE_PAGE_ACCESS[normalizedRole].includes(page);
};

export const getDefaultPageForRole = (role?: string): Page => {
  return getRole(role) === 'admin' || getRole(role) === 'moderator' ? 'admin' : 'dashboard';
};
