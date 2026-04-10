/**
 * Service Scope Utility
 * WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1
 *
 * Extracts service scope from user roles for Operator API data isolation.
 * Platform admins bypass all filters. Service operators see only their service data.
 */

import type { Request, Response, NextFunction } from 'express';
import { parseServiceRole, isPlatformAdmin } from './role.utils.js';

/**
 * Role prefix → canonical service_key/service_code mapping.
 * Role prefixes that differ from service_key used in
 * service_memberships / organization_service_enrollments.
 *
 * Mirrors SCOPE_TO_MEMBERSHIP_KEY in membership-guard.middleware.ts
 */
const ROLE_PREFIX_TO_SERVICE_KEY: Record<string, string> = {
  'kpa': 'kpa-society',
  'cosmetics': 'k-cosmetics',
};

function resolveServiceKey(rolePrefix: string): string {
  return ROLE_PREFIX_TO_SERVICE_KEY[rolePrefix] || rolePrefix;
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
      const SERVICE_KEY_TO_PREFIX: Record<string, string> = {
        'kpa-society': 'kpa',
        'k-cosmetics': 'cosmetics',
      };
      scope.serviceKeys = activeKeys;
      scope.rolePrefixes = activeKeys.map(k => SERVICE_KEY_TO_PREFIX[k] || k);
    }
  }

  (req as any).serviceScope = scope;
  next();
}
