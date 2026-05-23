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

  // If no service scope from roles, derive from JWT memberships
  if (!scope.isPlatformAdmin && scope.serviceKeys.length === 0) {
    const memberships: { serviceKey: string; status: string }[] = user?.memberships || [];
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
  if (!scope.isPlatformAdmin) {
    return { mode: 'service-scoped', serviceKeys: scope.serviceKeys, crossService: false };
  }
  const sk = typeof query.serviceKey === 'string' ? query.serviceKey.trim() : '';
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
