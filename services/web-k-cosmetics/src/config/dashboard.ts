/**
 * K-Cosmetics — Dashboard Route Config
 *
 * WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1
 * AuthContext에서 분리된 role priority + dashboard map + role labels.
 */

import { getPrimaryDashboardRoute } from '@o4o/auth-utils';

export const ROLE_LABELS: Record<string, string> = {
  'platform:super_admin': '최고 관리자',
  'cosmetics:admin': '관리자',
  'cosmetics:operator': '운영자',
  'cosmetics:store_owner': '매장 운영자',
  user: '사용자',
};

export const KCOSMETICS_ROLE_PRIORITY = [
  'platform:super_admin',
  'cosmetics:admin',
  'cosmetics:operator',
  'cosmetics:store_owner',
  'consumer',            // legacy: 가입 시 consumer로 저장됨
  'customer',            // legacy: 가입 시 customer로 저장됨
] as const;

export const KCOSMETICS_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'cosmetics:admin': '/admin',
  'cosmetics:operator': '/operator',
  'cosmetics:store_owner': '/store',
  'consumer': '/',           // legacy
  'customer': '/',           // legacy
};

export function getKCosmeticsDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, KCOSMETICS_ROLE_PRIORITY, KCOSMETICS_DASHBOARD_MAP);
}
