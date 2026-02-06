/**
 * CommunityServiceSection - 공용 서비스 진입 영역
 *
 * WO-KPA-SOCIETY-COMMUNITY-CARD-TONE-DOWN-V1
 * - 상태 배지 제거 (활발한 토론, 학습 진행 등)
 * - 아이콘 무채색 통일 (slate-500 / #64748b)
 * - 차분하고 열린 약사 커뮤니티 톤
 *
 * 2x2 ServiceCard 그리드: 포럼, 교육, 이벤트, 자료실
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

interface ServiceCardData {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

// Neutral monochrome icons (inline SVG for consistent styling)
const ForumIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const EducationIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const EventIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ResourceIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const services: ServiceCardData[] = [
  {
    title: '약사 포럼',
    description: '약사 커뮤니티에서 정보를 교환하세요',
    href: '/forum',
    icon: <ForumIcon />,
  },
  {
    title: '교육 / 강의',
    description: '보수교육, 온라인 세미나',
    href: '/lms',
    icon: <EducationIcon />,
  },
  {
    title: '이벤트',
    description: '퀴즈, 설문, 캠페인 참여',
    href: '/events',
    icon: <EventIcon />,
  },
  {
    title: '자료실',
    description: '문서, 영상, 이미지 자료 공유',
    href: '/docs',
    icon: <ResourceIcon />,
  },
];

function ServiceCard({ card }: { card: ServiceCardData }) {
  return (
    <Link to={card.href} style={styles.card} className="service-card">
      <div style={styles.cardIcon}>{card.icon}</div>
      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{card.title}</h3>
        <p style={styles.cardDesc}>{card.description}</p>
      </div>
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
    boxShadow: 'none',
    textDecoration: 'none',
    color: colors.neutral800,
    transition: 'box-shadow 0.2s, border-color 0.2s',
    border: `1px solid ${colors.neutral200}`,
  },
  cardIcon: {
    flexShrink: 0,
    color: '#64748b', // slate-500 - neutral grayscale
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
};
