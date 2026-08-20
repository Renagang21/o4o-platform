/**
 * MobileBottomNav — GlycoPharm 모바일 하단 네비게이션
 *
 * WO-O4O-GLYCOPHARM-MENU-CANONICAL-ALIGN-V1
 *
 * md 미만(768px 이하) 에서만 표시 (md:hidden).
 * 웹 헤더/메뉴 구조에 영향 없음.
 *
 * 비로그인: 커뮤니티 + 로그인 버튼 (로그인 우선 노출)
 * 로그인:   커뮤니티 / 약국 경영 / 알림 / 내정보
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1:
 *   '알림' 탭이 `/mypage`(마이페이지 홈)로 가던 dead link 를 실제 알림 시트로 교정했다.
 *   공통 GlobalHeader 의 utilitySlot(NotificationBell)은 `hidden md:flex` 안이라
 *   모바일에서 렌더되지 않는다 → 모바일 알림 진입은 이 탭이 유일하다.
 *   데이터/시트 UI 는 KPA·Neture 와 동일한 공통 자산(useNotifications + NotificationSheet).
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Building2, Bell, User, LogIn } from 'lucide-react';
import {
  useNotifications,
  NotificationSheet,
  NotificationTabBadge,
  resolveNotificationTarget,
} from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';
import { notificationsApi, NOTIFICATION_SERVICE_KEY } from '@/lib/api/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';

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

export function MobileBottomNav() {
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  const [notifOpen, setNotifOpen] = useState(false);

  // 헤더 NotificationBell 과 동일 source. 새 API 없음.
  const notif = useNotifications(notificationsApi, {
    enabled: !!user,
    serviceKey: NOTIFICATION_SERVICE_KEY,
  });

  function openNotif() {
    setNotifOpen(true);
    void notif.refetchList();
  }

  function handleNotifItem(n: NotificationItem) {
    if (!n.isRead) void notif.markAsRead(n.id);
    const target = resolveNotificationTarget(n);
    setNotifOpen(false);
    if (target) navigate(target);
  }

  // ESC 로 닫기 + 열렸을 때 배경 스크롤 잠금
  useEffect(() => {
    if (!notifOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [notifOpen]);

  // 라우트 이동 시 시트 자동 닫힘
  useEffect(() => { setNotifOpen(false); }, [pathname]);

  const isCommunity =
    pathname === '/' ||
    pathname.startsWith('/forum') ||
    pathname.startsWith('/lms') ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/content');
  const isPharmacy = isPharmacyActive(pathname);
  const isMyPage = pathname.startsWith('/mypage');

  function handlePharmacyTab() {
    if (!isPharmacy) navigate('/mobile/pharmacy');
  }

  // 비로그인: 커뮤니티 + 로그인 우선 노출
  if (!user) {
    return (
      <nav
        className={NAV_CLASS}
        style={navSafeArea}
        aria-label="모바일 하단 메뉴"
      >
        <Link to="/" style={isCommunity ? { ...tabStyle, ...activeStyle } : tabStyle} aria-label="커뮤니티">
          <Home size={22} strokeWidth={isCommunity ? 2.5 : 1.75} />
          <span style={labelStyle}>커뮤니티</span>
        </Link>
        <button
          onClick={openLoginModal}
          style={{ ...tabStyle, ...loginStyle }}
          aria-label="로그인"
        >
          <LogIn size={22} strokeWidth={2} />
          <span style={labelStyle}>로그인</span>
        </button>
      </nav>
    );
  }

  // 로그인: 커뮤니티 / 약국 경영 / 알림 / 내정보
  return (
    <nav
      className={NAV_CLASS}
      style={navSafeArea}
      aria-label="모바일 하단 메뉴"
    >
      <Link
        to="/"
        style={isCommunity ? { ...tabStyle, ...activeStyle } : tabStyle}
        aria-label="커뮤니티"
      >
        <Home size={22} strokeWidth={isCommunity ? 2.5 : 1.75} />
        <span style={labelStyle}>커뮤니티</span>
      </Link>

      <button
        onClick={handlePharmacyTab}
        style={isPharmacy ? { ...tabStyle, ...activeStyle } : tabStyle}
        aria-label="약국 경영"
      >
        <Building2 size={22} strokeWidth={isPharmacy ? 2.5 : 1.75} />
        <span style={labelStyle}>약국 경영</span>
      </button>

      <button
        onClick={() => (notifOpen ? setNotifOpen(false) : openNotif())}
        style={notifOpen ? { ...tabStyle, ...activeStyle } : tabStyle}
        aria-label="알림"
        aria-haspopup="dialog"
        aria-expanded={notifOpen}
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Bell size={22} strokeWidth={notifOpen ? 2.5 : 1.75} />
          <NotificationTabBadge unreadCount={notif.unreadCount} style={badgeStyle} />
        </span>
        <span style={labelStyle}>알림</span>
      </button>

      <Link
        to="/mypage"
        style={isMyPage ? { ...tabStyle, ...activeStyle } : tabStyle}
        aria-label="내정보"
      >
        <User size={22} strokeWidth={isMyPage ? 2.5 : 1.75} />
        <span style={labelStyle}>내정보</span>
      </Link>

      {notifOpen && (
        <div
          onClick={() => setNotifOpen(false)}
          aria-hidden
          className="md:hidden fixed inset-0 z-40 bg-black/30"
        />
      )}
      {notifOpen && (
        <NotificationSheet
          notifications={notif.notifications}
          unreadCount={notif.unreadCount}
          loading={notif.loading}
          onClose={() => setNotifOpen(false)}
          onItemClick={handleNotifItem}
          onMarkAllAsRead={() => void notif.markAllAsRead()}
          markAllClassName="text-emerald-600 hover:bg-emerald-50"
          accentDotClassName="bg-emerald-500"
          unreadRowClassName="bg-emerald-50/50"
        />
      )}
    </nav>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// display/visibility는 Tailwind만 제어 — inline style로 display 지정 금지
// (inline style은 md:hidden보다 우선순위가 높아 재정의됨)
const NAV_CLASS =
  'flex md:hidden fixed bottom-0 left-0 right-0 z-50 items-stretch bg-white border-t border-slate-200';

// safe-area-inset만 inline style로 — Tailwind 미지원 CSS custom property
const navSafeArea: React.CSSProperties = {
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
};

const tabStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  gap: 2,
  padding: '8px 0',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  textDecoration: 'none',
  color: '#94a3b8',
};

const activeStyle: React.CSSProperties = {
  color: '#059669',
};

const loginStyle: React.CSSProperties = {
  color: '#059669',
  fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1,
};

// unread 배지 — NotificationBell 과 같은 상한 규칙(99+)은 NotificationTabBadge 가 처리한다.
const badgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: -4,
  right: -8,
  minWidth: 16,
  height: 16,
  padding: '0 4px',
  borderRadius: 999,
  background: '#ef4444',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  lineHeight: '16px',
  textAlign: 'center',
};
