/**
 * CommunityServiceSection - 서비스 바로가기 영역
 *
 * WO-KPA-SOCIETY-COMMUNITY-CARD-TONE-DOWN-V1
 * WO-KPA-A-HOME-HUB-ENHANCEMENT-V1: 깨진 링크 수정, 반응형 CSS 추가
 *
 * 2x2 ServiceCard 그리드: 포럼, 교육, 콘텐츠, 사이니지
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

interface ServiceCardData {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const responsiveStyles = `
  .service-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: ${spacing.md};
  }
  @media (min-width: 768px) {
    .service-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  .service-card:hover {
    border-color: ${colors.neutral300};
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
`;

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

const ContentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const SignageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

// WO-KPA-RESOURCE-LIBRARY-AI-WORKFLOW-V1
const ResourceIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
);

const services: ServiceCardData[] = [
  {
    title: '약사 포럼',
    description: '동료 약사와 질문·토론으로 전문성을 높이세요',
    href: '/forum',
    icon: <ForumIcon />,
  },
  {
    title: '교육 / 강의',
    description: '보수교육·세미나를 온라인으로 수강하세요',
    href: '/lms',
    icon: <EducationIcon />,
  },
  {
    title: '콘텐츠 허브',
    description: '공지·뉴스·이벤트를 한눈에 확인하세요',
    href: '/content',
    icon: <ContentIcon />,
  },
  {
    title: '디지털 사이니지',
    description: '약국 디지털 미디어를 관리하세요',
    href: '/signage',
    icon: <SignageIcon />,
  },
  // WO-KPA-RESOURCE-LIBRARY-AI-WORKFLOW-V1 / WO-KPA-RESOURCES-HUB-ENTRY-FIX-V1
  {
    title: '자료실',
    description: '자료를 저장하고 AI 작업에 활용하세요',
    href: '/resources',
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
      <div style={styles.cardArrow}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}

export function CommunityServiceSection() {
  useEffect(() => {
    const styleId = 'service-section-responsive-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = responsiveStyles;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <section style={styles.container}>
      <div style={styles.headerWrap}>
        <h2 style={styles.sectionTitle}>서비스 바로가기</h2>
        <p style={styles.sectionSubtitle}>각 서비스로 바로 이동하세요</p>
      </div>
      <div className="service-grid">
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
  headerWrap: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: `${spacing.xs} 0 0`,
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
  cardArrow: {
    flexShrink: 0,
    color: colors.neutral300,
    display: 'flex',
    alignItems: 'center',
  },
};
