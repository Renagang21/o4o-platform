/**
 * CommunityHomePage - KPA Society 통합 Home 허브
 *
 * WO-KPA-HOME-PHASE1-V1: 플랫폼 요약 허브
 * WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1: 통합 허브 재구성
 * WO-KPA-A-HOME-HUB-ENHANCEMENT-V1: 블록 우선순위·반응형·링크 정리
 * WO-KPA-A-HOME-FOOTER-LINKS-MANAGEMENT-V1: 하단 바로가기 링크 섹션 추가
 * WO-MARKET-TRIAL-COMMUNITY-HOME-BLOCK-IMPLEMENT-V1: 마켓트라이얼 소식 블록 추가
 * WO-KPA-MAIN-HOME-RESTRUCTURE-V1: 참여 유도형 커뮤니티 허브 전환
 * WO-SHARED-SPACE-COMPONENT-SPLIT-V1: 공통 컴포넌트 적용
 * WO-SHARED-SPACE-SIGNAGE-COMPONENT-V1: SignagePreviewSection 공통 적용
 * WO-SHARED-SPACE-CONTENT-COMPONENT-V1: ContentHighlightSection 공통 적용 (EducationSection 제거)
 *
 * 섹션 구조 (12블록):
 * ├─ HeroBannerSection        — 동적 광고 캐러셀 (KPA 고유)
 * ├─ HeroSummarySection       — 환영 메시지 + CTA 3개 (shared)
 * ├─ NewsNoticesSection       — 공지|새소식|약사공론 탭 (shared)
 * ├─ ActivitySection          — 최근 활동 포럼 글 (shared)
 * ├─ AppEntrySection          — 서비스 바로가기 카드 그리드 (shared)
 * ├─ ContentHighlightSection  — 교육/강의 요약 (shared)
 * ├─ SignagePreviewSection     — 디지털 사이니지 (shared)
 * ├─ CtaGuidanceSection       — 시범판매 CTA (shared)
 * ├─ AdSection                — 페이지 광고 (KPA 고유)
 * ├─ SponsorBar               — 스폰서 로고 (KPA 고유)
 * ├─ FooterLinksSection       — 하단 바로가기 링크 (KPA 고유)
 * └─ UtilitySection            — 유틸리티 (KPA 고유)
 */

import { useState, useEffect } from 'react';
import { HeroBannerSection } from '../components/community/HeroBannerSection';
import { AdSection } from '../components/community/AdSection';
import { SponsorBar } from '../components/community/SponsorBar';
import { FooterLinksSection } from '../components/home/FooterLinksSection';
import { UtilitySection } from '../components/home/UtilitySection';
import { homeApi } from '../api/home';
import type { HomePageData } from '../api/home';
import { lmsApi } from '../api/lms';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing } from '../styles/theme';
import {
  HeroSummarySection,
  NewsNoticesSection,
  ActivitySection as SharedActivitySection,
  AppEntrySection,
  CtaGuidanceSection,
  SignagePreviewSection,
  ContentHighlightSection,
} from '@o4o/shared-space-ui';
import type { NoticeItem, RecentPost, SignageMediaItem, SignagePlaylistItem, ContentHighlightItem } from '@o4o/shared-space-ui';

// ─── Inline SVG Icons (from original HeroCtaSection / CommunityServiceSection) ──

const ForumIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const EducationIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const SignageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const ResourceLibraryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const NewspaperIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6z" />
  </svg>
);

// ─── Main Component ─────────────────────────────────────────

