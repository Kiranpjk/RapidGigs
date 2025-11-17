import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserModel } from '../models/User';

// Middleware to check if user has required permission
export const requirePermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      // Check if user has the required permission
      if (!user.permissions.includes(permission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission,
          message: `You need '${permission}' permission to perform this action`
        });
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
};

// Middleware to check if user has any of the required permissions
export const requireAnyPermission = (permissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      // Check if user has any of the required permissions
      const hasPermission = permissions.some(permission => 
        user.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissions,
          message: `You need one of these permissions: ${permissions.join(', ')}`
        });
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
};

// Middleware to check if user has all required permissions
export const requireAllPermissions = (permissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every(permission => 
        user.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(
          permission => !user.permissions.includes(permission)
        );
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          missing: missingPermissions,
          message: `You are missing these permissions: ${missingPermissions.join(', ')}`
        });
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
};

// Middleware to check if user has a specific role
export const requireRole = (roles: string | string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient role',
          required: allowedRoles,
          current: user.role,
          message: `This action requires one of these roles: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
};

// Middleware to check if user is admin
export const requireAdmin = requireRole('admin');

// Middleware to check if user is moderator or admin
export const requireModeratorOrAdmin = requireRole(['moderator', 'admin']);

// Helper function to check resource ownership
export const isResourceOwner = async (
  userId: string,
  resourceUserId: string
): Promise<boolean> => {
  return userId === resourceUserId;
};

// Middleware to check if user owns the resource or has permission
export const requireOwnershipOrPermission = (
  permission: string,
  getUserIdFromResource: (req: AuthRequest) => Promise<string>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      // Get the resource owner's user ID
      const resourceUserId = await getUserIdFromResource(req);

      // Check if user owns the resource
      const isOwner = await isResourceOwner(req.user.userId, resourceUserId);

      // Check if user has the required permission
      const hasPermission = user.permissions.includes(permission);

      if (!isOwner && !hasPermission) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You can only access your own resources or need appropriate permissions'
        });
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
};
