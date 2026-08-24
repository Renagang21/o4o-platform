/**
 * Store Owner Utilities
 *
 * WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
 *   조직 선택을 `utils/store-organization.resolver.ts` 로 위임한다.
 *   serviceKey 가 주어지면 **그 서비스에 등록된 organization 만 후보**가 되고,
 *   2개 이상이면 임의 선택 대신 ambiguous 로 차단한다 (role 판정 ≠ organization 판정).
 *   serviceKey → service_memberships.service_key 매핑은 @o4o/security-core SSOT 위임
 *   (로컬 상수 제거 — membership-guard / serviceScope 와 3-way drift 방지).
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
 *
 * WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1:
 *   membership 검사를 `isStoreOwner()` 안으로 내린다. 미들웨어(createRequireStoreOwner)에만
 *   있던 검사는 같은 함수를 쓰는 다른 진입점(requireStoreAuth / optionalStoreAuth /
 *   resolveStoreAccess)을 보호하지 못했다. 이제 매장 판정의 접근 게이트는 한 곳이다.
 *   미들웨어의 JWT 사전 검사는 상태코드 구분(MEMBERSHIP_NOT_FOUND / MEMBERSHIP_NOT_ACTIVE)을
 *   위해 남긴다 — 이중 방어이며 판정은 DB 가 정본이다.
 */

import type { DataSource } from 'typeorm';
import type { Request, Response, NextFunction } from 'express';
import type { AuthContext } from '../auth/auth-context.js';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import {
  resolveStoreOrganization,
  type StoreOrganizationResolution,
  type StoreOwnerServiceKey,
} from './store-organization.resolver.js';

export type { StoreOwnerServiceKey } from './store-organization.resolver.js';

/**
 * 서비스별 store_owner 권한을 가지는 role 목록.
 *
 * - kpa        : `kpa:store_owner` (약사회 가맹 약국 개설자)
 * - glycopharm : `glycopharm:store_owner` (약국 경영자)
 *                WO-O4O-GLYCOPHARM-ROLE-VALUE-NORMALIZATION:
 *                `glycopharm:pharmacist`(일반 약사/근무약사)는 매장 접근 권한 없음.
 *                pharmacy_owner 승인 시 store_owner + pharmacist 둘 다 부여되므로
 *                경영자 판단은 store_owner role 단독 기준 — glycopharm-member.service.ts 참조.
 * - cosmetics  : `cosmetics:store_owner`
 * - pharmacy-hub : `pharmacy-hub:store_owner` (약국 경영자)
 *                WO-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1:
 *                W1(프로비저닝)이 organizations / organization_members(owner) /
 *                organization_service_enrollments / platform_store_slugs 를 생성해도
 *                이 registry 에 없으면 isStoreOwner() 가 role 게이트에서 종료되어
 *                organizationId 를 반환하지 못했다 (CHECK-PHARMACY-HUB-STORE-SUBJECT-
 *                PROVISIONING-V1 §8-5). 등록으로 공통 매장 API 진입을 복구한다.
 */
const STORE_OWNER_ROLES_BY_SERVICE = {
  kpa: ['kpa:store_owner'],
  glycopharm: ['glycopharm:store_owner'],
  cosmetics: ['cosmetics:store_owner'],
  'pharmacy-hub': ['pharmacy-hub:store_owner'],
} as const;

/**
 * WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
 *   StoreOwnerServiceKey(role prefix) → service_memberships.service_key 매핑은
 *   @o4o/security-core 의 resolveCanonicalServiceKey() 가 SSOT 다
 *   (kpa→kpa-society, cosmetics→k-cosmetics, glycopharm/pharmacy-hub self-map).
 *   membership-guard.middleware / utils/serviceScope 와 같은 함수를 쓴다 — 로컬 맵 금지.
 */
/**
 * 모든 서비스의 store_owner role 합집합 (back-compat 경로용).
 * 신규 호출은 가급적 serviceKey 를 지정하여 cross-service 침투를 차단한다.
 */
const ALL_STORE_OWNER_ROLES: readonly string[] = Object.values(
  STORE_OWNER_ROLES_BY_SERVICE,
).flat();

/**
 * Service-aware store_owner 체크.
 *
 * @param serviceKey  지정 시 해당 서비스 role 만 허용 (예: 'glycopharm' → glycopharm:store_owner / glycopharm:pharmacist).
 *                    미지정 시 모든 서비스 role 허용 (back-compat).
 */
export interface StoreOwnerCheckResult {
  isOwner: boolean;
  organizationId: string | null;
  memberRole: string;
  /** 조직 해석 상세 — 'ambiguous' 를 403 과 구분해 응답하려는 호출 측이 사용 */
  resolution: StoreOrganizationResolution;
}

