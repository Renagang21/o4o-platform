import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: '홈', href: '/' },
  { label: '조직', href: '/organizations' },
  { label: '회원 신청', href: '/member/apply' },
  { label: '내 신청', href: '/applications' },
];

export function Navigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav style={styles.nav}>
      <ul style={styles.navList}>
        {navItems.map((item) => (
          <li key={item.href} style={styles.navItem}>
            <Link
              to={item.href}
              style={{
                ...styles.navLink,
                ...(currentPath === item.href ? styles.navLinkActive : {}),
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
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
    padding: '0 24px',
  },
  navList: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: '8px',
  },
  navItem: {
    margin: 0,
  },
  navLink: {
    display: 'block',
    padding: '12px 16px',
    color: '#666',
    textDecoration: 'none',
    fontSize: '14px',
    borderBottom: '2px solid transparent',
    transition: 'color 0.2s, border-color 0.2s',
  },
  navLinkActive: {
    color: '#007bff',
    borderBottomColor: '#007bff',
  },
};
