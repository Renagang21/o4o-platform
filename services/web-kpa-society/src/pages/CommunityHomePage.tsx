/**
 * CommunityHomePage - KPA Society 커뮤니티 홈 페이지
 *
 * 커뮤니티 중심 구조:
 * ├─ HeroSection              - 커뮤니티 소개 Hero
 * ├─ ActivitySection          - 최근 활동 (포럼 글 + 공지)
 * ├─ CommunityServiceSection  - 공용 서비스 2x2 그리드
 * ├─ OrganizationDemoSection  - 지부 서비스 데모
 * └─ UtilitySection           - 유틸리티 (로그인 패널 + 링크)
 *
 * QuickAccessBar 제거: CommunityServiceSection과 중복
 */

import { ActivitySection } from '../components/home/ActivitySection/ActivitySection';
import { CommunityServiceSection } from '../components/home/CommunityServiceSection';
import { OrganizationDemoSection } from '../components/home/OrganizationDemoSection';
import { UtilitySection } from '../components/home/UtilitySection';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

function HeroSection() {
  return (
    <div style={heroStyles.wrapper}>
      <div style={heroStyles.inner}>
        <span style={heroStyles.badge}>KPA Community</span>
        <h1 style={heroStyles.title}>약사를 위한 커뮤니티 플랫폼</h1>
        <p style={heroStyles.subtitle}>
          포럼에서 동료 약사와 소통하고, 교육·자료를 통해 전문성을 높이세요.
        </p>
      </div>
      {/* 장식 원 */}
      <div style={heroStyles.circleTopRight} />
      <div style={heroStyles.circleBottomLeft} />
    </div>
  );
}

export function CommunityHomePage() {
  return (
    <div style={styles.page}>
      <HeroSection />
      <div style={styles.content}>
        <ActivitySection />
        <CommunityServiceSection />
        <OrganizationDemoSection />
        <UtilitySection />
      </div>
    </div>
  );
}

const heroStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    padding: `${spacing.xxl} ${spacing.lg}`,
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '960px',
    margin: '0 auto',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: colors.white,
    fontSize: typography.bodyM.fontSize,
    fontWeight: 600,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headingXL,
    color: colors.white,
    margin: `0 0 ${spacing.sm}`,
  },
  subtitle: {
    fontSize: typography.bodyL.fontSize,
    color: 'rgba(255,255,255,0.85)',
    margin: 0,
    lineHeight: 1.6,
  },
  circleTopRight: {
    position: 'absolute',
    top: '-40px',
    right: '-40px',
    width: '160px',
    height: '160px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: '-30px',
    left: '-30px',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: colors.neutral50,
  },
  content: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `${spacing.sectionGap} ${spacing.lg}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sectionGap,
  },
};

export default CommunityHomePage;
