/**
 * WO-KPA-A-DEFAULT-ROUTE-FIX-V2
 * WO-KPA-C-DEFAULT-ROUTE-ALIGNMENT-V1
 *
 * 역할 기반 기본 경로 결정 (KPA-a + KPA-c 통합)
 * - kpa:admin / kpa:operator → /hub
 * - kpa-c:branch_admin / kpa-c:operator → /branch-services
 * - 기타 → /dashboard
 * - roles 없음 → /login
 */
import { PLATFORM_ROLES, BRANCH_ROLES, hasAnyRole } from './role-constants';

export function getDefaultRouteByRole(userRoles?: string[]): string {
  if (!userRoles || userRoles.length === 0) return '/login';

  if (hasAnyRole(userRoles, PLATFORM_ROLES)) return '/hub';
  if (hasAnyRole(userRoles, BRANCH_ROLES)) return '/branch-services';

  return '/dashboard';
}
