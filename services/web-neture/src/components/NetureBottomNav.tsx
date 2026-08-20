/**
 * NetureBottomNav — Neture 모바일 하단 utility 네비게이션
 *
 * WO-O4O-NETURE-MOBILE-NAV-PROFILE-UTILITY-AND-WORKSPACE-ACCESS-STANDARDIZE-V1
 *
 * md 미만(<768px)에서만 표시(md:hidden). 인증 사용자에게만 렌더(비인증 시 null →
 * 공개 랜딩/QR/제품 페이지 누출 방지). 상단 햄버거(사이트 nav)와 역할 분리:
 *   상단 햄버거 = 사이트 이동 / 하단 utility = 알림·프로필(개인 기능).
 *
 * 알림은 NetureGlobalHeader 와 동일 source(useNotifications) 재사용 — 새 API 없음.
 * 프로필은 NetureUserMenuItems(SSOT) 재사용.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Bell, User, LogOut, X } from 'lucide-react';
import { useNotifications, NotificationSheet, NotificationTabBadge } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';
import { notificationsApi, NOTIFICATION_SERVICE_KEY } from '../lib/api/notifications';
import { useAuth } from '../contexts/AuthContext';
import { NetureUserMenuItems, getNetureUserDisplayName } from './NetureUserMenu';
import { resolveNetureNotificationTarget } from '../lib/notificationRouting';

export function NetureBottomNav() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  const [openSheet, setOpenSheet] = useState<'none' | 'profile' | 'notif'>('none');

  const notif = useNotifications(notificationsApi, {
    enabled: isAuthenticated && !!user,
    serviceKey: NOTIFICATION_SERVICE_KEY,
  });

  const closeSheet = () => setOpenSheet('none');

  function openNotif() {
    setOpenSheet('notif');
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

  // ESC 로 닫기 + 열렸을 때 배경 스크롤 잠금
  useEffect(() => {
    if (openSheet === 'none') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenSheet('none'); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openSheet]);

  // 라우트 이동 시 시트 자동 닫힘
  useEffect(() => { setOpenSheet('none'); }, [pathname]);

  // 비인증 사용자에게는 렌더하지 않음(공개 페이지 누출 방지)
  if (!isAuthenticated || !user) return null;

  const isHome = pathname === '/';

  return (
    <>
    {/* 하단 nav(고정) 높이만큼 문서 흐름 여백 — 콘텐츠 마지막 부분 가림 방지. 인증 시에만 렌더. */}
    <div className="md:hidden" aria-hidden style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }} />
    <nav className={NAV_CLASS} style={navSafeArea} aria-label="모바일 하단 메뉴">
      <Link to="/" style={isHome ? { ...tabStyle, ...activeStyle } : tabStyle} aria-label="홈">
        <Home size={22} strokeWidth={isHome ? 2.5 : 1.75} />
        <span style={labelStyle}>홈</span>
      </Link>

      <button
        onClick={() => (openSheet === 'notif' ? closeSheet() : openNotif())}
        style={openSheet === 'notif' ? { ...tabStyle, ...activeStyle } : tabStyle}
        aria-label="알림"
        aria-haspopup="dialog"
        aria-expanded={openSheet === 'notif'}
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Bell size={22} strokeWidth={openSheet === 'notif' ? 2.5 : 1.75} />
          <NotificationTabBadge unreadCount={notif.unreadCount} style={badgeStyle} />
        </span>
        <span style={labelStyle}>알림</span>
      </button>

      <button
        onClick={() => (openSheet === 'profile' ? closeSheet() : setOpenSheet('profile'))}
        style={openSheet === 'profile' ? { ...tabStyle, ...activeStyle } : tabStyle}
        aria-label="내정보"
        aria-haspopup="menu"
        aria-expanded={openSheet === 'profile'}
      >
        <User size={22} strokeWidth={openSheet === 'profile' ? 2.5 : 1.75} />
        <span style={labelStyle}>내정보</span>
      </button>

      {/* ── 공통 backdrop ── */}
      {openSheet !== 'none' && (
        <div onClick={closeSheet} aria-hidden className="md:hidden fixed inset-0 z-40 bg-black/30" />
      )}

      {/* ── 알림 시트 — 공통 NotificationSheet (WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1) ── */}
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

      {/* ── 프로필 시트 (이름·이메일 + 역할별 업무 공간 + 계정 메뉴 + 로그아웃) ── */}
      {openSheet === 'profile' && (
        <div
          role="menu"
          aria-label="내 정보 메뉴"
          className="md:hidden fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{getNetureUserDisplayName(user)}님</p>
              <p className="text-xs text-slate-500 break-all">{user?.email}</p>
            </div>
            <button onClick={closeSheet} aria-label="닫기" className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="py-1">
            <NetureUserMenuItems user={user} isAuthenticated={isAuthenticated} onItemClick={closeSheet} />
          </nav>
          <div className="border-t border-slate-100 py-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </nav>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const NAV_CLASS =
  'flex md:hidden fixed bottom-0 left-0 right-0 z-40 items-stretch bg-white border-t border-slate-200';

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

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1,
};

const badgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: -6,
  right: -8,
  minWidth: 16,
  height: 16,
  padding: '0 4px',
  borderRadius: 999,
  background: '#ef4444',
  color: '#fff',
  fontSize: 10,
  fontWeight: 600,
  lineHeight: '16px',
  textAlign: 'center',
};
