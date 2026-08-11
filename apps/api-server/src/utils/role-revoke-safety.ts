/**
 * Role Revoke Safety — 서비스 역할 해제 안전 판정 (WO-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1)
 *
 * 중앙 관리자 `/operators` 의 역할 해제 경로가 지켜야 하는 두 가지 안전 계약의 판정부다.
 *
 *   1) 마지막 활성 서비스 admin 해제 차단
 *   2) 요청자가 자기 자신의 역할을 해제하는 행위 차단
 *
 * 배경: Neture 전용 `/admin/operators` 백엔드(WO-O4O-NETURE-LEGACY-ADMIN-OPERATOR-API-RETIREMENT-V1 로 은퇴됨)에만 있던 보호를
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 서비스 admin 해제 — 잠금 기반 실행부
 * WO-O4O-MEMBERSHIP-CONSOLE-ROLE-REVOKE-SAFETY-GUARDS-V1
 *
 * 판정과 실행을 **한 트랜잭션 안에서** 수행한다. 같은 role 의 활성 assignment 전체를
 * `FOR UPDATE` 로 잠근 뒤 보유자 집합을 평가하므로, 두 요청이 동시에 마지막 두 admin 을
 * 해제하려 해도 뒤의 요청은 선행 커밋 이후 잠금을 얻고 WHERE 재평가에서 대상이 탈락한다
 * (READ COMMITTED).
 *
 * 두 해제 경로(중앙 `AdminUserController.revokeRoleAssignment` ·
 * `MembershipConsoleController.removeMemberRole`)가 같은 구현을 쓰도록 여기에 둔다.
 * 판정 규칙이 한쪽만 바뀌는 drift 를 막는 것이 목적이다.
 *
 * 이 함수는 **서비스 admin 역할에만** 쓴다(`getServiceAdminRoleServiceKey` 로 먼저 판정).
 * 캐시 무효화·응답 생성·감사 로그는 호출부 책임이다 — 경로마다 계약이 다르기 때문이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 최소 계약만 요구한다(테스트 주입 가능) */
export interface RoleRevokeTxRunner {
  transaction<T>(runInTransaction: (manager: { query: (sql: string, params?: unknown[]) => Promise<any> }) => Promise<T>): Promise<T>;
}

export type ServiceAdminRevokeOutcome =
  /** 대상 사용자가 해당 role 의 활성 보유자가 아니다 */
  | { status: 'not_holder' }
  /** 대상 사용자가 마지막 활성 admin 이다 — 해제하지 않았다 */
  | { status: 'last_admin' }
  /** 해제했다 */
  | { status: 'revoked'; affected: number };

export async function revokeServiceAdminRoleWithLock(
  runner: RoleRevokeTxRunner,
  userId: string,
  role: string
): Promise<ServiceAdminRevokeOutcome> {
  return runner.transaction(async (manager) => {
    const holders: Array<{ user_id: string }> = await manager.query(
      `SELECT user_id FROM role_assignments
             WHERE role = $1 AND is_active = true
             FOR UPDATE`,
      [role]
    );
    const holderIds = holders.map((h) => h.user_id);

    if (!holderIds.includes(userId)) {
      return { status: 'not_holder' as const };
    }
    // 비활성 assignment 는 is_active = true 필터로 이미 제외된다.
    // 다른 서비스의 admin 은 role 문자열이 다르므로 애초에 집합에 들어오지 않는다.
    if (holderIds.filter((id) => id !== userId).length === 0) {
      return { status: 'last_admin' as const };
    }

    const txResult = await manager.query(
      `UPDATE role_assignments SET is_active = false, updated_at = NOW()
             WHERE user_id = $1 AND role = $2 AND is_active = true`,
      [userId, role]
    );
    return { status: 'revoked' as const, affected: txResult?.[1] ?? 0 };
  });
}
