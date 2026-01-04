/**
 * Footer - K-Cosmetics 푸터
 * WO-KCOS-HOME-UI-V1
 *
 * 책임 경계 고지 포함
 */

import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        {/* 링크 섹션 */}
        <div style={styles.links}>
          <Link to="/about" style={styles.link}>플랫폼 소개</Link>
          <Link to="/stores" style={styles.link}>매장 디렉토리</Link>
          <Link to="/partners" style={styles.link}>파트너 프로그램</Link>
          <Link to="/tourists" style={styles.link}>관광객 안내</Link>
          <Link to="/contact" style={styles.link}>문의</Link>
        </div>

        {/* 책임 경계 고지 */}
        <p style={styles.disclaimer}>
          K-Cosmetics Distribution Network는 직접 판매를 하지 않습니다.
          모든 구매는 각 파트너 매장에서 직접 이루어집니다.
        </p>

        {/* 회사 정보 */}
        <div style={styles.companyInfo}>
          <p style={styles.company}>
            © 2026 ㈜쓰리라이프존 | 사업자등록번호 108-86-02873
          </p>
          <p style={styles.contact}>
            고객센터 1577-2779 | sohae2100@gmail.com
          </p>
        </div>

        {/* 정책 링크 */}
        <div style={styles.policyLinks}>
          <Link to="/terms" style={styles.policyLink}>이용약관</Link>
          <span style={styles.divider}>|</span>
          <Link to="/privacy" style={styles.policyLink}>개인정보처리방침</Link>
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    padding: '48px 24px 32px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    textAlign: 'center',
  },
  links: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '24px',
    marginBottom: '24px',
  },
  link: {
    color: '#aaa',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'color 0.2s',
  },
  disclaimer: {
    fontSize: '13px',
    color: '#888',
    margin: '0 0 24px 0',
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    lineHeight: 1.6,
  },
  companyInfo: {
    marginBottom: '16px',
  },
  company: {
    fontSize: '12px',
    color: '#666',
    margin: '0 0 4px 0',
  },
  contact: {
    fontSize: '12px',
    color: '#666',
    margin: 0,
  },
  policyLinks: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
  },
  policyLink: {
    color: '#666',
    textDecoration: 'none',
    fontSize: '12px',
  },
  divider: {
    color: '#444',
    fontSize: '12px',
  },
};
