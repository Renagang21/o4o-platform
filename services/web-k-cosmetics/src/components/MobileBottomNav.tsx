/**
 * MobileBottomNav — K-Cosmetics 모바일 하단 네비게이션
 *
 * WO-O4O-KCOS-MENU-CANONICAL-ALIGN-V1
 *
 * md 미만(768px 이하) 에서만 표시 (md:hidden).
 * 웹 헤더/메뉴 구조에 영향 없음.
 *
 * 비로그인: 커뮤니티 + 로그인 버튼 (로그인 우선 노출)
 * 로그인:   커뮤니티 / 매장 경영 / 알림 / 내정보
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Building2, Bell, User, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';

// 매장 경영 active 판정: /mobile/store, /store-hub, /store 대시보드
function isStoreActive(pathname: string): boolean {
  if (pathname === '/mobile/store') return true;
  if (pathname.startsWith('/store-hub')) return true;
  if (pathname === '/store' || pathname.startsWith('/store/')) {
    // /store/:id 소비자 경로 제외 (숫자 시작)
    const afterStore = pathname.slice('/store/'.length);
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

  const isCommunity =
    pathname === '/' ||
    pathname.startsWith('/forum') ||
    pathname.startsWith('/lms') ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/content');
  const isStore = isStoreActive(pathname);
  const isNotif = pathname.startsWith('/mypage') && pathname.includes('notif');
  const isMyPage = pathname.startsWith('/mypage');

  function handleStoreTab() {
    if (!isStore) navigate('/mobile/store');
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

  // 로그인: 커뮤니티 / 매장 경영 / 알림 / 내정보
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
        onClick={handleStoreTab}
        style={isStore ? { ...tabStyle, ...activeStyle } : tabStyle}
        aria-label="매장 경영"
      >
        <Building2 size={22} strokeWidth={isStore ? 2.5 : 1.75} />
        <span style={labelStyle}>매장 경영</span>
      </button>

      <Link
        to="/mypage"
        style={isNotif ? { ...tabStyle, ...activeStyle } : tabStyle}
        aria-label="알림"
      >
        <Bell size={22} strokeWidth={isNotif ? 2.5 : 1.75} />
        <span style={labelStyle}>알림</span>
      </Link>

      <Link
        to="/mypage"
        style={isMyPage ? { ...tabStyle, ...activeStyle } : tabStyle}
        aria-label="내정보"
      >
        <User size={22} strokeWidth={isMyPage ? 2.5 : 1.75} />
        <span style={labelStyle}>내정보</span>
      </Link>
    </nav>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// display/visibility는 Tailwind만 제어 — inline style로 display 지정 금지
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
  color: '#db2777',
};

const loginStyle: React.CSSProperties = {
  color: '#db2777',
  fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1,
};
