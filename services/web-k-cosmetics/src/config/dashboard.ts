/**
 * K-Cosmetics — Dashboard Route Config
 *
 * WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1
 * AuthContext에서 분리된 role priority + dashboard map + role labels.
 */

import { getPrimaryDashboardRoute } from '@o4o/auth-utils';

export const ROLE_LABELS: Record<string, string> = {
  'platform:super_admin': '최고 관리자',
  'k-cosmetics:admin': '관리자',
  'k-cosmetics:operator': '운영자',
  'k-cosmetics:supplier': '공급자',
  'cosmetics:store_owner': '매장 운영자',
  'k-cosmetics:partner': '파트너',
  user: '사용자',
};

export const KCOSMETICS_ROLE_PRIORITY = [
  'platform:super_admin',
  'k-cosmetics:admin',
  'k-cosmetics:operator',
  'k-cosmetics:supplier',
  'k-cosmetics:partner',
  'cosmetics:store_owner',
  'consumer',            // legacy: 가입 시 consumer로 저장됨
  'customer',            // legacy: 가입 시 customer로 저장됨
] as const;

export const KCOSMETICS_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'k-cosmetics:admin': '/admin',
  'k-cosmetics:operator': '/operator',
  'k-cosmetics:supplier': '/',
  'k-cosmetics:partner': '/partner',
  'cosmetics:store_owner': '/store',
  'consumer': '/',           // legacy
  'customer': '/',           // legacy
};

export function getKCosmeticsDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, KCOSMETICS_ROLE_PRIORITY, KCOSMETICS_DASHBOARD_MAP);
}
