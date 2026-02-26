/**
 * User Role Routes
 * Routes for user role and permission management
 * Phase3-E: Uses RoleAssignment service instead of dbRoles
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { User } from '../modules/auth/entities/User.js';
import { authenticate } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router: Router = Router();

/**
 * GET /api/v1/userRole/:userId/permissions
 * Get user's permissions based on their roles (via RoleAssignment)
 * Requires authentication
 */
router.get('/:userId/permissions', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Phase3-E: Use RoleAssignment service for permissions
    const { roleAssignmentService } = await import('../modules/auth/services/role-assignment.service.js');
    const assignments = await roleAssignmentService.getActiveRoles(userId);
    const permissions = await roleAssignmentService.getPermissions(userId);

    res.json({
      success: true,
      data: {
        userId,
        permissions,
        roles: assignments.map(a => ({
          role: a.role,
          assignedAt: a.assignedAt,
        })),
      },
    });
  } catch (error: any) {
    logger.error('UserRole API - getPermissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
