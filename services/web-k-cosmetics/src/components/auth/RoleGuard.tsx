/**
 * RoleGuard — K-Cosmetics 공통 역할 기반 접근 제어
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1
 * 기존 ProtectedRoute 로직을 그대로 유지하며 통일된 인터페이스 제공.
 * role 필드: user.roles[]
 * 특이사항: isSessionChecked + checkSession() 트리거 포함
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
 *   판정 순서를 @o4o/auth-react 의 createRouteGuard 로 위임한다.
 *   K-Cosmetics 고유의 lazy session check 계약(WO-O4O-STORE-OWNER-GUARD-CHECKSESSION-FIX-V1)은
 *   Core 를 바꾸지 않고 **useAuth 어댑터** 안에 그대로 보존한다 —
 *   보호 route 진입 시 checkSession() 1회 트리거 + 완료 전까지 로딩 유지.
 */

import React from 'react';
import { isAdminOrAbove } from '@o4o/auth-utils';
import { createRouteGuard } from '@o4o/auth-react';
import { useAuth } from '../../contexts/AuthContext';
import { MembershipGate } from './MembershipGate';
import { AccessDenied } from '@o4o/ui';

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
  </div>
);

/**
 * Guard 전용 useAuth 어댑터.
 *
 * 기존 RoleGuard 가 직접 하던 두 가지를 그대로 옮겼다:
 *   1) 보호 route 진입 시 세션 미확인이면 checkSession() 트리거
 *   2) 세션 확인이 끝나기 전에는 로딩으로 취급 (`!isSessionChecked || isLoading`)
 */
function useGuardAuth() {
  const { isAuthenticated, user, isLoading, isSessionChecked, checkSession } = useAuth();

  React.useEffect(() => {
    if (!isSessionChecked) {
      checkSession();
    }
  }, [isSessionChecked, checkSession]);

  return {
    isAuthenticated,
    user,
    isLoading: !isSessionChecked || isLoading,
  };
}

export const RoleGuard = createRouteGuard({
  useAuth: useGuardAuth,
  renderLoading: () => <LoadingSpinner />,
  // WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1:
  //   기존 무안내 '/' redirect 를 안내 화면으로 교체(판정 무변경).
  renderDenied: ({ message }) => <AccessDenied message={message} />,
  deniedRedirect: '/',
  MembershipGate,
});

/**
 * OperatorRoute — service_memberships 기반 Operator 접근 제어
 *
 * WO-O4O-OPERATOR-VISIBILITY-UNIFICATION-V1
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1:
 *   missing-membership 시 Navigate("/") 대신 MembershipGate 의 상태별 안내 화면 표시.
 *   admin 도 membership 검증 거침 — role 만 있고 membership 없는 케이스 차단.
 *   platform:super_admin 만 MembershipGate 내부에서 bypass.
 *
 * role 자체가 없으면 (admin 도 아니고 operator role 도 없으면) 홈으로 — operator 페이지는 role 필수.
 * prefix 가 'k-cosmetics'/'cosmetics' 두 갈래라 배열 상수 대신 술어로 주입한다.
 */
export function OperatorRoute({
  children,
  fallback = '/login',
}: {
  children: React.ReactNode;
  fallback?: string;
}) {
  return (
    <RoleGuard
      isAllowed={(roles) =>
        isAdminOrAbove(roles, 'k-cosmetics') ||
        roles.some((r) => r === 'k-cosmetics:operator' || r === 'cosmetics:operator')
      }
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}
