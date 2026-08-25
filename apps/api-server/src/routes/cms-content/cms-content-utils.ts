/**
 * CMS Content Utilities — Shared types and constants
 *
 * WO-O4O-CMS-CONTENT-ROUTES-SPLIT-V1
 * Extracted from cms-content.routes.ts
 */

import {
  resolveCanonicalServiceKey,
  resolveRolePrefixFromCanonicalServiceKey,
} from '@o4o/security-core';

// WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: local type aliases (matches CmsContent entity)
export type ContentAuthorRole = 'admin' | 'service_admin' | 'supplier' | 'community';
export type ContentVisibilityScope = 'platform' | 'service' | 'organization';

// Supported content types — used in POST and PUT validation
export const VALID_CONTENT_TYPES = ['hero', 'notice', 'guide', 'knowledge'] as const;

// ============================================================================
// WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1
//
// CHECK-…-V1 §5 판정: **`serviceKey` 가 read 경계다** (B. service-public).
//   `visibilityScope` 는 서비스 **내부의 제작 주체 축**(`authorRole` 과 같은 불리언에서 파생)이지
//   cross-service 공개 축이 아니다. 따라서 `/api/v1/cms/*` 공통 read 가
//   `serviceKey` 없이 전 서비스를 반환하던 동작은 정책상 정당화되지 않는다.
//
// 아래 helper 가 그 계약의 단일 구현이다 (§6 계약표 / §11-1 구현 1·3·4).
// ============================================================================

/**
 * serviceKey alias 집합 — **CMS 전용 mapping 을 만들지 않는다** (WO §9·§10).
 *
 * `cms_contents.serviceKey` 는 같은 서비스를 canonical 값과 role-prefix 값 두 가지로
 * 기록해 왔다 (프로덕션 실측: `kpa-society` 53건 + legacy `kpa` 1건).
 * 그 대응은 이미 `@o4o/security-core` 의 canonical SSOT 가 갖고 있으므로
 * **양방향 resolver 를 합성**해서 파생시킨다. 여기서 `{ 'kpa-society': [...] }` 같은
 * 로컬 map 을 새로 선언하면 SSOT 가 두 벌이 된다 (security-core §Drift prevention).
 *
 *   'kpa' | 'kpa-society'         → ['kpa-society', 'kpa']
 *   'cosmetics' | 'k-cosmetics'   → ['k-cosmetics', 'cosmetics']
 *   'neture' | 'glycopharm' | 'pharmacy-hub' → 자기 자신 1개 (self-map)
 */
export function resolveCmsServiceKeys(serviceKey: string): string[] {
  const rolePrefix = resolveRolePrefixFromCanonicalServiceKey(serviceKey);
  const canonical = resolveCanonicalServiceKey(rolePrefix);
  return canonical === rolePrefix ? [canonical] : [canonical, rolePrefix];
}

/**
 * WO-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1
 *
 * CMS `serviceKey` 축(canonical `kpa-society` / legacy role-prefix `kpa`)을 **canonical 한 벌**로
 * 접는다. read 측 {@link resolveCmsServiceKeys} 와 **같은 security-core 왕복**을 쓴다 —
 * `if (serviceKey === 'kpa-society') ...` 같은 CMS 로컬 분기를 만들지 않는다 (WO §8 금지).
 *
 *   'kpa' | 'kpa-society'       → 'kpa-society'
 *   'cosmetics' | 'k-cosmetics' → 'k-cosmetics'
 *   'glycopharm' | 'pharmacy-hub' | 'neture' → 자기 자신 (self-map)
 */
export function canonicalizeCmsServiceKey(serviceKey: string): string {
  return resolveCanonicalServiceKey(resolveRolePrefixFromCanonicalServiceKey(serviceKey));
}

