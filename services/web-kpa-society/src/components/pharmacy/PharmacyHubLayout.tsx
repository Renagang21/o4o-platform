/**
 * PharmacyHubLayout — 약국 HUB 좌측 사이드바 + 우측 본문 레이아웃
 *
 * WO-KPA-PHARMACY-HUB-SIDEBAR-LAYOUT-AND-PRODUCT-TABS-FIX-V1
 *
 * 상단 섹션 나열형 구조에서 좌측 사이드바 메뉴 + 우측 본문 구조로 전환.
 * Outlet으로 선택된 메뉴의 페이지를 렌더링한다.
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
import { colors } from '../../styles/theme';

interface HubMenuItem {
  label: string;
  path: string;
  icon: string;
  description: string;
}

const HUB_MENU_ITEMS: HubMenuItem[] = [
  { label: '상품 카탈로그', path: '/hub/b2b', icon: '\u{1F6D2}', description: '공급 가능 상품 탐색 · 취급 신청' },
  { label: '디지털 사이니지', path: '/hub/signage', icon: '\u{1F5A5}\uFE0F', description: '사이니지 미디어 · 플레이리스트' },
  { label: '공동구매', path: '/hub/groupbuy', icon: '\u{1F6CD}\uFE0F', description: '약사회 공동구매 상품' },
  { label: '콘텐츠/자료', path: '/hub/content', icon: '\u{1F4C4}', description: 'CMS 콘텐츠 탐색 · 복사' },
];

function isMenuActive(pathname: string, menuPath: string): boolean {
  if (menuPath === '/hub/b2b') {
    return pathname === '/hub/b2b' || pathname === '/hub';
  }
  return pathname.startsWith(menuPath);
}

export function PharmacyHubLayout() {
  const { pathname } = useLocation();

  return (
    <div style={layoutStyles.wrapper}>
      {/* Sidebar */}
      <aside style={layoutStyles.sidebar}>
        <div style={layoutStyles.sidebarHeader}>
          <h2 style={layoutStyles.sidebarTitle}>약국 HUB</h2>
          <p style={layoutStyles.sidebarSubtitle}>
            플랫폼이 제공하는 자원을 탐색하고 내 매장으로 가져갑니다
          </p>
        </div>

        <nav style={layoutStyles.nav}>
          {HUB_MENU_ITEMS.map(item => {
            const active = isMenuActive(pathname, item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...layoutStyles.menuItem,
                  ...(active ? layoutStyles.menuItemActive : {}),
                }}
              >
                <span style={layoutStyles.menuIcon}>{item.icon}</span>
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
            선택한 콘텐츠 · 상품 · 서비스는 내 매장관리에서 관리할 수 있습니다.
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
