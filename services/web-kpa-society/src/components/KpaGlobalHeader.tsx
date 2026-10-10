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

import { useNavigate, useMatch, Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { GlobalHeader, buildCommunityPrimaryNav } from '@o4o/ui';
import { NotificationBell, useNotifications, getUserDisplayName } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';
import { O4OHomeButton, O4O_LOGOUT_LABEL } from '@o4o/auth-react';
import { getKpaServiceRoleLabel, KpaUserMenuItems } from './KpaUserMenu';
import { resolveNotificationTarget } from '../lib/notificationRouting';
import { useAuth } from '../contexts';
import { authClient } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/LoginModalContext';
import {
  KPA_BASE_NAV,
} from '../config/navigation';
import { creditApi } from '../api/credit';
import { PHARMACY_HEADER_BRAND } from '../config/brand';
import { notificationsApi } from '../api/notifications';

// ─── Component ───────────────────────────────────────────────────────────────

export function KpaGlobalHeader() {
  const { user, logout, isLoading } = useAuth();
  const { openLoginModal, openRegisterModal } = useAuthModal();
  const navigate = useNavigate();
  const businessMatch = useMatch('/businesses/:businessKey/*');
  // The business workspace owns its task navigation; the header retains account/store utilities.
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // WO-O4O-KPA-LOGIN-REFETCH-MINIMIZE-V1:
  // user 객체 참조 전체 대신 user.id만 의존 — fetchKpaContext Phase2 갱신 시
  // user 참조가 바뀌어도 동일 사용자이면 재호출 방지.
  useEffect(() => {
    if (!user) { setCreditBalance(null); return; }
    creditApi.getMyBalance()
      .then((res: any) => {
        const bal = res?.data?.data?.balance ?? res?.data?.balance ?? null;
        if (typeof bal === 'number') setCreditBalance(bal);
      })
      .catch(() => { /* 실패 시 뱃지 숨김 */ });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    trailing: [...((user?.roles ?? []).some(r => r === 'neture:operator' || r === 'neture:admin' || r === 'platform:super_admin') ? [{ label: '사업 운영', href: '/operator/semi-franchises' }] : [])],
    guestTrailing: [],
    isAuthenticated: !!user,
  });

  // User 정보 변환
  // isLoading 중 placeholder를 전달해 GlobalHeader의 isAuthenticated && user 조건 충족.
  // side effects(creditApi, notif)는 useAuth()의 실제 user를 참조하므로 영향 없음.
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
      homeSlot={<O4OHomeButton api={authClient.api} isAuthenticated={!!user} authLoading={isLoading} className="o4o-home-link" />}
      utilitySlot={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && creditBalance !== null && (
            <Link
              to="/mypage/credits"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999,
                background: '#fef9c3', color: '#854d0e',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                border: '1px solid #fde047',
              }}
              title="크레딧 잔액 — 클릭하면 이력을 확인할 수 있습니다"
            >
              ⭐ {creditBalance.toLocaleString()} C
            </Link>
          )}
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
      /* WO-O4O-KPA-MOBILE-NAV-AND-PROFILE-MENU-SEPARATION-V1:
         모바일 햄버거 drawer 는 사이트 nav 만 표시. 사용자 이름·이메일·역할별 대시보드·계정 메뉴·
         로그아웃은 모바일 하단 '내정보' 프로필 시트(MobileBottomNav)로 분리한다.
         데스크톱 드롭다운(userMenuItems)은 영향 없음. */
      showMobileUserMenu={false}
    />
  );
}
