/**
 * Role Revoke Safety — 서비스 역할 해제 안전 판정 (WO-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1)
 *
 * 중앙 관리자 `/operators` 의 역할 해제 경로가 지켜야 하는 두 가지 안전 계약의 판정부다.
 *
 *   1) 마지막 활성 서비스 admin 해제 차단
 *   2) 요청자가 자기 자신의 역할을 해제하는 행위 차단
 *
 * 배경: Neture 전용 `/admin/operators` 백엔드에만 있던 보호를
 *   (`neture.controller.ts` LAST_ADMIN_PROTECTED / self-deactivation)
 *   중앙 경로로 이식하면서, Neture 고정 문자열 대신 서비스 공통 규칙으로 일반화했다.
 *
 * 판정 기준(서비스 admin):
 *   role 이름이 `{serviceKey}:admin` 형태이고 serviceKey 가 'platform' 이 아닐 때.
 *   - 포함: kpa:admin · neture:admin · glycopharm:admin · cosmetics:admin ·
 *           pharmacy-hub:admin · glucoseview:admin (roles.role_key = 'admin')
 *   - 제외: kpa:district_admin · kpa:branch_admin — `is_admin_role=true` 이지만
 *           서비스 단위 관리자가 아니다. `_admin` 접미사는 `:admin` 과 다르므로
 *           문자열 규칙만으로 정확히 갈린다.
 *   - 제외: platform:super_admin(별도 SUPER_ADMIN_ROLE_PROTECTED 로 이미 차단) ·
 *           platform:admin(deprecated, 서비스 admin 아님) — 기존 동작을 바꾸지 않는다.
 *
 * roles 테이블 조회 대신 문자열 규칙을 쓰는 이유: 해제 경로에서 카탈로그 조회가 실패했을 때
 * 보호가 조용히 열리는(fail-open) 경로를 만들지 않기 위해서다. 명명 규약은
 * `20260318100000-ExtendRolesTable.ts` 의 seed 가 정본이다.
 */

/** `{serviceKey}:admin` — serviceKey 는 소문자/숫자/하이픈 */
const SERVICE_ADMIN_ROLE_PATTERN = /^([a-z0-9][a-z0-9-]*):admin$/;

/** 서비스 admin 판정에서 제외하는 prefix (플랫폼 거버넌스 역할) */
const NON_SERVICE_PREFIXES = new Set(['platform']);

/**
 * 서비스 admin 역할이면 serviceKey 를, 아니면 null 을 반환한다.
 */
export function getServiceAdminRoleServiceKey(role: unknown): string | null {
  if (typeof role !== 'string') return null;
  const matched = SERVICE_ADMIN_ROLE_PATTERN.exec(role);
  if (!matched) return null;
  const serviceKey = matched[1];
  if (NON_SERVICE_PREFIXES.has(serviceKey)) return null;
  return serviceKey;
}

/** 서비스 admin 역할 여부 */
export function isServiceAdminRole(role: unknown): boolean {
  return getServiceAdminRoleServiceKey(role) !== null;
}

export const SELF_ROLE_REVOKE_FORBIDDEN_CODE = 'SELF_ROLE_REVOKE_FORBIDDEN';
export const SELF_ROLE_REVOKE_FORBIDDEN_MESSAGE =
  '자기 자신의 역할은 해제할 수 없습니다. 다른 관리자에게 요청하세요.';

export const LAST_ADMIN_PROTECTED_CODE = 'LAST_ADMIN_PROTECTED';
export function lastAdminProtectedMessage(role: string): string {
  return `마지막 활성 '${role}' 관리자는 해제할 수 없습니다. 다른 관리자를 먼저 지정하세요.`;
}
