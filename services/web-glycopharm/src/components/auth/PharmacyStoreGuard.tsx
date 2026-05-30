/**
 * PharmacyStoreGuard — GlycoPharm /store 영역 접근 제어
 *
 * WO-O4O-GLYCOPHARM-MY-STORE-MENU-MEMBERSHIP-GUARD-V1
 *
 * 배경:
 *   `/store` 라우트의 기존 ProtectedRoute(allowedRoles 기반) 는 role 만 검사한다.
 *   하지만 GlycoPharm 의 약국 경영자는 두 가지 경로로 인식된다:
 *     (a) JWT roles: glycopharm:pharmacist / glycopharm:store_owner (legacy / prefixed role-based)
 *     (b) service_memberships: glycopharm + role='pharmacy' + status='active|approved'
 *           (현재 운영 중인 canonical 가입 흐름 — JWT 에는 unprefixed 'pharmacy' role 만 들어옴)
 *
 *   GlycoGlobalHeader 의 isPharmacy 는 (a) OR (b) 로 메뉴 노출을 결정한다.
 *   하지만 라우트 가드가 (a) 만 보면 (b) 사용자는 메뉴는 보이는데 /store 진입 시
 *   가드가 / 로 되돌려 "내 약국 클릭 → 화면 변화 없음" 증상이 발생한다.
 *
 *   본 가드는 헤더와 동일 정책으로 정렬 — role OR membership 통과 시 허용.
 *   operator / admin / super_admin 은 운영 진입 보장 (WO-O4O-GLYCOPHARM-MY-STORE-MENU-FLICKER-FIX-V1).
 *
 *   회원 상태(active/approved/none/pending/...) 안내는 MembershipGate 가 담당.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { isStoreOwnerDual } from '@o4o/auth-utils';
import { useAuth } from '../../contexts/AuthContext';
import { GLYCOPHARM_ROLES, isPharmacistRole } from '../../lib/role-constants';
import { MembershipGate } from './MembershipGate';

interface PharmacyStoreGuardProps {
  children: React.ReactNode;
  fallback?: string;
}

export function PharmacyStoreGuard({ children, fallback = '/login' }: PharmacyStoreGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={fallback} state={{ from: location.pathname + location.search }} replace />;
  }

  const roles = user.roles ?? [];

  // operator / admin / super_admin 진입 보장
  const isOperatorOrAbove =
    roles.includes(GLYCOPHARM_ROLES.OPERATOR) ||
    roles.includes(GLYCOPHARM_ROLES.ADMIN) ||
    roles.includes(GLYCOPHARM_ROLES.PLATFORM_SUPER_ADMIN);

  // 약국 경영자 — (a) prefixed role 또는 (b) membership 기반 pharmacy
  const isPharmacistByRole = roles.some((r: string) => isPharmacistRole(r));
  const isStoreOwnerByRole = isStoreOwnerDual(roles, GLYCOPHARM_ROLES.STORE_OWNER);
  const isPharmacyByMembership = (user.memberships ?? []).some(
    (m: { serviceKey?: string; role?: string; status?: string }) =>
      m.serviceKey === 'glycopharm' &&
      m.role === 'pharmacy' &&
      (m.status === 'active' || m.status === 'approved'),
  );

  const allowed =
    isOperatorOrAbove || isPharmacistByRole || isStoreOwnerByRole || isPharmacyByMembership;

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <MembershipGate>{children}</MembershipGate>;
}
