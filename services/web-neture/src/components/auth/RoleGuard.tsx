/**
 * RoleGuard — Neture 공통 역할 기반 접근 제어
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1
 * 기존 ProtectedRoute 로직을 그대로 유지하며 통일된 인터페이스 제공.
 * WO-O4O-ROLE-MODEL-UNIFICATION-PHASE2-V1: roles[] 배열 기반 전환
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
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
 * OperatorRoute — service_memberships 기반 Operator 전용 접근 제어
 *
 * WO-O4O-ROLE-ROUTE-ISOLATION-V1
 * - admin/super_admin → /admin 리다이렉트 (operator 접근 차단)
 * - operator → active membership 필요
 */
const SERVICE_KEY = 'neture';

export function OperatorRoute({ children, fallback = '/login' }: Omit<RoleGuardProps, 'allowedRoles'>) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallback} state={{ from: location.pathname + location.search }} replace />;
  }

  if (!user) return <Navigate to="/" replace />;

  // WO-O4O-ROLE-ROUTE-ISOLATION-V1: admin은 /admin으로 리다이렉트
  const isAdmin = (user.roles as string[]).some(r => r === 'admin' || r === 'super_admin');
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const hasOperatorMembership = user.memberships?.some(
    m => m.serviceKey === SERVICE_KEY && m.status === 'active'
  );

  if (!hasOperatorMembership) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * AdminRoute — admin/super_admin 역할 전용 접근 제어
 *
 * WO-O4O-ROLE-ROUTE-ISOLATION-V1
 * - admin/super_admin → 허용
 * - 그 외 → /operator 리다이렉트
 */
export function AdminRoute({ children, fallback = '/login' }: Omit<RoleGuardProps, 'allowedRoles'>) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallback} state={{ from: location.pathname + location.search }} replace />;
  }

  if (!user) return <Navigate to="/" replace />;

  const isAdmin = (user.roles as string[]).some(r => r === 'admin' || r === 'super_admin');
  if (!isAdmin) {
    return <Navigate to="/operator" replace />;
  }

  return <>{children}</>;
}
