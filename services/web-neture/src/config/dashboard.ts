/**
 * Neture — Dashboard Route Config
 *
 * WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1
 * AuthContext에서 분리된 role priority + dashboard map + role labels.
 */

import { getPrimaryDashboardRoute } from '@o4o/auth-utils';
import { resolveRoleLabel } from '@o4o/account-ui';

// WO-O4O-NETURE-SELLER-LEGACY-CLEANUP-TO-STORE-OWNER-PARTICIPANT-V1:
// store_owner 가 canonical (Neture 내부 participant type, 권한 role 아님).
// seller / neture:seller 는 기존 데이터 호환을 위한 legacy fallback.
// neture:store_owner role 은 만들지 않으며 다른 서비스 store_owner 와 연결하지 않는다.
export const ROLE_LABELS: Record<string, string> = {
  'platform:super_admin': '최고 관리자',
  'neture:admin': '관리자',
  'neture:operator': '운영자',
  'neture:supplier': '공급자',
  supplier: '공급자',
  'neture:partner': '파트너',
  partner: '파트너',
  store_owner: '매장 경영자',          // canonical
  'neture:seller': '매장 경영자',      // legacy fallback
  seller: '매장 경영자',               // legacy fallback
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
  'store_owner',         // canonical
  'neture:seller',       // legacy fallback
  'seller',              // legacy: 기존 데이터 호환
] as const;

export const NETURE_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'neture:admin': '/admin',
  'neture:operator': '/operator',
  'neture:supplier': '/supplier/dashboard',
  'supplier': '/supplier/dashboard',   // legacy
  'neture:partner': '/partner/dashboard',
  'partner': '/partner/dashboard',     // legacy
  'store_owner': '/seller/overview',   // canonical (route path rename 은 후속 WO)
  'neture:seller': '/seller/overview', // legacy fallback
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
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §9:
 * 같은 우선순위 해석 루프가 5 서비스에 복제돼 있어 공통 `resolveRoleLabel` 로
 * 수렴했다. 사전(ROLE_LABELS)·우선순위(NETURE_ROLE_PRIORITY)는 Neture 소관으로
 * 남으며, 반환 문자열은 종전과 동일하다.
 */
export function getNetureRoleLabel(roles: string[] | undefined | null): string {
  return resolveRoleLabel(roles, {
    labels: ROLE_LABELS,
    priority: NETURE_ROLE_PRIORITY,
    fallback: '사용자',
  });
}
