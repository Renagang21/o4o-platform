/**
 * WO-KPA-C-ROLE-SYNC-NORMALIZATION-V1: membership 기반 라우팅
 *
 * 역할 기반 기본 경로 결정 (KPA-a + KPA-c 통합)
 * - kpa:admin / kpa:operator → /operator
 * - KpaMember.role = admin / operator → /branch-services
 * - 기타 → /dashboard
 * - roles 없음 → /login
 */
import { PLATFORM_ROLES, hasAnyRole } from './role-constants';

export function getDefaultRouteByRole(userRoles?: string[], membershipRole?: string): string {
  if (!userRoles || userRoles.length === 0) return '/login';

  if (hasAnyRole(userRoles, PLATFORM_ROLES)) return '/operator';
  if (membershipRole === 'admin' || membershipRole === 'operator') return '/branch-services';

  return '/dashboard';
}
