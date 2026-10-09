/**
 * Neture Role Constants — SSOT
 *
 * WO-NETURE-ROLE-CONSTANTS-SEPARATION-V1
 *
 * 기존 RoleGuard.tsx 내 inline 정의를 분리한 것.
 * 기능 동작 변경 없음.
 */

import { isServiceAccessAllowed, type UserLike } from './membershipGate';

// ─── Role Strings ──────────────────────────────────────────────────────────

export const NETURE_ROLES = {
  PLATFORM_SUPER_ADMIN: 'platform:super_admin',
  ADMIN: 'neture:admin',
  OPERATOR: 'neture:operator',
  SUPPLIER: 'neture:supplier',
  SELLER: 'neture:seller',
} as const;

/**
 * Legacy 미접두사 역할 — 가입 시 접두사 없이 저장됨.
 * 후속 WO-NETURE-LEGACY-ROLE-MIGRATION-V1에서 neture: 접두사로 전환 예정.
 * 이번 작업에서는 제거하지 않고 상수로만 명시한다.
 */
export const LEGACY_ROLES = {
  SUPPLIER: 'supplier',
  SELLER: 'seller',
} as const;
// ('neture:partner' / 'partner' 는 WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1 로 은퇴)

// ─── Role Group Arrays ─────────────────────────────────────────────────────

/** Admin 역할 집합 (admin + platform:super_admin) */
export const ADMIN_ROLES: string[] = [NETURE_ROLES.ADMIN, NETURE_ROLES.PLATFORM_SUPER_ADMIN];

/**
 * Platform-level 역할 집합 (cross-service) — neture:admin 과 구분.
 * WO-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1: /admin/platform section 전용.
 * neture:admin 단독으로는 platform surface 에 접근하지 못한다(platform guard).
 */
// WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
//   legacy 'platform:admin' 제거 → platform surface 는 platform:super_admin 단독.
export const PLATFORM_ROLES: string[] = [NETURE_ROLES.PLATFORM_SUPER_ADMIN];

/**
 * platform-admin 진입점 노출 판정 — WO-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-V1.
 * neture:admin 단독은 false(platform role 아님). PLATFORM_ROLES 재사용.
 */
export function hasPlatformAdminRole(roles: string[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => PLATFORM_ROLES.includes(r));
}

/** Operator route guard 역할 집합 */
export const OPERATOR_ROLES: string[] = [NETURE_ROLES.OPERATOR];

/**
 * Operator-or-above 역할 집합 — UI 가시성 체크용.
 * operator + admin + platform:super_admin
 */
export const OPERATOR_OR_ABOVE_ROLES: string[] = [
  NETURE_ROLES.OPERATOR,
  NETURE_ROLES.ADMIN,
  NETURE_ROLES.PLATFORM_SUPER_ADMIN,
];

/**
 * Supplier route guard 역할 집합.
 * legacy 미접두사(supplier/seller) 포함 — SupplierRoute는 B2B 전체 커버.
 */
export const SUPPLIER_ROLES: string[] = [
  NETURE_ROLES.SUPPLIER,
  LEGACY_ROLES.SUPPLIER,
  LEGACY_ROLES.SELLER,
];

/** Supplier-only 역할 집합 — UI 가시성용 (isSupplier 체크) */
export const SUPPLIER_ONLY_ROLES: string[] = [NETURE_ROLES.SUPPLIER, LEGACY_ROLES.SUPPLIER];

/** Supplier 레이아웃 접근 역할 (supplier + admin) */
export const SUPPLIER_ACCESS_ROLES: string[] = [
  NETURE_ROLES.SUPPLIER,
  LEGACY_ROLES.SUPPLIER,
  NETURE_ROLES.ADMIN,
  NETURE_ROLES.PLATFORM_SUPER_ADMIN,
];

/** Supplier Hub 접근 역할 (supplier + admin) */
export const SUPPLIER_HUB_ACCESS_ROLES: string[] = [
  NETURE_ROLES.ADMIN,
  NETURE_ROLES.PLATFORM_SUPER_ADMIN,
  NETURE_ROLES.SUPPLIER,
  LEGACY_ROLES.SUPPLIER,
];

/** Dashboard B2B 역할 — legacy 미접두사 (AccountMenu hasDashboardRole 체크용) */
export const DASHBOARD_B2B_ROLES: string[] = [
  LEGACY_ROLES.SUPPLIER,
  LEGACY_ROLES.SELLER,
];

// ─── 서브도메인 운영자 범위 (supplier · funding · community) ────────────────────
//
// WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — 배포 2 전 경계 보정.
//   백엔드는 세 서브도메인 영역의 운영자 경계를 `neture:*` 에서 독립 키로 옮겼다
//   (`requireSupplierScope` · `requireFundingScope` · `requireCommunityServiceScope`).
//   화면 가드가 여전히 `neture:*` + neture membership 을 요구하면 새 역할만 가진 운영자는
//   자기 화면에 못 들어오고, 새 역할이 없는 Neture 관리자는 화면에 들어와 API 403 만 본다.
//   아래 값은 백엔드 `subdomain-operator-scope.ts` 의 scopeRoleMapping 과 같은 의미다:
//     `{key}:operator` ← operator · admin      `{key}:admin` ← admin
//   `platform:super_admin` 은 백엔드 platformBypass 와 같이 통과한다.
//   `community` 도 Admin/Operator 계층을 사용하며 개체 운영 권한과는 구분한다.
//   Neture 역할(`neture:admin` · `neture:operator`)은 **포함하지 않는다** — 다른 축이다.

