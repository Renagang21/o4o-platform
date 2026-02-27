import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../auth/entities/User.js';
import { UserQueryDto, UpdateUserDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';

/**
 * User Management Controller - NextGen Pattern
 *
 * Handles admin user management operations:
 * - List users (paginated)
 * - Get user by ID
 * - Update user (admin)
 * - Delete user (admin)
 */
export class UserManagementController extends BaseController {
  /**
   * GET /api/v1/users
   * List all users (paginated, filtered)
   */
  static async listUsers(req: Request, res: Response): Promise<any> {
    const query = req.query as unknown as UserQueryDto;

    try {
      const userRepository = AppDataSource.getRepository(User);

      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Build query
      const queryBuilder = userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.email',
          'user.name',
          'user.status',
          'user.createdAt',
          'user.updatedAt',
        ])
        .leftJoinAndSelect('user.dbRoles', 'roles');

      // Apply filters
      if (query.search) {
        queryBuilder.andWhere('(user.name LIKE :search OR user.email LIKE :search)', {
          search: `%${query.search}%`,
        });
      }

      // role column removed - Phase3-E: role filter via role_assignments
      // if (query.role) {
      //   queryBuilder.andWhere('user.role = :role', { role: query.role });
      // }

      if (query.status) {
        queryBuilder.andWhere('user.status = :status', { status: query.status });
      }

      // Apply sorting
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'desc';
      queryBuilder.orderBy(`user.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      // Execute query
      const [users, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

      return BaseController.okPaginated(
        res,
        users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          status: u.status,
          roles: u.dbRoles?.map(r => r.name) || u.roles || [],
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })),
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      );
    } catch (error: any) {
      logger.error('[UserManagementController.listUsers] Error', {
        error: error.message,
      });
      return BaseController.error(res, 'Failed to list users');
    }
  }

  /**
   * GET /api/v1/users/:id
   * Get user by ID
   */
  static async getUserById(req: Request, res: Response): Promise<any> {
    const { id } = req.params;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id },
        relations: ['dbRoles'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      return BaseController.ok(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
          status: user.status,
          roles: user.dbRoles?.map(r => ({
            id: r.id,
            name: r.name,
            displayName: r.displayName,
          })) || (user.roles?.map(role => ({ id: '', name: role, displayName: role })) || []),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('[UserManagementController.getUserById] Error', {
        error: error.message,
        userId: id,
      });
      return BaseController.error(res, 'Failed to get user');
    }
  }

  /**
   * PUT /api/v1/users/:id
   * Update user (admin only)
   */
  static async updateUser(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const data = req.body as UpdateUserDto;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id } });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Update fields
      if (data.name) user.name = data.name;
      if (data.email) user.email = data.email;
      if (data.status) user.status = data.status as any;
      // Phase3-E: use role_assignments table
      if (data.role) {
        await roleAssignmentService.removeAllRoles(user.id);
        await roleAssignmentService.assignRole({ userId: user.id, role: data.role as string });
      }

      user.updatedAt = new Date();
      await userRepository.save(user);

      return BaseController.ok(res, {
        message: 'User updated successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles || [],
          status: user.status,
        },
      });
    } catch (error: any) {
      logger.error('[UserManagementController.updateUser] Error', {
        error: error.message,
        userId: id,
      });
      return BaseController.error(res, 'Failed to update user');
    }
  }

  /**
   * DELETE /api/v1/users/:id
   * Delete user (admin only)
   */
  static async deleteUser(req: Request, res: Response): Promise<any> {
    const { id } = req.params;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id } });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Soft delete by setting status to 'deleted'
      user.status = 'deleted' as any;
      user.updatedAt = new Date();
      await userRepository.save(user);

      return BaseController.ok(res, {
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      logger.error('[UserManagementController.deleteUser] Error', {
        error: error.message,
        userId: id,
      });
      return BaseController.error(res, 'Failed to delete user');
    }
  }
}
