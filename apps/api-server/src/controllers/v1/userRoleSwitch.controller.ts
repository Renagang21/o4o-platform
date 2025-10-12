import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { User } from '../../entities/User';
import { Role } from '../../entities/Role';
import { UserActivityLog, ActivityType } from '../../entities/UserActivityLog';
import { validate as isUuid } from 'uuid';
import logger from '../../utils/logger';

export class UserRoleSwitchController {
  private static userRepository = AppDataSource.getRepository(User);
  private static roleRepository = AppDataSource.getRepository(Role);
  private static activityRepository = AppDataSource.getRepository(UserActivityLog);

  /**
   * Switch active role for current user
   * PATCH /api/users/me/active-role
   */
  static async switchActiveRole(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user;
      const { roleId } = req.body;

      // Validation: roleId is required
      if (!roleId) {
        res.status(400).json({
          success: false,
          message: 'roleId is required'
        });
        return;
      }

      // Validation: roleId must be a valid UUID
      if (!isUuid(roleId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid roleId format'
        });
        return;
      }

      // Get user with roles
      const user = await UserRoleSwitchController.userRepository.findOne({
        where: { id: currentUser.id },
        relations: ['dbRoles', 'activeRole']
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Check if role exists
      const role = await UserRoleSwitchController.roleRepository.findOne({
        where: { id: roleId, isActive: true },
        relations: ['permissions']
      });

      if (!role) {
        res.status(404).json({
          success: false,
          message: 'Role not found or inactive'
        });
        return;
      }

      // Check if user has this role
      if (!user.canSwitchToRole(roleId)) {
        res.status(403).json({
          success: false,
          message: 'You do not have permission to switch to this role',
          availableRoles: user.dbRoles?.map(r => ({
            id: r.id,
            name: r.name,
            displayName: r.displayName
          })) || []
        });
        return;
      }

      // Update active role
      const previousRole = user.activeRole;
      user.activeRole = role;
      await UserRoleSwitchController.userRepository.save(user);

      // Log the role switch activity
      try {
        const activityLog = UserRoleSwitchController.activityRepository.create({
          userId: user.id,
          activityType: ActivityType.ROLE_CHANGE,
          description: `Role switched from ${previousRole?.displayName || 'None'} to ${role.displayName}`,
          performedByUserId: user.id,
          metadata: {
            previousRoleId: previousRole?.id || null,
            previousRoleName: previousRole?.name || null,
            newRoleId: role.id,
            newRoleName: role.name,
            switchedBy: 'self'
          }
        });
        await UserRoleSwitchController.activityRepository.save(activityLog);
      } catch (logError) {
        // Log error but don't fail the request
        logger.error('Failed to log role switch activity:', logError);
      }

      // Return updated user data
      res.status(200).json({
        success: true,
        message: `Active role switched to ${role.displayName}`,
        data: {
          userId: user.id,
          activeRole: {
            id: role.id,
            name: role.name,
            displayName: role.displayName,
            permissions: role.getPermissionKeys()
          },
          availableRoles: user.dbRoles?.map(r => ({
            id: r.id,
            name: r.name,
            displayName: r.displayName,
            isActive: r.id === role.id
          })) || []
        }
      });
    } catch (error) {
      logger.error('Error switching active role:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get current user's roles
   * GET /api/users/me/roles
   */
  static async getCurrentUserRoles(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user;

      // Get user with roles
      const user = await UserRoleSwitchController.userRepository.findOne({
        where: { id: currentUser.id },
        relations: ['dbRoles', 'activeRole']
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const activeRole = user.getActiveRole();

      res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          email: user.email,
          activeRole: activeRole ? {
            id: activeRole.id,
            name: activeRole.name,
            displayName: activeRole.displayName,
            permissions: activeRole.getPermissionKeys()
          } : null,
          roles: user.dbRoles?.map(r => ({
            id: r.id,
            name: r.name,
            displayName: r.displayName,
            isActive: r.id === activeRole?.id,
            permissionCount: r.getPermissionKeys().length
          })) || [],
          canSwitchRoles: user.hasMultipleRoles(),
          totalRoles: user.dbRoles?.length || 0
        }
      });
    } catch (error) {
      logger.error('Error fetching current user roles:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
