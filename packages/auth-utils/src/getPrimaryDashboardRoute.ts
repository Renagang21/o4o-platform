import { ROLE_DASHBOARD_MAP } from './roleDashboardMap.js';
import { ROLE_PRIORITY } from './rolePriority.js';

/**
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2
 *
 * Overloaded:
 *  1. (roles, priority[], dashboardMap) — prefixed roles, service-specific config
 *  2. (roles, overrides?) — legacy unprefixed roles (backward compat)
 */
export function getPrimaryDashboardRoute(
  roles: string[],
  priorityOrOverrides?: readonly string[] | Record<string, string>,
  dashboardMap?: Record<string, string>,
): string {
  // New API: explicit priority + dashboardMap (prefixed roles)
  if (Array.isArray(priorityOrOverrides) && dashboardMap) {
    for (const role of priorityOrOverrides) {
      if (roles.includes(role)) {
        return dashboardMap[role] ?? '/';
      }
    }
    return '/';
  }

  // Legacy API: use defaults + overrides (unprefixed roles)
  const overrides = priorityOrOverrides as Record<string, string> | undefined;
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return overrides?.[role] ?? ROLE_DASHBOARD_MAP[role] ?? '/';
    }
  }
  return '/';
}
