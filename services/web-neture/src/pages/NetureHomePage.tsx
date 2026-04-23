/**
 * NetureHomePage - Neture 플랫폼 메인 홈
 *
 * WO-O4O-NETURE-UI-REFACTORING-V1
 * WO-O4O-NETURE-HOME-CONTENT-V1: CMS 기반 콘텐츠 전환
 * WO-NETURE-MARKET-TRIAL-PAGE-SEPARATION-AND-HOME-RESTRUCTURE-V1:
 *   MarketTrialBanner → MarketTrialSection (모집중 시범판매 카드 표시)
 *
 * 구조:
 * 1. Hero Slider (CMS → 정적 폴백)
 * 2. 플랫폼 소개 (정적)
 * 3. 광고 3단 (CMS → 데이터 없으면 미표시)
 * 4. Market Trial Section (API — 모집중 카드 + 공급자 CTA)
 * 5. Latest Updates (API)
 * 6. Community Preview (API+정적)
 * 7. Featured Section (API+정적)
 * 8. 파트너 로고 캐러셀 (CMS → 데이터 없으면 미표시)
 * 9. Supplier / Partner CTA (정적)
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero, PageSection, PageContainer } from '@o4o/ui';
import HeroSlider from '../components/home/HeroSlider';
import { PlatformIntroSection } from '../components/home/PlatformIntroSection';
import HomepageAds from '../components/home/HomepageAds';
import { LatestUpdatesSection } from '../components/home/LatestUpdatesSection';
import { CommunityPreviewSection } from '../components/home/CommunityPreviewSection';
import { FeaturedSection } from '../components/home/FeaturedSection';
import PartnerLogoCarousel from '../components/home/PartnerLogoCarousel';
import { HomeCtaSection } from '../components/home/HomeCtaSection';
import { getTrials, type Trial } from '../api/trial';

/**
 * WO-NETURE-MARKET-TRIAL-PAGE-SEPARATION-AND-HOME-RESTRUCTURE-V1:
 * 참여자 관점 — 모집중 시범판매 카드 + 공급자 CTA
 */
function MarketTrialSection() {
  const [trials, setTrials] = useState<Trial[]>([]);

  useEffect(() => {
    getTrials()
      .then((data) => {
        const recruiting = (Array.isArray(data) ? data : [])
          .filter((t) => t.status === 'recruiting')
          .slice(0, 3);
        setTrials(recruiting);
      })
      .catch(() => {});
  }, []);

  return (
    <section style={mts.section}>
      <PageContainer>
        {/* 헤더 */}
        <div style={mts.headerRow}>
          <div>
            <h2 style={mts.heading}>시범판매 (Market Trial)</h2>
            <p style={mts.subheading}>
              공급자가 제안한 신제품을 매장에서 먼저 체험하고, 현장 의견을 공유하는 참여형 프로그램입니다.
            </p>
          </div>
          <Link to="/market-trial" style={mts.viewAllLink}>
            전체 보기 →
          </Link>
        </div>

        {/* 모집중 카드 */}
        {trials.length > 0 ? (
          <div style={mts.cardGrid}>
            {trials.map((trial) => (
              <Link key={trial.id} to={`/market-trial/${trial.id}`} style={mts.card}>
                <div style={mts.cardBadgeRow}>
                  <span style={mts.statusBadge}>모집중</span>
                  {trial.supplierName && (
                    <span style={mts.supplierName}>{trial.supplierName}</span>
                  )}
                </div>
                <h3 style={mts.cardTitle}>{trial.title}</h3>
                {trial.description && (
                  <p style={mts.cardDesc}>{trial.description}</p>
                )}
                <div style={mts.cardMeta}>
                  <span>참여 {trial.currentParticipants}{trial.maxParticipants ? ` / ${trial.maxParticipants}` : ''}명</span>
                  {trial.rewardRate != null && trial.rewardRate > 0 && (
                    <span style={mts.rewardTag}>리워드 +{trial.rewardRate}%</span>
                  )}
                  {trial.endDate && (
                    <span>마감 {new Date(trial.endDate).toLocaleDateString('ko-KR')}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={mts.emptyBox}>
            <p style={mts.emptyText}>현재 모집 중인 시범판매가 없습니다.</p>
            <Link to="/market-trial" style={mts.emptyLink}>
              지난 시범판매 보기 →
            </Link>
          </div>
        )}

        {/* 공급자 CTA */}
        <div style={mts.supplierCta}>
          <span style={mts.supplierCtaText}>공급자이신가요?</span>
          <Link to="/supplier/market-trial/new" style={mts.supplierCtaLink}>
            시범판매 제안하기 →
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}

const mts: Record<string, React.CSSProperties> = {
  section: { padding: '48px 0', backgroundColor: '#FAFAFA' },
  headerRow: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: '12px', marginBottom: '24px',
  },
  heading: { fontSize: '1.375rem', fontWeight: 700, color: '#111827', margin: '0 0 6px 0' },
  subheading: { fontSize: '0.875rem', color: '#6B7280', margin: 0, maxWidth: '560px', lineHeight: 1.6 },
  viewAllLink: {
    fontSize: '0.875rem', fontWeight: 600, color: '#7C3AED',
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
  cardGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px', marginBottom: '20px',
  },
  card: {
    display: 'block', textDecoration: 'none', color: 'inherit',
    backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB',
    padding: '20px', transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  cardBadgeRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' },
  statusBadge: {
    padding: '2px 10px', backgroundColor: '#DCFCE7', color: '#166534',
    borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
  },
  supplierName: { fontSize: '0.8125rem', color: '#9CA3AF' },
  cardTitle: {
    fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  cardDesc: {
    fontSize: '0.8125rem', color: '#6B7280', margin: '0 0 12px 0', lineHeight: 1.5,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  cardMeta: { display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8125rem', color: '#6B7280' },
  rewardTag: { color: '#7C3AED', fontWeight: 600 },
  emptyBox: {
    textAlign: 'center', padding: '32px 20px',
    backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB',
    marginBottom: '20px',
  },
  emptyText: { fontSize: '0.875rem', color: '#9CA3AF', margin: '0 0 8px 0' },
  emptyLink: { fontSize: '0.8125rem', color: '#7C3AED', textDecoration: 'none', fontWeight: 500 },
  supplierCta: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '12px 0',
  },
  supplierCtaText: { fontSize: '0.8125rem', color: '#6B7280' },
  supplierCtaLink: { fontSize: '0.8125rem', fontWeight: 600, color: '#7C3AED', textDecoration: 'none' },
};

export default function NetureHomePage() {
  return (
    <div className="min-h-screen">
      <PageHero><HeroSlider /></PageHero>
      <PageSection><PlatformIntroSection /></PageSection>
      <PageSection><HomepageAds /></PageSection>
      <PageSection><MarketTrialSection /></PageSection>
      <PageSection><LatestUpdatesSection /></PageSection>
      <PageSection><CommunityPreviewSection /></PageSection>
      <PageSection><FeaturedSection /></PageSection>
      <PageSection><PartnerLogoCarousel /></PageSection>
      <PageSection last><HomeCtaSection /></PageSection>
    </div>
  );
}
