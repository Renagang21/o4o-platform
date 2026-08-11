/**
 * GlycoHubGuard — GlycoPharm 매장 HUB 접근 제어
 *
 * WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1
 *
 * KPA HubGuard 패턴 동일:
 *   - 미인증 → /login redirect
 *   - isPharmacistRole OR glycopharm:store_owner → MembershipGate 통과
 *   - operator/admin → /operator redirect
 *   - 그 외 → / redirect
 */

import { Navigate, useLocation } from 'react-router-dom';
import { isStoreOwnerDual, isOperatorOrAbove } from '@o4o/auth-utils';
import { useAuth } from '../../contexts/AuthContext';
import { isPharmacistRole } from '../../lib/role-constants';
import { MembershipGate } from './MembershipGate';
import { AccessDenied } from '@o4o/ui';

interface GlycoHubGuardProps {
  children: React.ReactNode;
}

export function GlycoHubGuard({ children }: GlycoHubGuardProps) {
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

  // pharmacist(기존) OR store_owner(신규) 둘 다 HUB 접근 가능
  const hasStoreRole =
    user.roles?.some((r: string) => isPharmacistRole(r)) ||
    isStoreOwnerDual(user.roles ?? [], 'glycopharm:store_owner');

  if (hasStoreRole) {
    return <MembershipGate>{children}</MembershipGate>;
  }

  // operator/admin → 운영자 대시보드
  if (isOperatorOrAbove(user.roles ?? [], 'glycopharm')) {
    return <Navigate to="/operator" replace />;
  }

  // WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1:
  //   매장 역할도 operator 도 아닌 사용자는 기존에 무안내로 홈에 튕겼다 → 안내 화면.
  return <AccessDenied message="매장 HUB 는 매장 경영자 계정만 이용할 수 있습니다." />;
}
