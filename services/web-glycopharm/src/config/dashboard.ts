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
  'pharmacy',
  'glycopharm:pharmacy',  // legacy: 마이그레이션 전 데이터 호환
  'seller',               // legacy: 초기 가입자 호환
  'customer',
] as const;

export const GLYCOPHARM_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'glycopharm:admin': '/admin',
  'glycopharm:operator': '/operator',
  'pharmacy': '/care',
  'glycopharm:pharmacy': '/care',  // legacy
  'seller': '/care',               // legacy
  'customer': '/patient',
};

export function getGlycopharmDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, GLYCOPHARM_ROLE_PRIORITY, GLYCOPHARM_DASHBOARD_MAP);
}
