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
      </main>
      <PlatformFooter />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

export default HomePage;
