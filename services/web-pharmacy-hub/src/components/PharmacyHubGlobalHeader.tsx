/**
 * PharmacyHubGlobalHeader — Pharmacy-Hub 의 GlobalHeader 브릿지
 *
 * WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1
 *
 * KPA(KpaGlobalHeader) / K-Cosmetics(KCosGlobalHeader) / Neture(NetureGlobalHeader) 와 같은
 * thin bridge 다. 공통 GlobalHeader(@o4o/ui) 를 그대로 쓰고 **서비스 차이만** 주입한다:
 *   - AuthContext → GlobalHeader props 변환
 *   - Pharmacy-Hub 브랜드(로고·명칭·색)
 *   - 역할 기반 contextual nav 필터 (config/navigation.ts 의 표)
 *   - 알림 벨(공통 /notifications 계약)
 *   - 사용자 드롭다운
 *
 * 역할 판정은 config/service.ts 의 satisfiesRole 하나만 쓴다 — 이 파일에 역할 문자열을
 * 다시 하드코딩하지 않는다(backend scopeRoleMapping 과 같은 표 유지).
 *
 * 이 헤더는 **공개 영역 셸(PublicLayout)** 전용이다. 역할별 업무 셸
 * (StoreDashboardLayout / OperatorAreaShell / SupplierShell) 은 각자의 상단바 계약을
 * 그대로 유지한다 — 이중 헤더를 만들지 않는다.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogIn, Pill, Store, Truck, UserCircle } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem, filterContextualNav } from '@o4o/ui';
import { NotificationBell, useNotifications, getUserDisplayName } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';
import { useAuth } from '../contexts/AuthContext';
import { BRAND, ROLES, ROLE_LABELS, SERVICE_KEY, satisfiesRole } from '../config/service';
import { PH_CONTEXTUAL_NAV, PH_PUBLIC_NAV } from '../config/navigation';
import { notificationsApi } from '../lib/api/notifications';

/** 브랜드 primary — 다른 서비스와 구분되는 Pharmacy-Hub 색(teal, 공급자 헤더와 동일 계열) */
const PH_PRIMARY = '#0d9488';

export function PharmacyHubGlobalHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const roles: string[] = Array.isArray(user?.roles) ? (user!.roles as string[]) : [];

  const isOperator = isAuthenticated && satisfiesRole(roles, ROLES.operator);
  const isSupplier = isAuthenticated && satisfiesRole(roles, ROLES.supplier);
  /**
   * StoreOwnerGuard('pharmacy-hub') 통과 조건과 같은 표 —
   * store_owner 본인 + operator/admin(운영 목적 진입 허용). 메뉴와 가드가 어긋나지 않게 한다.
   */
  const isStoreOwner = isAuthenticated && satisfiesRole(roles, ROLES.storeOwner);
  const isStoreManager = isStoreOwner || isOperator;

  const contextualNav = filterContextualNav(PH_CONTEXTUAL_NAV, {
    storeManager: !!isStoreManager,
    storeOwner: !!isStoreOwner,
    supplier: !!isSupplier,
    operator: !!isOperator,
  });

  /**
   * 가입 진입점 (WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1 — 브라우저 검증에서 확정)
   *
   * 공통 GlobalHeader 의 "회원가입" 버튼은 `<Link to="/register">` 로 **경로가 고정**돼 있다
   * (onRegister 는 함께 호출되지만 Link 의 이동이 이긴다). Pharmacy-Hub 에는 `/register` route 가
   * 없어 그 버튼을 켜면 404 로 가는 데드링크가 된다. 공통 Core 를 고치는 것은 본 WO 범위 밖이므로
   * onRegister 를 주입하지 않고, 가입 진입점을 실제 경로(`/join`)를 가진 nav 항목으로 제공한다.
   * 이미 가입한 사용자에게는 노출하지 않는다.
   */
  const publicNav = isAuthenticated
    ? PH_PUBLIC_NAV
    : [...PH_PUBLIC_NAV, { label: '가입 신청', href: '/join' }];

  const headerUser = user
    ? { displayName: getUserDisplayName(user), email: user.email ?? '' }
    : null;

  const notif = useNotifications(notificationsApi, {
    enabled: !!user,
    serviceKey: SERVICE_KEY,
  });

  const handleNotificationClick = useCallback(
    (n: NotificationItem) => {
      const target = (n.metadata as Record<string, unknown> | undefined)?.targetUrl;
      if (typeof target === 'string' && target.length > 0) navigate(target);
    },
    [navigate],
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  return (
    <GlobalHeader
      brand={{
        icon: <Pill className="w-5 h-5 text-white" aria-hidden="true" />,
        name: BRAND.name,
        subtitle: BRAND.nameKo,
        primaryColor: PH_PRIMARY,
      }}
      publicNav={publicNav}
      contextualNav={contextualNav}
      user={headerUser}
      /** Pharmacy-Hub 는 로그인 모달이 없다(전용 /login 화면 계약). 모달 대신 라우팅한다. */
      onLogin={() => navigate('/login')}
      /* onRegister 미주입 — 위 publicNav 주석 참조(공통 헤더의 /register 고정 경로 = PH 데드링크) */
      onLogout={handleLogout}
      utilitySlot={user ? (
        <NotificationBell
          unreadCount={notif.unreadCount}
          notifications={notif.notifications}
          loading={notif.loading}
          onOpen={notif.refetchList}
          onItemClick={handleNotificationClick}
          onMarkAsRead={notif.markAsRead}
          onMarkAllAsRead={notif.markAllAsRead}
        />
      ) : undefined}
      userMenuItems={
        <>
          {isStoreOwner && (
            <GlobalHeaderMenuItem to="/store-owner" icon={<Store className="w-4 h-4" />}>
              내 약국
            </GlobalHeaderMenuItem>
          )}
          {isSupplier && (
            <GlobalHeaderMenuItem to="/supplier" icon={<Truck className="w-4 h-4" />}>
              {ROLE_LABELS[ROLES.supplier]}
            </GlobalHeaderMenuItem>
          )}
          {isOperator && (
            <GlobalHeaderMenuItem to="/operator" icon={<LayoutDashboard className="w-4 h-4" />}>
              {ROLE_LABELS[ROLES.operator]}
            </GlobalHeaderMenuItem>
          )}
          {/*
            내 계정 = 매장 셸 안의 /store-owner/account 가 유일한 계정 화면이다.
            매장 진입 권한이 없는 사용자에게는 열리지 않으므로 노출하지 않는다(데드링크 방지).
            운영자는 매장 셸에는 들어가지만 계정 프로필은 store_owner 본인 레코드라 403 이 되므로
            store_owner 본인에게만 노출한다. 대신 모든 로그인 사용자가 볼 수 있는 가입 상태를 둔다.
          */}
          {isStoreOwner && (
            <GlobalHeaderMenuItem to="/store-owner/account" icon={<UserCircle className="w-4 h-4" />}>
              내 계정
            </GlobalHeaderMenuItem>
          )}
          <GlobalHeaderMenuItem to="/join/status" icon={<LogIn className="w-4 h-4" />}>
            가입 상태
          </GlobalHeaderMenuItem>
        </>
      }
    />
  );
}
