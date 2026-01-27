/**
 * CommunityLearningGrid - 커뮤니티 & 학습 카드 그리드
 *
 * 2x2 카드 배치: 약사 포럼, 교육/강의, 이벤트, 자료실
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

const cards = [
  {
    title: '약사 포럼',
    description: '약사 커뮤니티에서 정보를 교환하세요',
    href: '/demo/forum',
    icon: '💬',
    stat: '활발한 토론',
  },
  {
    title: '교육 / 강의',
    description: '보수교육, 온라인 세미나',
    href: '/demo/lms',
    icon: '📚',
    stat: '학습 진행',
  },
  {
    title: '이벤트',
    description: '퀴즈, 설문, 캠페인 참여',
    href: '/demo/events',
    icon: '🎯',
    stat: '참여 가능',
  },
  {
    title: '자료실',
    description: '서식, 가이드라인, 규정 자료',
    href: '/demo/docs',
    icon: '📁',
    stat: '최신 자료',
  },
];

export function CommunityLearningGrid() {
  return (
    <section style={styles.container}>
      <h2 style={styles.sectionTitle}>커뮤니티 & 학습</h2>
      <div style={styles.grid}>
        {cards.map((card) => (
          <Link key={card.href} to={card.href} style={styles.card}>
            <div style={styles.cardIcon}>{card.icon}</div>
            <div style={styles.cardContent}>
              <h3 style={styles.cardTitle}>{card.title}</h3>
              <p style={styles.cardDesc}>{card.description}</p>
            </div>
            <span style={styles.cardStat}>{card.stat}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginBottom: spacing.lg,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.md,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    textDecoration: 'none',
    color: colors.neutral800,
    transition: 'box-shadow 0.2s',
    border: `1px solid ${colors.neutral100}`,
  },
  cardIcon: {
    fontSize: '2rem',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
  },
  cardDesc: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.813rem',
    color: colors.neutral500,
  },
  cardStat: {
    fontSize: '0.75rem',
    color: colors.primary,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
};
