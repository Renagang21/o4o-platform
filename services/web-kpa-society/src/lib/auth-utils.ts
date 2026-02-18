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
export function getDefaultRouteByRole(userRoles?: string[]): string {
  if (!userRoles || userRoles.length === 0) return '/login';

  if (
    userRoles.includes('kpa:admin') ||
    userRoles.includes('kpa:operator')
  ) {
    return '/hub';
  }

  if (
    userRoles.includes('kpa-c:branch_admin') ||
    userRoles.includes('kpa-c:operator')
  ) {
    return '/branch-services';
  }

  return '/dashboard';
}
