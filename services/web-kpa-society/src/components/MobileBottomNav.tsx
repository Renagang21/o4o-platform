/**
 * MobileBottomNav — KPA-Society 모바일 하단 네비게이션
 *
 * WO-O4O-KPA-MOBILE-MENU-STRUCTURE-PHASE2-V1
 *
 * md 미만(768px 이하) 에서만 표시 (md:hidden).
 * 웹 헤더/메뉴 구조에 영향 없음.
 *
 * 비로그인: 커뮤니티 + 로그인 버튼 (로그인 우선 노출)
 * 로그인:   커뮤니티 / 약국 경영 / 알림 / 내정보
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Building2, Bell, User, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/LoginModalContext';

// 약국 경영 active 판정: /mobile/pharmacy, /pharmacy, /store-hub, /store (slug 경로 제외)
function isPharmacyActive(pathname: string): boolean {
  if (pathname === '/mobile/pharmacy') return true;
  if (pathname.startsWith('/pharmacy')) return true;
  if (pathname.startsWith('/store-hub')) return true;
  // /store/slug (매장 퍼블릭 페이지) 제외: /store 자체 또는 /store/dashboard 등만 포함
  if (pathname === '/store' || pathname.startsWith('/store/')) {
    // /store/:slug 공개 페이지 제외 — slug 라우트는 영문 소문자+하이픈 패턴
    const afterStore = pathname.slice('/store/'.length);
    const isSlug = afterStore.length > 0 && !afterStore.includes('/') && !/^(dashboard|info|marketing|commerce|analytics|my-products|library|channels|content|billing|settings|requests|qr|pop|signage|analytics)/.test(afterStore);
    return !isSlug;
  }
  return false;
}

export function MobileBottomNav() {
  const { user } = useAuth();
  const { openLoginModal } = useAuthModal();
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  const isCommunity = pathname === '/' || pathname.startsWith('/forum') || pathname.startsWith('/lms') || pathname.startsWith('/resources');
  const isPharmacy = isPharmacyActive(pathname);
  const isNotif = pathname.startsWith('/mypage') && pathname.includes('notif');
  const isMyPage = pathname.startsWith('/mypage');

  function handlePharmacyTab() {
    if (!isPharmacy) navigate('/mobile/pharmacy');
  }

  // 비로그인: 커뮤니티 + 로그인 우선 노출
  if (!user) {
    return (
      <nav
        className="md:hidden"
        style={navStyle}
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
      className="md:hidden"
      style={navStyle}
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

const navStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'stretch',
  backgroundColor: '#ffffff',
  borderTop: '1px solid #e2e8f0',
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
  color: '#2563eb',
};

const loginStyle: React.CSSProperties = {
  color: '#2563eb',
  fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1,
};
