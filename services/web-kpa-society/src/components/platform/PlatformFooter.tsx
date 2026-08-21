/**
 * PlatformFooter - 플랫폼 홈 푸터
 *
 * WO-KPA-HOME-FOUNDATION-V1
 * WO-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1:
 *   placeholder anchor(dead link) 제거 → KPA canonical route 연결(react-router Link, SPA 유지).
 *   법정정보는 하드코딩하지 않고 공통 계약(PublicLegalFooterInfo + loadFooterLegal)을 재사용한다.
 *   canonical 선례: src/components/Footer.tsx (serviceKey="kpa-society" + loadFooterLegal).
 *   이용약관 = /policy (KPA 에 /terms route 는 없다) · 개인정보처리방침 = /privacy · 문의하기 = /contact.
 */

import { Link } from 'react-router-dom';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { loadFooterLegal } from '../../lib/footerLegal';

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
              <Link to="/guide/features/signage" style={styles.link}>Digital Signage</Link>
              <Link to="/guide/features/forum" style={styles.link}>Forum</Link>
              <Link to="/guide/features/content" style={styles.link}>콘텐츠 안내</Link>
            </div>
            <div style={styles.linkGroup}>
              <h4 style={styles.linkGroupTitle}>정보</h4>
              <Link to="/policy" style={styles.link}>이용약관</Link>
              <Link to="/privacy" style={styles.link}>개인정보처리방침</Link>
              <Link to="/contact" style={styles.link}>문의하기</Link>
            </div>
          </div>
        </div>
        <div style={styles.copyright}>
          {/* 법정정보 — 공통 계약 재사용. 미설정/비활성/오류면 아무것도 렌더하지 않는다(null). */}
          <div style={styles.legalInfo}>
            <PublicLegalFooterInfo
              serviceKey="kpa-society"
              loadProfile={loadFooterLegal}
              linkColor="#94a3b8"
            />
          </div>
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
  legalInfo: {
    color: '#64748b',
    marginBottom: '8px',
  },
  copyrightText: {
    fontSize: '0.75rem',
    color: '#64748b',
    margin: 0,
  },
};

export default PlatformFooter;
