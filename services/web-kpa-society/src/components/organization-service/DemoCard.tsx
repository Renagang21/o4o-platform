/**
 * DemoCard - 지부/분회 공용 데모 카드
 *
 * 제목, 설명 1줄, 배지 1개, CTA 1개
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

export interface DemoCardData {
  title: string;
  description: string;
  badge: string;
  ctaLabel: string;
  href: string;
}

export function DemoCard({ card }: { card: DemoCardData }) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{card.title}</h3>
        <span style={styles.badge}>{card.badge}</span>
      </div>
      <p style={styles.description}>{card.description}</p>
      <Link to={card.href} style={styles.cta}>
        {card.ctaLabel}
      </Link>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral900,
  },
  badge: {
    padding: `2px ${spacing.sm}`,
    fontSize: '0.7rem',
    fontWeight: 600,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.accentYellow}15`,
    color: colors.accentYellow,
    whiteSpace: 'nowrap',
  },
  description: {
    margin: 0,
    fontSize: '0.875rem',
    color: colors.neutral500,
    lineHeight: 1.5,
  },
  cta: {
    display: 'inline-block',
    alignSelf: 'flex-start',
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.primary,
    textDecoration: 'none',
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    transition: 'background-color 0.2s',
  },
};
