/**
 * PharmacyGuard — 약국 경영지원 접근 제어
 *
 * WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1:
 *   STORE_OWNER_ROLES 보유 여부가 유일한 통과 조건이다.
 *   JWT가 stale인 경우 API 승인 확인 후 세션 갱신으로 회복한다.
 */

import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES, STORE_OWNER_ROLES } from '../../lib/role-constants';
import { getMyRequestsCached } from '../../api/pharmacyRequestApi';

interface PharmacyGuardProps {
  children: React.ReactNode;
}

export function PharmacyGuard({ children }: PharmacyGuardProps) {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuth();
  const location = useLocation();
  const [apiCheck, setApiCheck] = useState<'idle' | 'loading' | 'approved' | 'denied'>('idle');

  const hasStoreRole = !!user && hasAnyRole(user.roles, STORE_OWNER_ROLES);
  const needsApiCheck = !!user && !hasAnyRole(user.roles, PLATFORM_ROLES) && !hasStoreRole;

  useEffect(() => {
    if (!needsApiCheck) return;
    if (apiCheck === 'approved' || apiCheck === 'denied') return;
    setApiCheck('loading');

    let cancelled = false;
    (async () => {
      try {
        const items = await getMyRequestsCached();
        if (cancelled) return;
        const approved = items.find((r) => r.status === 'approved');
        setApiCheck(approved ? 'approved' : 'denied');
      } catch {
        if (!cancelled) setApiCheck('denied');
      }
    })();
    return () => { cancelled = true; };
  }, [needsApiCheck, apiCheck]);

  // Stale JWT 회복: API 승인 확인 시 세션 갱신
  useEffect(() => {
    if (apiCheck === 'approved' && !hasStoreRole) {
      checkAuth();
    }
  }, [apiCheck, hasStoreRole, checkAuth]);

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

  if (hasStoreRole) {
    return <>{children}</>;
  }

  if (apiCheck === 'loading' || apiCheck === 'idle') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748B' }}>약국 승인 상태 확인 중...</p>
      </div>
    );
  }

  if (apiCheck === 'approved') {
    return <>{children}</>;
  }

  return <Navigate to="/pharmacy" replace />;
}
