/**
 * NetureBottomNav — Neture 모바일 하단 utility 네비게이션
 *
 * WO-O4O-NETURE-MOBILE-NAV-PROFILE-UTILITY-AND-WORKSPACE-ACCESS-STANDARDIZE-V1
 * WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1:
 *   렌더 shell(nav 배치 · 탭 마크업 · 스타일 토큰 · spacer · backdrop · 프로필 시트 ·
 *   시트 개폐)을 공통 `@o4o/account-ui` Mobile Bottom Nav Core 로 옮겼다.
 *   **Neture 는 primary 탭바가 아니라 인증 사용자 전용 utility nav** 라는 성격은
 *   그대로다 — 탭 구성 · 비인증 시 null 렌더 · route semantics 는 이 파일 소관이다.
 *
 * md 미만(<768px)에서만 표시(md:hidden). 인증 사용자에게만 렌더(비인증 시 null →
 * 공개 랜딩/QR/제품 페이지 누출 방지). 상단 햄버거(사이트 nav)와 역할 분리:
 *   상단 햄버거 = 사이트 이동 / 하단 utility = 알림·프로필(개인 기능).
 *
 * 알림은 NetureGlobalHeader 와 동일 source(useNotifications) 재사용 — 새 API 없음.
 * 프로필은 NetureUserMenuItems(SSOT) 재사용.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Bell, User } from 'lucide-react';
import {
  useNotifications,
  NotificationSheet,
  MobileBottomNav,
  MobileBottomNavSpacer,
  MobileBottomNavBackdrop,
  MobileBottomNavProfileSheet,
  useMobileBottomNavSheet,
} from '@o4o/account-ui';
import type { NotificationItem, MobileBottomNavItem } from '@o4o/account-ui';
import { notificationsApi, NOTIFICATION_SERVICE_KEY } from '../lib/api/notifications';
import { useAuth } from '../contexts/AuthContext';
import { NetureUserMenuItems, getNetureUserDisplayName } from './NetureUserMenu';
import { resolveNetureNotificationTarget } from '../lib/notificationRouting';

/** Neture 브랜드 active 색. */
const ACTIVE_COLOR = '#059669';

/** Neture 배지 위치/굵기 (공통 기본값과 다른 부분만 — 기존 UX 보존). */
const BADGE_STYLE: React.CSSProperties = { top: -6, fontWeight: 600 };

export function NetureBottomNav() {
  const { user, isAuthenticated, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { openSheet, close: closeSheet, open, toggle } = useMobileBottomNavSheet(pathname);

  const notif = useNotifications(notificationsApi, {
    enabled: isAuthenticated && !!user,
    serviceKey: NOTIFICATION_SERVICE_KEY,
  });

  function handleNotifTab() {
    if (openSheet === 'notif') return closeSheet();
    open('notif');
    void notif.refetchList();
  }

  function handleNotifItem(n: NotificationItem) {
    if (!n.isRead) void notif.markAsRead(n.id);
    const target = resolveNetureNotificationTarget(n);
    closeSheet();
    navigate(target ?? '/mypage');
  }

  function handleLogout() {
    closeSheet();
    logout();
    navigate('/');
  }

  // 비인증 사용자에게는 렌더하지 않음(공개 페이지 누출 방지)
  if (!isAuthenticated || !user) return null;

  const items: MobileBottomNavItem[] = [
    { key: 'home', label: '홈', icon: Home, to: '/', active: pathname === '/' },
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
    <>
      {/* 하단 nav(고정) 높이만큼 문서 흐름 여백 — 콘텐츠 가림 방지. 인증 시에만 렌더. */}
      <MobileBottomNavSpacer />
      <MobileBottomNav items={items} activeColor={ACTIVE_COLOR}>
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
            markAllClassName="text-emerald-600 hover:bg-emerald-50"
            accentDotClassName="bg-emerald-500"
            unreadRowClassName="bg-emerald-50/50"
          />
        )}

        {/* 프로필 시트 (이름·이메일 + 역할별 업무 공간 + 계정 메뉴 + 로그아웃) */}
        {openSheet === 'profile' && (
          <MobileBottomNavProfileSheet
            displayName={getNetureUserDisplayName(user)}
            email={user?.email}
            onClose={closeSheet}
            onLogout={handleLogout}
          >
            <NetureUserMenuItems
              user={user}
              isAuthenticated={isAuthenticated}
              onItemClick={closeSheet}
            />
          </MobileBottomNavProfileSheet>
        )}
      </MobileBottomNav>
    </>
  );
}
