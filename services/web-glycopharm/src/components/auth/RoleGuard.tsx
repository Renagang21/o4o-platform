/**
 * RoleGuard — GlycoPharm 공통 역할 기반 접근 제어
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed JWT roles 직접 사용
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GLYCOPHARM_ROLES } from '../../contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: string;
}

export function RoleGuard({ children, allowedRoles, fallback = '/login' }: RoleGuardProps) {
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

  return <>{children}</>;
}

/**
 * OperatorRoute — service_memberships 기반 Operator 접근 제어
 *
 * WO-O4O-OPERATOR-VISIBILITY-UNIFICATION-V1
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed JWT roles 직접 사용
 * - Platform admin/super_admin or glycopharm:admin/operator → 항상 허용
 * - 그 외 → 해당 서비스의 active membership 필요
 */
const SERVICE_KEY = 'glycopharm';

export function OperatorRoute({ children, fallback = '/login' }: Omit<RoleGuardProps, 'allowedRoles'>) {
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

  // WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed role checks
  const isAdmin = user.roles.some(r =>
    r === GLYCOPHARM_ROLES.ADMIN ||
    r === GLYCOPHARM_ROLES.PLATFORM_SUPER_ADMIN
  );
  const hasOperatorMembership = user.memberships?.some(
    m => m.serviceKey === SERVICE_KEY && m.status === 'active'
  );

  if (!isAdmin && !hasOperatorMembership) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
