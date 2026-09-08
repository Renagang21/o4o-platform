/**
 * route → workspace 매핑 (Neture)
 *
 * WO-O4O-WORK-SCOPE-CONTRACT-V0 §10
 *
 * WO 의 예상 매핑을 최신 main 의 실제 route 트리(services/web-neture/src/App.tsx)에
 * 대조해 확정한 것이다. route 와 workspace 는 1:1 이 아니다:
 *
 *   `/seller/*`         → store    (store_owner 대시보드. NETURE_DASHBOARD_MAP 이
 *                                   store_owner → '/seller/overview' 로 보낸다)
 *   `/admin-vault`      → admin    (ProtectedRoute allowedRoles={ADMIN_ROLES})
 *   `/account/supplier` → supplier (SupplierRoute 가 그대로 걸려 있는 legacy redirect 트리)
 *   `/account/partner`  → partner  (PartnerAccountLayout = PARTNER_ACCESS_ROLES)
 *
 * 매핑에 없는 경로는 전부 'home' 으로 떨어진다(보수적 기본값).
 * `/guide/*` `/forum/*` `/market-trial/*` 같은 공개 페이지는 **업무 축이 아니므로**
 * 별도 workspace 를 만들지 않는다.
 *
 * `/workspace/*` 를 의도적으로 매핑하지 않는다 — SupplierOpsLayout 에 role guard 가
 * 없어(무게이트) operator/admin 축으로 올리면 실제 강제보다 넓게 주장하게 된다.
 */

import type { Workspace } from './types';

interface RouteRule {
  /** 경로 접두사. 세그먼트 단위로만 일치시킨다(`/admin-vault` 가 `/admin` 에 걸리지 않도록). */
  prefix: string;
  workspace: Workspace;
}

/**
 * 세그먼트 수가 많은(더 구체적인) 규칙이 먼저 오도록 정렬해 사용한다.
 * 선언 순서에 의존하지 않는다.
 */
const ROUTE_RULES: readonly RouteRule[] = [
  { prefix: '/account/supplier', workspace: 'supplier' },
  { prefix: '/account/partner', workspace: 'partner' },
  { prefix: '/admin-vault', workspace: 'admin' },
  { prefix: '/admin', workspace: 'admin' },
  { prefix: '/operator', workspace: 'operator' },
  { prefix: '/supplier', workspace: 'supplier' },
  { prefix: '/partner', workspace: 'partner' },
  { prefix: '/store', workspace: 'store' },
  { prefix: '/seller', workspace: 'store' },
  { prefix: '/community', workspace: 'community' },
];

const SORTED_RULES: readonly RouteRule[] = [...ROUTE_RULES].sort(
  (a, b) => b.prefix.split('/').length - a.prefix.split('/').length,
);

/** 기본 workspace — 매핑되지 않은 모든 경로. */
export const DEFAULT_WORKSPACE: Workspace = 'home';

/**
 * 경로 접두사 일치 — **세그먼트 경계**에서만 성립한다.
 * `/admin` 은 `/admin`·`/admin/users` 에 걸리고 `/admin-vault` 에는 걸리지 않는다.
 */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * pathname 에서 업무 축을 판정한다. query·hash 는 호출 전에 제거해서 넘긴다.
 */
export function resolveWorkspaceFromPath(pathname: string): Workspace {
  // 뒤따르는 '/' 제거 — '/admin/' 과 '/admin' 을 같게 본다. 루트 '/' 는 보존.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  for (const rule of SORTED_RULES) {
    if (matchesPrefix(path, rule.prefix)) return rule.workspace;
  }
  return DEFAULT_WORKSPACE;
}

/** 진단·문서용 — 확정된 매핑 목록. */
export const ROUTE_WORKSPACE_RULES = ROUTE_RULES;
