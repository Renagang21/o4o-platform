/**
 * PharmacyGuard — 약국 경영지원 접근 제어
 *
 * WO-KPA-A-PHARMACY-ROUTE-GUARD-HARDENING-V1
 * WO-KPA-A-PHARMACY-TOKEN-STALE-FIX-V1: API fallback 추가
 * WO-ROLE-NORMALIZATION-PHASE3-C-V1: isStoreOwner 기반 전환
 *
 * 정책:
 * - 미인증 → /login
 * - admin/operator → /operator
 * - isStoreOwner === true → 즉시 통과
 * - isStoreOwner 없음 → API로 승인 상태 확인 (스테일 대응)
 *   - approved → 통과
 *   - 그 외 → /pharmacy (게이트 페이지로 안내)
 */

import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';
import { getMyRequestsCached } from '../../api/pharmacyRequestApi';

interface PharmacyGuardProps {
  children: React.ReactNode;
}

export function PharmacyGuard({ children }: PharmacyGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [apiCheck, setApiCheck] = useState<'idle' | 'loading' | 'approved' | 'denied'>('idle');

  // isStoreOwner가 아닐 때 API로 확인 (모듈 레벨 캐시 사용)
  const needsApiCheck = !!user && !hasAnyRole(user.roles, PLATFORM_ROLES) && !user.isStoreOwner;

  useEffect(() => {
    if (!needsApiCheck) return;
    // apiCheck이 이미 approved/denied면 재요청 불필요
    if (apiCheck === 'approved' || apiCheck === 'denied') return;
    setApiCheck('loading');

    let cancelled = false;
    (async () => {
      try {
        // getMyRequestsCached: 모듈 레벨 캐시 + in-flight dedup
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

  // Fast path: isStoreOwner면 즉시 통과
  if (user.isStoreOwner) {
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
