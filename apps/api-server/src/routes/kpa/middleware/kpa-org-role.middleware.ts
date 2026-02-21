/**
 * KPA Organization Role Guard Middleware
 *
 * WO-KPA-C-ROLE-SYNC-NORMALIZATION-V1
 *
 * KpaMember.role 기반 조직 역할 검증.
 * User.roles[]의 kpa-c:* 의존 제거 — KpaMember.role이 SSOT.
 *
 * 역할 계층: admin > operator > member
 * kpa:admin bypass: User.roles[]에 kpa:admin이 있으면 모든 분회 접근 허용.
 *
 * 사용법:
 *   router.use(requireOrgRole(dataSource, 'admin'));
 *   router.use(requireOrgRole(dataSource, 'operator'));
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { KpaMember } from '../entities/kpa-member.entity.js';

/** 역할 계층 맵 (숫자가 높을수록 상위 역할) */
const ROLE_HIERARCHY: Record<string, number> = {
  member: 1,
  operator: 2,
  admin: 3,
};

/** kpa:admin bypass 역할 */
const BYPASS_ROLES = ['kpa:admin', 'kpa:district_admin'];

export type KpaOrgRole = 'member' | 'operator' | 'admin';

/**
 * KpaMember.role 기반 미들웨어 팩토리.
 *
 * @param dataSource - TypeORM DataSource
 * @param minimumRole - 최소 요구 역할 ('member' | 'operator' | 'admin')
 * @returns Express middleware
 */
export function requireOrgRole(
  dataSource: DataSource,
  minimumRole: KpaOrgRole,
): RequestHandler {
  const minimumLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const userId = user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // kpa:admin / kpa:district_admin bypass — 모든 분회 접근 허용
    const userRoles: string[] = user.roles || [];
    if (userRoles.some((r: string) => BYPASS_ROLES.includes(r))) {
      next();
      return;
    }

    try {
      const memberRepo = dataSource.getRepository(KpaMember);
      const member = await memberRepo.findOne({
        where: { user_id: userId, status: 'active' as const },
      });

      if (!member) {
        res.status(403).json({
          success: false,
          error: {
            code: 'NO_ACTIVE_MEMBERSHIP',
            message: '활성 분회 소속이 없습니다.',
          },
        });
        return;
      }

      const memberLevel = ROLE_HIERARCHY[member.role] ?? 0;

      if (memberLevel < minimumLevel) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_ORG_ROLE',
            message: `이 기능은 ${minimumRole} 이상의 분회 역할이 필요합니다.`,
          },
        });
        return;
      }

      // req에 member 첨부 — downstream 엔드포인트에서 재활용
      (req as any).kpaMember = member;

      next();
    } catch (error) {
      console.error('[KpaOrgRoleGuard] Error checking membership:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify organization role' },
      });
    }
  };
}
