import express from 'express';
import { body, validationResult } from 'express-validator';
import { Role } from '../models/Role';
import { UserModel } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/rbac';
import { PERMISSIONS, getPermissionsForRole } from '../config/permissions';

const router = express.Router();

// Get all roles (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single role (admin only)
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create role (admin only)
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('name').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('permissions').isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, permissions } = req.body;

      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(400).json({ error: 'Role already exists' });
      }

      const role = new Role({
        name,
        description,
        permissions,
      });

      await role.save();

      res.status(201).json(role);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update role (admin only)
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('permissions').optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, permissions } = req.body;
      const updates: any = {};

      if (name) updates.name = name;
      if (description) updates.description = description;
      if (permissions) updates.permissions = permissions;

      const role = await Role.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );

      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      res.json(role);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete role (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json({ message: 'Role deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Assign role to user (admin only)
router.post(
  '/assign',
  authenticate,
  requireAdmin,
  [
    body('userId').notEmpty(),
    body('role').isIn(['student', 'recruiter', 'admin', 'moderator']),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, role } = req.body;

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get permissions for the new role
      const permissions = getPermissionsForRole(role);

      // Update user role and permissions
      user.role = role;
      user.permissions = permissions;
      
      // Update legacy flags for backward compatibility
      user.isStudent = role === 'student';
      user.isRecruiter = role === 'recruiter';
      
      await user.save();

      res.json({
        message: 'Role assigned successfully',
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get user's permissions
router.get('/user/:userId/permissions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    // Users can only view their own permissions unless they're admin
    const requestingUser = await UserModel.findById(req.user!.userId);
    if (!requestingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user!.userId !== userId && requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      userId: user._id.toString(),
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Activate/Deactivate user (admin only)
router.patch(
  '/user/:userId/status',
  authenticate,
  requireAdmin,
  [body('isActive').isBoolean()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { isActive } = req.body;

      const user = await UserModel.update(userId, { isActive });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          isActive: user.isActive,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get all available permissions (admin only)
router.get('/permissions/list', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({
      permissions: Object.values(PERMISSIONS),
      grouped: {
        user: Object.entries(PERMISSIONS)
          .filter(([key]) => key.startsWith('USER_'))
          .map(([, value]) => value),
        video: Object.entries(PERMISSIONS)
          .filter(([key]) => key.startsWith('VIDEO_'))
          .map(([, value]) => value),
        job: Object.entries(PERMISSIONS)
          .filter(([key]) => key.startsWith('JOB_'))
          .map(([, value]) => value),
        application: Object.entries(PERMISSIONS)
          .filter(([key]) => key.startsWith('APPLICATION_'))
          .map(([, value]) => value),
        message: Object.entries(PERMISSIONS)
          .filter(([key]) => key.startsWith('MESSAGE_'))
          .map(([, value]) => value),
        notification: Object.entries(PERMISSIONS)
          .filter(([key]) => key.startsWith('NOTIFICATION_'))
          .map(([, value]) => value),
        category: Object.entries(PERMISSIONS)
          .filter(([key]) => key.startsWith('CATEGORY_'))
          .map(([, value]) => value),
        system: Object.entries(PERMISSIONS)
          .filter(([key]) => key.startsWith('SYSTEM_'))
          .map(([, value]) => value),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
