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
 * WO-KPA-HOME-STRUCTURE-REFINEMENT-V1: 홈 구조 정리 (10블록)
 *
 * 섹션 구조 (10블록):
 * ├─ HeroBannerSection        — 동적 광고 캐러셀 (KPA 고유)
 * ├─ HeroSummarySection       — 환영 메시지 + CTA 3개 (shared, subtitle 제거)
 * ├─ 공��� / 약사공론 뉴스     — 2-column (좌: 공지, 우: placeholder)
 * ├─ ActivitySection          — 최근 활동 포럼 글 (shared)
 * ├─ AppEntrySection          — 서비스 바로가기 카드 5개 (shared)
 * ├─ CtaGuidanceSection       — Market Trial CTA (shared)
 * ├─ AdSection                — 페이지 광고 (KPA 고유)
 * ├─ SponsorBar               — 스폰서 로고 (KPA 고유)
 * ├─ FooterLinksSection       — 하단 바로가기 링크 (KPA 고유)
 * └─ UtilitySection           — 유틸리티 (KPA 고유)
 */

import { useState, useEffect } from 'react';
import { HeroBannerSection } from '../components/community/HeroBannerSection';
import { AdSection } from '../components/community/AdSection';
import { SponsorBar } from '../components/community/SponsorBar';
import { FooterLinksSection } from '../components/home/FooterLinksSection';
import { UtilitySection } from '../components/home/UtilitySection';
import { homeApi } from '../api/home';
import type { HomePageData } from '../api/home';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing } from '../styles/theme';
import {
  HeroSummarySection,
  NewsNoticesSection,
  ActivitySection as SharedActivitySection,
  AppEntrySection,
  CtaGuidanceSection,
} from '@o4o/shared-space-ui';
import type { NoticeItem, RecentPost } from '@o4o/shared-space-ui';

// ─── Inline SVG Icons ──────────────────────────────────────

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

const ContentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
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
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6z" />
  </svg>
);

// ─── Main Component ─────────────────────────────────────────

export function CommunityHomePage() {
  const { isAuthenticated, user } = useAuth();
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeApi.prefetchAll()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Responsive 2-column CSS
  useEffect(() => {
    const id = 'kpa-home-two-col-responsive';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @media (max-width: 768px) {
        .kpa-home-two-col { flex-direction: column !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // ── Hero greeting ──
  const greeting = isAuthenticated && user?.name
    ? `${user.name}님, 환영합니다`
    : '약사 커뮤니티에 오신 것을 환영합니다';

  // ── Notice items ──
  const noticeItems: NoticeItem[] = (data?.notices ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    date: n.publishedAt || n.createdAt,
    isPinned: n.isPinned,
  }));

  // ── Activity data mapping ──
  const recentPosts: RecentPost[] = (data?.community.posts ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    date: p.createdAt,
    href: `/forum/post/${p.id}`,
    category: p.categoryName ?? undefined,
    author: p.authorName ?? undefined,
  }));

  return (
    <div style={styles.page}>
      {/* 1. Hero 배너 (동적 광고 캐러셀 — KPA 고유) */}
      <HeroBannerSection ads={data?.heroAds ?? []} />

      <div style={styles.content}>
        {/* 2. 환영 + CTA (shared) */}
        <HeroSummarySection
          greeting={greeting}
          ctas={[
            { label: '포럼 참여', href: '/forum', icon: <ForumIcon /> },
            { label: '강의 수강', href: '/lms', icon: <EducationIconSvg /> },
            { label: '자료실', href: '/resources', icon: <ResourceLibraryIcon /> },
          ]}
        />

        {/* 3. 공지 / 약사공론 뉴스 (2-column) */}
        <section style={twoColStyles.section}>
          <div style={twoColStyles.row} className="kpa-home-two-col">
            {/* Left: 공지사항 */}
            <div style={twoColStyles.col}>
              <NewsNoticesSection
                title="공지"
                items={noticeItems}
                loading={loading}
                viewAllHref="/forum"
              />
            </div>
            {/* Right: 약사공론 뉴스 Placeholder */}
            <div style={twoColStyles.col}>
              <div style={twoColStyles.placeholderHeader}>
                <h2 style={twoColStyles.placeholderTitle}>약사공론 뉴스</h2>
              </div>
              <div style={twoColStyles.placeholderCard}>
                <NewspaperIcon />
                <p style={twoColStyles.placeholderText}>
                  이 영역은 약사공론 뉴스가 표시될 예정입니다.
                </p>
                <a
                  href="https://www.kpanews.co.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={twoColStyles.placeholderLink}
                >
                  약사공론 바로가기 →
                </a>
              </div>
            </div>
          </div>
        </section>

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
            { title: '포럼', description: '동료 약사와 질문·토론으로 전문성을 높이세요', href: '/forum', icon: <ForumIcon /> },
            { title: '강의', description: '보수교육·세미나를 온라인으로 수강하세요', href: '/lms', icon: <EducationIconSvg /> },
            { title: '콘텐츠', description: '플랫폼 콘텐츠를 검색하고 활용하세요', href: '/hub/content', icon: <ContentIcon /> },
            { title: '디지털 사이니지', description: '약국 디지털 미디어를 관리하세요', href: '/signage', icon: <SignageIcon /> },
            { title: '자료실', description: '자료를 저장하고 AI 작업에 활용하세요', href: '/resources', icon: <ResourceLibraryIcon /> },
          ]}
        />

        {/* 6. Market Trial CTA (shared) */}
        <CtaGuidanceSection
          title="Market Trial"
          description="서비스 참여자와 함께 제품을 다듬고, 좋은 조건의 유통 환경을 만들어가는 참여형 프로그램"
          href="https://neture.co.kr"
          linkLabel="Neture에서 보기 →"
          icon={<span>🧪</span>}
          external
        />

        {/* 7. 페이지 광고 (KPA 고유) */}
        <AdSection ads={data?.pageAds ?? []} />

        {/* 8. 스폰서 (KPA 고유) */}
        <SponsorBar sponsors={data?.sponsors ?? []} />

        {/* 9. 하단 바로가기 링크 (KPA 고유) */}
        <FooterLinksSection quickLinks={data?.quickLinks ?? []} />

        {/* 10. 유틸리티 (KPA 고유) */}
        <UtilitySection />
      </div>
    </div>
  );
}

const twoColStyles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: 32,
  },
  row: {
    display: 'flex',
    gap: 16,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  placeholderHeader: {
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  placeholderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: '40px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  placeholderText: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#334155',
    margin: '12px 0',
    textAlign: 'center',
  },
  placeholderLink: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#2563EB',
    textDecoration: 'none',
  },
};

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
