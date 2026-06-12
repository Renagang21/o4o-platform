/**
 * Footer - K-Cosmetics
 * Based on GlycoPharm Footer structure
 */

import { Link } from 'react-router-dom';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
// WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1
import { loadFooterLegal } from '@/lib/footerLegal';

export default function Footer() {
  return (
    <footer style={styles.footer}>
      {/* Main Footer */}
      <div style={styles.container}>
        <div style={styles.grid}>
          {/* Brand */}
          <div style={styles.brand}>
            <Link to="/" style={styles.logoLink}>
              <div style={styles.logoIcon}>💄</div>
              <span style={styles.logoText}>K-Cosmetics</span>
            </Link>
            <p style={styles.description}>
              K-Beauty 전문 B2B 플랫폼.
              검증된 화장품 매장과 브랜드를 연결합니다.
            </p>
            <a href="mailto:support@k-cosmetics.site" style={styles.email}>
              📧 support@k-cosmetics.site
            </a>
          </div>

          {/* 서비스 */}
          <div>
            <h4 style={styles.sectionTitle}>서비스</h4>
            <ul style={styles.list}>
              <li>
                <Link to="/" style={styles.link}>홈</Link>
              </li>
              <li>
                <Link to="/service-guide" style={styles.link}>서비스 안내</Link>
              </li>
              <li>
                <Link to="/contact" style={styles.link}>문의하기</Link>
              </li>
            </ul>
          </div>

          {/* 참여하기 */}
          <div>
            <h4 style={styles.sectionTitle}>참여하기</h4>
            <ul style={styles.list}>
              <li>
                <Link to="/register" style={styles.link}>매장 입점 신청</Link>
              </li>
              <li>
                <Link to="/contact" style={styles.link}>제휴/파트너 문의</Link>
              </li>
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h4 style={styles.sectionTitle}>고객지원</h4>
            <ul style={styles.list}>
              <li>
                <Link to="/contact" style={styles.link}>문의하기</Link>
              </li>
              <li>
                <Link to="/terms" style={styles.link}>이용약관</Link>
              </li>
              <li>
                <Link to="/privacy" style={styles.link}>개인정보처리방침</Link>
              </li>
            </ul>
            <div style={styles.contact}>
              <p style={styles.hours}>평일 09:00 - 18:00</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={styles.bottomBar}>
        <div style={styles.bottomContainer}>
          <div style={styles.bottomContent}>
            <p style={styles.copyright}>&copy; 2025 K-Cosmetics. All rights reserved.</p>
          </div>
          {/* WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1:
              WO-O4O-GP-KCOS-FOOTER-PLACEHOLDER-LEGAL-INFO-SUPPRESSION-V1 의 placeholder 제거를 잇는 동적 재도입.
              법정정보는 하드코딩 금지 — ServiceLegalProfile public API 값이 있을 때만 표시(미설정/비활성→비표시). */}
          <div style={styles.legal}>
            <PublicLegalFooterInfo serviceKey="k-cosmetics" loadProfile={loadFooterLegal} />
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '48px 16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '32px',
  },
  brand: {
    gridColumn: 'span 1',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    marginBottom: '16px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #e91e63, #c2185b)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  logoText: {
    fontWeight: 700,
    fontSize: '20px',
    color: '#fff',
  },
  description: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '16px',
    lineHeight: 1.6,
  },
  email: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#cbd5e1',
    textDecoration: 'none',
  },
  sectionTitle: {
    fontWeight: 600,
    color: '#fff',
    marginBottom: '16px',
    fontSize: '14px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  link: {
    fontSize: '14px',
    color: '#cbd5e1',
    textDecoration: 'none',
  },
  contact: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #334155',
  },
  phone: {
    fontSize: '14px',
    margin: 0,
  },
  hours: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px',
  },
  bottomBar: {
    borderTop: '1px solid #1e293b',
  },
  bottomContainer: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '24px 16px',
  },
  bottomContent: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  copyright: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  legal: {
    color: '#64748b',
    marginTop: '8px',
  },
  address: {
    fontSize: '12px',
    color: '#475569',
    margin: 0,
  },
  businessInfo: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #1e293b',
    fontSize: '12px',
    color: '#475569',
  },
};
