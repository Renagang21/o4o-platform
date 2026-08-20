/**
 * MembershipStatusBadge — 서비스 가입 상태 배지 (공통 View)
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §10
 *
 * `RequestStatusBadge` 와 같은 표시 계층이며, 기본 config 만
 * `service_memberships.status` 축(`DEFAULT_MEMBERSHIP_STATUS_CONFIG`)을 쓴다.
 *
 * ⚠️ 상태를 판정하지 않는다. status 문자열 분기를 이 파일에 두지 않는다 (§12).
 */

import { RoleBadge } from './RoleBadge.js';
import type { RoleBadgeSize } from './RoleBadge.js';
import {
  resolveMembershipStatusConfig,
  type MembershipStatusConfig,
} from '../adapters/membershipNormalizers.js';

export interface MembershipStatusBadgeProps {
  /** 이미 판정된 membership 상태 문자열. */
  status: string | null | undefined;
  /** 서비스 표현이 다를 때만 label/tone 을 덮어쓴다. */
  overrides?: Record<string, MembershipStatusConfig>;
  size?: RoleBadgeSize;
  className?: string;
}

export function MembershipStatusBadge({
  status,
  overrides,
  size = 'sm',
  className,
}: MembershipStatusBadgeProps) {
  const config = resolveMembershipStatusConfig(status, overrides);
  return (
    <RoleBadge
      label={config.label}
      tone={config.tone}
      variant="soft"
      size={size}
      className={className}
    />
  );
}
