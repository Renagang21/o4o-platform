/**
 * PlatformFooter - 플랫폼 홈 푸터
 *
 * WO-KPA-HOME-FOUNDATION-V1
 */

export function PlatformFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="about" style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.brand}>
            <h3 style={styles.brandTitle}>O4O Platform</h3>
            <p style={styles.brandDescription}>
              약사 직능을 위한 공동 플랫폼
            </p>
          </div>
          <div style={styles.links}>
            <div style={styles.linkGroup}>
              <h4 style={styles.linkGroupTitle}>서비스</h4>
              <a href="/demo" style={styles.link}>약사회 서비스 (Demo)</a>
              <a href="#" style={styles.link}>Digital Signage</a>
              <a href="#" style={styles.link}>Forum</a>
              <a href="#" style={styles.link}>LMS</a>
            </div>
            <div style={styles.linkGroup}>
              <h4 style={styles.linkGroupTitle}>정보</h4>
              <a href="#" style={styles.link}>이용약관</a>
              <a href="#" style={styles.link}>개인정보처리방침</a>
              <a href="#" style={styles.link}>문의하기</a>
            </div>
          </div>
        </div>
        <div style={styles.copyright}>
          <p style={styles.copyrightText}>
            © {currentYear} O4O Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    backgroundColor: '#0f172a',
    color: '#fff',
    padding: '48px 24px 24px',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  content: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '40px',
    marginBottom: '40px',
  },
  brand: {
    maxWidth: '300px',
  },
  brandTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    margin: '0 0 8px 0',
  },
  brandDescription: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.5,
  },
  links: {
    display: 'flex',
    gap: '64px',
    flexWrap: 'wrap',
  },
  linkGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  linkGroupTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    margin: '0 0 8px 0',
  },
  link: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  copyright: {
    borderTop: '1px solid #1e293b',
    paddingTop: '24px',
  },
  copyrightText: {
    fontSize: '0.75rem',
    color: '#64748b',
    margin: 0,
    textAlign: 'center',
  },
};

export default PlatformFooter;
