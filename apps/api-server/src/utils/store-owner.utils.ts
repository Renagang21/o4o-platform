/**
 * Store Owner Utilities
 *
 * WO-ROLE-NORMALIZATION-PHASE3-A-V1
 *
 * organization_members 기반 relation-based store ownership 확인.
 * 기존 pharmacistRole / users.roles[] 기반 체크를 대체한다.
 */

import type { DataSource } from 'typeorm';
import type { Request, Response, NextFunction } from 'express';
import { hasAnyServiceRole } from './role.utils.js';
import type { PrefixedRole } from '../types/roles.js';

const KPA_STORE_ACCESS_ROLES: PrefixedRole[] = [
  'kpa:branch_admin',
  'kpa:branch_operator',
  'kpa:admin',
  'kpa:operator',
];

export { KPA_STORE_ACCESS_ROLES };

/**
 * organization_members 기반 store owner 확인 (relation-based)
 */
export async function isStoreOwner(
  dataSource: DataSource,
  userId: string
): Promise<{ isOwner: boolean; organizationId: string | null }> {
  const rows = await dataSource.query(
    `SELECT organization_id
     FROM organization_members
     WHERE user_id = $1 AND role = 'owner' AND left_at IS NULL
     LIMIT 1`,
    [userId]
  );
  if (rows.length > 0) {
    return { isOwner: true, organizationId: rows[0].organization_id };
  }
  return { isOwner: false, organizationId: null };
}

/**
 * KPA 관리자/운영자 역할에 의한 조직 접근 (기존 동작 유지)
 */
async function getKpaOrganizationId(
  dataSource: DataSource,
  userId: string
): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT organization_id FROM kpa_members WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0]?.organization_id || null;
}

/**
 * Middleware: store owner 또는 KPA admin/operator 필수
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

    const userRoles: string[] = user.roles || [];

    // Path 1: KPA admin/operator (기존 동작 유지)
    if (hasAnyServiceRole(userRoles, KPA_STORE_ACCESS_ROLES)) {
      const orgId = await getKpaOrganizationId(dataSource, user.id);
      if (orgId) {
        (req as any).organizationId = orgId;
        next();
        return;
      }
    }

    // Path 2: organization_members owner (relation-based)
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
        message: 'Store owner or KPA operator role required',
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
  userRoles: string[]
): Promise<string | null> {
  // Path 1: KPA admin/operator
  if (hasAnyServiceRole(userRoles, KPA_STORE_ACCESS_ROLES)) {
    const orgId = await getKpaOrganizationId(dataSource, userId);
    if (orgId) return orgId;
  }

  // Path 2: organization_members owner
  const { isOwner, organizationId } = await isStoreOwner(dataSource, userId);
  if (isOwner) return organizationId;

  return null;
}
