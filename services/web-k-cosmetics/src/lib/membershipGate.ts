/**
 * Membership Gate Helper — K-Cosmetics
 *
 * WO-O4O-MEMBERSHIPGATE-SHARED-INSTANCE-V1
 *
 * 공통 runtime gating 로직은 @o4o/auth-utils 에서 제공.
 * 이 파일은 K-Cosmetics SERVICE_KEY 를 설정하고 re-export 한다.
 */

import type { UserLike } from '@o4o/auth-utils';
import {
  getServiceMembershipStatus as _getServiceMembershipStatus,
  isServiceAccessAllowed as _isServiceAccessAllowed,
} from '@o4o/auth-utils';

export type { MembershipStatus, MembershipLike, UserLike } from '@o4o/auth-utils';
export { isPlatformSuperAdmin } from '@o4o/auth-utils';

export const SERVICE_KEY = 'k-cosmetics' as const;

export function getServiceMembershipStatus(
  user: UserLike | null | undefined,
  serviceKey: string = SERVICE_KEY,
) {
  return _getServiceMembershipStatus(user, serviceKey);
}

export function isServiceAccessAllowed(
  user: UserLike | null | undefined,
  serviceKey: string = SERVICE_KEY,
) {
  return _isServiceAccessAllowed(user, serviceKey);
}