export function CommunityHomePage() {
  const { isAuthenticated, user } = useAuth();
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newsTab, setNewsTab] = useState<'notices' | 'latest' | 'kpanews'>('notices');
  const [courses, setCourses] = useState<ContentHighlightItem[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);

  useEffect(() => {
    homeApi.prefetchAll()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    lmsApi.getCourses({ limit: 3 })
      .then((res: any) => {
        const items = res?.data?.data ?? res?.data ?? [];
        const list: any[] = Array.isArray(items) ? items : [];
        setCourses(list.map((c) => ({
          id: c.id,
          title: c.title,
          badge: c.category,
          thumbnailUrl: c.thumbnailUrl ?? null,
          meta: c.instructorName,
          href: `/lms/course/${c.id}`,
        })));
      })
      .catch(() => {})
      .finally(() => setCoursesLoaded(true));
  }, []);

  // ── Hero greeting ──
  const greeting = isAuthenticated && user?.name
    ? `${user.name}님, 환영합니다`
    : '약사 커뮤니티에 오신 것을 환영합니다';

  // ── News tab data mapping ──
  const newsItems: NoticeItem[] = (() => {
    if (newsTab === 'notices') {
      return (data?.notices ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        date: n.publishedAt || n.createdAt,
        isPinned: n.isPinned,
      }));
    }
    if (newsTab === 'latest') {
      return (data?.newsLatest ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        date: n.publishedAt || n.createdAt,
        isPinned: n.isPinned,
      }));
    }
    return [];
  })();

  // ── Activity data mapping ──
  const recentPosts: RecentPost[] = (data?.community.posts ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    date: p.createdAt,
    href: `/forum/post/${p.id}`,
    category: p.categoryName ?? undefined,
    author: p.authorName ?? undefined,
  }));

  // ── Signage data mapping ──
  const signageMediaItems: SignageMediaItem[] = (data?.signage.media ?? []).map((m) => ({
    id: m.id,
    title: m.name,
    mediaType: m.mediaType,
    uploaderName: m.uploaderName,
    createdAt: m.createdAt,
  }));
  const signagePlaylistItems: SignagePlaylistItem[] = (data?.signage.playlists ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    itemCount: p.itemCount,
    createdAt: p.createdAt,
  }));

  return (
    <div style={styles.page}>
      {/* 1. Hero 배너 (동적 광고 캐러셀 — KPA 고유) */}
      <HeroBannerSection ads={data?.heroAds ?? []} />

      <div style={styles.content}>
        {/* 2. 환영 + CTA (shared) */}
        <HeroSummarySection
          greeting={greeting}
          subtitle="자주 사용하는 서비스를 빠르게 시작하세요"
          ctas={[
            { label: '포럼 참여', href: '/forum', icon: <ForumIcon /> },
            { label: '강의 수강', href: '/lms', icon: <EducationIconSvg /> },
            { label: '자료실', href: '/resources', icon: <ResourceLibraryIcon /> },
          ]}
        />

        {/* 3. 탭 뉴스 (shared) */}
        <NewsNoticesSection
          title="공지 / 새 소식"
          tabs={[
            { key: 'notices', label: '공지사항' },
            { key: 'latest', label: '새소식' },
            { key: 'kpanews', label: '약사공론' },
          ]}
          activeTab={newsTab}
          onTabChange={(key) => setNewsTab(key as 'notices' | 'latest' | 'kpanews')}
          items={newsItems}
          loading={loading}
          viewAllHref="https://www.kpanews.co.kr"
          externalCta={newsTab === 'kpanews' ? {
            icon: <NewspaperIcon />,
            message: '약사공론에서 업계 소식을 확인하세요',
            href: 'https://www.kpanews.co.kr',
            linkLabel: '약사공론 바로가기 →',
          } : undefined}
        />

        {/* 4. 최근 활동 (shared) */}
        <SharedActivitySection
          featuredPosts={[]}
          recentPosts={recentPosts}
          loading={loading}
          viewAllHref="/forum"
        />

        {/* 5. 서비스 바로가기 (shared) */}
        <AppEntrySection
          cards={[
            { title: '약사 포럼', description: '동료 약사와 질문·토론으로 전문성을 높이세요', href: '/forum', icon: <ForumIcon /> },
            { title: '교육 / 강의', description: '보수교육·세미나를 온라인으로 수강하세요', href: '/lms', icon: <EducationIconSvg /> },
            { title: '디지털 사이니지', description: '약국 디지털 미디어를 관리하세요', href: '/signage', icon: <SignageIcon /> },
            { title: '자료실', description: '자료를 저장하고 AI 작업에 활용하세요', href: '/resources', icon: <ResourceLibraryIcon /> },
          ]}
        />

        {/* 6. 교육/강의 (shared) */}
        <div style={sectionMargin}>
          <ContentHighlightSection
            title="교육/강의"
            primaryGroupTitle="교육/강의"
            primaryItems={courses}
            viewAllHref="/lms"
            viewAllLabel="전체 보기 →"
            emptyMessage="등록된 강의가 없습니다."
            loading={!coursesLoaded}
          />
        </div>

        {/* 7. 사이니지 미디어 (shared) */}
        <SignagePreviewSection
          mediaItems={signageMediaItems}
          playlistItems={signagePlaylistItems}
          loading={loading}
          viewAllHref="/signage"
          viewAllLabel="사이니지 콘텐츠 보기 →"
        />

        {/* 8. 시범판매 CTA (shared) */}
        <CtaGuidanceSection
          title="신제품 시범판매 참여"
          description="공급자가 제안한 신제품을 먼저 체험해 보세요."
          href="https://neture.co.kr"
          linkLabel="Neture에서 보기 →"
          icon={<span>🧪</span>}
          external
        />

        {/* 9. 페이지 광고 (KPA 고유) */}
        <AdSection ads={data?.pageAds ?? []} />

        {/* 10. 스폰서 (KPA 고유) */}
        <SponsorBar sponsors={data?.sponsors ?? []} />

        {/* 11. 하단 바로가기 링크 (KPA 고유) */}
        <FooterLinksSection quickLinks={data?.quickLinks ?? []} />

        {/* 12. 유틸리티 (KPA 고유) */}
        <UtilitySection />
      </div>
    </div>
  );
}

const sectionMargin: React.CSSProperties = { marginBottom: 32 };

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: colors.neutral50,
  },
  content: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `${spacing.md} ${spacing.lg} ${spacing.sectionGap}`,
  },
};

export default CommunityHomePage;
