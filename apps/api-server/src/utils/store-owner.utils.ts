/**
 * Store Owner Utilities
 *
 * WO-ROLE-NORMALIZATION-PHASE3-A-V1
 * WO-KPA-B-STORE-CONTAMINATION-CLEANUP-V1 Phase 3B+3C:
 *   KPA_STORE_ACCESS_ROLES 바이패스 제거 → organization_members 단일 경로
 * WO-O4O-AUTH-CONTEXT-UNIFICATION-V1: memberRole 추가
 *
 * organization_members 기반 relation-based store ownership 확인.
 */

import type { DataSource } from 'typeorm';
import type { Request, Response, NextFunction } from 'express';
import type { AuthContext } from '../auth/auth-context.js';

/**
 * Store 접근 권한 확인
 *
 * WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1:
 *   PRIMARY: role_assignments에서 kpa:store_owner 확인
 *   FALLBACK: organization_members 기반 (legacy — Phase 7에서 제거 예정)
 */
export async function isStoreOwner(
  dataSource: DataSource,
  userId: string
): Promise<{ isOwner: boolean; organizationId: string | null; memberRole: string }> {
  // PRIMARY: role_assignments 기반
  try {
    const [raRecord] = await dataSource.query(
      `SELECT 1 FROM role_assignments WHERE user_id = $1 AND role = 'kpa:store_owner' AND is_active = true LIMIT 1`,
      [userId]
    );
    if (raRecord) {
      // Role confirmed — get org info from organization_members
      const rows = await dataSource.query(
        `SELECT organization_id, role FROM organization_members
         WHERE user_id = $1 AND role IN ('owner', 'admin', 'manager') AND left_at IS NULL LIMIT 1`,
        [userId]
      );
      if (rows.length > 0) {
        return { isOwner: true, organizationId: rows[0].organization_id, memberRole: rows[0].role };
      }
      // Has role but no org yet (recently approved, org not created yet)
      return { isOwner: true, organizationId: null, memberRole: '' };
    }
  } catch { /* role_assignments table issue */ }

  // FALLBACK (legacy): organization_members only
  // TODO: WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1 Phase 7 — remove after transition
  const rows = await dataSource.query(
    `SELECT organization_id, role
     FROM organization_members
     WHERE user_id = $1 AND role IN ('owner', 'admin', 'manager') AND left_at IS NULL
     LIMIT 1`,
    [userId]
  );
  if (rows.length > 0) {
    console.warn(`[isStoreOwner] Legacy fallback: org_members only for user ${userId}`);
    return { isOwner: true, organizationId: rows[0].organization_id, memberRole: rows[0].role };
  }
  return { isOwner: false, organizationId: null, memberRole: '' };
}

/**
 * Middleware: organization_members 기반 store 접근 필수
 * req.organizationId + req.authContext 주입
 * WO-O4O-AUTH-CONTEXT-UNIFICATION-V1: authContext 추가
 *
 * WO-KPA-A-PHARMACIST-ACTIVITY-TYPE-BUSINESS-INFO-FLOW-V1:
 *   Fallback — activity_type='pharmacy_owner'면 매장 미개설도 접근 허용.
 *   organizationId=null → 하위 핸들러가 빈 결과 반환.
 */
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

    // Primary: organization_members 기반
    const { isOwner, organizationId, memberRole } = await isStoreOwner(dataSource, user.id);
    if (isOwner && organizationId) {
      req.organizationId = organizationId;
      req.authContext = {
        userId: user.id as string,
        organizationId,
        memberRole,
        roles: (user.roles as string[]) || [],
      };
      next();
      return;
    }

    // Fallback (legacy): activity_type='pharmacy_owner' (매장 미개설 약국 개설약사)
    // TODO: WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1 Phase 7 — remove after transition
    // WO-KPA-A-PHARMACIST-ACTIVITY-TYPE-BUSINESS-INFO-FLOW-V1
    try {
      const [profile] = await dataSource.query(
        `SELECT 1 FROM kpa_pharmacist_profiles WHERE user_id = $1 AND activity_type = 'pharmacy_owner' LIMIT 1`,
        [user.id]
      );
      if (profile) {
        req.organizationId = null as any;
        req.authContext = {
          userId: user.id as string,
          organizationId: null as any,
          memberRole: '',
          roles: (user.roles as string[]) || [],
        };
        next();
        return;
      }
    } catch { /* table may not exist */ }

    res.status(403).json({
      success: false,
      error: 'Store owner access required',
      code: 'STORE_OWNER_REQUIRED',
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
