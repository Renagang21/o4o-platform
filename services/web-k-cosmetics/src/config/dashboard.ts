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
  'k-cosmetics:seller': '판매자',
  'k-cosmetics:partner': '파트너',
  user: '사용자',
};

export const KCOSMETICS_ROLE_PRIORITY = [
  'platform:super_admin',
  'k-cosmetics:admin',
  'k-cosmetics:operator',
  'k-cosmetics:supplier',
  'k-cosmetics:partner',
  'k-cosmetics:seller',
] as const;

export const KCOSMETICS_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'k-cosmetics:admin': '/admin',
  'k-cosmetics:operator': '/operator',
  'k-cosmetics:supplier': '/',
  'k-cosmetics:partner': '/partner',
  'k-cosmetics:seller': '/',
};

export function getKCosmeticsDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, KCOSMETICS_ROLE_PRIORITY, KCOSMETICS_DASHBOARD_MAP);
}
