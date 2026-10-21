import { pharmacyCollaboratorRoles } from '@o4o/types';
import { BUSINESS_SITE } from '../config/businessSite';
import BusinessStoreShortcut from '../pages/business/BusinessStoreShortcut';
/**
 * KpaGlobalHeader — KPA Society 서비스의 GlobalHeader 브릿지
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 *
 * 역할:
 *   - KPA AuthContext → GlobalHeader props 변환
 *   - 역할 기반 메뉴 필터링
 *   - KPA 브랜드 정보 주입
 *   - ServiceSwitcher 연결
 *   - 사용자 드롭다운 메뉴 구성
 */

import { useNavigate, useMatch } from 'react-router-dom';
import { useCallback } from 'react';
import { GlobalHeader, buildCommunityPrimaryNav } from '@o4o/ui';
import { NotificationBell, useNotifications, getUserDisplayName } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';
import { MyHomeButton, O4OHomeButton, O4O_LOGOUT_LABEL, ServiceAccountMenu } from '@o4o/auth-react';
import { getKpaServiceRoleLabel, KpaUserMenuItems } from './KpaUserMenu';
import { resolveNotificationTarget } from '../lib/notificationRouting';
import { useAuth } from '../contexts';
import { authClient } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/LoginModalContext';
import {
  KPA_BASE_NAV,
} from '../config/navigation';
import { PHARMACY_HEADER_BRAND } from '../config/brand';
import { notificationsApi } from '../api/notifications';

// ─── Component ───────────────────────────────────────────────────────────────

export function KpaGlobalHeader() {
  const { user, logout, isLoading } = useAuth();
  const { openLoginModal, openRegisterModal } = useAuthModal();
  const navigate = useNavigate();
  const businessMatch = useMatch('/businesses/:businessKey/*');
  const isHostWorkspace = !businessMatch || businessMatch.params.businessKey === BUSINESS_SITE.key;
  // The business workspace owns its task navigation; the header retains account/store utilities.
  // WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7: 크레딧 뱃지(/mypage/credits)는 마이페이지와 함께 삭제했다.

  // WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1
  // 알림 — kpa-society serviceKey 로 backend 가 저장하므로 동일 키로 필터.
  // (KPA 로컬 SERVICE_KEY='kpa' 는 backend 와 불일치 — literal 'kpa-society' 사용)
  const notif = useNotifications(notificationsApi, {
    enabled: !!user,
    serviceKey: 'kpa-society',
  });

  const handleNotificationClick = useCallback(
    (n: NotificationItem) => {
      // WO-O4O-KPA-MOBILE-BOTTOM-UTILITY-NAV-ROUTE-COVERAGE-FIX-V1:
      //   라우팅 규칙을 resolveNotificationTarget(SSOT)로 이관 — MobileBottomNav 알림 시트와 공유.
      const target = resolveNotificationTarget(n);
      if (target) navigate(target);
    },
    [navigate],
  );

  // Generic business workspaces retain their own navigation; pharmacy uses the header once.
  const computedNav = buildCommunityPrimaryNav({
    base: businessMatch ? [] : KPA_BASE_NAV,
    contextual: [],
    conditions: {},
    trailing: [...(isHostWorkspace && (user?.roles ?? []).some(r => r === 'neture:operator' || r === 'neture:admin' || r === 'platform:super_admin' || pharmacyCollaboratorRoles(BUSINESS_SITE.key).includes(r)) ? [{ label: '사업 운영', href: '/operator/semi-franchises' }] : [])],
    guestTrailing: [],
    isAuthenticated: !!user,
  });

  // User 정보 변환
  // isLoading 중 placeholder를 전달해 GlobalHeader의 isAuthenticated && user 조건 충족.
  // side effects(notif)는 useAuth()의 실제 user를 참조하므로 영향 없음.
  const headerUser = user
    ? {
        displayName: getUserDisplayName(user),
        email: user.email,
        roleLabel: getKpaServiceRoleLabel(user),
      }
    : isLoading
      ? { displayName: '', email: '' }
      : null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const accountMenu = user ? <ServiceAccountMenu key={user.id} displayName={getUserDisplayName(user)} email={user.email} roleLabel={getKpaServiceRoleLabel(user)} onLogout={handleLogout}>
    <KpaUserMenuItems user={user} />
  </ServiceAccountMenu> : undefined;
  const accountLoading = isLoading ? <output>계정 확인 중</output> : undefined;

  return (
    <GlobalHeader
      /* WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1: 표시 이름 = O4O 약국 (serviceKey 불변) */
      brand={PHARMACY_HEADER_BRAND}
      publicNav={computedNav}
      user={headerUser}
      isAuthenticated={isLoading || !!user}
      onLogin={openLoginModal}
      onRegister={openRegisterModal}
      onLogout={handleLogout}
      /* WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1: 서버 logout 은 현재 브라우저 세션만 종료 */
      logoutLabel={O4O_LOGOUT_LABEL}
      /* O4O 홈 — 로그인 여부와 무관하게 표시. 로그인 중이면 로그인 유지한 채 neture.co.kr 대표 홈으로 복귀 (로그아웃 아님)
         WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1: 로그인 조건 제거 · 모바일 헤더에도 노출 */
      homeSlot={<span className="inline-flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">{user && <BusinessStoreShortcut key={user.id} compact />}<MyHomeButton accountId={user?.id} api={authClient.api} isAuthenticated={!!user} authLoading={isLoading} className="o4o-home-link" /><O4OHomeButton api={authClient.api} isAuthenticated={!!user} authLoading={isLoading} className="o4o-home-link" /></span>}
      utilitySlot={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1: 로그인 사용자에게만 표시 */}
          {user && (
            <NotificationBell
              unreadCount={notif.unreadCount}
              notifications={notif.notifications}
              loading={notif.loading}
              onOpen={notif.refetchList}
              onItemClick={handleNotificationClick}
              onMarkAsRead={notif.markAsRead}
              onMarkAllAsRead={notif.markAllAsRead}
            />
          )}
        </div>
      }
      /* WO-O4O-ROLE-BASED-PROFILE-MENU-CANONICALIZATION-V1 규칙은 KpaUserMenuItems(SSOT)로 이동.
         데스크톱 프로필 드롭다운은 이 항목을 그대로 사용. */
      userMenuItems={<KpaUserMenuItems user={user} />}
      accountSlot={accountMenu ?? accountLoading}
      /* WO-O4O-KPA-MOBILE-NAV-AND-PROFILE-MENU-SEPARATION-V1:
         모바일 햄버거 drawer 는 사이트 nav 만 표시. 사용자 이름·이메일·역할별 대시보드·계정 메뉴·
         로그아웃은 모바일 하단 '내정보' 프로필 시트(MobileBottomNav)로 분리한다.
         데스크톱 드롭다운(userMenuItems)은 영향 없음. */
      showMobileUserMenu={false}
    />
  );
}
