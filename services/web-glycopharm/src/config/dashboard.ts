/**
 * GlycoPharm — Dashboard Route Config
 *
 * WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1
 * AuthContext에서 분리된 role priority + dashboard map.
 */

import { getPrimaryDashboardRoute } from '@o4o/auth-utils';

export const GLYCOPHARM_ROLE_PRIORITY = [
  'platform:super_admin',
  'glycopharm:admin',
  'glycopharm:operator',
  'glycopharm:supplier',
  'glycopharm:pharmacy',
  'seller',              // legacy: 약국 가입 시 seller로 저장됨
  'glycopharm:consumer',
  'customer',            // legacy: 당뇨인 가입 시 customer로 저장됨
] as const;

export const GLYCOPHARM_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'glycopharm:admin': '/admin',
  'glycopharm:operator': '/operator',
  'glycopharm:supplier': '/supplier',
  'glycopharm:pharmacy': '/care',
  'seller': '/care',               // legacy: seller = pharmacy
  'glycopharm:consumer': '/',
  'customer': '/patient',          // legacy: customer = consumer (patient)
};

export function getGlycopharmDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, GLYCOPHARM_ROLE_PRIORITY, GLYCOPHARM_DASHBOARD_MAP);
}
