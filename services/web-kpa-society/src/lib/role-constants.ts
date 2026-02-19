/**
 * KPA Society Role Constants
 * WO-KPA-ROLE-SIMPLIFICATION-PHASE1-V1
 *
 * 모든 role 문자열의 단일 진실 원천 (Single Source of Truth).
 * Guard/Component에서 하드코딩 대신 이 상수를 import.
 */

// ─── 개별 Role ─────────────────────────────────
export const ROLES = {
  // 플랫폼 공통
  KPA_ADMIN: 'kpa:admin',
  KPA_OPERATOR: 'kpa:operator',

  // KPA-a 커뮤니티
  KPA_PHARMACIST: 'kpa:pharmacist',
  KPA_STUDENT: 'kpa:student',

  // KPA-c 분회 서비스
  KPA_C_BRANCH_ADMIN: 'kpa-c:branch_admin',
  KPA_C_OPERATOR: 'kpa-c:operator',

  // KPA-b 레거시/데모 (격리, 제거 예정)
  KPA_DISTRICT_ADMIN: 'kpa:district_admin',
  KPA_BRANCH_ADMIN: 'kpa:branch_admin',
  KPA_BRANCH_OPERATOR: 'kpa:branch_operator',

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

/** KPA-c 분회 서비스 역할 */
export const BRANCH_ROLES = [
  ROLES.KPA_C_BRANCH_ADMIN,
  ROLES.KPA_C_OPERATOR,
] as const;

/** 인트라넷 접근 = 플랫폼 + 분회 */
export const INTRANET_ROLES: readonly string[] = [
  ...PLATFORM_ROLES,
  ...BRANCH_ROLES,
];

/** 직능 선택 면제 역할 = 플랫폼 + 분회 + 학생 */
export const FUNCTION_GATE_EXEMPT_ROLES: readonly string[] = [
  ...PLATFORM_ROLES,
  ...BRANCH_ROLES,
  ROLES.KPA_STUDENT,
];

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
