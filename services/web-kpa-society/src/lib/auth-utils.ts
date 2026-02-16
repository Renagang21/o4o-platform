/**
 * WO-KPA-A-ROLE-BASED-REDIRECT-V1
 * WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1: admin/operator → /hub 통합
 *
 * KPA-a 역할 기반 기본 경로 결정
 * 우선순위: admin/operator → /hub > 일반회원 → /dashboard
 */
export function getDefaultRouteByRole(userRoles?: string[]): string {
  if (!userRoles || userRoles.length === 0) return '/dashboard';

  if (userRoles.includes('kpa:admin')) return '/hub';
  if (userRoles.includes('kpa:operator')) return '/hub';

  return '/dashboard';
}
