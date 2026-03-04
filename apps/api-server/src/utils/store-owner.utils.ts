/**
 * Store Owner Utilities
 *
 * WO-ROLE-NORMALIZATION-PHASE3-A-V1
 * WO-KPA-B-STORE-CONTAMINATION-CLEANUP-V1 Phase 3B+3C:
 *   KPA_STORE_ACCESS_ROLES 바이패스 제거 → organization_members 단일 경로
 *
 * organization_members 기반 relation-based store ownership 확인.
 */

import type { DataSource } from 'typeorm';
import type { Request, Response, NextFunction } from 'express';

/**
 * organization_members 기반 store 접근 권한 확인 (relation-based)
 *
 * role IN ('owner', 'admin', 'manager') → store 접근 허용
 * Phase 3A 마이그레이션에서 KPA 약국소유자/admin/operator에 대해
 * organization_members 레코드가 생성됨.
 */
export async function isStoreOwner(
  dataSource: DataSource,
  userId: string
): Promise<{ isOwner: boolean; organizationId: string | null }> {
  const rows = await dataSource.query(
    `SELECT organization_id
     FROM organization_members
     WHERE user_id = $1 AND role IN ('owner', 'admin', 'manager') AND left_at IS NULL
     LIMIT 1`,
    [userId]
  );
  if (rows.length > 0) {
    return { isOwner: true, organizationId: rows[0].organization_id };
  }
  return { isOwner: false, organizationId: null };
}

/**
 * Middleware: organization_members 기반 store 접근 필수
 * req.organizationId에 조직 ID 주입
 */
export function createRequireStoreOwner(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const { isOwner, organizationId } = await isStoreOwner(dataSource, user.id);
    if (isOwner && organizationId) {
      (req as any).organizationId = organizationId;
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'STORE_OWNER_REQUIRED',
        message: 'Store owner access required',
      },
    });
  };
}

/**
 * 인라인 owner 체크 유틸리티 (미들웨어 대신 라우트 핸들러 내에서 사용)
 *
 * @returns organizationId if authorized, null otherwise
 */
export async function resolveStoreAccess(
  dataSource: DataSource,
  userId: string,
  _userRoles: string[]
): Promise<string | null> {
  const { isOwner, organizationId } = await isStoreOwner(dataSource, userId);
  if (isOwner) return organizationId;
  return null;
}
