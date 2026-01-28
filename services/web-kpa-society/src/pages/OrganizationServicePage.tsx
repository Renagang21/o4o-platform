/**
 * OrganizationServicePage - 약사회 서비스 (데모)
 *
 * "지금은 데모를 보여주고, 나중에는 조용히 사라질 수 있도록"
 *
 * 컴포넌트 트리:
 * OrganizationServicePage
 * ├─ PageHeader
 * ├─ DemoNoticeSection
 * ├─ BranchDemoSection
 * │  └─ DemoCardGrid → DemoCard
 * └─ DivisionDemoSection
 *    └─ DemoCardGrid → DemoCard
 */

import { DemoCardGrid } from '../components/organization-service/DemoCardGrid';
import type { DemoCardData } from '../components/organization-service/DemoCard';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

// 지부 데모 카드
const branchCards: DemoCardData[] = [
  {
    title: 'KPA-Society',
    description: '지부 운영을 위한 서비스 화면 예시',
    badge: '도입 검토용 데모',
    ctaLabel: '데모 보기',
    href: '/demo',
  },
];

// 분회 데모 카드
const divisionCards: DemoCardData[] = [
  {
    title: '데모 분회',
    description: '분회 단위 커뮤니티·운영 서비스 예시',
    badge: '데모 분회',
    ctaLabel: '바로가기',
    href: '/demo/branch/demo-branch',
  },
];

export function OrganizationServicePage() {
  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        {/* PageHeader */}
        <div style={styles.header}>
          <h1 style={styles.title}>약사회 서비스 (데모)</h1>
          <p style={styles.subtitle}>조직 단위 서비스 화면 예시입니다</p>
        </div>

        {/* DemoNoticeSection */}
        <div style={styles.notice}>
          <p style={styles.noticeText}>
            아래 서비스는 현재 데모 화면입니다. 실제 운영은 별도 환경에서 제공됩니다.
          </p>
        </div>

        {/* BranchDemoSection */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>지부 서비스 (데모)</h2>
          <DemoCardGrid cards={branchCards} />
        </section>

        {/* DivisionDemoSection */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>분회 서비스 (데모)</h2>
          <DemoCardGrid cards={divisionCards} />
        </section>
      </div>
    </div>
  );
}

export default OrganizationServicePage;

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: colors.neutral50,
  },
  wrapper: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },
  header: {
    padding: `${spacing.xl} 0 ${spacing.lg}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headingL,
    margin: 0,
    color: colors.neutral900,
  },
  subtitle: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  notice: {
    padding: spacing.md,
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  noticeText: {
    margin: 0,
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: `0 0 ${spacing.md}`,
  },
};
