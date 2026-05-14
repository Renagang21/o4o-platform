/**
 * RoleGuard — GlycoPharm 공통 역할 기반 접근 제어
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed JWT roles 직접 사용
 */

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
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed JWT roles 직접 사용
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1:
 *   - 기존 missing-membership 시 Navigate("/") 동작을 MembershipGate 의
 *     상태별 안내 화면으로 대체 (none/pending/rejected/suspended/withdrawn 별 메시지).
 *   - Platform super_admin 만 bypass — service-prefixed role(glycopharm:admin 등) 도
 *     membership 검사를 거친다 (role 만 있고 membership 없는 케이스 차단).
 */

export function OperatorRoute({ children, fallback = '/login' }: Omit<RoleGuardProps, 'allowedRoles' | 'enforceMembership'>) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallback} state={{ from: location.pathname + location.search }} replace />;
  }

  if (!user) return <Navigate to="/" replace />;

  // role 체크: admin 계열은 통과시키되, membership 활성은 MembershipGate 가 한번 더 검사.
  // admin 도 아니고 운영자 role 도 없으면 홈으로 (membership 화면이 더 적절하지만 운영자 페이지는 role 자체가 필요).
  const isAdmin = isAdminOrAbove(user.roles, 'glycopharm');
  const hasOperatorRole = user.roles.some((r) => r === 'glycopharm:operator');
  if (!isAdmin && !hasOperatorRole) {
    return <Navigate to="/" replace />;
  }

  return <MembershipGate>{children}</MembershipGate>;
}
