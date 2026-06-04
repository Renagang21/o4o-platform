/**
 * PharmacyHubLayout — 약국 HUB 좌측 사이드바 + 우측 본문 레이아웃
 *
 * WO-KPA-PHARMACY-HUB-SIDEBAR-LAYOUT-AND-PRODUCT-TABS-FIX-V1
 * WO-O4O-PHARMACY-HUB-LAYOUT-MOBILE-V1:
 *   AdminLayout drawer 패턴 적용. mobile에서 sidebar가 본문을 압박/덮는 문제 해소.
 *   - mobile-only sticky 토글 바 (햄버거 + "허브 메뉴")
 *   - aside: mobile fixed drawer (slide-in transform + backdrop) / desktop static flex-item
 *   - 메뉴 항목 클릭 시 drawer 자동 닫힘
 *   메뉴 구조 / 라우팅 / 권한 변경 없음.
 *
 * 상단 섹션 나열형 구조에서 좌측 사이드바 메뉴 + 우측 본문 구조로 전환.
 * Outlet으로 선택된 메뉴의 페이지를 렌더링한다.
 */

import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Menu,
  Home,
  PackageSearch,
  MonitorPlay,
  BadgePercent,
  Files,
  Newspaper,
  Megaphone,
  QrCode,
  type LucideIcon,
} from 'lucide-react';
import { colors } from '../../styles/theme';

interface HubMenuItem {
  label: string;
  path: string;
  // WO-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1:
  // O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1 — emoji 제거, lucide line icon 통일
  icon: LucideIcon;
  description: string;
}

const HUB_MENU_ITEMS: HubMenuItem[] = [
  { label: '홈', path: '/store-hub', icon: Home, description: '자원 탐색 허브 · 운영 흐름 안내' },
  { label: '상품 카탈로그', path: '/store-hub/b2b', icon: PackageSearch, description: '공급 가능 상품 탐색 · 내 매장에 추가' },
  { label: '디지털 사이니지', path: '/store-hub/signage', icon: MonitorPlay, description: '사이니지 미디어 · 플레이리스트' },
  { label: '이벤트/특가', path: '/store-hub/event-offers', icon: BadgePercent, description: 'KPA-Society 이벤트 상품' },
  { label: '콘텐츠/자료', path: '/store-hub/content', icon: Files, description: 'CMS 콘텐츠 탐색 · 복사' },
  // WO-O4O-STORE-HUB-BLOG-CONTENT-IMPORT-V1: 매장 HUB 블로그 진열 + 가져가기
  { label: '블로그', path: '/store-hub/blog', icon: Newspaper, description: '운영자 게시 블로그 · 내 매장으로 가져가기' },
  // WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1: 매장 HUB POP 진열 + 가져가기
  { label: 'POP', path: '/store-hub/pop', icon: Megaphone, description: '운영자 게시 POP · 내 매장으로 가져가기' },
  // WO-O4O-KPA-STORE-HUB-QR-CONTENT-IMPORT-V1: 매장 HUB QR 진열 + 가져가기
  // 매장 사본은 기존 StoreQRPage (/store/marketing/qr) 가 그대로 표시 — 별도 사본 관리 화면 없음.
  { label: 'QR-code', path: '/store-hub/qr', icon: QrCode, description: '운영자 게시 QR 템플릿 · 내 매장으로 가져가기' },
];

function isMenuActive(pathname: string, menuPath: string): boolean {
  if (menuPath === '/store-hub') {
    return pathname === '/store-hub';
  }
  return pathname.startsWith(menuPath);
}

export function PharmacyHubLayout() {
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div style={layoutStyles.wrapper} className="flex-col md:flex-row">
      {/* Mobile-only sidebar toggle bar — desktop 숨김 */}
      <div className="md:hidden sticky top-16 z-20 bg-white border-b border-slate-200 px-4 py-2 flex items-center">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="HUB 메뉴 열기"
          aria-expanded={mobileMenuOpen}
          aria-controls="pharmacy-hub-sidebar"
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
        >
          <Menu className="w-5 h-5" />
          허브 메뉴
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-x-0 top-16 bottom-0 bg-black/40 z-30"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — mobile drawer (fixed) / desktop static flex-item */}
      <aside
        id="pharmacy-hub-sidebar"
        style={layoutStyles.sidebar}
        className={`fixed left-0 top-16 bottom-0 z-40 transition-transform duration-200 ease-out md:static md:top-auto md:bottom-auto md:z-auto md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div style={layoutStyles.sidebarHeader}>
          <h2 style={layoutStyles.sidebarTitle}>매장 운영 허브</h2>
          <p style={layoutStyles.sidebarSubtitle}>
            플랫폼이 제공하는 자원을 탐색하고 내 매장으로 가져갑니다
          </p>
        </div>

        <nav style={layoutStyles.nav}>
          {HUB_MENU_ITEMS.map(item => {
            const active = isMenuActive(pathname, item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                style={{
                  ...layoutStyles.menuItem,
                  ...(active ? layoutStyles.menuItemActive : {}),
                }}
              >
                <span style={layoutStyles.menuIcon}>
                  <Icon size={18} color={active ? colors.primary : colors.neutral600} />
                </span>
                <div style={layoutStyles.menuText}>
                  <span
                    style={{
                      ...layoutStyles.menuLabel,
                      ...(active ? layoutStyles.menuLabelActive : {}),
                    }}
                  >
                    {item.label}
                  </span>
                  <span style={layoutStyles.menuDesc}>{item.description}</span>
                </div>
                {active && <span style={layoutStyles.activeIndicator} />}
              </Link>
            );
          })}
        </nav>

        <div style={layoutStyles.sidebarFooter}>
          <span style={layoutStyles.footerNote}>
  탐색한 자원은 내 약국 (/store)에서 설정·운영합니다.
          </span>
        </div>
      </aside>

      {/* Content */}
      <main style={layoutStyles.content}>
        <Outlet />
      </main>
    </div>
  );
}

const layoutStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    minHeight: 'calc(100vh - 120px)',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  /* ── Sidebar ── */
  sidebar: {
    width: '260px',
    flexShrink: 0,
    backgroundColor: colors.white,
    borderRight: `1px solid ${colors.neutral200}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
  },
  sidebarHeader: {
    padding: '0 20px 20px',
    borderBottom: `1px solid ${colors.neutral100}`,
    marginBottom: '8px',
  },
  sidebarTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  sidebarSubtitle: {
    margin: '6px 0 0',
    fontSize: '0.75rem',
    color: colors.neutral400,
    lineHeight: 1.4,
  },

  /* ── Nav ── */
  nav: {
    flex: 1,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: colors.neutral600,
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: `${colors.primary}0A`,
  },
  menuIcon: {
    fontSize: '18px',
    flexShrink: 0,
    width: '24px',
    textAlign: 'center',
  },
  menuText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1,
  },
  menuLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral700,
  },
  menuLabelActive: {
    fontWeight: 600,
    color: colors.primary,
  },
  menuDesc: {
    fontSize: '0.6875rem',
    color: colors.neutral400,
    lineHeight: 1.3,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '8px',
    bottom: '8px',
    width: '3px',
    borderRadius: '0 3px 3px 0',
    backgroundColor: colors.primary,
  },

  /* ── Footer ── */
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: `1px solid ${colors.neutral100}`,
    marginTop: 'auto',
  },
  footerNote: {
    fontSize: '0.6875rem',
    color: colors.neutral400,
    lineHeight: 1.4,
  },

  /* ── Content ── */
  content: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.neutral50,
  },
};
