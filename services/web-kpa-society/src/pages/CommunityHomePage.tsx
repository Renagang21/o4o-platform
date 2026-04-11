/**
 * CommunityHomePage - KPA Society 통합 Home 허브
 *
 * WO-KPA-HOME-PHASE1-V1: 플랫폼 요약 허브
 * WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1: 통합 허브 재구성
 * WO-KPA-A-HOME-HUB-ENHANCEMENT-V1: 블록 우선순위·반응형·링크 정리
 * WO-KPA-A-HOME-FOOTER-LINKS-MANAGEMENT-V1: 하단 바로가기 링크 섹션 추가
 *
 * /community 허브 기능을 흡수하여 단일 Home으로 통합.
 *
 * 섹션 구조 (9블록):
 * ├─ HeroBannerSection       — 동적 광고 캐러셀 (community_ads hero)
 * ├─ NoticeSection            — 공지사항 (cms_contents type=notice)
 * ├─ ActivitySection           — 최근 활동 (포럼 글 + 추천 콘텐츠)
 * ├─ EducationSection         — 교육/강의 요약 (lmsApi 독립 호출)
 * ├─ SignageSection            — 디지털 사이니지 프리뷰
 * ├─ CommunityServiceSection   — 서비스 바로가기 카드 그리드
 * ├─ AdSection                — 페이지 광고 (community_ads page)
 * ├─ SponsorBar               — 스폰서 로고 (community_sponsors)
 * ├─ FooterLinksSection       — 하단 바로가기 링크 (community_quick_links)
 * └─ UtilitySection            — 유틸리티 (로그인 패널 + 링크)
 */

import { useState, useEffect } from 'react';
import { HeroBannerSection } from '../components/community/HeroBannerSection';
import { NoticeSection } from '../components/home/NoticeSection';
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
        {/* 2. 공지사항 */}
        <NoticeSection prefetchedNotices={data?.notices} loading={loading} />

        {/* 3. 최근 활동 (포럼 글 + 추천 콘텐츠) */}
        <ActivitySection
          prefetchedPosts={data?.community.posts}
          prefetchedFeatured={data?.community.featured}
          loading={loading}
        />

        {/* 4. 교육/강의 (독립 API 호출) */}
        <EducationSection />

        {/* 5. 사이니지 미디어 */}
        <SignageSection
          prefetchedMedia={data?.signage.media}
          prefetchedPlaylists={data?.signage.playlists}
          loading={loading}
        />

        {/* 6. 서비스 바로가기 */}
        <CommunityServiceSection />

        {/* 7. 페이지 광고 */}
        <AdSection ads={data?.pageAds ?? []} />

        {/* 8. 스폰서 */}
        <SponsorBar sponsors={data?.sponsors ?? []} />

        {/* 9. 하단 바로가기 링크 */}
        <FooterLinksSection quickLinks={data?.quickLinks ?? []} />

        {/* 유틸리티 */}
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
    padding: `${spacing.sectionGap} ${spacing.lg}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sectionGap,
  },
};

export default CommunityHomePage;
