/**
 * RoleGuard / RouteGuard — Neture 역할 기반 접근 제어
 *
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: 통합 RouteGuard (prefixed roles)
 *
 * RouteGuard: 범용. allowedRoles + requireMembership + redirectMap 조합
 * RoleGuard:  하위 호환. allowedRoles 단순 체크
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// ─── Neture Role Constants ───

export const NETURE_ROLES = {
  PLATFORM_SUPER_ADMIN: 'platform:super_admin',
  ADMIN: 'neture:admin',
  OPERATOR: 'neture:operator',
  SUPPLIER: 'neture:supplier',
  PARTNER: 'neture:partner',
  SELLER: 'neture:seller',
} as const;

/** Admin 역할 집합 (admin + platform:super_admin) */
export const ADMIN_ROLES = [NETURE_ROLES.ADMIN, NETURE_ROLES.PLATFORM_SUPER_ADMIN];

/** Operator 역할 집합 */
export const OPERATOR_ROLES = [NETURE_ROLES.OPERATOR];

/** Supplier 역할 집합 */
export const SUPPLIER_ROLES = [NETURE_ROLES.SUPPLIER];

// ─── RouteGuard (통합 컴포넌트) ───

export interface RouteGuardProps {
  /** 접근 허용 역할 (하나라도 포함되면 통과) */
  allowedRoles: string[];
  /** 서비스 멤버십 필수 여부 (serviceKey) */
  requireMembership?: string;
  /** 역할별 리다이렉트 (e.g., { 'neture:admin': '/admin' }) — allowedRoles 체크 전에 실행 */
  redirectMap?: Record<string, string>;
  children: React.ReactNode;
  fallback?: string;
}

export function RouteGuard({
  allowedRoles,
  requireMembership,
  redirectMap,
  children,
  fallback = '/login',
}: RouteGuardProps) {
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

  const userRoles = user.roles as string[];

  // Redirect check (e.g., admin accessing /operator → redirect to /admin)
  if (redirectMap) {
    for (const [role, path] of Object.entries(redirectMap)) {
      if (userRoles.includes(role)) {
        return <Navigate to={path} replace />;
      }
    }
  }

  // Role check
  const hasRequiredRole = userRoles.some(r => allowedRoles.includes(r));
  if (!hasRequiredRole) {
    return <Navigate to="/" replace />;
  }

  // Membership check
  if (requireMembership) {
    const hasMembership = user.memberships?.some(
      m => m.serviceKey === requireMembership && m.status === 'active'
    );
    if (!hasMembership) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

// ─── Legacy compat wrappers (기존 import 호환) ───

interface LegacyGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: string;
}

export function RoleGuard({ children, allowedRoles, fallback = '/login' }: LegacyGuardProps) {
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
 * OperatorRoute — RouteGuard wrapper (하위 호환)
 */
export function OperatorRoute({ children, fallback = '/login' }: Omit<LegacyGuardProps, 'allowedRoles'>) {
  return (
    <RouteGuard
      allowedRoles={OPERATOR_ROLES}
      requireMembership="neture"
      redirectMap={{
        [NETURE_ROLES.ADMIN]: '/admin',
        [NETURE_ROLES.PLATFORM_SUPER_ADMIN]: '/admin',
      }}
      fallback={fallback}
    >
      {children}
    </RouteGuard>
  );
}

/**
 * AdminRoute — RouteGuard wrapper (하위 호환)
 */
export function AdminRoute({ children, fallback = '/login' }: Omit<LegacyGuardProps, 'allowedRoles'>) {
  return (
    <RouteGuard
      allowedRoles={ADMIN_ROLES}
      fallback={fallback}
    >
      {children}
    </RouteGuard>
  );
}

/**
 * SupplierRoute — RouteGuard wrapper (하위 호환)
 */
export function SupplierRoute({ children, fallback = '/login' }: Omit<LegacyGuardProps, 'allowedRoles'>) {
  return (
    <RouteGuard
      allowedRoles={SUPPLIER_ROLES}
      requireMembership="neture"
      fallback={fallback}
    >
      {children}
    </RouteGuard>
  );
}
