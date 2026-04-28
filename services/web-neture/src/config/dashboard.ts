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
  supplier: '공급자',
  'neture:partner': '파트너',
  partner: '파트너',
  'neture:seller': '셀러',
  seller: '셀러',
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

/**
 * 사용자의 역할 배열에서 가장 우선순위가 높은 역할의 한글 라벨을 반환.
 *
 * `user.roles[0]`만 사용하면 배열 순서가 우선순위와 무관할 수 있어
 * Operator/Admin 사용자에게도 '사용자' 라벨이 노출되는 문제가 있다.
 * NETURE_ROLE_PRIORITY 순서로 매칭하여 ROLE_LABELS에서 라벨을 찾는다.
 */
export function getNetureRoleLabel(roles: string[] | undefined | null): string {
  if (!roles || roles.length === 0) return '사용자';
  for (const role of NETURE_ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return ROLE_LABELS[role] ?? '사용자';
    }
  }
  return '사용자';
}