/**
 * CMS `serviceKey` 에 대응하는 **role prefix** 를 돌려준다.
 *
 * mutation 인가가 `${serviceKey}:operator` 를 그대로 조립하면 KPA 는
 * role scope(`kpa`) 와 CMS service key(`kpa-society`) 축이 달라 항상 어긋난다
 * (§7 실측 403 원인). role 축으로 접어서 비교한다.
 *
 *   'kpa-society' | 'kpa'       → 'kpa'
 *   'k-cosmetics' | 'cosmetics' → 'cosmetics'
 */
export function resolveCmsRolePrefix(serviceKey: string): string {
  return resolveRolePrefixFromCanonicalServiceKey(serviceKey);
}

/**
 * 두 `serviceKey` 문자열이 **같은 canonical service** 를 가리키는지 판정한다.
 * `'kpa' === 'kpa-society'` 같은 alias 쌍을 문자열 동등성으로 비교하지 않기 위한 계약.
 */
export function isSameCmsService(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return a === b || (!a && !b);
  return canonicalizeCmsServiceKey(a) === canonicalizeCmsServiceKey(b);
}

/** platform admin 판정 근거 — mutation 측 `authorizeCmsMutation` 과 **동일한 근거**를 쓴다. */
export const CMS_PLATFORM_ADMIN_ROLES = ['platform:super_admin'];

export interface CmsRoleChecker {
  hasAnyRole(userId: string, roles: string[]): Promise<boolean>;
}

/**
 * JWT payload roles 를 먼저 보고, 없으면 RoleAssignment 테이블로 폴백한다.
 * (mutation handler 가 쓰던 절차를 그대로 공유한다 — 근거를 두 벌로 만들지 않는다.)
 */
export async function isCmsPlatformAdmin(
  user: { id: string; roles?: string[] } | undefined,
  roleChecker: CmsRoleChecker,
  onError?: (message: string) => void,
): Promise<boolean> {
  if (!user) return false;
  const jwtRoles: string[] = user.roles || [];
  if (jwtRoles.some((r) => CMS_PLATFORM_ADMIN_ROLES.includes(r))) return true;
  try {
    return await roleChecker.hasAnyRole(user.id, CMS_PLATFORM_ADMIN_ROLES);
  } catch (err) {
    onError?.((err as Error).message);
    return false;
  }
}

/** read scope 판정 결과. */
export type CmsReadScope =
  | { ok: true; crossService: true; serviceKeys: null }
  | { ok: true; crossService: false; serviceKeys: string[] }
  | { ok: false };

/**
 * 공통 CMS read 경계를 판정한다 (CHECK §6).
 *
 *   serviceKey 주어짐            → 항상 그 서비스(+alias)로 제한. platform admin 도 동일하게 제한된다.
 *   serviceKey 없음 + PLATFORM_ADMIN → cross-service 유지. **역할 근거**로 허용하며
 *                                   "파라미터 생략 = 관리자 모드" 로 구현하지 않는다.
 *   serviceKey 없음 + 그 외      → 거부. ANONYMOUS·SERVICE_MEMBER 는 serviceKey 가 필요하다.
 */
export async function resolveCmsReadScope(args: {
  user: { id: string; roles?: string[] } | undefined;
  serviceKey: unknown;
  roleChecker: CmsRoleChecker;
  onError?: (message: string) => void;
}): Promise<CmsReadScope> {
  const { user, serviceKey, roleChecker, onError } = args;

  if (typeof serviceKey === 'string' && serviceKey.trim()) {
    return { ok: true, crossService: false, serviceKeys: resolveCmsServiceKeys(serviceKey.trim()) };
  }

  if (await isCmsPlatformAdmin(user, roleChecker, onError)) {
    return { ok: true, crossService: true, serviceKeys: null };
  }

  return { ok: false };
}

/** serviceKey 누락 거부 응답 (query handler 계열 envelope). */
export const CMS_SERVICE_KEY_REQUIRED_ERROR = {
  success: false as const,
  error: {
    code: 'SERVICE_KEY_REQUIRED',
    message: 'serviceKey is required for CMS read access',
  },
};
