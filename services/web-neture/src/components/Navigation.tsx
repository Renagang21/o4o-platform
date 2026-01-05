interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: '홈', href: '/' },
  { label: 'Trials', href: '/trials' },
  { label: 'B2B 조달', href: '/procurement' },
];

export function Navigation() {
  // Phase 2-B: 현재 경로 하이라이트 (추후 React Router 연동)
  const currentPath = window.location.pathname;

  return (
    <nav style={styles.nav}>
      <ul style={styles.navList}>
        {navItems.map((item) => (
          <li key={item.href} style={styles.navItem}>
            <a
              href={item.href}
              style={{
                ...styles.navLink,
                ...(currentPath === item.href ? styles.navLinkActive : {}),
              }}
            >
              {item.label}
            </a>
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
