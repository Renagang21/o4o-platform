/**
 * requireInstructor Middleware
 *
 * WO-LMS-INSTRUCTOR-ROLE-V1
 *
 * RoleAssignment 테이블에서 'lms:instructor' 역할 확인.
 * platform:admin / platform:super_admin도 통과.
 */

import type { Request, Response, NextFunction } from 'express';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';

export async function requireInstructor(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // WO-KPA-A-LMS-COURSE-OWNERSHIP-GUARD-V1: kpa:admin bypass
  const userRoles: string[] = (req as any).user?.roles || [];
  if (userRoles.includes('kpa:admin')) {
    return next();
  }

  const hasRole = await roleAssignmentService.hasAnyRole(userId, [
    'lms:instructor',
    'platform:admin',
    'platform:super_admin',
  ]);

  if (!hasRole) {
    return res.status(403).json({
      success: false,
      error: '강사 권한이 필요합니다',
      code: 'INSTRUCTOR_REQUIRED',
    });
  }

  next();
}
