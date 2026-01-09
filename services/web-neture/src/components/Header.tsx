/**
 * Header - Neture 통합 헤더
 * 로고 + 네비게이션 + 로그인을 한 줄로 표시
 */

interface HeaderProps {
  serviceName: string;
}

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: '홈', href: '/' },
  { label: 'Trials', href: '/trials' },
  { label: 'B2B 조달', href: '/procurement' },
];

export function Header({ serviceName }: HeaderProps) {
  const currentPath = window.location.pathname;

  return (
    <header style={styles.header}>
      {/* 로고 */}
      <a href="/" style={styles.logo}>
        {serviceName}
      </a>

      {/* 네비게이션 */}
      <nav style={styles.nav}>
        <ul style={styles.navList}>
          {navItems.map((item) => (
            <li key={item.href} style={styles.navItem}>
              <a
                href={item.href}
                style={{
                  ...styles.navLink,
                  ...(currentPath === item.href || currentPath.startsWith(item.href + '/')
                    ? styles.navLinkActive
                    : {}),
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* 로그인 링크 */}
      <div style={styles.userArea}>
        <a href="/login" style={styles.loginLink}>
          로그인
        </a>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    height: '56px',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    marginLeft: '32px',
  },
  navList: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: '4px',
  },
  navItem: {
    margin: 0,
  },
  navLink: {
    display: 'block',
    padding: '16px 16px',
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
  userArea: {
    display: 'flex',
    alignItems: 'center',
  },
  loginLink: {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
