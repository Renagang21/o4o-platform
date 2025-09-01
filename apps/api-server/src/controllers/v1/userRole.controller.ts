import { Request, Response } from 'express';
import AppDataSource from '../../database/data-source';
import { User, UserRole } from '../../entities/User';
import { UserActivityLog, ActivityType } from '../../entities/UserActivityLog';
import { validate } from 'class-validator';

// Define available permissions
export const PERMISSIONS = {
  // User management
  'users.view': 'View users',
  'users.create': 'Create users',
  'users.edit': 'Edit users', 
  'users.delete': 'Delete users',
  'users.suspend': 'Suspend/unsuspend users',
  'users.approve': 'Approve users',
  
  // Content management
  'content.view': 'View content',
  'content.create': 'Create content',
  'content.edit': 'Edit content',
  'content.delete': 'Delete content',
  'content.publish': 'Publish content',
  'content.moderate': 'Moderate content',
  
  // System administration
  'admin.settings': 'Manage system settings',
  'admin.analytics': 'View analytics',
  'admin.logs': 'View system logs',
  'admin.backup': 'Manage backups',
  
  // ACF and CPT
  'acf.manage': 'Manage custom fields',
  'cpt.manage': 'Manage custom post types',
  'shortcodes.manage': 'Manage shortcodes',
  
  // API access
  'api.access': 'Access API',
  'api.admin': 'Admin API access'
} as const;

// Define role permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: Object.keys(PERMISSIONS),
  [UserRole.ADMIN]: Object.keys(PERMISSIONS),
  [UserRole.MODERATOR]: [
    'users.view', 'users.suspend', 'users.approve',
    'content.view', 'content.edit', 'content.moderate', 'content.publish',
    'admin.analytics', 'admin.logs',
    'api.access'
  ],
  [UserRole.MANAGER]: [
    'users.view',
    'content.view', 'content.create', 'content.edit', 'content.publish',
    'acf.manage', 'cpt.manage', 'shortcodes.manage',
    'api.access'
  ],
  [UserRole.VENDOR]: [
    'content.view', 'content.create', 'content.edit',
    'api.access'
  ],
  [UserRole.VENDOR_MANAGER]: [
    'users.view', 'users.create', 'users.edit',
    'content.view', 'content.create', 'content.edit', 'content.publish',
    'admin.analytics',
    'api.access'
  ],
  [UserRole.SELLER]: [
    'content.view', 'content.create',
    'api.access'
  ],
  [UserRole.CUSTOMER]: [
    'content.view',
    'api.access'
  ],
  [UserRole.BUSINESS]: [
    'content.view', 'content.create',
    'api.access'
  ],
  [UserRole.PARTNER]: [
    'content.view', 'content.create',
    'api.access'
  ],
  [UserRole.BETA_USER]: [
    'content.view', 'content.create',
    'api.access'
  ],
  [UserRole.SUPPLIER]: [
    'content.view', 'content.create',
    'api.access'
  ],
  [UserRole.AFFILIATE]: [
    'content.view',
    'api.access'
  ]
};

export class UserRoleController {
  private static userRepository = AppDataSource.getRepository(User);
  private static activityRepository = AppDataSource.getRepository(UserActivityLog);

  static async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const roles = Object.values(UserRole).map(role => ({
        value: role,
        label: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '),
        permissions: ROLE_PERMISSIONS[role],
        permissionCount: ROLE_PERMISSIONS[role].length
      }));

      res.status(200).json({
        success: true,
        data: roles
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;

      const user = await UserRoleController.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'firstName', 'lastName', 'role', 'status']
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const userRole = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        permissions: ROLE_PERMISSIONS[user.role],
        roleLabel: user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')
      };

      res.status(200).json({
        success: true,
        data: userRole
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const { role, reason } = req.body;
      const currentUser = (req as any).user;

      if (!Object.values(UserRole).includes(role)) {
        res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
        return;
      }

      const user = await UserRoleController.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Prevent users from elevating themselves to admin
      if (currentUser.id === userId && role === UserRole.ADMIN && user.role !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Cannot elevate your own role to admin'
        });
        return;
      }

      // Prevent demoting the last admin
      if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
        const adminCount = await UserRoleController.userRepository.count({
          where: { role: UserRole.ADMIN }
        });

        if (adminCount <= 1) {
          res.status(403).json({
            success: false,
            message: 'Cannot demote the last admin user'
          });
          return;
        }
      }

      const oldRole = user.role;
      user.role = role;

      const errors = await validate(user);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints
          }))
        });
        return;
      }

      await UserRoleController.userRepository.save(user);

      // Log the role change activity
      const activityData = UserActivityLog.createRoleChangeActivity(
        userId,
        oldRole,
        role,
        currentUser.id,
        reason
      );

      const activity = UserRoleController.activityRepository.create(activityData);
      await UserRoleController.activityRepository.save(activity);

      res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          oldRole,
          newRole: role,
          permissions: ROLE_PERMISSIONS[role],
          updatedAt: new Date()
        },
        message: 'User role updated successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.query;

      let permissions = PERMISSIONS;
      let rolePermissions: string[] = [];

      if (role && Object.values(UserRole).includes(role as UserRole)) {
        rolePermissions = ROLE_PERMISSIONS[role as UserRole];
      }

      const permissionsData = Object.entries(permissions).map(([key, description]) => ({
        key,
        description,
        granted: rolePermissions.length > 0 ? rolePermissions.includes(key) : false
      }));

      // Group permissions by category
      const groupedPermissions = {
        users: permissionsData.filter(p => p.key.startsWith('users.')),
        content: permissionsData.filter(p => p.key.startsWith('content.')),
        admin: permissionsData.filter(p => p.key.startsWith('admin.')),
        acf: permissionsData.filter(p => p.key.startsWith('acf.')),
        cpt: permissionsData.filter(p => p.key.startsWith('cpt.')),
        shortcodes: permissionsData.filter(p => p.key.startsWith('shortcodes.')),
        api: permissionsData.filter(p => p.key.startsWith('api.'))
      };

      res.status(200).json({
        success: true,
        data: {
          all: permissionsData,
          grouped: groupedPermissions,
          rolePermissions: rolePermissions
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async checkUserPermission(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const { permission } = req.query;

      if (!permission || typeof permission !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Permission parameter is required'
        });
        return;
      }

      const user = await UserRoleController.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'role']
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const hasPermission = ROLE_PERMISSIONS[user.role].includes(permission);

      res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          role: user.role,
          permission,
          granted: hasPermission
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getRoleStatistics(req: Request, res: Response): Promise<void> {
    try {
      const roleStats = await Promise.all(
        Object.values(UserRole).map(async (role) => {
          const count = await UserRoleController.userRepository.count({
            where: { role }
          });
          return {
            role,
            label: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '),
            count,
            permissions: ROLE_PERMISSIONS[role].length
          };
        })
      );

      const totalUsers = await UserRoleController.userRepository.count();

      res.status(200).json({
        success: true,
        data: {
          roleDistribution: roleStats,
          totalUsers,
          summary: {
            admins: roleStats.find(r => r.role === UserRole.ADMIN)?.count || 0,
            activeUsers: roleStats.reduce((sum, r) => sum + r.count, 0),
            pendingUsers: 0
          }
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}