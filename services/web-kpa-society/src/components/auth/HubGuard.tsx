/**
 * HubGuard — 약국 HUB 접근 제어 (PharmacyGuard보다 관대)
 *
 * WO-KPA-PHARMACY-HUB-NAVIGATION-RESTRUCTURE-V1
 *
 * 정책:
 * - 미인증 → /login
 * - admin/operator → /operator
 * - isStoreOwner === true → 통과 (승인 완료)
 * - activityType === 'pharmacy_owner' → 통과 (미승인이라도 HUB 탐색 가능)
 * - 그 외 → /pharmacy (게이트 페이지)
 *
 * PharmacyGuard와의 차이:
 * PharmacyGuard는 isStoreOwner 또는 API 승인 확인이 필요하지만,
 * HubGuard는 activityType만으로도 HUB 접근을 허용한다.
 * 이는 약국 개설약사가 승인 전에도 플랫폼 자원을 탐색할 수 있게 하기 위함.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';

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

  // admin/operator → Operator dashboard
  if (hasAnyRole(user.roles, PLATFORM_ROLES)) {
    return <Navigate to="/operator" replace />;
  }

  // 승인 완료된 약국 → 통과
  if (user.isStoreOwner) {
    return <>{children}</>;
  }

  // pharmacy_owner 직역 → HUB 탐색 허용 (미승인이라도)
  if ((user as any).activityType === 'pharmacy_owner') {
    return <>{children}</>;
  }

  // 그 외 → 게이트 페이지
  return <Navigate to="/pharmacy" replace />;
}
