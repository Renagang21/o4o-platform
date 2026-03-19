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
import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: string;
}

export function RoleGuard({ children, allowedRoles, fallback = '/login' }: RoleGuardProps) {
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

  return <>{children}</>;
}

/**
 * OperatorRoute — service_memberships 기반 Operator 접근 제어
 *
 * WO-O4O-OPERATOR-VISIBILITY-UNIFICATION-V1
 * - Platform admin (admin/super_admin) → 항상 허용
 * - 그 외 → 해당 서비스의 active membership 필요
 */
const SERVICE_KEY = 'k-cosmetics';

export function OperatorRoute({ children, fallback = '/login' }: Omit<RoleGuardProps, 'allowedRoles'>) {
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

  const isAdmin = (user.roles as string[]).some(r => r === 'admin' || r === 'super_admin');
  const hasOperatorMembership = user.memberships?.some(
    m => m.serviceKey === SERVICE_KEY && m.status === 'active'
  );

  if (!isAdmin && !hasOperatorMembership) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
