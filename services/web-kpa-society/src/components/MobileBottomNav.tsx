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

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Building2, Bell, User, LogIn, LogOut, X } from 'lucide-react';
import { useNotifications } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/LoginModalContext';
import { notificationsApi } from '../api/notifications';
import { KpaUserMenuItems, getKpaUserDisplayName } from './KpaUserMenu';
import { resolveNotificationTarget } from '../lib/notificationRouting';

function formatRelative(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString('ko-KR');
}

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
  const { user, logout } = useAuth();
  const { openLoginModal } = useAuthModal();
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  // WO-O4O-KPA-MOBILE-NAV-AND-PROFILE-MENU-SEPARATION-V1:
  //   '내정보' 탭 = 사용자 프로필 메뉴(bottom sheet) 열기. 사이트 nav(상단 햄버거)와 분리.
  // WO-O4O-KPA-MOBILE-BOTTOM-UTILITY-NAV-ROUTE-COVERAGE-FIX-V1:
  //   '알림' 탭 = 알림 bottom sheet. 데스크톱 상단 NotificationBell 과 동일 source 재사용
  //   (모바일에서는 상단 utility 숨김 → 하단으로 이동). 한 번에 하나의 시트만 open.
  const [openSheet, setOpenSheet] = useState<'none' | 'profile' | 'notif'>('none');

  // 알림 — KpaGlobalHeader 와 동일 serviceKey('kpa-society') source. 새 API 없음.
  const notif = useNotifications(notificationsApi, { enabled: !!user, serviceKey: 'kpa-society' });

  const isCommunity = pathname === '/' || pathname.startsWith('/forum') || pathname.startsWith('/lms') || pathname.startsWith('/resources');
  const isPharmacy = isPharmacyActive(pathname);

  function handlePharmacyTab() {
    if (!isPharmacy) navigate('/mobile/pharmacy');
  }

  const closeSheet = () => setOpenSheet('none');

  function openNotif() {
    setOpenSheet('notif');
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

  // 라우트 이동 시 시트 자동 닫힘 (메뉴 항목 클릭 후)
  useEffect(() => { setOpenSheet('none'); }, [pathname]);

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
        onClick={() => (openSheet === 'notif' ? closeSheet() : openNotif())}
        style={openSheet === 'notif' ? { ...tabStyle, ...activeStyle } : tabStyle}
        aria-label="알림"
        aria-haspopup="dialog"
        aria-expanded={openSheet === 'notif'}
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Bell size={22} strokeWidth={openSheet === 'notif' ? 2.5 : 1.75} />
          {notif.unreadCount > 0 && (
            <span
              aria-label={`읽지 않은 알림 ${notif.unreadCount}건`}
              style={badgeStyle}
            >
              {notif.unreadCount > 99 ? '99+' : notif.unreadCount}
            </span>
          )}
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
        <div
          onClick={closeSheet}
          aria-hidden
          className="md:hidden fixed inset-0 z-40 bg-black/30"
        />
      )}

      {/* ── 알림 시트 (데스크톱 NotificationBell 과 동일 source) ── */}
      {openSheet === 'notif' && (
        <div
          role="dialog"
          aria-label="알림 목록"
          className="md:hidden fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">알림</p>
            <div className="flex items-center gap-1">
              {notif.unreadCount > 0 && (
                <button
                  onClick={() => void notif.markAllAsRead()}
                  className="text-xs text-blue-600 hover:bg-blue-50 rounded px-2 py-1"
                >
                  모두 읽음
                </button>
              )}
              <button
                onClick={closeSheet}
                aria-label="닫기"
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto">
            {notif.loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">불러오는 중...</div>
            ) : notif.notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">알림이 없습니다.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notif.notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleNotifItem(n)}
                      className={`w-full text-left px-4 py-3 transition ${n.isRead ? 'bg-white' : 'bg-blue-50/50'} hover:bg-slate-50`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && (
                          <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{n.title}</div>
                          {n.message && (
                            <div className="mt-0.5 text-xs text-slate-600 line-clamp-2">{n.message}</div>
                          )}
                          <div className="mt-1 text-[11px] text-slate-400">{formatRelative(n.createdAt)}</div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── 프로필 시트 (사용자 이름·이메일 + 역할별 대시보드 + 계정 메뉴 + 로그아웃) ── */}
      {openSheet === 'profile' && (
        <div
          role="menu"
          aria-label="내 정보 메뉴"
          className="md:hidden fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {getKpaUserDisplayName(user)}님
              </p>
              <p className="text-xs text-slate-500 break-all">{user?.email}</p>
            </div>
            <button
              onClick={closeSheet}
              aria-label="닫기"
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="py-1">
            <KpaUserMenuItems user={user} onItemClick={closeSheet} />
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
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// display/visibility는 Tailwind만 제어 — inline style로 display 지정 금지
// (inline style은 md:hidden보다 우선순위가 높아 재정의됨)
const NAV_CLASS =
  'flex md:hidden fixed bottom-0 left-0 right-0 z-40 items-stretch bg-white border-t border-slate-200';

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
