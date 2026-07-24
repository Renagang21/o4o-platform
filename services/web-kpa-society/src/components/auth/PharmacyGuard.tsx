/**
 * PharmacyGuard — KPA 약국 경영지원 접근 제어
 *
 * WO-O4O-MY-STORE-CROSSSERVICE-CANONICAL-GUARD-ALIGNMENT-V1:
 *   공통 `StoreOwnerGuard` (`@o4o/store-ui-core`) 를 사용하도록 정렬.
 *   KPA-specific 동작은 본 wrapper 에서 유지:
 *     1. `isPlatformOnlyUser` (admin/operator 단독 계정) → 차단 카드 즉시 표시
 *     2. MembershipGate 로 접근 grant 시 children 감싸기
 *
 * WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1:
 *   약국 서비스 별도 신청(pharmacy-requests) 폐지에 따라, pharmacy-request 기반
 *   stale JWT recovery(`getMyRequestsCached`)를 제거한다. 매장 운영 권한은 약국 경영자
 *   회원 승인(Path B) 시 자동 부여되며, 세션 갱신은 재로그인/마이페이지 checkAuth 로 회복된다.
 *   role/`user.isStoreOwner` 플래그만으로 접근을 판정한다.
 *
 * 평가 우선순위:
 *   loading > !auth > directAccess > platformOnly card > denial
 */

import { Navigate, useLocation } from 'react-router-dom';
import { StoreOwnerGuard } from '@o4o/store-ui-core';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES, STORE_OWNER_ROLES } from '../../lib/role-constants';
import { MembershipGate } from './MembershipGate';

interface PharmacyGuardProps {
  children: React.ReactNode;
}

const Loading = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
    <p style={{ color: '#64748B' }}>권한을 확인하는 중...</p>
  </div>
);

const PlatformOnlyCard = (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
      gap: 12,
    }}
  >
    <p style={{ color: '#1e40af', fontSize: 16, fontWeight: 600 }}>약국 경영지원 전용 영역</p>
    <p style={{ color: '#64748B', fontSize: 14 }}>약국 경영자 역할이 없는 계정은 이 페이지에 접근할 수 없습니다.</p>
    <p style={{ color: '#94a3b8', fontSize: 13 }}>운영 대시보드는 상단 메뉴에서 진입하세요.</p>
  </div>
);

export function PharmacyGuard({ children }: PharmacyGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return Loading;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  // KPA platform-only 차단 — stale recovery 호출 회피.
  // store_owner 역할 (또는 user.isStoreOwner 보강 flag) 전혀 없이 admin/operator 만 보유.
  const hasStoreRoleOrFlag =
    STORE_OWNER_ROLES.some((r) => user.roles?.includes(r)) || !!user.isStoreOwner;
  const isPlatformOnlyUser =
    !hasStoreRoleOrFlag && hasAnyRole(user.roles ?? [], PLATFORM_ROLES);
  if (isPlatformOnlyUser) return PlatformOnlyCard;

  return (
    <StoreOwnerGuard
      serviceKey="kpa"
      user={user}
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      loadingNode={Loading}
      denialFallback="/pharmacy"
      membershipGate={MembershipGate}
    >
      {children}
    </StoreOwnerGuard>
  );
}
