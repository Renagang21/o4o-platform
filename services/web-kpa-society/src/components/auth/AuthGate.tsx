/**
 * AuthGate - 상태 기반 인증 게이트
 *
 * WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1
 * WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1: kpaMembership.serviceAccess 기반 확장
 *
 * 로그인된 사용자의 상태에 따라 적절한 화면으로 분기:
 * 1. serviceAccess = 'pending' → PendingApprovalPage
 * 2. serviceAccess = 'blocked' → PendingApprovalPage (정지/탈퇴)
 * 3. active + activityType 미설정 + 면제 아님 → ActivitySetupPage
 * 4. 정상 → children 렌더링
 *
 * 비로그인 사용자는 그대로 통과 (공개 페이지 접근 허용)
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isActivityTypeExempt } from '../../lib/role-constants';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  // 비로그인 → 통과 (공개 페이지는 Layout이 처리)
  if (!user) return <>{children}</>;

  // kpaMembership.serviceAccess 기반 판정 (우선)
  const sa = user.kpaMembership?.serviceAccess;
  if (sa === 'pending' || sa === 'blocked') {
    return <Navigate to="/pending-approval" replace />;
  }

  // 하위 호환: kpaMembership 없는 경우 기존 membershipStatus 폴백
  if (!user.kpaMembership) {
    if (user.membershipStatus === 'pending' || user.membershipStatus === 'suspended') {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  // active + activityType 미설정 + 면제 아님 → 직능 설정
  if (
    !user.activityType &&
    !isActivityTypeExempt(user.roles, user.membershipRole, user.membershipType)
  ) {
    return <Navigate to="/setup-activity" replace />;
  }

  // 정상
  return <>{children}</>;
}
