/**
 * KPA Branch Service Identity (SSOT — 프론트엔드)
 *
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * SERVICE_KEY 는 backend 의 다음 축과 동일한 값이어야 한다:
 *   - SERVICE_KEYS.KPA_BRANCH             (apps/api-server/src/constants/service-keys.ts)
 *   - O4O_SERVICES[].key = 'kpa-branch'   (apps/api-server/src/config/service-catalog.ts)
 *   - service_memberships.service_key     (서비스 접근 축)
 *   - role prefix 'kpa-branch:'           (role_assignments 축, self-map)
 *
 * 주의: 분회 식별자는 이 파일에 들어오지 않는다.
 *   "어느 분회인가"는 URL(/:branchSlug) 또는 Host 로만 결정되고,
 *   "그 분회에 속하는가"는 backend 의 branch_memberships 가 판정한다.
 */

export const SERVICE_KEY = 'kpa-branch' as const;

export const BRAND = {
  name: 'KPA Branch',
  nameKo: '약사회 분회',
  domain: 'branch.kpa-society.co.kr',
  tagline: '분회별 홈페이지와 회원 소속을 한 곳에서',
} as const;

export const ROLES = {
  admin: `${SERVICE_KEY}:admin`,
  operator: `${SERVICE_KEY}:operator`,
  member: `${SERVICE_KEY}:member`,
} as const;

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.admin]: '서비스 관리자',
  [ROLES.operator]: '분회 운영자',
  [ROLES.member]: '분회 회원',
};

/**
 * 역할 계층.
 * backend `KPA_BRANCH_SCOPE_CONFIG.scopeRoleMapping`
 * (`apps/api-server/src/middleware/kpa-branch-scope.middleware.ts`) 와 **같은 표**여야 한다.
 * 프론트가 더 넓으면 화면은 열리고 API 는 403, 더 좁으면 권한이 있는데도 막힌다.
 */
export const ROLE_SCOPE_MAPPING: Record<string, readonly string[]> = {
  [ROLES.admin]: [ROLES.admin],
  [ROLES.operator]: [ROLES.operator, ROLES.admin],
  [ROLES.member]: [ROLES.member, ROLES.operator, ROLES.admin],
};

/** 보유 역할이 요구 역할을 만족하는가 (계층 포함) */
export function satisfiesRole(userRoles: readonly string[], requiredRole: string): boolean {
  const accepted = ROLE_SCOPE_MAPPING[requiredRole] ?? [requiredRole];
  return userRoles.some((r) => accepted.includes(r));
}
