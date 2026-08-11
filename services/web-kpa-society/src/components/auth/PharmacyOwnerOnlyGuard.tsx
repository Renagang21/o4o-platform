/**
 * PharmacyOwnerOnlyGuard - 약국 개설자 전용 접근 가드
 *
 * WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1:
 *   STORE_OWNER_ROLES 또는 PLATFORM_ROLES 보유자만 통과한다.
 *
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1:
 *   로컬 권한없음 카드를 공통 @o4o/ui AccessDenied 로 교체. 판정 로직은 변경하지 않는다.
 */

import { AccessDenied } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { PLATFORM_ROLES, STORE_OWNER_ROLES, hasAnyRole } from '../../lib/role-constants';
import { MembershipGate } from './MembershipGate';

interface PharmacyOwnerOnlyGuardProps {
  children: React.ReactNode;
}

export function PharmacyOwnerOnlyGuard({ children }: PharmacyOwnerOnlyGuardProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingSpinner message="권한을 확인하는 중..." />;
  }

  if (!isAuthenticated || !user) {
    return <AccessDenied message="로그인이 필요합니다." showLogin showHome={false} />;
  }

  if (hasAnyRole(user.roles, PLATFORM_ROLES)) {
    // WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
    return <MembershipGate>{children}</MembershipGate>;
  }

  if (hasAnyRole(user.roles, STORE_OWNER_ROLES)) {
    // WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
    return <MembershipGate>{children}</MembershipGate>;
  }

  return <AccessDenied message="약국 개설자만 이벤트에 참여할 수 있습니다." homeTo="/mypage" homeLabel="마이페이지로 돌아가기" />;
}
