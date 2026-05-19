/**
 * RoleGuard / RouteGuard — Neture 역할 기반 접근 제어
 *
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: 통합 RouteGuard (prefixed roles)
 *
 * RouteGuard: 범용. allowedRoles + requireMembership + redirectMap 조합
 * RoleGuard:  하위 호환. allowedRoles 단순 체크
 */

import { Navigate, useLocation } from 'react-router-dom';
import { hasAnyRole } from '@o4o/auth-utils';
import { useAuth } from '../../contexts/AuthContext';
import { MembershipGate } from './MembershipGate';
import { isPlatformSuperAdmin } from '../../lib/membershipGate';
import {
  NETURE_ROLES,
  ADMIN_ROLES,
  OPERATOR_ROLES,
  SUPPLIER_ROLES,
} from '../../lib/role-constants';

// re-export for backward compat — 기존 import 유지
export { NETURE_ROLES, ADMIN_ROLES, OPERATOR_ROLES, SUPPLIER_ROLES };

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
  const hasRequiredRole = hasAnyRole(userRoles, allowedRoles);
  if (!hasRequiredRole) {
    return <Navigate to="/" replace />;
  }

  // WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1:
  //   기존 코드는 missing membership 시 Navigate("/") 했으나, 사용자가 왜 차단됐는지
  //   알 수 없었음. MembershipGate 로 위임 — none/pending/rejected/suspended/withdrawn
  //   별 안내 화면을 표시. super_admin 은 MembershipGate 내부에서 bypass.
  if (requireMembership) {
    return <MembershipGate serviceKey={requireMembership}>{children}</MembershipGate>;
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

  if (allowedRoles && user && !hasAnyRole(user.roles, allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  // WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1: role 통과 후 membership active 강제
  if (user && !isPlatformSuperAdmin(user)) {
    return <MembershipGate>{children}</MembershipGate>;
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
 *
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1:
 *   기존에는 admin role 만으로 통과시켰으나, role 만 있고 membership 없는 사용자도
 *   서비스 이용 불가 정책에 맞춰 'neture' membership 검증을 추가한다.
 *   platform:super_admin 은 MembershipGate 내부에서 bypass.
 */
export function AdminRoute({ children, fallback = '/login' }: Omit<LegacyGuardProps, 'allowedRoles'>) {
  return (
    <RouteGuard
      allowedRoles={ADMIN_ROLES}
      requireMembership="neture"
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
