/**
 * PharmacyStoreGuard — GlycoPharm /store 영역 접근 제어
 *
 * WO-O4O-MY-STORE-CROSSSERVICE-CANONICAL-GUARD-ALIGNMENT-V1:
 *   공통 `StoreOwnerGuard` (`@o4o/store-ui-core`) 로 정렬.
 *   GlycoPharm 의 3-way OR 통과 정책은 그대로 보존:
 *     - JWT roles: glycopharm:store_owner (alias) — StoreOwnerGuard 가 cfg.storeOwner 로 처리.
 *     - JWT roles: glycopharm:pharmacist (canonical) — `extraRoleMatcher` 로 전달.
 *     - service_memberships(glycopharm, 'pharmacy', active/approved) — StoreOwnerGuard 가
 *       cfg.membershipStoreOwnerRole='pharmacy' 로 처리.
 *     - operator / admin / super_admin — StoreOwnerGuard 의 isOperatorOrAbove 분기로 처리.
 *
 *   이전 WO 들: WO-O4O-GLYCOPHARM-MY-STORE-MENU-MEMBERSHIP-GUARD-V1 /
 *               WO-O4O-GLYCOPHARM-MY-STORE-MENU-FLICKER-FIX-V1.
 *
 *   회원 상태 안내는 MembershipGate 가 담당.
 */

import { StoreOwnerGuard } from '@o4o/store-ui-core';
import { useAuth } from '../../contexts/AuthContext';
import { isPharmacistRole } from '../../lib/role-constants';
import { MembershipGate } from './MembershipGate';

interface PharmacyStoreGuardProps {
  children: React.ReactNode;
  fallback?: string;
}

const Loading = (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

export function PharmacyStoreGuard({ children, fallback = '/login' }: PharmacyStoreGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <StoreOwnerGuard
      serviceKey="glycopharm"
      user={user}
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      loadingNode={Loading}
      loginFallback={fallback}
      denialFallback="/"
      extraRoleMatcher={isPharmacistRole}
      membershipGate={MembershipGate}
    >
      {children}
    </StoreOwnerGuard>
  );
}
