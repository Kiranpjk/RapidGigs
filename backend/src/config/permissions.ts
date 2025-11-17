// Define all available permissions in the system
export const PERMISSIONS = {
  // User Management
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE_ROLES: 'user:manage_roles',
  
  // Video Management
  VIDEO_VIEW: 'video:view',
  VIDEO_CREATE: 'video:create',
  VIDEO_UPDATE: 'video:update',
  VIDEO_DELETE: 'video:delete',
  VIDEO_MODERATE: 'video:moderate',
  
  // Job Management
  JOB_VIEW: 'job:view',
  JOB_CREATE: 'job:create',
  JOB_UPDATE: 'job:update',
  JOB_DELETE: 'job:delete',
  JOB_MODERATE: 'job:moderate',
  
  // Application Management
  APPLICATION_VIEW: 'application:view',
  APPLICATION_CREATE: 'application:create',
  APPLICATION_UPDATE: 'application:update',
  APPLICATION_DELETE: 'application:delete',
  APPLICATION_REVIEW: 'application:review',
  
  // Message Management
  MESSAGE_VIEW: 'message:view',
  MESSAGE_SEND: 'message:send',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_MODERATE: 'message:moderate',
  
  // Notification Management
  NOTIFICATION_VIEW: 'notification:view',
  NOTIFICATION_CREATE: 'notification:create',
  NOTIFICATION_DELETE: 'notification:delete',
  
  // Category Management
  CATEGORY_VIEW: 'category:view',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  
  // System Administration
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_MODERATE: 'system:moderate',
  SYSTEM_VIEW_ANALYTICS: 'system:view_analytics',
};

// Define role-based permission sets
export const ROLE_PERMISSIONS = {
  student: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_UPDATE, // Own profile only
    PERMISSIONS.VIDEO_VIEW,
    PERMISSIONS.VIDEO_CREATE,
    PERMISSIONS.VIDEO_UPDATE, // Own videos only
    PERMISSIONS.VIDEO_DELETE, // Own videos only
    PERMISSIONS.JOB_VIEW,
    PERMISSIONS.APPLICATION_VIEW, // Own applications only
    PERMISSIONS.APPLICATION_CREATE,
    PERMISSIONS.APPLICATION_UPDATE, // Own applications only
    PERMISSIONS.MESSAGE_VIEW,
    PERMISSIONS.MESSAGE_SEND,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.CATEGORY_VIEW,
  ],
  
  recruiter: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_UPDATE, // Own profile only
    PERMISSIONS.VIDEO_VIEW,
    PERMISSIONS.VIDEO_CREATE,
    PERMISSIONS.VIDEO_UPDATE, // Own videos only
    PERMISSIONS.VIDEO_DELETE, // Own videos only
    PERMISSIONS.JOB_VIEW,
    PERMISSIONS.JOB_CREATE,
    PERMISSIONS.JOB_UPDATE, // Own jobs only
    PERMISSIONS.JOB_DELETE, // Own jobs only
    PERMISSIONS.APPLICATION_VIEW, // For their jobs
    PERMISSIONS.APPLICATION_REVIEW,
    PERMISSIONS.MESSAGE_VIEW,
    PERMISSIONS.MESSAGE_SEND,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.CATEGORY_VIEW,
  ],
  
  moderator: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.VIDEO_VIEW,
    PERMISSIONS.VIDEO_CREATE,
    PERMISSIONS.VIDEO_UPDATE,
    PERMISSIONS.VIDEO_DELETE,
    PERMISSIONS.VIDEO_MODERATE,
    PERMISSIONS.JOB_VIEW,
    PERMISSIONS.JOB_CREATE,
    PERMISSIONS.JOB_UPDATE,
    PERMISSIONS.JOB_DELETE,
    PERMISSIONS.JOB_MODERATE,
    PERMISSIONS.APPLICATION_VIEW,
    PERMISSIONS.APPLICATION_CREATE,
    PERMISSIONS.APPLICATION_UPDATE,
    PERMISSIONS.APPLICATION_REVIEW,
    PERMISSIONS.MESSAGE_VIEW,
    PERMISSIONS.MESSAGE_SEND,
    PERMISSIONS.MESSAGE_DELETE,
    PERMISSIONS.MESSAGE_MODERATE,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.NOTIFICATION_CREATE,
    PERMISSIONS.NOTIFICATION_DELETE,
    PERMISSIONS.CATEGORY_VIEW,
    PERMISSIONS.SYSTEM_MODERATE,
    PERMISSIONS.SYSTEM_VIEW_ANALYTICS,
  ],
  
  admin: [
    // Admins have all permissions
    ...Object.values(PERMISSIONS),
  ],
};

// Helper function to get permissions for a role
export const getPermissionsForRole = (role: string): string[] => {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
};

// Helper function to check if a role has a specific permission
export const roleHasPermission = (role: string, permission: string): boolean => {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
};
