import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../auth/entities/User.js';
import { Role } from '../../../entities/Role.js';
import { AssignRoleDto, RemoveRoleDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';

/**
 * User Role Controller - NextGen Pattern (Phase3-E)
 *
 * Handles user role management operations via RoleAssignment service:
 * - Get all available roles
 * - Get user roles (from role_assignments table)
 * - Assign role to user (via RoleAssignment)
 * - Remove role from user (via RoleAssignment)
 * - Update role validity period (via RoleAssignment)
 */
export class UserRoleController extends BaseController {
  /**
   * GET /api/v1/users/roles
   * Get all available roles in the system
   */
  static async getRoles(req: Request, res: Response): Promise<any> {
    try {
      const roleRepository = AppDataSource.getRepository(Role);
      const roles = await roleRepository.find({
        select: ['id', 'name', 'displayName', 'description', 'createdAt', 'updatedAt'],
        order: { name: 'ASC' },
      });

      return BaseController.ok(res, {
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
          description: r.description || null,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
      });
    } catch (error: any) {
      logger.error('[UserRoleController.getRoles] Error', {
        error: error.message,
      });
      return BaseController.error(res, 'Failed to get roles');
    }
  }

  /**
   * GET /api/v1/users/:userId/roles
   * Get roles for a specific user (via RoleAssignment)
   */
  static async getUserRoles(req: Request, res: Response): Promise<any> {
    const { userId } = req.params;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Phase3-E: Use RoleAssignment service for authoritative role data
      const { roleAssignmentService } = await import('../../auth/services/role-assignment.service.js');
      const assignments = await roleAssignmentService.getActiveRoles(userId);

      return BaseController.ok(res, {
        userId: user.id,
        roles: assignments.map(a => ({
          role: a.role,
          assignedAt: a.assignedAt,
          assignedBy: a.assignedBy,
          validFrom: a.validFrom,
          validUntil: a.validUntil,
        })),
      });
    } catch (error: any) {
      logger.error('[UserRoleController.getUserRoles] Error', {
        error: error.message,
        userId,
      });
      return BaseController.error(res, 'Failed to get user roles');
    }
  }

  /**
   * POST /api/v1/users/:userId/roles
   * Assign a role to a user (admin only, via RoleAssignment)
   */
  static async assignRole(req: AuthRequest, res: Response): Promise<any> {
    // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Admin-only guard
    const currentUser = req.user;
    if (!currentUser) {
      return BaseController.error(res, 'Authentication required', 401);
    }
    const currentRoles: string[] = (currentUser as any).roles || [];
    const isAdmin = currentRoles.includes('platform:admin') || currentRoles.includes('platform:super_admin') || currentRoles.includes('kpa:admin');
    if (!isAdmin) {
      logger.warn('[UserRoleController.assignRole] Non-admin role assignment attempt', {
        userId: (currentUser as any).id,
        path: req.path,
      });
      return BaseController.error(res, 'Admin role required for role assignment', 403);
    }

    const { userId } = req.params;
    const data = req.body as AssignRoleDto;

    try {
      const userRepository = AppDataSource.getRepository(User);

      // Check if user exists
      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Phase3-E: Use RoleAssignment service to assign role
      const { roleAssignmentService } = await import('../../auth/services/role-assignment.service.js');

      // Check if user already has this role
      const hasRole = await roleAssignmentService.hasRole(userId, data.role);
      if (hasRole) {
        return BaseController.error(res, 'User already has this role', 400);
      }

      const assignment = await roleAssignmentService.assignRole({
        userId,
        role: data.role,
        assignedBy: (currentUser as any).id || 'system',
      });

      logger.info('[UserRoleController.assignRole] Role assigned via RoleAssignment', {
        userId: user.id,
        role: data.role,
        assignedBy: (currentUser as any).id,
      });

      return BaseController.created(res, {
        message: 'Role assigned successfully',
        userRole: {
          userId: user.id,
          role: assignment.role,
          assignedAt: assignment.assignedAt,
        },
      });
    } catch (error: any) {
      logger.error('[UserRoleController.assignRole] Error', {
        error: error.message,
        userId,
        role: data.role,
      });
      return BaseController.error(res, 'Failed to assign role');
    }
  }

  /**
   * DELETE /api/v1/users/:userId/roles/:roleId
   * Remove a role from a user (admin only, via RoleAssignment)
   *
   * Note: roleId param is now treated as the role name string for RoleAssignment compatibility
   */
  static async removeRole(req: Request, res: Response): Promise<any> {
    // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Admin-only guard
    const currentUser = (req as any).user;
    if (!currentUser) {
      return BaseController.error(res, 'Authentication required', 401);
    }
    const currentRoles: string[] = currentUser.roles || [];
    const isAdmin = currentRoles.includes('platform:admin') || currentRoles.includes('platform:super_admin') || currentRoles.includes('kpa:admin');
    if (!isAdmin) {
      logger.warn('[UserRoleController.removeRole] Non-admin role removal attempt', {
        userId: currentUser.id,
        path: req.path,
      });
      return BaseController.error(res, 'Admin role required for role removal', 403);
    }

    const { userId, roleId } = req.params;

    try {
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Phase3-E: Use RoleAssignment service to remove role
      // roleId param may be a role name or UUID - try both
      const { roleAssignmentService } = await import('../../auth/services/role-assignment.service.js');
      const removed = await roleAssignmentService.removeRole(userId, roleId);

      if (!removed) {
        return BaseController.notFound(res, 'User does not have this role');
      }

      logger.info('[UserRoleController.removeRole] Role removed via RoleAssignment', {
        userId,
        role: roleId,
      });

      return BaseController.ok(res, {
        message: 'Role removed successfully',
      });
    } catch (error: any) {
      logger.error('[UserRoleController.removeRole] Error', {
        error: error.message,
        userId,
        roleId,
      });
      return BaseController.error(res, 'Failed to remove role');
    }
  }

  /**
   * PUT /api/v1/users/:userId/roles/:roleId
   * Update role validity period (admin only, via RoleAssignment)
   */
  static async updateRoleValidity(req: Request, res: Response): Promise<any> {
    const { userId, roleId } = req.params;
    const { validFrom, validUntil } = req.body;

    try {
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Phase3-E: Use RoleAssignment service for validity control
      const { roleAssignmentService } = await import('../../auth/services/role-assignment.service.js');
      const hasRole = await roleAssignmentService.hasRole(userId, roleId);
      if (!hasRole) {
        return BaseController.notFound(res, 'User does not have this role');
      }

      // Re-assign with validity period
      const assignment = await roleAssignmentService.assignRole({
        userId,
        role: roleId,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
      });

      return BaseController.ok(res, {
        message: 'Role validity updated successfully',
        assignment: {
          role: assignment.role,
          validFrom: assignment.validFrom,
          validUntil: assignment.validUntil,
        },
      });
    } catch (error: any) {
      logger.error('[UserRoleController.updateRoleValidity] Error', {
        error: error.message,
        userId,
        roleId,
      });
      return BaseController.error(res, 'Failed to update role validity');
    }
  }
}
