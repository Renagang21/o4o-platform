/**
 * CommunityServiceSection - 공용 서비스 진입 영역
 *
 * 2x2 ServiceCard 그리드: 포럼, 교육, 이벤트, 자료실
 * 각 카드: 아이콘 + 제목 + 간단 상태 + 바로가기 링크
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

interface ServiceCardData {
  title: string;
  description: string;
  href: string;
  icon: string;
  status: string;
  statusType: 'active' | 'new' | 'default';
}

const services: ServiceCardData[] = [
  {
    title: '약사 포럼',
    description: '약사 커뮤니티에서 정보를 교환하세요',
    href: '/demo/forum',
    icon: '💬',
    status: '활발한 토론',
    statusType: 'active',
  },
  {
    title: '교육 / 강의',
    description: '보수교육, 온라인 세미나',
    href: '/demo/lms',
    icon: '📚',
    status: '학습 진행',
    statusType: 'default',
  },
  {
    title: '이벤트',
    description: '퀴즈, 설문, 캠페인 참여',
    href: '/demo/events',
    icon: '🎯',
    status: '참여 가능',
    statusType: 'new',
  },
  {
    title: '자료실',
    description: '문서, 영상, 이미지 자료 공유',
    href: '/demo/docs',
    icon: '📁',
    status: '최신 자료',
    statusType: 'default',
  },
];

function ServiceCard({ card }: { card: ServiceCardData }) {
  const statusStyle = card.statusType === 'active'
    ? styles.statusActive
    : card.statusType === 'new'
      ? styles.statusNew
      : styles.statusDefault;

  return (
    <Link to={card.href} style={styles.card}>
      <div style={styles.cardIcon}>{card.icon}</div>
      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{card.title}</h3>
        <p style={styles.cardDesc}>{card.description}</p>
      </div>
      <span style={{ ...styles.cardStatus, ...statusStyle }}>{card.status}</span>
    </Link>
  );
}

export function CommunityServiceSection() {
  return (
    <section style={styles.container}>
      <h2 style={styles.sectionTitle}>커뮤니티 & 서비스</h2>
      <div style={styles.grid}>
        {services.map((card) => (
          <ServiceCard key={card.href} card={card} />
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
  cardStatus: {
    fontSize: '0.75rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
  },
  statusActive: {
    color: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  statusNew: {
    color: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  statusDefault: {
    color: colors.neutral500,
    backgroundColor: colors.neutral50,
  },
};
