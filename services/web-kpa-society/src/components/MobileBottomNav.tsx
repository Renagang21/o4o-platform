/**
 * MobileBottomNav — KPA-Society 모바일 하단 네비게이션
 *
 * WO-O4O-KPA-MOBILE-MENU-STRUCTURE-PHASE2-V1
 * WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1:
 *   렌더 shell(nav 배치 · 탭 마크업 · 스타일 토큰 · backdrop · 프로필 시트 · 시트
 *   개폐)을 공통 `@o4o/account-ui` Mobile Bottom Nav Core 로 옮겼다. 이 파일에는
 *   KPA 고유의 메뉴 구성 · route · active 판정 · 브랜드 색만 남는다.
 *
 * md 미만(768px 이하) 에서만 표시 (md:hidden). 웹 헤더/메뉴 구조에 영향 없음.
 *
 * 비로그인: 커뮤니티 + 로그인 버튼 (로그인 우선 노출)
 * 로그인:   커뮤니티 / 알림 / 내정보
 *
 * WO-O4O-KPA-MOBILE-NAV-AND-PROFILE-MENU-SEPARATION-V1:
 *   '내정보' 탭 = 사용자 프로필 메뉴(bottom sheet). 사이트 nav(상단 햄버거)와 분리.
 * WO-O4O-KPA-MOBILE-BOTTOM-UTILITY-NAV-ROUTE-COVERAGE-FIX-V1:
 *   '알림' 탭 = 알림 bottom sheet. 데스크톱 상단 NotificationBell 과 동일 source
 *   재사용(모바일에서는 상단 utility 숨김). 한 번에 하나의 시트만 open.
 */

import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Home, Bell, User, LogIn, LayoutDashboard } from 'lucide-react';
import {
  useNotifications,
  NotificationSheet,
  MobileBottomNav as MobileBottomNavCore,
  MobileBottomNavBackdrop,
  MobileBottomNavProfileSheet,
  useMobileBottomNavSheet,
} from '@o4o/account-ui';
import type { NotificationItem, MobileBottomNavItem } from '@o4o/account-ui';
import { useMyHomeReturn, O4OHomeButton, O4O_LOGOUT_LABEL } from '@o4o/auth-react';
import { useAuth, authClient } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/LoginModalContext';
import { notificationsApi } from '../api/notifications';
import {
  getKpaServiceRoleLabel,
  getKpaUserDisplayName,
  KpaUserMenuItems,
} from './KpaUserMenu';
import { resolveNotificationTarget } from '../lib/notificationRouting';

/** 프로필 시트 메뉴 항목과 같은 모양의 O4O 홈 버튼 */
const O4O_HOME_SHEET_ITEM_CLASS =
  'flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 bg-transparent border-none text-left cursor-pointer hover:bg-slate-50 disabled:opacity-60';

/** KPA 브랜드 active 색. */
const ACTIVE_COLOR = '#2563eb';

/** KPA 배지 위치/굵기 (공통 기본값과 다른 부분만 — 기존 UX 보존). */
const BADGE_STYLE: React.CSSProperties = { top: -6, fontWeight: 600 };

// 커뮤니티 active 판정
function isCommunityActive(pathname: string): boolean {
  return (
    pathname.startsWith('/businesses') ||
    pathname === '/' ||
    pathname.startsWith('/community') ||
    pathname.startsWith('/materials') ||
    pathname.startsWith('/my/participation') ||
    pathname.startsWith('/forum') ||
    pathname.startsWith('/resources')
  );
}

