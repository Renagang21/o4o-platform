/**
 * Membership Gate Helper — Pharmacy-Hub
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 공통 runtime gating 로직은 @o4o/auth-utils 에서 제공한다 (서비스별 재구현 금지).
 * 이 파일은 Pharmacy-Hub SERVICE_KEY 를 바인딩해 re-export 만 한다.
 *
 * 서비스별 가입/승인 분리 원칙:
 *   다른 서비스(KPA / GlycoPharm / K-Cosmetics / Neture) 회원은 자동 편입되지 않는다.
 *   Pharmacy-Hub 멤버십이 없으면 status = 'none' → 접근 불가.
 */

import type { UserLike } from '@o4o/auth-utils';
import {
  getServiceMembershipStatus as _getServiceMembershipStatus,
  isServiceAccessAllowed as _isServiceAccessAllowed,
} from '@o4o/auth-utils';
import { SERVICE_KEY } from '../config/service';

export type { MembershipStatus, MembershipLike, UserLike } from '@o4o/auth-utils';
export { isPlatformSuperAdmin } from '@o4o/auth-utils';
export { SERVICE_KEY };

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
