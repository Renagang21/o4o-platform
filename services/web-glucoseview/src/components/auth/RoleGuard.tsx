/**
 * RoleGuard — GlucoseView 공통 역할 기반 접근 제어
 *
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1
 * 기존 RoleProtectedRoute 로직을 그대로 유지하며 통일된 인터페이스 제공.
 * role 필드: user.role
 * fallback 기본값: '/' (GlucoseView 홈)
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: string;
}

export function RoleGuard({ children, allowedRoles, fallback = '/' }: RoleGuardProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallback} state={{ from: location.pathname + location.search, requireLogin: true }} replace />;
  }

  if (allowedRoles && user && !user.roles.some(r => allowedRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