export function MobileBottomNav() {
  const { user, isLoading, logout } = useAuth();
  const { openLoginModal } = useAuthModal();
  const { pathname } = useLocation();
  const businessMatch = useMatch('/businesses/:businessKey/*');
  const participantPath = businessMatch && businessMatch.params.businessKey !== 'pharmacy'
    ? `/businesses/${encodeURIComponent(businessMatch.params.businessKey!)}/participation` : '/';
  const navigate = useNavigate();
  const myHome = useMyHomeReturn({ accountId: user?.id, api: authClient.api, isAuthenticated: !!user, authLoading: isLoading });

  const { openSheet, close: closeSheet, open, toggle } = useMobileBottomNavSheet(pathname);

  // 알림 — KpaGlobalHeader 와 동일 serviceKey('kpa-society') source. 새 API 없음.
  const notif = useNotifications(notificationsApi, { enabled: !!user, serviceKey: 'kpa-society' });

  const isCommunity = isCommunityActive(pathname);
  function handleNotifTab() {
    if (openSheet === 'notif') return closeSheet();
    open('notif');
    void notif.refetchList();
  }

  function handleNotifItem(n: NotificationItem) {
    if (!n.isRead) void notif.markAsRead(n.id);
    const target = resolveNotificationTarget(n);
    closeSheet();
    navigate(target ?? '/mypage');
  }

  async function handleLogout() {
    closeSheet();
    await logout();
    navigate('/');
  }

  // 비로그인: 커뮤니티 + 로그인 우선 노출
  if (!user) {
    const guestItems: MobileBottomNavItem[] = [
      { key: 'community', label: '커뮤니티', icon: Home, to: participantPath, active: isCommunity },
      { key: 'login', label: '로그인', icon: LogIn, onClick: openLoginModal, emphasis: true },
    ];
    return <MobileBottomNavCore items={guestItems} activeColor={ACTIVE_COLOR} />;
  }

  // 로그인: 커뮤니티 / 알림 / 내정보
  const items: MobileBottomNavItem[] = [
    { key: 'my-home', label: myHome.busy ? '이동 중…' : 'My Home', ariaLabel: 'My Home', icon: LayoutDashboard, onClick: () => { closeSheet(); void myHome.go(); } },
    { key: 'community', label: '커뮤니티', icon: Home, to: participantPath, active: isCommunity },
    {
      key: 'notif',
      label: '알림',
      icon: Bell,
      onClick: handleNotifTab,
      active: openSheet === 'notif',
      ariaHasPopup: 'dialog',
      ariaExpanded: openSheet === 'notif',
      badgeCount: notif.unreadCount,
      badgeStyle: BADGE_STYLE,
    },
    {
      key: 'profile',
      label: '내정보',
      icon: User,
      onClick: () => toggle('profile'),
      active: openSheet === 'profile',
      ariaHasPopup: 'menu',
      ariaExpanded: openSheet === 'profile',
    },
  ];

  return (
    <MobileBottomNavCore items={items} activeColor={ACTIVE_COLOR}>
      {myHome.error && <p role="alert" className="fixed bottom-20 left-4 right-4 z-50 rounded-lg bg-red-50 p-3 text-sm text-red-700">{myHome.error}</p>}
      {openSheet !== 'none' && <MobileBottomNavBackdrop onClick={closeSheet} />}

      {/* 알림 시트 — 공통 NotificationSheet (WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1) */}
      {openSheet === 'notif' && (
        <NotificationSheet
          notifications={notif.notifications}
          unreadCount={notif.unreadCount}
          loading={notif.loading}
          onClose={closeSheet}
          onItemClick={handleNotifItem}
          onMarkAllAsRead={() => void notif.markAllAsRead()}
          markAllClassName="text-blue-600 hover:bg-blue-50"
          accentDotClassName="bg-blue-500"
          unreadRowClassName="bg-blue-50/50"
        />
      )}

      {/* 프로필 시트 (이름·이메일 + 역할별 대시보드 + 계정 메뉴 + 로그아웃) */}
      {openSheet === 'profile' && (
        <MobileBottomNavProfileSheet
          displayName={getKpaUserDisplayName(user)}
          email={user?.email}
          roleLabel={getKpaServiceRoleLabel(user)}
          roleLabelClassName="text-blue-700"
          onClose={closeSheet}
          onLogout={() => void handleLogout()}
          logoutLabel={O4O_LOGOUT_LABEL}
        >
          {/* WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1: O4O 홈(로그인 유지) */}
          <O4OHomeButton api={authClient.api} isAuthenticated className={O4O_HOME_SHEET_ITEM_CLASS} />
          <KpaUserMenuItems user={user} onItemClick={closeSheet} />
        </MobileBottomNavProfileSheet>
      )}
    </MobileBottomNavCore>
  );
}
