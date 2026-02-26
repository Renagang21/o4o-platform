import { Router, Request, Response } from 'express';
// userRoleRoutes removed (Phase 8-3 - legacy commerce)
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import logger from '../../utils/logger.js';

const router: Router = Router();

// Basic user list endpoint
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const role = req.query.role as string;

    const userRepository = AppDataSource.getRepository(User);
    const queryBuilder = userRepository.createQueryBuilder('user');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.name ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (role) {
      queryBuilder.andWhere(`EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.user_id = user.id AND ra.is_active = true AND ra.role = :role)`, { role });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const users = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    // Transform users to match frontend expectations
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.roles?.[0] || 'user', // Phase3-E: role is getter
      status: user.status,
      provider: user.provider,
      businessInfo: user.businessInfo,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    }));

    res.json({
      success: true,
      data: {
        users: transformedUsers,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: limit,
          totalItems: total
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single user
router.get('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.params.id } });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// Delete user
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const result = await userRepository.delete({ id: req.params.id });
    
    if (result.affected === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// Create new user
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);

    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: { email: req.body.email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create new user
    // Phase3-E: role is a read-only getter — DB column has default
    const newUser = userRepository.create({
      email: req.body.email,
      password: req.body.password, // Should be hashed in the entity
      name: req.body.firstName && req.body.lastName
        ? `${req.body.firstName} ${req.body.lastName}`
        : req.body.firstName || req.body.lastName || req.body.email.split('@')[0],
      status: req.body.status || 'active',
      provider: 'local'
    });

    const savedUser = await userRepository.save(newUser);

    // Remove password from response
    const { password, ...userWithoutPassword } = savedUser;

    res.status(201).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update user (PUT for full update)
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.params.id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Debug logging
    logger.info('Update user request body:', {
      userId: req.params.id,
      roles: req.body.roles,
      role: req.body.role,
      isArray: Array.isArray(req.body.roles),
      rolesLength: req.body.roles?.length
    });

    // Update allowed fields
    if (req.body.email) user.email = req.body.email;
    if (req.body.password) user.password = req.body.password; // Will be hashed in entity
    if (req.body.firstName || req.body.lastName) {
      user.name = req.body.firstName && req.body.lastName
        ? `${req.body.firstName} ${req.body.lastName}`
        : req.body.firstName || req.body.lastName || user.name;
    }

    // Phase3-E: role is a read-only getter, roles not persisted
    // Role changes are handled via RoleAssignment dual-write below
    if (req.body.roles && Array.isArray(req.body.roles) && req.body.roles.length > 0) {
      logger.info('Roles will be synced via RoleAssignment:', { roles: req.body.roles });
    } else if (req.body.role) {
      logger.info('Role will be synced via RoleAssignment:', { role: req.body.role });
    }

    if (req.body.status) user.status = req.body.status;

    const updatedUser = await userRepository.save(user);

    // Phase3-D: Dual-write RoleAssignment
    const rolesToSync = req.body.roles || (req.body.role ? [req.body.role] : null);
    if (rolesToSync) {
      try {
        const { roleAssignmentService } = await import('../../modules/auth/services/role-assignment.service.js');
        for (const r of rolesToSync) {
          await roleAssignmentService.assignRole({
            userId: user.id,
            role: r,
            assignedBy: (req as any).user?.id,
          });
        }
      } catch {
        // Non-fatal
      }
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// Update user (PATCH for partial update)
router.patch('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.params.id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update allowed fields
    // Phase3-E: user.role is a read-only getter — skip role assignment
    if (req.body.status) user.status = req.body.status;
    if (req.body.name) user.name = req.body.name;

    const updatedUser = await userRepository.save(user);

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

export default router;