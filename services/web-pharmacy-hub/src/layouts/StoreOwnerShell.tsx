/**
 * StoreOwnerShell — Pharmacy-Hub 매장 경영 셸 wrapper
 *
 * WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1
 *
 * 공통 `@o4o/store-ui-core` 의 StoreDashboardLayout / StoreOwnerGuard 를 그대로 사용하고,
 * 서비스 차이(auth context 연결 · 가입 상태 게이트 · basePath)만 여기서 주입한다.
 * KPA / K-Cosmetics 셸을 복사하지 않으며, Pharmacy-Hub 전용 Layout·Sidebar 사본도 만들지 않는다.
 *
 * 가드 2단:
 *   1. StoreOwnerGuard(serviceKey='pharmacy-hub') — role_assignments 축
 *      (pharmacy-hub:store_owner / operator / admin / platform:super_admin).
 *      다른 서비스의 store_owner 역할만 가진 사용자는 통과하지 못한다.
 *   2. MembershipGate — service_memberships.status 축 (active 만 통과, pending/rejected 안내).
 *   backend 의 실제 권한 경계는 requireAuth + pharmacy-hub scope guard 가 강제한다.
 *   프론트 가드는 UX 안내이며 권한 판정 근거가 아니다.
 *
 * requireStoreOwnerRole=false 모드 (결제 라우트 전용):
 *   `/store-owner/payment/success|fail` 은 PG 리다이렉트 대상이라 URL 에 결제 파라미터가 실려 온다.
 *   StoreOwnerGuard 는 미인증 시 `<Navigate to="/login">` 로 **주소를 바꿔버리므로**
 *   (LoginPage 는 returnUrl 을 복원하지 않는다) callback 파라미터가 소실된다.
 *   결제 라우트는 기존과 동일하게 MembershipGate 만 적용해 같은 URL 에서 안내한다 —
 *   기존 동작 보존이 목적이며 셸(사이드바·상단바)은 동일하게 렌더한다.
 */

import { useNavigate } from 'react-router-dom';
import { StoreDashboardLayout, StoreOwnerGuard, PHARMACY_HUB_STORE_CONFIG } from '@o4o/store-ui-core';
import type { StoreOwnerGuardUser } from '@o4o/store-ui-core';
import { useAuth } from '../contexts/AuthContext';
import { MembershipGate } from '../components/MembershipGate';
import { BRAND } from '../config/service';

function ShellLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <StoreDashboardLayout
      config={PHARMACY_HUB_STORE_CONFIG}
      userName={user?.name || user?.email || ''}
      homeLink="/"
      serviceLabel={BRAND.name}
      serviceBadge="약국 경영자"
      onLogout={() => {
        logout();
        navigate('/');
      }}
    />
  );
}

export function StoreOwnerShell({
  requireStoreOwnerRole = true,
}: {
  requireStoreOwnerRole?: boolean;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // @o4o/auth-utils 의 memberships 는 null 을 허용하지만 Guard 계약은 undefined 만 허용한다.
  // 공통 패키지 타입을 넓히는 대신 서비스 wrapper 에서 좁혀 전달한다(공통 계약 무변경).
  const guardUser: StoreOwnerGuardUser | null = user
    ? { roles: user.roles ?? undefined, memberships: user.memberships ?? undefined }
    : null;

  if (!requireStoreOwnerRole) {
    return (
      <MembershipGate>
        <ShellLayout />
      </MembershipGate>
    );
  }

  return (
    <StoreOwnerGuard
      serviceKey="pharmacy-hub"
      user={guardUser}
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      membershipGate={MembershipGate}
    >
      <ShellLayout />
    </StoreOwnerGuard>
  );
}
