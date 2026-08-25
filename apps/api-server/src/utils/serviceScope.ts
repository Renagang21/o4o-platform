/**
 * Service Scope Utility
 * WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1
 *
 * Extracts service scope from user roles for Operator API data isolation.
 * Platform admins bypass all filters. Service operators see only their service data.
 */

import type { Request, Response, NextFunction } from 'express';
import { parseServiceRole, isPlatformAdmin } from './role.utils.js';
import { resolveCanonicalServiceKey, resolveRolePrefixFromCanonicalServiceKey } from '@o4o/security-core';
import logger from './logger.js';

// WO-O4O-BACKFILL-MIGRATION-CANONICAL-KEY-CONSISTENCY-V1:
//   role prefix → canonical service_key 매핑은 @o4o/security-core SSOT 위임.
//   로컬 const 정의 금지 — 3-way drift(membership-guard / AdminUserController / serviceScope) 방지.
function resolveServiceKey(rolePrefix: string): string {
  return resolveCanonicalServiceKey(rolePrefix);
}

export interface ServiceScope {
  /** Canonical service keys (mapped from role prefixes). Used in SQL filters. */
  serviceKeys: string[];
  /** Raw role prefixes (e.g., 'kpa', 'neture'). Useful for role_assignments filtering. */
  rolePrefixes: string[];
  /** Platform admin — bypasses all service scope filters. */
  isPlatformAdmin: boolean;
}

/**
 * Extract service scope from user roles.
 *
 * @param userRoles — Array of prefixed roles (e.g., ['kpa:admin', 'platform:super_admin'])
 * @returns ServiceScope with canonical service keys and platform admin flag
 *
 * @example
 * extractServiceScope(['kpa:admin', 'kpa:operator'])
 * // { serviceKeys: ['kpa-society'], rolePrefixes: ['kpa'], isPlatformAdmin: false }
 *
 * extractServiceScope(['platform:super_admin'])
 * // { serviceKeys: [], rolePrefixes: [], isPlatformAdmin: true }
 */
export function extractServiceScope(userRoles: string[]): ServiceScope {
  if (isPlatformAdmin(userRoles)) {
    return { serviceKeys: [], rolePrefixes: [], isPlatformAdmin: true };
  }

  const prefixes = new Set<string>();
  const keys = new Set<string>();

  for (const role of userRoles) {
    const parsed = parseServiceRole(role);
    if (parsed && parsed.service !== 'platform') {
      prefixes.add(parsed.service);
      keys.add(resolveServiceKey(parsed.service));
    }
  }

  return {
    serviceKeys: [...keys],
    rolePrefixes: [...prefixes],
    isPlatformAdmin: false,
  };
}

/**
 * Check if the scope includes a specific service (by role prefix).
 *
 * @example
 * hasServiceAccess(scope, 'neture') // true if user has neture:* roles or is platform admin
 */
export function hasServiceAccess(scope: ServiceScope, rolePrefix: string): boolean {
  return scope.isPlatformAdmin || scope.rolePrefixes.includes(rolePrefix);
}

/**
 * Express middleware — injects `req.serviceScope` for downstream controllers.
 * Must be placed after requireAuth / requireRole.
 *
 * WO-KPA-SOCIETY-STORE-ACCESS-FIX-V1:
 * Fallback to JWT memberships for membership-based operators (e.g., KPA Society)
 * who don't have role_assignments and therefore have no roles in user.roles.
 */
export function injectServiceScope(req: Request, _res: Response, next: NextFunction): void {
  const user = (req as any).user;
  const userRoles: string[] = user?.roles || [];
  const scope = extractServiceScope(userRoles);
  const memberships: { serviceKey: string; status: string }[] = user?.memberships || [];

  // WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1:
  //   role 로 파생한 scope 에서 **비활성 membership(정지/탈퇴/거부) 서비스를 제거**한다.
  //   종전에는 role 만 보았기 때문에, 정지된 회원이 role 을 그대로 들고 있으면
  //   그 서비스 데이터가 계속 scope 안에 남았다 (선행 WO
  //   CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §10-1 잔여 3계열 중 하나).
  //
  //   **negative filter 만** 적용한다 — membership row 가 아예 없는 서비스는 건드리지 않는다.
  //   membership 축이 없는 내부/운영 계열(role 만으로 운영되는 scope)을 깨지 않기 위해서다.
  //   즉 "있는데 active 가 아니다" 만 제거하고, "없다" 는 종전 동작을 유지한다.
  //
  //   판정 근거는 JWT 스냅샷이다. 이 미들웨어는 **진입 게이트가 아니라 데이터 격리 scope**
  //   계산이고(진입 차단은 membership-guard 가 DB 로 확정한다), sync 시그니처를 유지해야
  //   99개 호출부의 체인이 바뀌지 않는다. 정지 즉시성은 게이트 쪽에서 이미 닫혔다.
  if (!scope.isPlatformAdmin && scope.serviceKeys.length > 0 && memberships.length > 0) {
    const inactiveKeys = new Set(
      memberships.filter(m => m.status !== 'active').map(m => m.serviceKey)
    );
    if (inactiveKeys.size > 0) {
      scope.serviceKeys = scope.serviceKeys.filter(k => !inactiveKeys.has(k));
      scope.rolePrefixes = scope.rolePrefixes.filter(
        p => !inactiveKeys.has(resolveServiceKey(p))
      );
    }
  }

  // If no service scope from roles, derive from JWT memberships
  if (!scope.isPlatformAdmin && scope.serviceKeys.length === 0) {
    const activeKeys = memberships
      .filter(m => m.status === 'active')
      .map(m => m.serviceKey);
    if (activeKeys.length > 0) {
      // WO-O4O-CANONICAL-SERVICE-KEY-REVERSE-MAP-V1:
      //   canonical service_key → role prefix 매핑은 @o4o/security-core SSOT 위임.
      //   로컬 const 정의 금지 — drift 재발 방지 (forward/reverse SSOT 동시 적용).
      scope.serviceKeys = activeKeys;
      scope.rolePrefixes = activeKeys.map(k => resolveRolePrefixFromCanonicalServiceKey(k));
    }
  }

  (req as any).serviceScope = scope;
  next();
}

