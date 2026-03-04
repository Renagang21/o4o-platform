import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { User, UserRole, UserStatus } from '../../modules/auth/entities/User.js';
import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';

export class AdminUserController {
  
  // Get all users with pagination and filters
  // WO-OPERATOR-FIX-V1: JOIN role_assignments to include roles in response
  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const userRepo = AppDataSource.getRepository(User);
      const queryBuilder = userRepo.createQueryBuilder('user');

      // Apply search filter
      if (search) {
        queryBuilder.where(
          '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR user.company ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // WO-OPERATOR-FIX-V1: role filter via role_assignments
      if (role && role !== 'all') {
        queryBuilder.andWhere(
          `EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.user_id = user.id AND ra.is_active = true AND ra.role = :filterRole)`,
          { filterRole: role }
        );
      }

      // Apply status filter
      if (status && status !== 'all') {
        queryBuilder.andWhere('user.status = :status', { status });
      }

      // Apply sorting
      const validSortFields = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
      const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`user.${sortField}`, order);

      // Apply pagination
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const [users, totalCount] = await queryBuilder.getManyAndCount();

      // WO-OPERATOR-FIX-V1: Fetch roles for all users in batch
      const userIds = users.map(u => u.id);
      let roleMap: Record<string, string[]> = {};
      if (userIds.length > 0) {
        const roleRows = await AppDataSource.query(
          `SELECT user_id, ARRAY_AGG(role ORDER BY role) as roles
           FROM role_assignments
           WHERE user_id = ANY($1) AND is_active = true
           GROUP BY user_id`,
          [userIds]
        );
        for (const row of roleRows) {
          roleMap[row.user_id] = row.roles || [];
        }
      }

      // Remove password from response, add roles
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return {
          ...userWithoutPassword,
          roles: roleMap[user.id] || [],
          role: (roleMap[user.id] || [])[0] || 'user'
        };
      });

      const totalPages = Math.ceil(totalCount / Number(limit));

      res.json({
        success: true,
        users: sanitizedUsers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  };

  // Get single user by ID
  getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userRepo = AppDataSource.getRepository(User);
      
      const user = await userRepo.findOne({ where: { id } });
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.json({
        success: true,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user'
      });
    }
  };

  // Create new user
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        email,
        password,
        firstName,
        lastName,
        name,
        role = UserRole.USER,
        roles: rolesArray,
        status = UserStatus.APPROVED,
        isActive = true
      } = req.body;

      const userRepo = AppDataSource.getRepository(User);

      // Check if email already exists
      const existingUser = await userRepo.findOne({ where: { email } });
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = userRepo.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        name,
        status,
        isActive,
        permissions: []
      });

      const savedUser = await userRepo.save(newUser);

      // WO-OPERATOR-FIX-V1: Support multiple roles from frontend
      // Write to role_assignments (SSOT)
      if (Array.isArray(rolesArray) && rolesArray.length > 0) {
        for (const r of rolesArray) {
          await roleAssignmentService.assignRole({ userId: savedUser.id, role: r });
        }
      } else {
        await roleAssignmentService.assignRole({ userId: savedUser.id, role });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = savedUser;

      res.status(201).json({
        success: true,
        user: userWithoutPassword,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
    }
  };

  // Update user
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const userRepo = AppDataSource.getRepository(User);

      const user = await userRepo.findOne({ where: { id } });
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      const {
        email,
        password,
        firstName,
        lastName,
        name,
        role,
        roles: rolesArray,
        status,
        isActive
      } = req.body;

      // Check if email is being changed and already exists
      if (email && email !== user.email) {
        const existingUser = await userRepo.findOne({ where: { email } });
        if (existingUser) {
          res.status(400).json({
            success: false,
            error: 'Email already exists'
          });
          return;
        }
      }

      // Update fields
      if (email) user.email = email;
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (name) user.name = name;
      // WO-OPERATOR-FIX-V1: Support multiple roles from frontend
      if (Array.isArray(rolesArray) && rolesArray.length > 0) {
        await roleAssignmentService.removeAllRoles(user.id);
        for (const r of rolesArray) {
          await roleAssignmentService.assignRole({ userId: user.id, role: r });
        }
      } else if (role) {
        await roleAssignmentService.removeAllRoles(user.id);
        await roleAssignmentService.assignRole({ userId: user.id, role });
      }
      if (status !== undefined) user.status = status;
      if (isActive !== undefined) user.isActive = isActive;

      // Update password if provided
      if (password) {
        user.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await userRepo.save(user);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json({
        success: true,
        user: userWithoutPassword,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
    }
  };

  // Update user status
  updateUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id } });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      user.status = status;
      await userRepo.save(user);

      res.json({
        success: true,
        message: `User status updated to ${status}`
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user status'
      });
    }
  };

  // Delete user
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userRepo = AppDataSource.getRepository(User);

      const user = await userRepo.findOne({ where: { id } });
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Try hard delete first; if FK constraint prevents it, soft-delete instead
      try {
        await userRepo.remove(user);
        res.json({
          success: true,
          message: 'User deleted successfully'
        });
      } catch (deleteError: any) {
        // FK constraint violation — fall back to soft delete
        if (deleteError?.code === '23503' || deleteError?.message?.includes('violates foreign key')) {
          await userRepo.update(id, { isActive: false });
          // Also remove role assignments so the user can no longer log in
          await AppDataSource.query(
            `DELETE FROM role_assignments WHERE user_id = $1`,
            [id]
          );
          res.json({
            success: true,
            message: 'User deactivated (has related records that prevent full deletion)'
          });
        } else {
          throw deleteError;
        }
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  };

  // Get user statistics
  getUserStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRepo = AppDataSource.getRepository(User);

      const [
        totalUsers,
        activeUsers,
        usersByRole,
        usersByStatus,
        recentUsers
      ] = await Promise.all([
        userRepo.count(),
        userRepo.count({ where: { isActive: true } }),
        // role column removed - return empty array for role stats
        Promise.resolve([]),
        userRepo
          .createQueryBuilder('user')
          .select('user.status as status, COUNT(*) as count')
          .groupBy('user.status')
          .getRawMany(),
        userRepo.find({
          order: { createdAt: 'DESC' },
          take: 10,
          select: ['id', 'firstName', 'lastName', 'email', 'createdAt']
        })
      ]);

      res.json({
        success: true,
        statistics: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          byRole: usersByRole,
          byStatus: usersByStatus,
          recent: recentUsers
        }
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics'
      });
    }
  };
}