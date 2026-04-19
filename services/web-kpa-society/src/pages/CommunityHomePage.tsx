/**
 * CommunityHomePage - KPA Society 통합 Home 허브
 *
 * WO-KPA-HOME-PHASE1-V1: 플랫폼 요약 허브
 * WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1: 통합 허브 재구성
 * WO-KPA-A-HOME-HUB-ENHANCEMENT-V1: 블록 우선순위·반응형·링크 정리
 * WO-KPA-A-HOME-FOOTER-LINKS-MANAGEMENT-V1: 하단 바로가기 링크 섹션 추가
 * WO-MARKET-TRIAL-COMMUNITY-HOME-BLOCK-IMPLEMENT-V1: 마켓트라이얼 소식 블록 추가
 * WO-KPA-MAIN-HOME-RESTRUCTURE-V1: 참여 유도형 커뮤니티 허브 전환
 *
 * 섹션 구조 (12블록):
 * ├─ HeroBannerSection       — 동적 광고 캐러셀 (community_ads hero)
 * ├─ HeroCtaSection          — 환영 메시지 + CTA 3개
 * ├─ TabbedNewsSection       — 공지|새소식|약사공론 탭
 * ├─ ActivitySection          — 최근 활동 (포럼 글 + 추천 콘텐츠)
 * ├─ CommunityServiceSection  — 서비스 바로가기 카드 그리드
 * ├─ EducationSection         — 교육/강의 요약 (lmsApi 독립 호출)
 * ├─ SignageSection            — 디지털 사이니지 (가로 카드 + 썸네일)
 * ├─ MarketTrialSection       — 시범판매 CTA (Neture 외부 링크)
 * ├─ AdSection                — 페이지 광고 (community_ads page)
 * ├─ SponsorBar               — 스폰서 로고 (community_sponsors)
 * ├─ FooterLinksSection       — 하단 바로가기 링크 (community_quick_links)
 * └─ UtilitySection            — 유틸리티 (로그인 패널 + 링크)
 */

import { useState, useEffect } from 'react';
import { HeroBannerSection } from '../components/community/HeroBannerSection';
import { HeroCtaSection } from '../components/home/HeroCtaSection';
import { TabbedNewsSection } from '../components/home/TabbedNewsSection';
import { MarketTrialSection } from '../components/home/MarketTrialSection';
import { EducationSection } from '../components/home/EducationSection';
import { ActivitySection } from '../components/home/ActivitySection/ActivitySection';
import { SignageSection } from '../components/home/SignageSection';
import { CommunityServiceSection } from '../components/home/CommunityServiceSection';
import { AdSection } from '../components/community/AdSection';
import { SponsorBar } from '../components/community/SponsorBar';
import { FooterLinksSection } from '../components/home/FooterLinksSection';
import { UtilitySection } from '../components/home/UtilitySection';
import { homeApi } from '../api/home';
import type { HomePageData } from '../api/home';
import { colors, spacing } from '../styles/theme';

export function CommunityHomePage() {
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeApi.prefetchAll()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      {/* 1. Hero 배너 (동적 광고 캐러셀) */}
      <HeroBannerSection ads={data?.heroAds ?? []} />

      <div style={styles.content}>
        {/* 2. 환영 + CTA */}
        <HeroCtaSection />

        {/* 3. 탭 뉴스 (공지|새소식|약사공론) */}
        <TabbedNewsSection
          prefetchedNotices={data?.notices}
          prefetchedLatestNews={data?.newsLatest}
          loading={loading}
        />

        {/* 4. 최근 활동 (포럼 글 + 추천 콘텐츠) */}
        <ActivitySection
          prefetchedPosts={data?.community.posts}
          prefetchedFeatured={data?.community.featured}
          loading={loading}
        />

        {/* 5. 서비스 바로가기 */}
        <CommunityServiceSection />

        {/* 6. 교육/강의 (독립 API 호출) */}
        <EducationSection />

        {/* 7. 사이니지 미디어 (가로 카드) */}
        <SignageSection
          prefetchedMedia={data?.signage.media}
          prefetchedPlaylists={data?.signage.playlists}
          loading={loading}
        />

        {/* 8. 시범판매 CTA */}
        <MarketTrialSection />

        {/* 9. 페이지 광고 */}
        <AdSection ads={data?.pageAds ?? []} />

        {/* 10. 스폰서 */}
        <SponsorBar sponsors={data?.sponsors ?? []} />

        {/* 11. 하단 바로가기 링크 */}
        <FooterLinksSection quickLinks={data?.quickLinks ?? []} />

        {/* 12. 유틸리티 */}
        <UtilitySection />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: colors.neutral50,
  },
  content: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `${spacing.md} ${spacing.lg} ${spacing.sectionGap}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sectionGap,
  },
};

export default CommunityHomePage;
