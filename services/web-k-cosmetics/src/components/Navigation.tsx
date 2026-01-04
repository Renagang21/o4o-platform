/**
 * Navigation - K-Cosmetics 상단 메뉴
 * WO-KCOS-HOME-UI-V1
 *
 * 메뉴 (한국어 고정): 매장 | 관광객 안내 | 파트너 안내 | 플랫폼 소개 | 문의
 */

import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: '매장', path: '/stores' },
  { label: '관광객 안내', path: '/tourists' },
  { label: '파트너 안내', path: '/partners' },
  { label: '플랫폼 소개', path: '/about' },
  { label: '문의', path: '/contact' },
];

export function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav style={styles.nav}>
      <ul style={styles.navList}>
        {navItems.map((item) => (
          <li key={item.path} style={styles.navItem}>
            <Link
              to={item.path}
              style={{
                ...styles.navLink,
                ...(isActive(item.path) ? styles.navLinkActive : {}),
              }}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    padding: '0 24px',
  },
  navList: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: '4px',
    maxWidth: '1000px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  navItem: {
    margin: 0,
  },
  navLink: {
    display: 'block',
    padding: '14px 16px',
    color: '#666',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    borderBottom: '2px solid transparent',
    transition: 'color 0.2s, border-color 0.2s',
  },
  navLinkActive: {
    color: '#1a1a1a',
    borderBottomColor: '#1a1a1a',
  },
};
