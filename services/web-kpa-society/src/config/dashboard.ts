/** Pharmacy member login starts in the member community.
 * Operator/admin defaults remain role-based; explicit returnTo is handled by LoginModal.
 * WO-O4O-PHARMACY-MEMBER-HOME-V1 supersedes automatic store-owner navigation here only.
 */
import { getPrimaryDashboardRoute } from '@o4o/auth-utils';
import type { User } from '../contexts/AuthContext';

export const KPA_ROLE_PRIORITY = ['platform:super_admin', 'kpa:admin', 'kpa:operator'] as const;
export const KPA_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'kpa:admin': '/admin',
  'kpa:operator': '/operator',
};

/** A normal login entry returns to `/`; LoginModal callbacks preserve explicit destinations. */
export function getKpaPostLoginRoute(user: User): string | null {
  const route = getPrimaryDashboardRoute(user.roles ?? [], KPA_ROLE_PRIORITY, KPA_DASHBOARD_MAP);
  return !route || route === '/' ? '/' : route;
}
