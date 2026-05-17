/**
 * HubGuard — 약국 HUB 접근 제어
 *
 * WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1:
 *   STORE_OWNER_ROLES 보유 여부가 유일한 통과 조건이다.
 *
 * WO-O4O-KPA-STOREOWNER-GUARD-CANONICAL-ALIGNMENT-V1:
 *   PharmacyGuard 와 동일한 dual-check 적용 (isStoreOwnerDual).
 *   store_owner capability 우선 — multi-role (operator + store_owner) 사용자가
 *   자기 매장 접근 시 /operator 로 강제 redirect 되지 않도록 함.
 *   stale JWT 상황에서도 user.isStoreOwner (KPA context) fallback 으로 회복.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { isStoreOwnerDual } from '@o4o/auth-utils';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES, ROLES } from '../../lib/role-constants';
import { MembershipGate } from './MembershipGate';

interface HubGuardProps {
  children: React.ReactNode;
}

export function HubGuard({ children }: HubGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748B' }}>권한을 확인하는 중...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  // WO-O4O-KPA-STOREOWNER-GUARD-CANONICAL-ALIGNMENT-V1:
  //   store_owner capability 우선 — JWT role 또는 KPA context isStoreOwner 중 하나라도 true 면 통과.
  //   multi-role (operator/admin + store_owner) 사용자도 자기 매장 접근 가능.
  const hasStoreRole = isStoreOwnerDual(user.roles, ROLES.KPA_STORE_OWNER, user.isStoreOwner);
  if (hasStoreRole) {
    // WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
    return <MembershipGate>{children}</MembershipGate>;
  }

  // store_owner capability 없는 platform-only 사용자 → 운영자 대시보드
  if (hasAnyRole(user.roles, PLATFORM_ROLES)) {
    return <Navigate to="/operator" replace />;
  }

  return <Navigate to="/pharmacy" replace />;
}
