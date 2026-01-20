/**
 * HomePage - 플랫폼 홈 페이지
 *
 * WO-KPA-HOME-FOUNDATION-V1
 * - PlatformHeader
 * - HeroSection
 * - ServiceCardsSection
 * - AudienceSection
 * - HowItWorksSection
 * - PlatformFooter
 */

import { Link } from 'react-router-dom';
import {
  PlatformHeader,
  HeroSection,
  ServiceCardsSection,
  AudienceSection,
  HowItWorksSection,
  PlatformFooter,
} from '../../components/platform';

export function HomePage() {
  return (
    <div style={styles.page}>
      <PlatformHeader />
      <main>
        <HeroSection />
        <ServiceCardsSection />
        <AudienceSection />
        <HowItWorksSection />
        {/* Test Center Banner (WO-TEST-CENTER-SEPARATION-V1) */}
        <TestCenterBanner />
      </main>
      <PlatformFooter />
    </div>
  );
}

// WO-TEST-CENTER-SEPARATION-V1: 테스트 센터 링크 배너
function TestCenterBanner() {
  return (
    <section style={bannerStyles.section}>
      <div style={bannerStyles.container}>
        <div style={bannerStyles.content}>
          <div style={bannerStyles.iconWrapper}>🧪</div>
          <div>
            <h3 style={bannerStyles.title}>서비스 테스트 & 개선 참여</h3>
            <p style={bannerStyles.desc}>
              테스트 의견, 서비스 업데이트 확인, 피드백 작성을 한곳에서
            </p>
          </div>
        </div>
        <Link to="/test-center" style={bannerStyles.button}>
          테스트 센터 →
        </Link>
      </div>
    </section>
  );
}

const bannerStyles: Record<string, React.CSSProperties> = {
  section: {
    padding: '32px 24px',
    backgroundColor: '#f8fafc',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#fff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  desc: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontWeight: 500,
    borderRadius: '12px',
    textDecoration: 'none',
    fontSize: '14px',
  },
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

export default HomePage;
