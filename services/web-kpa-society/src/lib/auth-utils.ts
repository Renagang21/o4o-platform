/**
 * WO-KPA-A-ROLE-BASED-REDIRECT-V1
 * KPA-a 역할 기반 기본 경로 결정
 *
 * 우선순위: admin > operator > 일반회원
 */
export function getDefaultRouteByRole(userRoles?: string[]): string {
  if (!userRoles || userRoles.length === 0) return '/dashboard';

  if (userRoles.includes('kpa:admin')) return '/demo/admin';
  if (userRoles.includes('kpa:operator')) return '/operator';

  return '/dashboard';
}