export async function isStoreOwner(
  dataSource: DataSource,
  userId: string,
  serviceKey?: StoreOwnerServiceKey,
): Promise<StoreOwnerCheckResult> {
  const allowedRoles: readonly string[] = serviceKey
    ? STORE_OWNER_ROLES_BY_SERVICE[serviceKey]
    : ALL_STORE_OWNER_ROLES;

  // WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §7
  //   canonical 계약: **membership = 서비스에 들어갈 수 있느냐**, role = 그 안에서 무엇을
  //   할 수 있느냐. 그런데 이 함수는 role_assignments 만 보고 있어서, 이 함수를 통과 지점으로
  //   쓰는 경로 전부가 role-only 였다:
  //     - auth-context.middleware 의 requireStoreAuth / optionalStoreAuth
  //       (store-hub 공개 GET 4개 — kpa/glycopharm/cosmetics)
  //     - resolveStoreAccess() 를 직접 부르는 store-playlist / store-handled-products /
  //       store-local-product / event-offer / seller 경로
  //   createRequireStoreOwner 만 JWT memberships 로 별도 검사하고 있었다(3-way drift).
  //   판정을 여기 한 곳으로 모아 정지된 회원이 매장 경로로 들어오지 못하게 한다.
  //
  //   JWT 가 아니라 DB 를 본다 — 정지는 토큰 재발급을 기다리지 않고 즉시 반영된다.
  //   serviceKey 미지정 back-compat 경로는 "어느 서비스인지" 를 결정할 수 없으므로
  //   createRequireStoreOwner 와 같은 정책(active membership 최소 1개, fail-closed)을 쓴다.
  //
  //   2026-08-24 프로덕션 실측: 활성 store_owner role 보유자 18명 전원이 같은 서비스의
  //   active membership 을 보유(kpa 5/5 · cosmetics 4/4 · glycopharm 3/3 · pharmacy-hub 6/6),
  //   suspended/withdrawn membership 0건 → 현행 사용자 동작 변화 0.
  const membershipKey = serviceKey ? resolveCanonicalServiceKey(serviceKey) : null;
  const [membershipRecord] = membershipKey
    ? await dataSource.query(
        `SELECT 1 FROM service_memberships
         WHERE user_id = $1 AND service_key = $2 AND status = 'active'
         LIMIT 1`,
        [userId, membershipKey]
      )
    : await dataSource.query(
        `SELECT 1 FROM service_memberships
         WHERE user_id = $1 AND status = 'active'
         LIMIT 1`,
        [userId]
      );

  const [raRecord] = membershipRecord
    ? await dataSource.query(
        `SELECT 1 FROM role_assignments
         WHERE user_id = $1 AND role = ANY($2::text[]) AND is_active = true
         LIMIT 1`,
        [userId, allowedRoles]
      )
    : [];
  if (!raRecord) {
    return {
      isOwner: false,
      organizationId: null,
      memberRole: '',
      resolution: { status: 'none', organizationId: null, memberRole: '', candidateCount: 0 },
    };
  }

  // WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
  //   조직 선택은 공통 해석기가 담당한다. serviceKey 가 있으면 그 서비스에 등록된
  //   조직만 후보이며, 2개 이상이면 organizationId 를 주지 않는다(임의 선택 금지).
  const resolution = await resolveStoreOrganization(dataSource, userId, serviceKey);
  return {
    isOwner: true,
    organizationId: resolution.organizationId,
    memberRole: resolution.memberRole,
    resolution,
  };
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
    // JWT memberships 직접 사용 — request 당 추가 DB query 없음.
    //
    // WO-O4O-SERVICE-MEMBERSHIP-UPSERT-STATUS-PRESERVATION-V1 (read/guard 축):
    //   back-compat 경로(serviceKey 미지정)는 membership 검증을 통째로 건너뛰고 있었다.
    //   role_assignments 의 store_owner role 만 있으면 suspended/rejected/withdrawn
    //   회원도 서비스 중립 store 라우트(store-library / store-ai / product-library /
    //   product-request / store-tablet)에 진입할 수 있었다.
    //   이 경로는 조직 해석이 서비스 중립이라 "어느 서비스의 membership 인지" 를
    //   결정할 수 없으므로, 서비스 단위 판정 대신 **active membership 최소 1개** 를
    //   요구한다 (fail-closed). 서비스 단위 정밀 판정은 serviceKey 를 넘기는
    //   호출부로의 점진 마이그레이션으로 계속 해소한다.
    if (serviceKey) {
      const membershipKey = resolveCanonicalServiceKey(serviceKey);
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
    } else {
      const memberships: { serviceKey: string; status: string }[] =
        (user as any).memberships || [];
      if (memberships.length === 0) {
        res.status(403).json({
          success: false,
          error: 'No service membership found',
          code: 'MEMBERSHIP_NOT_FOUND',
        });
        return;
      }
      if (!memberships.some((m) => m.status === 'active')) {
        res.status(403).json({
          success: false,
          error: 'No active service membership. Active membership required.',
          code: 'MEMBERSHIP_NOT_ACTIVE',
        });
        return;
      }
    }

    const { isOwner, organizationId, memberRole, resolution } = await isStoreOwner(
      dataSource,
      user.id,
      serviceKey,
    );
    // WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
    //   같은 서비스 후보가 2개 이상이면 하나를 골라 통과시키지 않는다.
    //   Pharmacy-Hub 전용 seam 과 같은 코드·같은 상태코드(409)로 응답한다.
    if (isOwner && resolution.status === 'ambiguous') {
      res.status(409).json({
        success: false,
        error: '연결된 매장이 여러 개입니다. 운영자에게 문의해 주세요.',
        code: 'AMBIGUOUS_STORE_CONNECTION',
      });
      return;
    }
    // WO-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1:
    //   organizationId 미해석(= 매장 조직 미연결) 사용자를 통과시키지 않는다.
    //   기존에는 role 만 있으면 통과 후 req.organizationId = null 이 되어 하위 핸들러가
    //   organization_id IS NULL 로 조회(0건)하거나 NOT NULL 위반으로 500 을 냈다.
    //   auth-context.middleware 의 requireStoreAuth 는 이미 동일 정책(`!isOwner || !organizationId`)이며
    //   이쪽만 어긋나 있었다. 프로덕션 실측상 kpa/glycopharm/cosmetics 의 active store_owner 는
    //   전원 조직을 보유하므로(각 5/1/2, 미보유 0) 기존 서비스 동작 변화 0.
    if (!isOwner || !organizationId) {
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
  // ambiguous 는 organizationId 가 null 이므로 자연히 차단된다(임의 선택 없음).
  const { isOwner, organizationId } = await isStoreOwner(dataSource, userId, serviceKey);
  if (isOwner) return organizationId;
  return null;
}
