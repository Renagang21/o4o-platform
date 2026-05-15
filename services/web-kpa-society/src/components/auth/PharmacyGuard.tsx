/**
 * PharmacyGuard — 약국 경영지원 접근 제어
 *
 * WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1:
 *   STORE_OWNER_ROLES 보유 여부가 유일한 통과 조건이다.
 *   JWT가 stale인 경우 API 승인 확인 후 세션 갱신으로 회복한다.
 *
 * WO-O4O-KPA-PHARMACYGUARD-OPERATOR-FIX-V1:
 *   operator/admin + store_owner 동시 보유 계정 접근 보장.
 *   hasStoreRole: STORE_OWNER_ROLES(JWT) OR user.isStoreOwner(KPA context) 양쪽 체크.
 *   → stale JWT로 kpa:store_owner가 누락된 경우에도 KPA context 기준으로 통과.
 *   → operator 단독 계정: isStoreOwner=false → isPlatformOnlyUser=true → 차단 유지.
 */

import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES, STORE_OWNER_ROLES } from '../../lib/role-constants';
import { getMyRequestsCached } from '../../api/pharmacyRequestApi';
import { MembershipGate } from './MembershipGate';

interface PharmacyGuardProps {
  children: React.ReactNode;
}

export function PharmacyGuard({ children }: PharmacyGuardProps) {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuth();
  const location = useLocation();
  const [apiCheck, setApiCheck] = useState<'idle' | 'loading' | 'approved' | 'denied'>('idle');

  // WO-O4O-KPA-PHARMACYGUARD-OPERATOR-FIX-V1:
  // JWT roles(STORE_OWNER_ROLES) 또는 KPA context(isStoreOwner) 중 하나라도 true면 통과.
  // operator+store_owner 동시 보유 계정: fresh JWT → roles로 판정, stale JWT → isStoreOwner로 보완.
  const hasStoreRole =
    !!user && (hasAnyRole(user.roles, STORE_OWNER_ROLES) || user.isStoreOwner === true);
  // PLATFORM_ROLES 보유자이고 store_owner가 전혀 아닌 경우에만 API 확인 불필요(즉시 차단)
  const isPlatformOnlyUser = !!user && !hasStoreRole && hasAnyRole(user.roles, PLATFORM_ROLES);
  const needsApiCheck = !!user && !hasStoreRole && !isPlatformOnlyUser;

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

  // WO-O4O-KPA-MY-PHARMACY-HEADER-ROUTE-FIX-V1
  // storeOwner가 아닌 운영자/admin은 /store 접근 불가 — /operator로 redirect 금지
  if (hasStoreRole) {
    // WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1: role 만 있고 membership 없는 사용자 차단
    return <MembershipGate>{children}</MembershipGate>;
  }

  if (isPlatformOnlyUser) {
    // operator/admin 단독 계정 (store_owner 역할 없음) — 차단 유지
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px', gap: 12 }}>
        <p style={{ color: '#1e40af', fontSize: 16, fontWeight: 600 }}>약국 경영지원 전용 영역</p>
        <p style={{ color: '#64748B', fontSize: 14 }}>약국 경영자 역할이 없는 계정은 이 페이지에 접근할 수 없습니다.</p>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>운영 대시보드는 상단 메뉴에서 진입하세요.</p>
      </div>
    );
  }

  if (apiCheck === 'loading' || apiCheck === 'idle') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748B' }}>약국 승인 상태 확인 중...</p>
      </div>
    );
  }

  if (apiCheck === 'approved') {
    return <MembershipGate>{children}</MembershipGate>;
  }

  return <Navigate to="/pharmacy" replace />;
}
