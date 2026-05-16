/**
 * AuthGate - 상태 기반 인증 게이트
 *
 * WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1
 * WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1: kpaMembership.serviceAccess 기반 확장
 * WO-KPA-LOGIN-LATENCY-CLEANUP-V1: KPA context 비동기 로딩 지원
 * WO-O4O-KPA-AUTHGATE-LEGACY-ACTIVITY-REDIRECT-CLEANUP-V1:
 *   activity_type 미설정 시 /setup-activity 강제 redirect 제거.
 *   canonical 가입 흐름(WO-O4O-KPA-REGISTER-MODAL-ACTIVITY-AND-PHARMACY-OWNER-INTEGRATION-V1)
 *   에서 가입 단계에 직역 입력이 이미 완료됨. legacy active+NULL 사용자는
 *   /setup-activity 또는 /mypage/profile 에서 manual 진입으로 보완.
 *
 * 로그인된 사용자의 상태에 따라 적절한 화면으로 분기:
 * 1. KPA context 아직 로딩 중 → children 통과 (차단하지 않음)
 * 2. serviceAccess = 'pending' → PendingApprovalPage
 * 3. serviceAccess = 'blocked' → PendingApprovalPage (정지/탈퇴)
 * 4. 정상 → children 렌더링
 *
 * 비로그인 사용자는 그대로 통과 (공개 페이지 접근 허용)
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, isLoading, isKpaContextLoaded } = useAuth();

  if (isLoading) return null;

  // 비로그인 → 통과 (공개 페이지는 Layout이 처리)
  if (!user) return <>{children}</>;

  // WO-KPA-LOGIN-LATENCY-CLEANUP-V1:
  // KPA context가 아직 로딩 중이면 KPA 게이트를 건너뛰고 통과.
  // fetchKpaContext 완료 → setUser + setIsKpaContextLoaded(true) → 재렌더 → 게이트 재평가.
  if (!isKpaContextLoaded) return <>{children}</>;

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

  // WO-O4O-KPA-AUTHGATE-LEGACY-ACTIVITY-REDIRECT-CLEANUP-V1:
  //   activity_type 강제 redirect 제거 — canonical 가입 단계에서 입력 완료됨.
  //   legacy active+NULL 사용자는 /mypage 등 정상 화면 통과시키고, 본인이 원할 때
  //   /setup-activity 또는 MyProfilePage 에서 manual 수정.
  return <>{children}</>;
}
