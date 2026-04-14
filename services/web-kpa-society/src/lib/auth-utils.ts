/**
 * WO-KPA-ADMIN-DEFAULT-DASHBOARD-ROUTING-FIX-V1: admin/operator 분리 라우팅
 *
 * 역할 기반 기본 경로 결정
 * - kpa:admin → /admin (관리자 콘솔)
 * - kpa:operator → /operator (운영 대시보드)
 * - 기타 → /mypage (개인 허브)
 * - roles 없음 → /login
 *
 * WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1: /dashboard → /mypage 통합
 * WO-KPA-A-BRANCH-REMOVAL-MICRO-CLEANUP-V1: /branch-services 레거시 경로 제거
 */

export function getDefaultRouteByRole(userRoles?: string[]): string {
  if (!userRoles || userRoles.length === 0) return '/login';

  // kpa:admin → /admin (관리자 콘솔)
  if (userRoles.includes('kpa:admin')) return '/admin';
  // kpa:operator → /operator (운영 대시보드)
  if (userRoles.includes('kpa:operator')) return '/operator';

  return '/mypage';
}
