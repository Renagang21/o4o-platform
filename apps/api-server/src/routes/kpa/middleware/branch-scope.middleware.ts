/**
 * Branch Scope Guard Middleware
 *
 * WO-KPA-BRANCH-SCOPE-VALIDATION-V1
 * Validates that the authenticated user belongs to the branch specified in req.params.branchId.
 * Super admin roles (kpa:admin, kpa:district_admin) bypass this check.
 *
 * Usage:
 *   router.use('/:branchId/admin', requireAuth, branchScopeGuard, adminRoutes);
 */

import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { KpaMember } from '../entities/kpa-member.entity.js';

/** Roles that can access any branch without ownership check */
const BRANCH_BYPASS_ROLES = ['kpa:admin', 'kpa:district_admin'];

/**
 * Create a middleware that enforces branch ownership.
 * If req.params.branchId exists, the user must own that branch
 * (via kpa_members.organization_id) or hold a bypass role.
 */
export function createBranchScopeGuard(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const branchId = req.params.branchId;

    // No branchId in route → nothing to guard
    if (!branchId) {
      next();
      return;
    }

    const user = (req as any).user;
    const userId = user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Super admin / district admin bypass
    const roles: string[] = user.roles || [];
    const singleRole: string = user.role || '';
    if (
      BRANCH_BYPASS_ROLES.includes(singleRole) ||
      roles.some((r: string) => BRANCH_BYPASS_ROLES.includes(r))
    ) {
      next();
      return;
    }

    // Verify branch ownership via kpa_members
    try {
      const memberRepo = dataSource.getRepository(KpaMember);
      const member = await memberRepo.findOne({ where: { user_id: userId } });

      if (!member || member.organization_id !== branchId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'BRANCH_SCOPE_FORBIDDEN',
            message: 'Access denied: you do not belong to this branch',
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[BranchScopeGuard] Error checking membership:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify branch scope' },
      });
    }
  };
}
