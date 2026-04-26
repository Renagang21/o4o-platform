/**
 * Store Owner Utilities
 *
 * WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1:
 *   role_assignments는 store_owner 판단의 단일 소스다.
 *   organization_members는 조직 정보 조회용으로만 사용한다.
 */

import type { DataSource } from 'typeorm';
import type { Request, Response, NextFunction } from 'express';
import type { AuthContext } from '../auth/auth-context.js';

const STORE_OWNER_ROLES = [
  'kpa:store_owner',
  'glycopharm:store_owner',
  'cosmetics:store_owner',
] as const;

export async function isStoreOwner(
  dataSource: DataSource,
  userId: string
): Promise<{ isOwner: boolean; organizationId: string | null; memberRole: string }> {
  const [raRecord] = await dataSource.query(
    `SELECT 1 FROM role_assignments
     WHERE user_id = $1 AND role = ANY($2::text[]) AND is_active = true
     LIMIT 1`,
    [userId, STORE_OWNER_ROLES]
  );
  if (!raRecord) {
    return { isOwner: false, organizationId: null, memberRole: '' };
  }

  const rows = await dataSource.query(
    `SELECT organization_id, role FROM organization_members
     WHERE user_id = $1 AND role IN ('owner', 'admin', 'manager') AND left_at IS NULL LIMIT 1`,
    [userId]
  );
  if (rows.length > 0) {
    return { isOwner: true, organizationId: rows[0].organization_id, memberRole: rows[0].role };
  }
  return { isOwner: true, organizationId: null, memberRole: '' };
}

export function createRequireStoreOwner(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { isOwner, organizationId, memberRole } = await isStoreOwner(dataSource, user.id);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        error: 'Store owner access required',
        code: 'STORE_OWNER_REQUIRED',
      });
      return;
    }

    req.organizationId = organizationId as any;
    req.authContext = {
      userId: user.id as string,
      organizationId: organizationId as any,
      memberRole,
      roles: (user.roles as string[]) || [],
    };
    next();
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
