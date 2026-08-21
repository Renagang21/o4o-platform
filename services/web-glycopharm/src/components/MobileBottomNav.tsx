/**
 * MobileBottomNav — GlycoPharm 모바일 하단 네비게이션
 *
 * WO-O4O-GLYCOPHARM-MENU-CANONICAL-ALIGN-V1
 * WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1:
 *   렌더 shell(nav 배치 · 탭 마크업 · 스타일 토큰 · backdrop · 시트 개폐)을 공통
 *   `@o4o/account-ui` Mobile Bottom Nav Core 로 옮겼다. 이 파일에는 GlycoPharm
 *   고유의 메뉴 구성 · route · active 판정 · 브랜드 색만 남는다.
 *
 * md 미만(768px 이하) 에서만 표시 (md:hidden). 웹 헤더/메뉴 구조에 영향 없음.
 *
 * 비로그인: 커뮤니티 + 로그인 버튼 (로그인 우선 노출)
 * 로그인:   커뮤니티 / 약국 경영 / 알림 / 내정보
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1:
 *   '알림' 탭이 `/mypage` 로 가던 dead link 를 실제 알림 시트로 교정했다.
 *   공통 GlobalHeader 의 utilitySlot(NotificationBell)은 `hidden md:flex` 안이라
 *   모바일에서 렌더되지 않는다 → 모바일 알림 진입은 이 탭이 유일하다.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Building2, Bell, User, LogIn } from 'lucide-react';
import {
  useNotifications,
  NotificationSheet,
  resolveNotificationTarget,
  MobileBottomNav as MobileBottomNavCore,
  MobileBottomNavBackdrop,
  useMobileBottomNavSheet,
} from '@o4o/account-ui';
import type { NotificationItem, MobileBottomNavItem } from '@o4o/account-ui';
import { notificationsApi, NOTIFICATION_SERVICE_KEY } from '@/lib/api/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';

/** GlycoPharm 브랜드 active 색 · z-index(기존 값 유지). */
const ACTIVE_COLOR = '#059669';
const Z_INDEX_CLASS = 'z-50';

// 약국 경영 active 판정: /mobile/pharmacy, /store, /store-hub
function isPharmacyActive(pathname: string): boolean {
  if (pathname === '/mobile/pharmacy') return true;
  if (pathname.startsWith('/store-hub')) return true;
  // /store 대시보드 경로 (소비자 스토어 /store/:pharmacyId 제외)
  if (pathname === '/store' || pathname.startsWith('/store/')) {
    const afterStore = pathname.slice('/store/'.length);
    // /store/:pharmacyId 소비자 경로는 숫자 또는 UUID 패턴 — 제외
    const isConsumerStore = afterStore.length > 0 && /^\d/.test(afterStore);
    return !isConsumerStore;
  }
  return false;
}

// 커뮤니티 active 판정
function isCommunityActive(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/forum') ||
    pathname.startsWith('/lms') ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/content')
  );
}

export function MobileBottomNav() {
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { openSheet, close: closeSheet, open } = useMobileBottomNavSheet(pathname);
  const notifOpen = openSheet === 'notif';

  // 헤더 NotificationBell 과 동일 source. 새 API 없음.
  const notif = useNotifications(notificationsApi, {
    enabled: !!user,
    serviceKey: NOTIFICATION_SERVICE_KEY,
  });

  const isCommunity = isCommunityActive(pathname);
  const isPharmacy = isPharmacyActive(pathname);
  const isMyPage = pathname.startsWith('/mypage');

  function handleNotifTab() {
    if (notifOpen) return closeSheet();
    open('notif');
    void notif.refetchList();
  }

  function handleNotifItem(n: NotificationItem) {
    if (!n.isRead) void notif.markAsRead(n.id);
    const target = resolveNotificationTarget(n);
    closeSheet();
    if (target) navigate(target);
  }

  function handlePharmacyTab() {
    if (!isPharmacy) navigate('/mobile/pharmacy');
  }

  // 비로그인: 커뮤니티 + 로그인 우선 노출
  if (!user) {
    const guestItems: MobileBottomNavItem[] = [
      { key: 'community', label: '커뮤니티', icon: Home, to: '/', active: isCommunity },
      { key: 'login', label: '로그인', icon: LogIn, onClick: openLoginModal, emphasis: true },
    ];
    return (
      <MobileBottomNavCore
        items={guestItems}
        activeColor={ACTIVE_COLOR}
        zIndexClassName={Z_INDEX_CLASS}
      />
    );
  }

  // 로그인: 커뮤니티 / 약국 경영 / 알림 / 내정보
  const items: MobileBottomNavItem[] = [
    { key: 'community', label: '커뮤니티', icon: Home, to: '/', active: isCommunity },
    { key: 'pharmacy', label: '약국 경영', icon: Building2, onClick: handlePharmacyTab, active: isPharmacy },
    {
      key: 'notif',
      label: '알림',
      icon: Bell,
      onClick: handleNotifTab,
      active: notifOpen,
      ariaHasPopup: 'dialog',
      ariaExpanded: notifOpen,
      badgeCount: notif.unreadCount,
    },
    { key: 'mypage', label: '내정보', icon: User, to: '/mypage', active: isMyPage },
  ];

  return (
    <MobileBottomNavCore
      items={items}
      activeColor={ACTIVE_COLOR}
      zIndexClassName={Z_INDEX_CLASS}
    >
      {notifOpen && <MobileBottomNavBackdrop onClick={closeSheet} />}
      {notifOpen && (
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
    </MobileBottomNavCore>
  );
}
