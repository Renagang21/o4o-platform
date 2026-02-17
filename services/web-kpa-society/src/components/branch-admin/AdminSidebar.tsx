/**
 * AdminSidebar - 분회 관리자 사이드바 (구조 관리 전용)
 *
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - 콘텐츠 CRUD (공지사항, 게시판, 자료실) → BranchOperator 이동
 * - Admin은 구조 관리만: 대시보드, 임원 관리, 분회 설정
 */

import { Link, useLocation, useParams } from 'react-router-dom';
import { colors } from '../../styles/theme';

interface MenuItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
}

const menuItems: MenuItem[] = [
  { icon: '📊', label: '대시보드', path: '' },
  { icon: '👔', label: '임원 관리', path: '/officers' },
  { icon: '⚙️', label: '분회 설정', path: '/settings' },
];

export function AdminSidebar() {
  const location = useLocation();
  const { branchId } = useParams();
  const basePath = `/branch-services/${branchId}/admin`;

  const isActive = (path: string) => {
    const fullPath = basePath + path;
    if (path === '') {
      return location.pathname === basePath || location.pathname === basePath + '/';
    }
    return location.pathname.startsWith(fullPath);
  };

  return (
    <aside style={styles.sidebar}>
      {/* 분회 정보 */}
      <div style={styles.branchInfo}>
        <div style={styles.branchIcon}>🏢</div>
        <div style={styles.branchDetails}>
          <div style={styles.branchName}>강남분회</div>
          <div style={styles.branchRole}>분회 관리자</div>
        </div>
      </div>

      {/* 메뉴 */}
      <nav style={styles.nav}>
        <ul style={styles.menuList}>
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={basePath + item.path}
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
            </li>
          ))}
        </ul>
      </nav>

      {/* 하단 링크 */}
      <div style={styles.footer}>
        <Link to={`/branch-services/${branchId}`} style={styles.footerLink}>
          ← 분회 사이트로 이동
        </Link>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '260px',
    backgroundColor: colors.neutral900,
    color: colors.white,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
  },
  branchInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderBottom: `1px solid ${colors.neutral700}`,
  },
  branchIcon: {
    fontSize: '32px',
  },
  branchDetails: {
    flex: 1,
  },
  branchName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.white,
  },
  branchRole: {
    fontSize: '12px',
    color: colors.neutral400,
    marginTop: '2px',
  },
  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 0',
  },
  menuList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    color: colors.neutral300,
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  menuItemActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderLeft: `3px solid ${colors.white}`,
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
    backgroundColor: colors.accentRed,
    color: colors.white,
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '10px',
    minWidth: '20px',
    textAlign: 'center',
  },
  footer: {
    padding: '16px 20px',
    borderTop: `1px solid ${colors.neutral700}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  footerLink: {
    color: colors.neutral400,
    textDecoration: 'none',
    fontSize: '13px',
    transition: 'color 0.2s',
  },
};
