/**
 * PharmacyHubMarketPage - 약국 공용공간 (Market Layer)
 *
 * WO-O4O-HUB-MARKET-RESTRUCTURE-V1
 * WO-O4O-HUB-PLATFORM-ACTIVITY-SUMMARY-V1: 플랫폼 활동 요약 영역 추가
 *
 * 플랫폼 4공간 구조:
 *   /pharmacy → Gate
 *   /hub      → 공용 플랫폼 공간 (이 페이지)
 *   /store    → 내 매장 실행 공간
 *   /operator → 운영자 OS
 *
 * Hub = "여기서 가져간다" — 플랫폼이 제공하는 자원을 탐색·선택하여 내 매장으로 가져가는 공간
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '../../contexts';
import { RecommendedServicesSection } from './sections/RecommendedServicesSection';
import { getCatalog } from '../../api/pharmacyProducts';
import { cmsApi } from '../../api/cms';
import { listPlatformServices } from '../../api/platform-services';
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
    status: 'active' as const,
    link: '/hub/signage',
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
// KPI 정의 (WO-O4O-HUB-PLATFORM-ACTIVITY-SUMMARY-V1)
// ============================================

interface PlatformKpi {
  productCount: number;
  contentCount: number;
  serviceCount: number;
}

// ============================================
// 컴포넌트
// ============================================

export function PharmacyHubMarketPage() {
  const { currentOrganization } = useOrganization();
  const [kpi, setKpi] = useState<PlatformKpi | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  // 플랫폼 활동 KPI 로드 (1회, 병렬)
  useEffect(() => {
    let cancelled = false;

    async function loadKpi() {
      const results = await Promise.allSettled([
        getCatalog({ limit: 1, offset: 0 }),
        cmsApi.getContents({ status: 'published', limit: 1, offset: 0 }),
        listPlatformServices(),
      ]);

      if (cancelled) return;

      const productTotal = results[0].status === 'fulfilled'
        ? results[0].value.pagination.total : 0;

      const contentTotal = results[1].status === 'fulfilled'
        ? results[1].value.pagination.total : 0;

      const serviceCount = results[2].status === 'fulfilled'
        ? results[2].value.filter(s => s.isFeatured && s.enrollmentStatus !== 'approved').length
        : 0;

      // 실패 시 console.warn
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const labels = ['상품 카탈로그', 'CMS 콘텐츠', '추천 서비스'];
          console.warn(`[Hub KPI] ${labels[i]} 조회 실패:`, r.reason);
        }
      });

      setKpi({ productCount: productTotal, contentCount: contentTotal, serviceCount });
      setKpiLoading(false);
    }

    loadKpi();
    return () => { cancelled = true; };
  }, []);

  const kpiCards = useMemo(() => {
    if (!kpi) return [];
    return [
      { label: '공개 상품', count: kpi.productCount, link: '/hub/b2b' },
      { label: '공개 콘텐츠', count: kpi.contentCount, link: '/hub/content' },
      { label: '추천 서비스', count: kpi.serviceCount, link: '#services' },
    ];
  }, [kpi]);

  const handleKpiClick = (link: string) => {
    if (link === '#services') {
      document.getElementById('hub-services-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={styles.container}>
      {/* Hero */}
      <header style={styles.hero}>
        <h1 style={styles.heroTitle}>약국 HUB</h1>
        <p style={styles.heroDesc}>
          {currentOrganization?.name || '내 약국'} — 플랫폼이 제공하는 자원을 탐색하고 내 매장으로 가져갑니다
        </p>
      </header>

      {/* 플랫폼 활동 요약 (WO-O4O-HUB-PLATFORM-ACTIVITY-SUMMARY-V1) */}
      <div style={styles.kpiBar}>
        <span style={styles.kpiBarTitle}>플랫폼 활동 요약</span>
        <div style={styles.kpiPills}>
          {kpiLoading ? (
            <>
              <div style={styles.kpiSkeleton} />
              <div style={styles.kpiSkeleton} />
              <div style={styles.kpiSkeleton} />
            </>
          ) : (
            kpiCards.map(item => (
              item.link.startsWith('#') ? (
                <button
                  key={item.label}
                  onClick={() => handleKpiClick(item.link)}
                  style={styles.kpiPill}
                >
                  <span style={styles.kpiCount}>{item.count}</span>
                  <span style={styles.kpiLabel}>{item.label}</span>
                </button>
              ) : (
                <Link key={item.label} to={item.link} style={styles.kpiPill}>
                  <span style={styles.kpiCount}>{item.count}</span>
                  <span style={styles.kpiLabel}>{item.label}</span>
                </Link>
              )
            ))
          )}
        </div>
      </div>

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
      <div id="hub-services-section" style={styles.servicesSection}>
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
    marginBottom: '24px',
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

  // KPI Bar
  kpiBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    marginBottom: '28px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
    flexWrap: 'wrap' as const,
  },
  kpiBarTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: colors.neutral500,
    whiteSpace: 'nowrap' as const,
  },
  kpiPills: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  kpiPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '20px',
    border: `1px solid ${colors.neutral200}`,
    textDecoration: 'none',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    color: colors.neutral600,
    fontWeight: 500,
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  kpiCount: {
    fontSize: '1rem',
    fontWeight: 700,
    color: colors.primary,
  },
  kpiLabel: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  kpiSkeleton: {
    width: '100px',
    height: '36px',
    backgroundColor: '#f1f5f9',
    borderRadius: '20px',
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
