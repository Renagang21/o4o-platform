/**
 * Footer - 경기도약사회 스타일
 * 로고 + 링크 + 연락처 정보
 */

import { Link } from 'react-router-dom';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { colors } from '../styles/theme';
// WO-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1
import { loadFooterLegal } from '../lib/footerLegal';

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
          {/* WO-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1: dead link 정리 — /terms→/policy(약관), /sitemap 제거, /service-guide 추가 */}
          <nav style={styles.footerNav}>
            <Link to="/about" style={styles.navLink}>약사회 소개</Link>
            <span style={styles.divider}>|</span>
            {/* WO-O4O-KPA-MAIN-NAV-GUIDE-ENTRY-V1: 가치·역할별 활용 가이드 발견성 */}
            <Link to="/guide/intro" style={styles.navLink}>이용 가이드</Link>
            <span style={styles.divider}>|</span>
            <Link to="/service-guide" style={styles.navLink}>서비스 안내</Link>
            <span style={styles.divider}>|</span>
            <Link to="/contact" style={styles.navLink}>협업 문의</Link>
            <span style={styles.divider}>|</span>
            <Link to="/policy" style={styles.navLink}>이용약관</Link>
            <span style={styles.divider}>|</span>
            <Link to="/privacy" style={styles.navLink}>개인정보처리방침</Link>
          </nav>
        </div>

        {/* WO-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1:
            더미 주소/전화/팩스/이메일 + 하드코딩 사업자번호 제거 → service_legal_profiles 동적 표시.
            법정정보는 코드 하드코딩 금지 — API 값이 있을 때만 표시(미설정/비활성→비표시, placeholder 0).
            법정정보 입력은 Admin 설정 영역(`/admin/settings/legal-terms`) 소관(후속 통합 WO). */}

        {/* Copyright */}
        <div style={styles.copyright}>
          <div style={styles.copyrightRow}>
            <div>
              <p style={styles.copyrightText}>
                Copyright © 2026 약사회. All Rights Reserved.
              </p>
              <div style={styles.operatorText}>
                <PublicLegalFooterInfo serviceKey="kpa-society" loadProfile={loadFooterLegal} />
              </div>
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
