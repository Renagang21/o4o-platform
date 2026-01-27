/**
 * OrganizationDemoSection - 지부 서비스 데모 섹션
 *
 * 단일 카드: "지부 서비스 데모" + Badge + CTA
 * 강조 없이 중하단 위치
 * 분회 서비스는 메인 제외
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

export function OrganizationDemoSection() {
  return (
    <section style={styles.container}>
      <h2 style={styles.sectionTitle}>지부 서비스 데모</h2>
      <div style={styles.card}>
        <div style={styles.content}>
          <span style={styles.icon}>🏛️</span>
          <div>
            <div style={styles.titleRow}>
              <h3 style={styles.cardTitle}>지부 서비스</h3>
              <span style={styles.badge}>도입 검토용 데모</span>
            </div>
            <p style={styles.desc}>
              약사회 지부·분회 운영 서비스를 체험해 보세요
            </p>
          </div>
        </div>
        <Link to="/demo" style={styles.cta}>
          데모 보기 →
        </Link>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.lg} 0`,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginBottom: spacing.md,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    fontSize: '1.75rem',
    flexShrink: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: '0.688rem',
    fontWeight: 500,
  },
  desc: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.813rem',
    color: colors.neutral500,
  },
  cta: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.primary,
    textDecoration: 'none',
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    whiteSpace: 'nowrap',
  },
};
