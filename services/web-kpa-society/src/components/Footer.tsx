/**
 * Footer - 경기도약사회 스타일
 * 로고 + 링크 + 연락처 정보
 */

import { Link } from 'react-router-dom';
import { colors } from '../styles/theme';

export function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        {/* Top Section */}
        <div style={styles.topSection}>
          <div style={styles.logoArea}>
            <span style={styles.logoIcon}>💊</span>
            <span style={styles.logoText}>약사회</span>
          </div>
          <nav style={styles.footerNav}>
            <Link to="/about" style={styles.navLink}>약사회 소개</Link>
            <span style={styles.divider}>|</span>
            <Link to="/contact" style={styles.navLink}>협업 문의</Link>
            <span style={styles.divider}>|</span>
            <Link to="/terms" style={styles.navLink}>이용약관</Link>
            <span style={styles.divider}>|</span>
            <Link to="/privacy" style={styles.navLink}>개인정보처리방침</Link>
            <span style={styles.divider}>|</span>
            <Link to="/sitemap" style={styles.navLink}>사이트맵</Link>
          </nav>
        </div>

        {/* Contact Info */}
        <div style={styles.contactSection}>
          <div style={styles.contactRow}>
            <span style={styles.contactLabel}>주소</span>
            <span style={styles.contactValue}>서울특별시 OO구 OO로 123 약사회관</span>
          </div>
          <div style={styles.contactRow}>
            <span style={styles.contactLabel}>전화</span>
            <span style={styles.contactValue}>02-1234-5678</span>
            <span style={styles.contactLabel}>팩스</span>
            <span style={styles.contactValue}>02-1234-5679</span>
          </div>
          <div style={styles.contactRow}>
            <span style={styles.contactLabel}>이메일</span>
            <span style={styles.contactValue}>info@kpa-society.kr</span>
          </div>
        </div>

        {/* Copyright */}
        <div style={styles.copyright}>
          <div style={styles.copyrightRow}>
            <div>
              <p style={styles.copyrightText}>
                Copyright © 2024 약사회. All Rights Reserved.
              </p>
              <p style={styles.operatorText}>
                운영: ㈜쓰리라이프존 | 사업자등록번호 108-86-02873
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    backgroundColor: colors.gray800,
    color: colors.gray300,
    padding: '40px 0 30px',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  topSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '24px',
    borderBottom: `1px solid ${colors.gray700}`,
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.white,
  },
  footerNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  navLink: {
    color: colors.gray400,
    textDecoration: 'none',
    fontSize: '13px',
    transition: 'color 0.2s',
  },
  divider: {
    color: colors.gray600,
    fontSize: '12px',
  },
  contactSection: {
    marginBottom: '24px',
  },
  contactRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap',
    fontSize: '13px',
  },
  contactLabel: {
    color: colors.gray500,
    minWidth: '40px',
  },
  contactValue: {
    color: colors.gray400,
    marginRight: '20px',
  },
  copyright: {
    paddingTop: '20px',
    borderTop: `1px solid ${colors.gray700}`,
  },
  copyrightRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  copyrightText: {
    fontSize: '12px',
    color: colors.gray500,
    margin: '0 0 4px 0',
  },
  operatorText: {
    fontSize: '12px',
    color: colors.gray600,
    margin: 0,
  },
};
