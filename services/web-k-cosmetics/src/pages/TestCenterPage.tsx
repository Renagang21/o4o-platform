/**
 * TestCenterPage - 서비스 테스트 & 개선 참여 센터
 *
 * Work Order: WO-TEST-CENTER-SEPARATION-V1
 *
 * 기존 HomePage 하단에 있던 테스트 관련 섹션을 별도 페이지로 분리
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import TestImprovementSection from '@/components/home/TestImprovementSection';

export default function TestCenterPage() {
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.headerLeft}>
            <Link to="/" style={styles.backLink}>
              <ArrowLeft size={20} />
              <span>홈으로</span>
            </Link>
            <div style={styles.divider} />
            <div style={styles.titleWrapper}>
              <div style={styles.iconWrapper}>
                <FlaskConical size={20} color="#e91e63" />
              </div>
              <div>
                <h1 style={styles.title}>테스트 센터</h1>
                <p style={styles.subtitle}>서비스 테스트 & 개선 참여</p>
              </div>
            </div>
          </div>
          {/* 운영형 알파 배지 */}
          <div style={styles.alphaBadge}>
            <span style={styles.alphaIndicator}></span>
            <span>운영형 알파 · v0.8.0</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <TestImprovementSection
        config={{
          serviceName: 'K-Cosmetics',
          serviceDescription: '국내 화장품 브랜드를 한 곳에서 탐색하고 구매할 수 있는 뷰티 커머스 플랫폼',
          primaryColor: '#e91e63',
        }}
      />

      {/* Quick Links Footer */}
      <div style={styles.footer}>
        <div style={styles.footerLinks}>
          <Link to="/test-guide" style={styles.footerLink}>
            테스트 가이드 보기 →
          </Link>
          <span style={styles.footerDivider}>|</span>
          <Link to="/forum" style={styles.footerLink}>
            포럼 바로가기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
  },
  headerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#e2e8f0',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#fce4ec',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  alphaBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#1e293b',
    borderRadius: '20px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.9)',
  },
  alphaIndicator: {
    width: '6px',
    height: '6px',
    backgroundColor: '#34d399',
    borderRadius: '50%',
  },
  footer: {
    backgroundColor: '#fff',
    borderTop: '1px solid #e2e8f0',
    padding: '32px 24px',
  },
  footerLinks: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  footerLink: {
    fontSize: '14px',
    color: '#e91e63',
    textDecoration: 'none',
    fontWeight: 500,
  },
  footerDivider: {
    color: '#e2e8f0',
  },
};
