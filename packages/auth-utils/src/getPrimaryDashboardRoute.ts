import { ROLE_DASHBOARD_MAP } from './roleDashboardMap.js';
import { ROLE_PRIORITY } from './rolePriority.js';

export function getPrimaryDashboardRoute(
  roles: string[],
  overrides?: Record<string, string>,
): string {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return overrides?.[role] ?? ROLE_DASHBOARD_MAP[role] ?? '/';
    }
  }
  return '/';
}