// ─────────────────────────────────────────────────────────────────────────
// WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1
//
// Option B — Operator endpoint 의 service scope 결정 헬퍼.
//
// 정책 (F6 Boundary Policy Rule 3 정합):
//   - Service operator: 자동 scope (scope.serviceKeys)
//   - Platform admin + serviceKey: 단일 service scope
//   - Platform admin + all=true: cross-service (명시 opt-in, 감사 로그)
//   - Platform admin + 둘 다 없음: null 반환 → caller 가 400 응답
//
// 도입 배경:
//   F6 Rule 3 "예외 없이" 와 정합화. silent platform admin exemption 제거.
//   IR-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-V1 → Option B 채택.
// ─────────────────────────────────────────────────────────────────────────

export type ResolvedOperatorScope =
  | { mode: 'service-scoped';        serviceKeys: string[]; crossService: false }
  | { mode: 'platform-scoped';       serviceKeys: string[]; crossService: false }
  | { mode: 'platform-cross-service'; serviceKeys: null;    crossService: true };

/**
 * Resolve the effective scope for an Operator Console endpoint.
 *
 * Returns null when platform admin caller fails to specify `serviceKey` or
 * `all=true` — caller MUST respond with HTTP 400 in that case.
 *
 * When crossService=true, caller SHOULD call logCrossServiceQuery(req) for
 * audit purposes.
 */
export function resolveOperatorScope(
  scope: ServiceScope,
  query: { serviceKey?: unknown; all?: unknown }
): ResolvedOperatorScope | null {
  const sk = typeof query.serviceKey === 'string' ? query.serviceKey.trim() : '';

  if (!scope.isPlatformAdmin) {
    // WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
    //   다중 서비스 operator(여러 서비스에 operator/admin role 을 가진 계정)는
    //   scope.serviceKeys 가 복수였고, 명시한 serviceKey 가 무시돼 **타 서비스 데이터가
    //   섞여 나왔다** (프로덕션 확인: Pharmacy-Hub 회원 관리에 neture/kpa-society/
    //   k-cosmetics 회원 7명, 운영 활동 로그에 glycopharm.* 액션 노출).
    //   F6 Boundary Policy Rule 3 위반이므로 명시 serviceKey 로 **좁히기만** 한다.
    //   - 보유 scope 안의 키  → 그 키 하나로 축소
    //   - 보유 scope 밖의 키  → 빈 scope (권한 확대 불가 · 결과 0건)
    //   - serviceKey 미지정   → 종전과 동일(보유 scope 전체)
    //   어떤 경로로도 scope.serviceKeys 를 넘어서지 않는다.
    if (sk && sk !== 'all') {
      const narrowed = scope.serviceKeys.includes(sk) ? [sk] : [];
      return { mode: 'service-scoped', serviceKeys: narrowed, crossService: false };
    }
    return { mode: 'service-scoped', serviceKeys: scope.serviceKeys, crossService: false };
  }

  if (sk && sk !== 'all') {
    return { mode: 'platform-scoped', serviceKeys: [sk], crossService: false };
  }
  if (query.all === 'true' || query.all === true) {
    return { mode: 'platform-cross-service', serviceKeys: null, crossService: true };
  }
  return null;
}

/** Standard 400 payload for platform admin missing both serviceKey and all=true. */
export const PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE = {
  success: false,
  error: 'serviceKey or all=true required for platform admin',
  code: 'PLATFORM_ADMIN_SCOPE_REQUIRED',
} as const;

/**
 * Structured audit log for platform admin cross-service queries.
 * Emitted whenever `all=true` opt-in is used.
 */
export function logCrossServiceQuery(req: Request): void {
  const user = (req as any).user;
  logger.info('[CROSS_SERVICE_QUERY] platform admin cross-service opt-in', {
    userId: user?.id || 'unknown',
    roles: user?.roles || [],
    endpoint: req.originalUrl || req.url,
    method: req.method,
    query: req.query,
    timestamp: new Date().toISOString(),
  });
}