export type SubdomainOperatorKey = 'supplier' | 'funding' | 'community';
export type SubdomainOperatorLevel = 'admin' | 'operator';

export function subdomainOperatorRoles(key: SubdomainOperatorKey, level: SubdomainOperatorLevel): string[] {
  if (level === 'operator') {
    return [`${key}:operator`, `${key}:admin`, NETURE_ROLES.PLATFORM_SUPER_ADMIN];
  }
  return [`${key}:admin`, NETURE_ROLES.PLATFORM_SUPER_ADMIN];
}

/**
 * 서브도메인 운영자 경계가 걸린 화면 경로 — 가드 · 메뉴 노출 · 대표 홈 진입이 같은 표를 본다.
 *   supplier  `/admin/supplier-governance`  ← `/api/v1/neture/admin/suppliers*` (supplier:admin)
 *   supplier  `/operator/suppliers`          ← `/api/v1/neture/operator/suppliers*` (supplier:operator)
 *   funding   `/operator/market-trial`       ← `/api/v1/neture/operator/market-trial/*` (funding:operator)
 *   community `/admin/communities`           ← `/api/v1/communities/requests*` · `/communities/admin/communities*` (community:admin)
 */
export const SUBDOMAIN_OPERATOR_SCREENS: ReadonlyArray<{
  path: string;
  key: SubdomainOperatorKey;
  level: SubdomainOperatorLevel;
}> = Object.freeze([
  { path: '/admin/supplier-governance', key: 'supplier', level: 'admin' },
  // 승인·거절 canonical. governance 만 옮기면 supplier 운영자가 목록은 보고 승인은 못 한다.
  { path: '/operator/suppliers', key: 'supplier', level: 'operator' },
  { path: '/operator/market-trial', key: 'funding', level: 'operator' },
  // 개설 심사 · 개별 커뮤니티 운영자 지정 — Admin 전용 지정 업무는 이 화면에서 수행한다.
  { path: '/admin/communities', key: 'community', level: 'admin' },
  { path: '/operator/communities', key: 'community', level: 'operator' },
  { path: '/operator/service-members/supplier', key: 'supplier', level: 'operator' },
  { path: '/operator/service-members/funding', key: 'funding', level: 'operator' },
  { path: '/operator/service-members/community', key: 'community', level: 'operator' },
]);

const hasAny = (roles: readonly string[] | undefined | null, allowed: string[]) =>
  (roles ?? []).some((r) => allowed.includes(r));

/** 화면 진입 판정에 필요한 사용자 정보 — 역할과 서비스 membership. */
export type SubdomainOperatorViewer = UserLike | null | undefined;

/**
 * 메뉴 항목 경로가 서브도메인 운영자 화면이면 **`SubdomainOperatorRoute` 와 같은 조건**일 때만 true:
 *   범위 역할(`{key}:{level}`, admin ⊃ operator) **그리고** 그 서비스 membership active.
 *   `platform:super_admin` 은 membership 없이 통과(MembershipGate · 백엔드 platformBypass 와 같음).
 * 역할만 남고 membership 이 없거나 pending · suspended 인 계정은 route 에서 막히므로 링크도 숨긴다.
 * 그 밖의 경로는 이 함수가 판정하지 않는다(true) — 기존 메뉴 규칙 그대로.
 */
export function canSeeSubdomainOperatorPath(viewer: SubdomainOperatorViewer, path: string): boolean {
  if (path === '/admin/semi-franchises' || path.startsWith('/admin/semi-franchises/')) return !!viewer?.roles?.includes('platform:super_admin');
  const screen = SUBDOMAIN_OPERATOR_SCREENS.find((s) => path === s.path || path.startsWith(`${s.path}/`));
  if (!screen) return true;
  return hasAny(viewer?.roles, subdomainOperatorRoles(screen.key, screen.level)) && isServiceAccessAllowed(viewer, screen.key);
}

/**
 * 사이드바 메뉴에서 **범위 역할이 없는** 서브도메인 운영자 화면 항목을 뺀다.
 * 빈 그룹은 남기지 않는다(`filterMenuByRole` 과 같은 규칙).
 */
export function withoutUnreachableSubdomainOperatorItems<T extends { path: string }>(
  menu: Partial<Record<string, T[]>>,
  viewer: SubdomainOperatorViewer,
): Partial<Record<string, T[]>> {
  const out: Partial<Record<string, T[]>> = {};
  for (const [group, items] of Object.entries(menu)) {
    const visible = (items ?? []).filter((item) => canSeeSubdomainOperatorPath(viewer, item.path));
    if (visible.length > 0) out[group] = visible;
  }
  return out;
}

/**
 * 대시보드 카드 · 대기열 · 바로가기처럼 **링크를 가진 항목** 에서 범위 역할이 없는
 * 서브도메인 운영자 화면으로 가는 항목을 뺀다. 링크 필드(`link` · `actionUrl` · `href`) 중
 * 하나라도 닿을 수 없는 화면이면 뺀다. 링크가 없는 항목은 그대로 둔다.
 */
export function withoutUnreachableSubdomainOperatorLinks<
  T extends { link?: string; actionUrl?: string; href?: string },
>(items: readonly T[] | undefined | null, viewer: SubdomainOperatorViewer): T[] {
  return (items ?? []).filter((item) =>
    [item.link, item.actionUrl, item.href].every((p) => !p || canSeeSubdomainOperatorPath(viewer, p)),
  );
}
