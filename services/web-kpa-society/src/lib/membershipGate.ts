/**
 * Membership Gate Helper — KPA Society
 *
 * WO-O4O-MEMBERSHIPGATE-SHARED-INSTANCE-V1
 *
 * 공통 runtime gating 로직은 @o4o/auth-utils 에서 제공.
 * 이 파일은 KPA-Society SERVICE_KEY 를 설정하고 re-export 한다.
 *
 * 정책:
 *   - users 인증 성공 + service_memberships.status === 'active' 일 때만 서비스 이용 가능
 *   - role_assignments 단독으로는 서비스 이용 가능 판정 금지
 *   - 'platform:super_admin' 만 예외 (backend membership-guard.middleware.ts 와 정렬)
 *
 * 주의: 'kpa:admin' / 'kpa:operator' 등 service-prefixed role 은
 *   isPlatformSuperAdmin() bypass 대상이 아님 — WO 정책상 role + membership 모두 필요.
 *
 * MembershipGate.tsx 컴포넌트는 KPA 전용 UX(가입 신청 CTA 포함)를
 * 유지하기 위해 서비스별 파일로 존재한다.
 */

import type { UserLike } from '@o4o/auth-utils';
import {
  getServiceMembershipStatus as _getServiceMembershipStatus,
  isServiceAccessAllowed as _isServiceAccessAllowed,
} from '@o4o/auth-utils';

export type { MembershipStatus, MembershipLike, UserLike } from '@o4o/auth-utils';
export { isPlatformSuperAdmin } from '@o4o/auth-utils';

export const SERVICE_KEY = 'kpa-society' as const;

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
