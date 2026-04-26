/**
 * KPA Society Role Constants
 * WO-KPA-ROLE-SIMPLIFICATION-PHASE1-V1
 * WO-KPA-C-ROLE-SYNC-NORMALIZATION-V1: kpa-c:* 제거 — KpaMember.role이 SSOT
 *
 * 모든 role 문자열의 단일 진실 원천 (Single Source of Truth).
 * Guard/Component에서 하드코딩 대신 이 상수를 import.
 *
 * kpa-c:branch_admin / kpa-c:operator는 User.roles[]에서 제거됨.
 * 조직 역할은 KpaMember.role (member | operator | admin)로 관리.
 */

// ─── 개별 Role ─────────────────────────────────
export const ROLES = {
  // 플랫폼 공통
  KPA_ADMIN: 'kpa:admin',
  KPA_OPERATOR: 'kpa:operator',

  // WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1
  KPA_STORE_OWNER: 'kpa:store_owner',

  // 플랫폼 Super
  PLATFORM_ADMIN: 'platform:admin',
  PLATFORM_OPERATOR: 'platform:operator',
  PLATFORM_SUPER_ADMIN: 'platform:super_admin',
  SUPER_OPERATOR: 'super_operator',
} as const;

// ─── 그룹 ──────────────────────────────────────

/** 플랫폼 관리/운영 (kpa:admin + kpa:operator) */
export const PLATFORM_ROLES = [
  ROLES.KPA_ADMIN,
  ROLES.KPA_OPERATOR,
] as const;

/** 인트라넷 접근 = 플랫폼 역할 (분회 역할은 membershipRole로 체크) */
export const INTRANET_ROLES: readonly string[] = [
  ...PLATFORM_ROLES,
];

/**
 * 직능 선택 면제 역할 = 플랫폼 역할만.
 * WO-KPA-A-ROLE-CLEANUP-V1: KPA_STUDENT 제거 — membershipType 기반 판정으로 전환.
 * isActivityTypeExempt()에서 membershipType === 'student' 으로 판정.
 */
export const FUNCTION_GATE_EXEMPT_ROLES: readonly string[] = [
  ...PLATFORM_ROLES,
];

/** WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1: store owner 역할 */
export const STORE_OWNER_ROLES = [
  ROLES.KPA_STORE_OWNER,
] as const;

/** Super Operator 감지용 (Header) */
export const SUPER_OPERATOR_ROLES = [
  ROLES.PLATFORM_OPERATOR,
  ROLES.SUPER_OPERATOR,
  ROLES.PLATFORM_ADMIN,
] as const;

/** Dashboard Switcher: 관리자 계열 전체 */
export const DASHBOARD_ADMIN_ROLES: readonly string[] = [
  ...PLATFORM_ROLES,
  ROLES.PLATFORM_ADMIN,
  ROLES.PLATFORM_OPERATOR,
  ROLES.PLATFORM_SUPER_ADMIN,
  ROLES.SUPER_OPERATOR,
];

// ─── 헬퍼 ──────────────────────────────────────

/** user.roles 배열에 지정 그룹의 role이 하나라도 있는지 */
export function hasAnyRole(userRoles: string[], group: readonly string[]): boolean {
  return userRoles.some(r => group.includes(r));
}

/**
 * WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1
 * 직능 선택 면제 판정 — 단일 진입점
 * admin, operator, student → 직능 선택 불필요
 */
export function isActivityTypeExempt(
  roles: string[],
  _membershipRole?: string,
  membershipType?: string,
): boolean {
  if (hasAnyRole(roles, FUNCTION_GATE_EXEMPT_ROLES)) return true;
  if (membershipType === 'student') return true;
  return false;
}
