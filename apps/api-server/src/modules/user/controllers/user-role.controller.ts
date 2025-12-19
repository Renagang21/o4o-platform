import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../auth/entities/User.js';
import { Role } from '../../../entities/Role.js';
import { AssignRoleDto, RemoveRoleDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';

/**
 * User Role Controller - NextGen Pattern
 *
 * Handles user role management operations:
 * - Get all available roles
 * - Get user roles
 * - Assign role to user
 * - Remove role from user
 * - Update role validity period
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
   * Get roles for a specific user
   */
  static async getUserRoles(req: Request, res: Response): Promise<any> {
    const { userId } = req.params;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['dbRoles'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      return BaseController.ok(res, {
        userId: user.id,
        roles: user.dbRoles?.map(role => ({
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          description: role.description || null,
        })) || [],
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
   * Assign a role to a user (admin only)
   */
  static async assignRole(req: AuthRequest, res: Response): Promise<any> {
    const { userId } = req.params;
    const data = req.body as AssignRoleDto;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const roleRepository = AppDataSource.getRepository(Role);

      // Check if user exists
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['dbRoles'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Check if role exists
      const role = await roleRepository.findOne({
        where: { name: data.role },
      });

      if (!role) {
        return BaseController.notFound(res, 'Role not found');
      }

      // Check if user already has this role
      const hasRole = user.dbRoles?.some(r => r.id === role.id);
      if (hasRole) {
        return BaseController.error(res, 'User already has this role', 400);
      }

      // Assign role using ManyToMany relationship
      if (!user.dbRoles) {
        user.dbRoles = [];
      }
      user.dbRoles.push(role);
      await userRepository.save(user);

      logger.info('[UserRoleController.assignRole] Role assigned', {
        userId: user.id,
        roleId: role.id,
        assignedBy: req.user?.id,
      });

      return BaseController.created(res, {
        message: 'Role assigned successfully',
        userRole: {
          userId: user.id,
          roleId: role.id,
          roleName: role.name,
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
   * Remove a role from a user (admin only)
   */
  static async removeRole(req: Request, res: Response): Promise<any> {
    const { userId, roleId } = req.params;

    try {
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['dbRoles'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Find the role in user's roles
      const roleIndex = user.dbRoles?.findIndex(r => r.id === roleId) ?? -1;
      if (roleIndex === -1) {
        return BaseController.notFound(res, 'User does not have this role');
      }

      // Remove role from user's roles
      user.dbRoles?.splice(roleIndex, 1);
      await userRepository.save(user);

      logger.info('[UserRoleController.removeRole] Role removed', {
        userId,
        roleId,
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
   * Update role validity period (admin only)
   *
   * Note: Role validity is not currently supported with the ManyToMany relationship.
   * This endpoint is kept for API compatibility but will return a not implemented error.
   * To support role validity, the RoleAssignment entity should be used instead.
   */
  static async updateRoleValidity(req: Request, res: Response): Promise<any> {
    const { userId, roleId } = req.params;

    try {
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['dbRoles'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      const hasRole = user.dbRoles?.some(r => r.id === roleId);
      if (!hasRole) {
        return BaseController.notFound(res, 'User does not have this role');
      }

      return BaseController.error(
        res,
        'Role validity is not supported with the current ManyToMany relationship. Use RoleAssignment entity for validity control.',
        501
      );
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
