/**
 * GlycoPharm — Dashboard Route Config
 *
 * WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1
 * AuthContext에서 분리된 role priority + dashboard map.
 *
 * WO-O4O-GLYCOPHARM-STOREOWNER-DASHBOARD-MAP-V1:
 *   glycopharm:store_owner 공식 dashboard redirect 대상 추가.
 *   operator/admin + store_owner 다중 역할 시 PRIORITY 기준 정상 동작 보장.
 *
 * NOTE for future commonization:
 *   shared dashboard registry / shared role priority util 추출 시
 *   이 파일의 PRIORITY+MAP 구조가 K-Cosmetics, KPA, Neture와 동일한 패턴이므로
 *   getPrimaryDashboardRoute() 호출부만 공통화하면 됨 (config 값은 서비스별 유지).
 */

import { getPrimaryDashboardRoute } from '@o4o/auth-utils';

// WO-GLYCOPHARM-PHARMACY-ROLE-FINAL-CLEANUP-V1: pharmacy 레거시 제거
// WO-O4O-GLYCOPHARM-STOREOWNER-DASHBOARD-MAP-V1: glycopharm:store_owner 추가
export const GLYCOPHARM_ROLE_PRIORITY = [
  'platform:super_admin',
  'glycopharm:admin',
  'glycopharm:operator',
  'glycopharm:store_owner',   // operator/admin보다 낮음, pharmacist보다 높음
  'glycopharm:pharmacist',
  'customer',
] as const;

export const GLYCOPHARM_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'glycopharm:admin': '/admin',
  'glycopharm:operator': '/operator',
  'glycopharm:store_owner': '/store',  // 매장 경영 워크스페이스
  'glycopharm:pharmacist': '/store/hub',
  'customer': '/patient',
};

export function getGlycopharmDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, GLYCOPHARM_ROLE_PRIORITY, GLYCOPHARM_DASHBOARD_MAP);
}
