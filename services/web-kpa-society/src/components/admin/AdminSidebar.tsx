/**
 * AdminSidebar - 지부 관리자 사이드바
 */

import { Link, useLocation } from 'react-router-dom';
import { colors } from '../../styles/theme';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
}

export function AdminSidebar() {
  const location = useLocation();
  const basePath = '/admin';

  const menuItems: MenuItem[] = [
    { path: '', label: '대시보드', icon: '📊' },
    { path: '/kpa-dashboard', label: '플랫폼 운영', icon: '🖥️' },
    { path: '/divisions', label: '분회 관리', icon: '🏢', badge: 5 },
    { path: '/members', label: '회원 관리', icon: '👥' },
    { path: '/committee-requests', label: '위원회 관리', icon: '👥' },
    { path: '/annual-report', label: '신상신고', icon: '📝', badge: 3 },
    { path: '/membership-fee', label: '연회비', icon: '💰', badge: 2 },
    { path: '/news', label: '공지사항', icon: '📢' },
    { path: '/docs', label: '자료실', icon: '📁' },
    { path: '/signage/content', label: '안내 영상 · 자료', icon: '📹' },
    { path: '/forum', label: '게시판', icon: '💬' },
    { path: '/officers', label: '임원 관리', icon: '👔' },
    { path: '/settings', label: '설정', icon: '⚙️' },
  ];

  const isActive = (path: string) => {
    const fullPath = `${basePath}${path}`;
    if (path === '') {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    return location.pathname.startsWith(fullPath);
  };

  return (
    <aside style={styles.sidebar}>
      {/* 지부 정보 */}
      <div style={styles.branchInfo}>
        <div style={styles.branchIcon}>🏛️</div>
        <div style={styles.branchDetails}>
          <div style={styles.branchName}>서울특별시약사회</div>
          <div style={styles.branchType}>지부 관리자</div>
        </div>
      </div>

      {/* 메뉴 */}
      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={`${basePath}${item.path}`}
            style={{
              ...styles.menuItem,
              ...(isActive(item.path) ? styles.menuItemActive : {}),
            }}
          >
            <span style={styles.menuIcon}>{item.icon}</span>
            <span style={styles.menuLabel}>{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span style={styles.badge}>{item.badge}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* 하단 링크 */}
      <div style={styles.footer}>
        <Link to="/" style={styles.footerLink}>
          ← 메인으로 돌아가기
        </Link>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '260px',
    backgroundColor: colors.white,
    borderRight: `1px solid ${colors.neutral200}`,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  },
  branchInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  branchIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: colors.primary,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  branchDetails: {},
  branchName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  branchType: {
    fontSize: '13px',
    color: colors.primary,
    marginTop: '2px',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    overflowY: 'auto',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: colors.neutral700,
    fontSize: '14px',
    marginBottom: '4px',
    transition: 'background-color 0.2s, color 0.2s',
  },
  menuItemActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  menuIcon: {
    fontSize: '18px',
    width: '24px',
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
  },
  badge: {
    padding: '2px 8px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
  },
  footer: {
    padding: '16px 20px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  footerLink: {
    fontSize: '13px',
    color: colors.neutral500,
    textDecoration: 'none',
  },
};
