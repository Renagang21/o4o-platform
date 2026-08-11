/**
 * PharmacistOnlyGuard - 약사 전용 서비스 접근 가드
 *
 * WO-O4O-KPA-B-C-ACCESS-POLICY-IMPLEMENTATION-V1
 *
 * KPA-b (분회 서비스), KPA-c (분회 관리) 접근을 약사 회원으로 제한.
 * 학생(membershipType === 'student')은 차단.
 *
 * 검증 순서:
 * 1. 로딩 중 → LoadingSpinner
 * 2. 미인증 → 로그인 안내
 * 3. PLATFORM_ROLES (kpa:admin, kpa:operator) → bypass
 * 4. student → 차단
 * 5. 그 외 (pharmacist 포함) → 통과
 *
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1:
 *   로컬 권한없음 카드를 공통 @o4o/ui AccessDenied 로 교체. 판정 로직은 변경하지 않는다.
 */

import { AccessDenied } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { PLATFORM_ROLES, hasAnyRole } from '../../lib/role-constants';
import { MembershipGate } from './MembershipGate';

interface PharmacistOnlyGuardProps {
  children: React.ReactNode;
}

export function PharmacistOnlyGuard({ children }: PharmacistOnlyGuardProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingSpinner message="권한을 확인하는 중..." />;
  }

  if (!isAuthenticated || !user) {
    return <AccessDenied message="로그인이 필요합니다." showLogin showHome={false} />;
  }

  // Platform roles bypass (kpa:admin, kpa:operator) — service-scoped, membership 검증은 MembershipGate 가 수행
  if (hasAnyRole(user.roles, PLATFORM_ROLES)) {
    return <MembershipGate>{children}</MembershipGate>;
  }

  // Student block
  const mt = user.kpaMembership?.membershipType || user.membershipType;
  if (mt === 'student') {
    return <AccessDenied message="약사 회원만 이용할 수 있는 서비스입니다." homeLabel="커뮤니티 홈으로 돌아가기" />;
  }

  // WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
  return <MembershipGate>{children}</MembershipGate>;
}
