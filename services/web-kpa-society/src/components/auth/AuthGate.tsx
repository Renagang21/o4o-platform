/**
 * AuthGate - 상태 기반 인증 게이트
 *
 * WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1
 *
 * 로그인된 사용자의 상태에 따라 적절한 화면으로 분기:
 * 1. pending/suspended → PendingApprovalPage
 * 2. active + activityType 미설정 + 면제 아님 → ActivitySetupPage
 * 3. 정상 → children 렌더링
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

  // pending/suspended → 승인 대기 안내
  if (user.membershipStatus === 'pending' || user.membershipStatus === 'suspended') {
    return <Navigate to="/pending-approval" replace />;
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
