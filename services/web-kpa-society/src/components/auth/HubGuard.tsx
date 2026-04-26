/**
 * HubGuard — 약국 HUB 접근 제어
 *
 * WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1:
 *   STORE_OWNER_ROLES 보유 여부가 유일한 통과 조건이다.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES, STORE_OWNER_ROLES } from '../../lib/role-constants';

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

  if (hasAnyRole(user.roles, PLATFORM_ROLES)) {
    return <Navigate to="/operator" replace />;
  }

  if (hasAnyRole(user.roles, STORE_OWNER_ROLES)) {
    return <>{children}</>;
  }

  return <Navigate to="/pharmacy" replace />;
}
