/**
 * RoleGuard — K-Cosmetics 공통 역할 기반 접근 제어
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1
 * 기존 ProtectedRoute 로직을 그대로 유지하며 통일된 인터페이스 제공.
 * role 필드: user.roles[]
 * 특이사항: isSessionChecked + checkSession() 트리거 포함
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdminOrAbove } from '@o4o/auth-utils';
import { useAuth } from '../../contexts/AuthContext';
import { MembershipGate } from './MembershipGate';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: string;
  /**
   * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1:
   *   role 통과 후 service_membership active 강제. 기본 true.
   */
  enforceMembership?: boolean;
}

export function RoleGuard({ children, allowedRoles, fallback = '/login', enforceMembership = true }: RoleGuardProps) {
  const { isAuthenticated, user, isLoading, isSessionChecked, checkSession } = useAuth();
  const location = useLocation();

  // Trigger session check when entering protected route
  React.useEffect(() => {
    if (!isSessionChecked) {
      checkSession();
    }
  }, [isSessionChecked, checkSession]);

  // Wait for session check to complete
  if (!isSessionChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallback} state={{ from: location.pathname + location.search }} replace />;
  }

  if (allowedRoles && user && !user.roles.some(r => allowedRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  if (enforceMembership) {
    return <MembershipGate>{children}</MembershipGate>;
  }
  return <>{children}</>;
}

/**
 * OperatorRoute — service_memberships 기반 Operator 접근 제어
 *
 * WO-O4O-OPERATOR-VISIBILITY-UNIFICATION-V1
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1:
 *   missing-membership 시 Navigate("/") 대신 MembershipGate 의 상태별 안내 화면 표시.
 *   admin 도 membership 검증 거침 — role 만 있고 membership 없는 케이스 차단.
 *   platform:super_admin 만 MembershipGate 내부에서 bypass.
 */

export function OperatorRoute({ children, fallback = '/login' }: Omit<RoleGuardProps, 'allowedRoles' | 'enforceMembership'>) {
  const { isAuthenticated, user, isLoading, isSessionChecked, checkSession } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    if (!isSessionChecked) {
      checkSession();
    }
  }, [isSessionChecked, checkSession]);

  if (!isSessionChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallback} state={{ from: location.pathname + location.search }} replace />;
  }

  if (!user) return <Navigate to="/" replace />;

  // role 자체가 없으면 (admin 도 아니고 operator role 도 없으면) 홈으로 — operator 페이지는 role 필수
  const isAdmin = isAdminOrAbove(user.roles, 'k-cosmetics');
  const hasOperatorRole = user.roles.some((r) => r === 'k-cosmetics:operator' || r === 'cosmetics:operator');
  if (!isAdmin && !hasOperatorRole) {
    return <Navigate to="/" replace />;
  }

  return <MembershipGate>{children}</MembershipGate>;
}
