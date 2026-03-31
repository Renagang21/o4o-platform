/**
 * Neture — Dashboard Route Config
 *
 * WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1
 * AuthContext에서 분리된 role priority + dashboard map + role labels.
 */

import { getPrimaryDashboardRoute } from '@o4o/auth-utils';

export const ROLE_LABELS: Record<string, string> = {
  'platform:super_admin': '최고 관리자',
  'neture:admin': '관리자',
  'neture:operator': '운영자',
  'neture:supplier': '공급자',
  'neture:partner': '파트너',
  'neture:seller': '셀러',
  user: '사용자',
};

export const NETURE_ROLE_PRIORITY = [
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'neture:supplier',
  'supplier',            // legacy: 가입 시 supplier로 저장됨
  'neture:partner',
  'partner',             // legacy: 가입 시 partner로 저장됨
  'neture:seller',
  'seller',              // legacy: 가입 시 seller로 저장됨
] as const;

export const NETURE_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'neture:admin': '/admin',
  'neture:operator': '/operator',
  'neture:supplier': '/supplier/dashboard',
  'supplier': '/supplier/dashboard',   // legacy
  'neture:partner': '/partner/dashboard',
  'partner': '/partner/dashboard',     // legacy
  'neture:seller': '/seller/overview',
  'seller': '/seller/overview',        // legacy
};

export function getNetureDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, NETURE_ROLE_PRIORITY, NETURE_DASHBOARD_MAP);
}
