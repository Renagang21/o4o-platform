/**
 * StoreManagementLayout — 매장 관리 사이드바 + 콘텐츠 래퍼
 *
 * WO-STORE-ADMIN-CONSOLIDATION-V1
 *
 * /store/* 하위 모든 페이지에 사이드바 내비게이션을 제공.
 * 패턴 참조: AdminSidebar.tsx
 */

import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { colors } from '../../styles/theme';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

const MENU_ITEMS: MenuItem[] = [
  { path: '', label: '개요', icon: '📊' },
  { path: '/layout', label: '레이아웃', icon: '🧱' },
  { path: '/template', label: '템플릿', icon: '🎨' },
  { path: '/blog', label: '블로그', icon: '📝' },
  { path: '/tablet', label: '태블릿', icon: '📱' },
  { path: '/channels', label: '채널', icon: '📡' },
  { path: '/cyber-templates', label: '사이버 공간', icon: '🌐' },
];

const BASE_PATH = '/store';

export function StoreManagementLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  const isActive = (path: string) => {
    const fullPath = `${BASE_PATH}${path}`;
    if (path === '') {
      return location.pathname === BASE_PATH || location.pathname === `${BASE_PATH}/`;
    }
    return location.pathname.startsWith(fullPath);
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.header}>
          <div style={styles.headerIcon}>🏪</div>
          <div>
            <div style={styles.headerTitle}>매장 관리</div>
            <div style={styles.headerSub}>스토어 운영</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={`${BASE_PATH}${item.path}`}
              style={{
                ...styles.menuItem,
                ...(isActive(item.path) ? styles.menuItemActive : {}),
              }}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={styles.footer}>
          <Link to="/store" style={styles.footerLink}>
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </aside>

      <main style={styles.content}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: 'calc(100vh - 120px)',
  },
  sidebar: {
    width: '220px',
    flexShrink: 0,
    backgroundColor: colors.white,
    borderRight: `1px solid ${colors.neutral200}`,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 16px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    backgroundColor: colors.primary,
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  headerTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  headerSub: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  nav: {
    flex: 1,
    padding: '12px 8px',
    overflowY: 'auto',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: colors.neutral700,
    fontSize: '14px',
    marginBottom: '2px',
  },
  menuItemActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  menuIcon: {
    fontSize: '16px',
    width: '22px',
    textAlign: 'center',
  },
  footer: {
    padding: '14px 16px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  footerLink: {
    fontSize: '13px',
    color: colors.neutral500,
    textDecoration: 'none',
  },
  content: {
    flex: 1,
    backgroundColor: colors.neutral50,
    overflow: 'auto',
  },
};
