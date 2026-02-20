/**
 * PharmacyGuard — 약국 경영지원 접근 제어
 *
 * WO-KPA-A-PHARMACY-ROUTE-GUARD-HARDENING-V1
 * WO-KPA-A-PHARMACY-TOKEN-STALE-FIX-V1: API fallback 추가
 *
 * 정책:
 * - 미인증 → /login
 * - admin/operator → /operator
 * - pharmacistRole === 'pharmacy_owner' → 즉시 통과 (토큰 기준)
 * - pharmacistRole 없음 → API로 승인 상태 확인 (토큰 스테일 대응)
 *   - approved → 통과
 *   - 그 외 → /pharmacy (게이트 페이지로 안내)
 */

import { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';
import { pharmacyRequestApi } from '../../api/pharmacyRequestApi';

interface PharmacyGuardProps {
  children: React.ReactNode;
}

export function PharmacyGuard({ children }: PharmacyGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [apiCheck, setApiCheck] = useState<'idle' | 'loading' | 'approved' | 'denied'>('idle');
  const fetchedRef = useRef(false);

  // 토큰에 pharmacistRole이 없을 때 API로 확인
  const needsApiCheck = !!user && !hasAnyRole(user.roles, PLATFORM_ROLES) && user.pharmacistRole !== 'pharmacy_owner';

  useEffect(() => {
    if (!needsApiCheck || fetchedRef.current) return;
    fetchedRef.current = true;
    setApiCheck('loading');

    (async () => {
      try {
        const res = await pharmacyRequestApi.getMyRequests();
        const items = res?.data?.items || [];
        const approved = items.find((r) => r.status === 'approved');
        setApiCheck(approved ? 'approved' : 'denied');
      } catch {
        setApiCheck('denied');
      }
    })();
  }, [needsApiCheck]);

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

  // admin/operator는 Operator 대시보드로 리다이렉트
  if (hasAnyRole(user.roles, PLATFORM_ROLES)) {
    return <Navigate to="/operator" replace />;
  }

  // Fast path: 토큰에 pharmacy_owner가 있으면 즉시 통과
  if (user.pharmacistRole === 'pharmacy_owner') {
    return <>{children}</>;
  }

  // Slow path: API로 확인 중
  if (apiCheck === 'loading' || apiCheck === 'idle') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748B' }}>약국 승인 상태 확인 중...</p>
      </div>
    );
  }

  // API 확인 결과: 승인됨 → 통과
  if (apiCheck === 'approved') {
    return <>{children}</>;
  }

  // API 확인 결과: 미승인 → 게이트 페이지로
  return <Navigate to="/pharmacy" replace />;
}
