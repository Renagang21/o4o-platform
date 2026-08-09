/**
 * RoleGuard / RouteGuard — Neture 역할 기반 접근 제어
 *
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: 통합 RouteGuard (prefixed roles)
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
 *   판정 순서를 @o4o/auth-react 의 createRouteGuard 로 위임. Neture 고유분은
 *   로딩 스피너 · MembershipGate · 역할 상수 · 래퍼 계약뿐이다.
 *
 * RouteGuard: 범용. allowedRoles + requireMembership + redirectMap 조합
 * RoleGuard:  하위 호환. allowedRoles 단순 체크
 */

import type { ReactNode } from 'react';
import { createRouteGuard } from '@o4o/auth-react';
import { useAuth } from '../../contexts/AuthContext';
import { MembershipGate } from './MembershipGate';
import {
  NETURE_ROLES,
  ADMIN_ROLES,
  PLATFORM_ROLES,
  OPERATOR_ROLES,
  OPERATOR_OR_ABOVE_ROLES,
  SUPPLIER_ROLES,
} from '../../lib/role-constants';

// re-export for backward compat — 기존 import 유지
export { NETURE_ROLES, ADMIN_ROLES, PLATFORM_ROLES, OPERATOR_ROLES, OPERATOR_OR_ABOVE_ROLES, SUPPLIER_ROLES };

/**
 * Neture 판정 본체 (Core).
 *
 * membership 강제는 **호출부가 requireMembership 을 준 경우에만** 켠다 —
 * PlatformRoute 처럼 cross-service surface 는 서비스 멤버십을 요구하지 않는 기존 계약 보존.
 */
const BaseGuard = createRouteGuard({
  useAuth,
  renderLoading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
    </div>
  ),
  deniedRedirect: '/',
  MembershipGate,
});

// ─── RouteGuard (통합 컴포넌트) ───

export interface RouteGuardProps {
  /** 접근 허용 역할 (하나라도 포함되면 통과) */
  allowedRoles: string[];
  /** 서비스 멤버십 필수 여부 (serviceKey) */
  requireMembership?: string;
  /** 역할별 리다이렉트 (e.g., { 'neture:admin': '/admin' }) — allowedRoles 체크 전에 실행 */
  redirectMap?: Record<string, string>;
  children: ReactNode;
  fallback?: string;
}

export function RouteGuard({
  allowedRoles,
  requireMembership,
  redirectMap,
  children,
  fallback = '/login',
}: RouteGuardProps) {
  return (
    <BaseGuard
      allowedRoles={allowedRoles}
      redirectMap={redirectMap}
      // WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1:
      //   missing membership 시 Navigate("/") 대신 MembershipGate 로 위임 —
      //   none/pending/rejected/suspended/withdrawn 별 안내 화면. super_admin 은 Gate 내부에서 bypass.
      enforceMembership={!!requireMembership}
      membershipServiceKey={requireMembership}
      fallback={fallback}
    >
      {children}
    </BaseGuard>
  );
}

// ─── Legacy compat wrappers (기존 import 호환) ───

interface LegacyGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
  fallback?: string;
}

/**
 * 하위 호환 RoleGuard.
 *
 * 기존 구현은 `!isPlatformSuperAdmin(user)` 일 때만 MembershipGate 로 감쌌으나,
 * MembershipGate 자체가 platform super_admin 을 bypass 하므로 항상 감싸도 판정은 동일하다.
 * serviceKey 는 넘기지 않는다 — MembershipGate 의 기본값(SERVICE_KEY)이 기존 동작이다.
 */
export function RoleGuard({ children, allowedRoles, fallback = '/login' }: LegacyGuardProps) {
  return (
    <BaseGuard allowedRoles={allowedRoles} fallback={fallback}>
      {children}
    </BaseGuard>
  );
}

/**
 * OperatorRoute — RouteGuard wrapper (하위 호환)
 *
 * WO-O4O-NETURE-ADMIN-OPERATOR-URL-SEPARATION-V1:
 *   admin 역할도 /operator/* 접근 허용 (KPA-Society 정렬).
 *   operator 업무(가입 승인 등)는 /operator/* 에서 수행, /admin/* 는 admin 전용 기능만.
 *   기존 redirectMap 제거 — admin이 /operator/* 에서 차단되던 구조 해소.
 */
export function OperatorRoute({ children, fallback = '/login' }: Omit<LegacyGuardProps, 'allowedRoles'>) {
  return (
    <RouteGuard
      allowedRoles={OPERATOR_OR_ABOVE_ROLES}
      requireMembership="neture"
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
 * PlatformRoute — O4O platform-admin 전용 guard
 *
 * WO-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1 (Phased B):
 *   platform:super_admin 만 통과. neture:admin 단독은 차단(→ '/').
 *   cross-service surface 이므로 'neture' membership 을 요구하지 않는다(서비스 멤버십과 무관).
 */
export function PlatformRoute({ children, fallback = '/login' }: Omit<LegacyGuardProps, 'allowedRoles'>) {
  return (
    <RouteGuard
      allowedRoles={PLATFORM_ROLES}
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
