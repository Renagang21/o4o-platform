/**
 * Service Membership — DB 기반 접근 판정 SSOT
 *
 * WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1
 *
 * canonical contract:
 *   membership = "이 서비스에 들어갈 수 있느냐" / role = "그 안에서 무엇을 할 수 있느냐"
 *
 * 기존에는 이 판정이 세 갈래로 흩어져 있었다.
 *   1. `common/middleware/membership-guard.middleware.ts` — JWT 스냅샷 (`user.memberships`)
 *   2. `utils/store-owner.utils.ts` `isStoreOwner()` — DB (inline SQL)
 *   3. signage / serviceScope / auth-helpers — 검사 없음 (role only)
 *
 * JWT 스냅샷은 **정지 즉시성이 0** 이다(토큰 만료까지 통과). 그래서 판정 정본은 DB 이고,
 * 이 파일이 그 질의의 단일 지점이다. serviceKey 는 항상 `@o4o/security-core` 의
 * `resolveCanonicalServiceKey` 로 정규화한 뒤 `service_memberships.service_key` 와 맞춘다
 * (로컬 매핑 상수 금지 — 4-way drift 재발 방지).
 */

import type { DataSource } from 'typeorm';
import { resolveCanonicalServiceKey } from '@o4o/security-core';

/**
 * `service_memberships` 의 canonical status 집합.
 * 'active' 만 접근 성립. 'suspended' / 'rejected' / 'withdrawn' / 'pending' 은 모두 차단이며
 * 서비스별로 재해석하지 않는다 (특히 suspended ≠ rejected — 경로를 섞지 않는다).
 */
export type ServiceMembershipStatus =
  | 'active'
  | 'pending'
  | 'rejected'
  | 'suspended'
  | 'withdrawn'
  | 'none';

/**
 * 해당 serviceKey 의 membership status 를 DB 에서 읽는다.
 *
 * - row 없음 → 'none'
 * - 알 수 없는 legacy status → 'none' (보수적 차단 — frontend membershipGate 와 동일 fallback)
 */
export async function getServiceMembershipStatusFromDb(
  dataSource: DataSource,
  userId: string,
  serviceKey: string,
): Promise<ServiceMembershipStatus> {
  if (!userId || !serviceKey) return 'none';
  const membershipKey = resolveCanonicalServiceKey(serviceKey);
  const rows = await dataSource.query(
    `SELECT status FROM service_memberships
     WHERE user_id = $1 AND service_key = $2
     LIMIT 1`,
    [userId, membershipKey],
  );
  const status = rows?.[0]?.status;
  switch (status) {
    case 'active':
    case 'pending':
    case 'rejected':
    case 'suspended':
    case 'withdrawn':
      return status;
    default:
      return 'none';
  }
}

/**
 * 해당 serviceKey 에 **active membership** 이 있는가.
 *
 * fail-closed: DB 오류는 통과가 아니라 차단이다(`isStoreOwner()` 와 동일 정책).
 */
export async function hasActiveServiceMembership(
  dataSource: DataSource,
  userId: string,
  serviceKey: string,
): Promise<boolean> {
  try {
    return (await getServiceMembershipStatusFromDb(dataSource, userId, serviceKey)) === 'active';
  } catch {
    return false;
  }
}
