/**
 * OrganizationDemo - 지부 서비스 데모 카드
 *
 * 단일 카드: "지부 서비스 데모" + CTA 버튼
 * 강조 없이 중하단 위치
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

export function OrganizationDemo() {
  return (
    <section style={styles.container}>
      <div style={styles.card}>
        <div style={styles.content}>
          <span style={styles.icon}>🏛️</span>
          <div>
            <h3 style={styles.title}>지부 서비스 (데모)</h3>
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
  title: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
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
