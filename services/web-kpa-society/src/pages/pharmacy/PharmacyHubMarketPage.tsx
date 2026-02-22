/**
 * PharmacyHubMarketPage - 약국 공용공간 (Market Layer)
 *
 * WO-O4O-HUB-MARKET-RESTRUCTURE-V1
 *
 * 플랫폼 4공간 구조:
 *   /pharmacy → Gate
 *   /hub      → 공용 플랫폼 공간 (이 페이지)
 *   /store    → 내 매장 실행 공간
 *   /operator → 운영자 OS
 *
 * Hub = "여기서 가져간다" — 플랫폼이 제공하는 자원을 탐색·선택하여 내 매장으로 가져가는 공간
 */

import { Link } from 'react-router-dom';
import { useOrganization } from '../../contexts';
import { RecommendedServicesSection } from './sections/RecommendedServicesSection';
import { colors, shadows, borderRadius } from '../../styles/theme';

// ============================================
// 공용공간 카드 정의
// ============================================

const HUB_CARDS = [
  {
    id: 'content',
    icon: '📝',
    title: '플랫폼 콘텐츠',
    desc: '본부/공급사가 제공하는 CMS 콘텐츠를 탐색하고 내 매장에 복사합니다.',
    status: 'active' as const,
    link: '/hub/content',
  },
  {
    id: 'signage',
    icon: '🖥️',
    title: '플랫폼 사이니지',
    desc: '디지털 사이니지 미디어와 플레이리스트를 탐색하고 내 매장에 추가합니다.',
    status: 'coming' as const,
    link: undefined,
  },
  {
    id: 'products',
    icon: '🛒',
    title: 'B2B 상품 카탈로그',
    desc: '공급사 상품을 서비스별로 탐색하고 신청·주문합니다.',
    status: 'active' as const,
    link: '/hub/b2b',
  },
  {
    id: 'campaign',
    icon: '📋',
    title: '캠페인 · 설문',
    desc: '약사회 캠페인에 참여하고 설문에 응답합니다.',
    status: 'coming' as const,
    link: undefined,
  },
] as const;

// ============================================
// 컴포넌트
// ============================================

export function PharmacyHubMarketPage() {
  const { currentOrganization } = useOrganization();

  return (
    <div style={styles.container}>
      {/* Hero */}
      <header style={styles.hero}>
        <h1 style={styles.heroTitle}>약국 공용공간</h1>
        <p style={styles.heroDesc}>
          {currentOrganization?.name || '내 약국'} — 플랫폼이 제공하는 자원을 탐색하고 내 매장으로 가져갑니다
        </p>
      </header>

      {/* 카드 그리드 */}
      <div style={styles.cardGrid}>
        {HUB_CARDS.map(card => (
          <div key={card.id} style={styles.card}>
            <span style={styles.cardIcon}>{card.icon}</span>
            <h3 style={styles.cardTitle}>{card.title}</h3>
            <p style={styles.cardDesc}>{card.desc}</p>
            <div style={styles.cardAction}>
              {card.status === 'active' && card.link ? (
                <Link to={card.link} style={styles.activeLink}>바로가기 &rarr;</Link>
              ) : (
                <span style={styles.comingBadge}>준비중</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 추천 서비스 (기존 RecommendedServicesSection 재사용) */}
      <div style={styles.servicesSection}>
        <h2 style={styles.sectionTitle}>추천 서비스</h2>
        <p style={styles.sectionDesc}>플랫폼이 권하는 서비스를 발견하고 이용을 신청하세요.</p>
        <RecommendedServicesSection />
      </div>

      {/* 안내 */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>💡</span>
        <span>
          여기서 선택한 콘텐츠·상품·서비스는{' '}
          <Link to="/store" style={{ color: colors.primary }}>내 매장관리</Link>
          에서 관리할 수 있습니다.
        </span>
      </div>
    </div>
  );
}

// ============================================
// 스타일
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px',
  },

  // Hero
  hero: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '2px solid #e2e8f0',
  },
  heroTitle: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  heroDesc: {
    margin: '8px 0 0',
    fontSize: '0.95rem',
    color: colors.neutral500,
  },

  // Card grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral200}`,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardIcon: {
    fontSize: '32px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 600,
    color: colors.neutral900,
  },
  cardDesc: {
    margin: 0,
    fontSize: '0.85rem',
    color: colors.neutral500,
    lineHeight: 1.5,
    flex: 1,
  },
  cardAction: {
    marginTop: '8px',
  },
  activeLink: {
    color: colors.primary,
    fontSize: '0.875rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
  comingBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.neutral500,
    backgroundColor: colors.neutral100,
    borderRadius: '4px',
  },

  // Services section
  servicesSection: {
    marginBottom: '40px',
  },
  sectionTitle: {
    margin: '0 0 4px 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  sectionDesc: {
    margin: '0 0 20px 0',
    fontSize: '0.875rem',
    color: colors.neutral500,
  },

  // Notice
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '18px 22px',
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.primary}20`,
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
  noticeIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
};
