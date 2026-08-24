/**
 * PlatformHeader - 플랫폼 홈 헤더
 *
 * WO-KPA-HOME-FOUNDATION-V1
 * WO-KPA-HOME-REFINE-V1: 메뉴 명칭 카드와 일치
 */

// WO-O4O-CROSSSERVICE-HEADER-FOOTER-FINAL-CLOSURE-AUDIT-V1 §7/§20:
//   `#services` 는 대상 anchor(`id="services"`)가 KPA 전 소스에 존재하지 않는 dead link 였다.
//   (`#about` 은 `PlatformFooter` 의 `id="about"` 로 유효하다.) dead 항목만 제거한다.
const menuItems = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '#about' },
];

export function PlatformHeader() {
  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <a href="/" style={styles.logo}>
          O4O Platform
        </a>
        <nav style={styles.nav}>
          <ul style={styles.navList}>
            {menuItems.map((item) => (
              <li key={item.label} style={styles.navItem}>
                <a href={item.href} style={styles.navLink}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="/login" style={styles.loginButton}>
            Login
          </a>
        </nav>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  navList: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: '24px',
  },
  navItem: {
    margin: 0,
  },
  navLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  loginButton: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: '#0f172a',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
};

export default PlatformHeader;
