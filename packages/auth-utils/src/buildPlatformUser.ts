/**
 * buildPlatformUser — API 응답에서 표준 플랫폼 사용자 객체 생성
 *
 * WO-O4O-AUTH-STATUS-RUNTIME-CANONICALIZATION-V1:
 * Neture / K-Cosmetics AuthContext에서 반복되던 패턴을 단일 함수로 통합:
 *   const roles = extractRoles(apiUser);
 *   const base = normalizeUser(apiUser);
 *   const memberships = (apiUser as any).memberships || [];
 *   setUser({ ...base, roles, memberships });
 *
 * GlycoPharm / KPA 는 서비스별 User 구조가 달라 normalizeMemberships 만 사용.
 *
 * 미포함:
 *   - 서비스별 추가 필드 (nickname, isStoreOwner, activityType 등)
 *   - KPA kpaMembership 필드
 *   - redirect/login UI 로직
 */

import type { ApiUser } from './types.js';
import { normalizeUser } from './normalizeUser.js';
import { extractRoles } from './extractRoles.js';
import { normalizeMemberships } from './membershipGate.js';
import type { MembershipLike } from './membershipGate.js';

/** buildPlatformUser 반환 타입 — 4개 서비스 공통 최소 User 구조 */
export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  status: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
  roles: string[];
  memberships: MembershipLike[];
}

/**
 * API 응답 user 객체에서 표준 플랫폼 사용자 객체 생성.
 *
 * @param apiUser - /auth/me 또는 /auth/login 응답에서 parseAuthResponse()로 추출한 user 객체
 */
export function buildPlatformUser(apiUser: ApiUser): PlatformUser {
  return {
    ...normalizeUser(apiUser),
    roles: extractRoles(apiUser),
    memberships: normalizeMemberships(apiUser),
  };
}
