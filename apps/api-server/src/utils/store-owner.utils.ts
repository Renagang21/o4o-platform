/**
 * Store Owner Utilities
 *
 * WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1:
 *   role_assignments는 store_owner 판단의 단일 소스다.
 *   organization_members는 조직 정보 조회용으로만 사용한다.
 *
 * WO-GLYCOPHARM-STORE-GUARD-SERVICE-AWARE-FIX-V1:
 *   service-aware guard 도입 — cross-service role leakage 차단.
 *   서비스별 store_owner 역할 정의를 명시화하여 frontend/backend SSOT 정합 회복.
 *   기존 시그니처(serviceKey 미지정)는 back-compat 경로로 모든 서비스 role 허용.
 *
 * WO-O4O-STORE-OWNER-MEMBERSHIP-CANONICALIZATION-V1:
 *   serviceKey 가 명시된 경로에서 service_memberships(active) 검사를 추가한다.
 *   role 만 있고 active membership 이 없는 store-owner 접근을 차단 (frontend
 *   MembershipGate / WO-O4O-BACKEND-MEMBERSHIP-GUARD-CANONICALIZATION-V1 과 동일 정책).
 *   serviceKey 미지정 back-compat 경로는 본 WO 범위에서 변경하지 않음 — 점진 마이그레이션.
 *   request 당 추가 DB query 0건 (JWT memberships 직접 사용).
 */

import type { DataSource } from 'typeorm';
import type { Request, Response, NextFunction } from 'express';
import type { AuthContext } from '../auth/auth-context.js';

/**
 * 서비스별 store_owner 권한을 가지는 role 목록.
 *
 * - kpa        : `kpa:store_owner` (약사회 가맹 약국 개설자)
 * - glycopharm : `glycopharm:store_owner` 또는 `glycopharm:pharmacist`
 *                (glycopharm 도메인에서 매장 경영자 = 약사 컨벤션 — role-constants.ts 참조.
 *                 WO-GLYCOPHARM-PHARMACY-ROLE-FINAL-CLEANUP-V1: PHARMACIST 단일 기준)
 * - cosmetics  : `cosmetics:store_owner`
 */
const STORE_OWNER_ROLES_BY_SERVICE = {
  kpa: ['kpa:store_owner'],
  glycopharm: ['glycopharm:store_owner', 'glycopharm:pharmacist'],
  cosmetics: ['cosmetics:store_owner'],
} as const;

export type StoreOwnerServiceKey = keyof typeof STORE_OWNER_ROLES_BY_SERVICE;

/**
 * WO-O4O-STORE-OWNER-MEMBERSHIP-CANONICALIZATION-V1:
 *   StoreOwnerServiceKey(role-prefix) → service_memberships.service_key 매핑.
 *   common/middleware/membership-guard.middleware.ts 의 SCOPE_TO_MEMBERSHIP_KEY,
 *   utils/serviceScope.ts 의 ROLE_PREFIX_TO_SERVICE_KEY 와 동일 의미 (follow-up
 *   으로 단일 상수 통합 권장).
 */
const STORE_OWNER_SCOPE_TO_MEMBERSHIP_KEY: Record<StoreOwnerServiceKey, string> = {
  kpa: 'kpa-society',
  glycopharm: 'glycopharm',
  cosmetics: 'k-cosmetics',
};

/**
 * 모든 서비스의 store_owner role 합집합 (back-compat 경로용).
 * 신규 호출은 가급적 serviceKey 를 지정하여 cross-service 침투를 차단한다.
 */
const ALL_STORE_OWNER_ROLES: readonly string[] = [
  ...STORE_OWNER_ROLES_BY_SERVICE.kpa,
  ...STORE_OWNER_ROLES_BY_SERVICE.glycopharm,
  ...STORE_OWNER_ROLES_BY_SERVICE.cosmetics,
];

/**
 * Service-aware store_owner 체크.
 *
 * @param serviceKey  지정 시 해당 서비스 role 만 허용 (예: 'glycopharm' → glycopharm:store_owner / glycopharm:pharmacist).
 *                    미지정 시 모든 서비스 role 허용 (back-compat).
 */
export async function isStoreOwner(
  dataSource: DataSource,
  userId: string,
  serviceKey?: StoreOwnerServiceKey,
): Promise<{ isOwner: boolean; organizationId: string | null; memberRole: string }> {
  const allowedRoles: readonly string[] = serviceKey
    ? STORE_OWNER_ROLES_BY_SERVICE[serviceKey]
    : ALL_STORE_OWNER_ROLES;

  const [raRecord] = await dataSource.query(
    `SELECT 1 FROM role_assignments
     WHERE user_id = $1 AND role = ANY($2::text[]) AND is_active = true
     LIMIT 1`,
    [userId, allowedRoles]
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

/**
 * Service-aware requireStoreOwner 미들웨어 팩토리.
 *
 * @param serviceKey  지정 시 해당 서비스 role 만 통과 (cross-service leakage 차단).
 *                    미지정 시 모든 서비스 store_owner role 허용 (back-compat).
 */
export function createRequireStoreOwner(
  dataSource: DataSource,
  serviceKey?: StoreOwnerServiceKey,
) {
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

    // WO-O4O-STORE-OWNER-MEMBERSHIP-CANONICALIZATION-V1
    // serviceKey 가 명시된 경우 service_memberships.active 사전 검증.
    // back-compat 경로(serviceKey 미지정)는 본 WO 에서 변경 없음 — 점진 마이그레이션.
    // JWT memberships 직접 사용 — request 당 추가 DB query 없음.
    if (serviceKey) {
      const membershipKey = STORE_OWNER_SCOPE_TO_MEMBERSHIP_KEY[serviceKey];
      const memberships: { serviceKey: string; status: string }[] =
        (user as any).memberships || [];
      const membership = memberships.find((m) => m.serviceKey === membershipKey);
      if (!membership) {
        res.status(403).json({
          success: false,
          error: `No membership found for service: ${serviceKey}`,
          code: 'MEMBERSHIP_NOT_FOUND',
        });
        return;
      }
      if (membership.status !== 'active') {
        res.status(403).json({
          success: false,
          error: `Service membership is ${membership.status}. Active membership required.`,
          code: 'MEMBERSHIP_NOT_ACTIVE',
        });
        return;
      }
    }

    const { isOwner, organizationId, memberRole } = await isStoreOwner(
      dataSource,
      user.id,
      serviceKey,
    );
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
 * @param serviceKey  지정 시 해당 서비스 role 만 허용. 미지정 시 모든 서비스 허용 (back-compat).
 * @returns organizationId if authorized, null otherwise
 */
export async function resolveStoreAccess(
  dataSource: DataSource,
  userId: string,
  _userRoles: string[],
  serviceKey?: StoreOwnerServiceKey,
): Promise<string | null> {
  const { isOwner, organizationId } = await isStoreOwner(dataSource, userId, serviceKey);
  if (isOwner) return organizationId;
  return null;
}
