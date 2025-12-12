/**
 * User Role Routes
 * Routes for user role and permission management
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { User } from '../modules/auth/entities/User.js';
import { authenticate } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router: Router = Router();

/**
 * GET /api/v1/userRole/:userId/permissions
 * Get user's permissions based on their roles
 * Requires authentication
 */
router.get('/:userId/permissions', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ['dbRoles', 'dbRoles.permissions'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Collect all unique permissions from user's roles
    const permissionSet = new Set<string>();

    if (user.dbRoles) {
      for (const role of user.dbRoles) {
        if (role.permissions) {
          for (const permission of role.permissions) {
            if (permission.isActive) {
              permissionSet.add(permission.key);
            }
          }
        }
      }
    }

    const permissions = Array.from(permissionSet);

    res.json({
      success: true,
      data: {
        userId,
        permissions,
        roles: user.dbRoles?.map(r => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
        })) || [],
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
