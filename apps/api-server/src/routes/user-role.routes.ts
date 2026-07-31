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

    // WO-O4O-AUTH-ONLY-ROUTE-GUARD-HARDENING-V1:
    // 경로의 :userId 는 클라이언트가 지정한 식별자다. 로그인만으로 타 사용자의
    // 역할·권한 목록을 열람할 수 없어야 한다 (본인 또는 플랫폼 관리자만 허용).
    const actorId = (req as any).user?.id as string | undefined;
    if (!actorId) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' });
    }
    if (actorId !== userId) {
      const { roleAssignmentService } = await import('../modules/auth/services/role-assignment.service.js');
      const isPlatformAdmin = await roleAssignmentService.hasAnyRole(actorId, [
        'platform:admin',
        'platform:super_admin',
      ]);
      if (!isPlatformAdmin) {
        logger.warn('[userRole] cross-user permission read denied', { actorUserId: actorId, targetUserId: userId });
        return res.status(403).json({
          success: false,
          error: '다른 사용자의 권한 정보를 조회할 수 없습니다.',
          code: 'FORBIDDEN',
        });
      }
    }

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
