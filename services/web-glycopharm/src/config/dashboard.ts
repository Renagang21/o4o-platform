/**
 * GlycoPharm — Dashboard Route Config
 *
 * WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1
 * AuthContext에서 분리된 role priority + dashboard map.
 */

import { getPrimaryDashboardRoute } from '@o4o/auth-utils';

// WO-GLYCOPHARM-ROLE-PREFIX-MIGRATION-V1: glycopharm:pharmacist 우선, pharmacy 호환 유지
export const GLYCOPHARM_ROLE_PRIORITY = [
  'platform:super_admin',
  'glycopharm:admin',
  'glycopharm:operator',
  'glycopharm:pharmacist',
  'pharmacy', // DEPRECATED — 호환용 유지
  'customer',
] as const;

export const GLYCOPHARM_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'glycopharm:admin': '/admin',
  'glycopharm:operator': '/operator',
  'glycopharm:pharmacist': '/store/hub',
  'pharmacy': '/store/hub', // DEPRECATED — 호환용 유지
  'customer': '/patient',
};

export function getGlycopharmDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, GLYCOPHARM_ROLE_PRIORITY, GLYCOPHARM_DASHBOARD_MAP);
}
