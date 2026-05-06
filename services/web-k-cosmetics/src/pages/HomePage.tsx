/**
 * HomePage - K-Cosmetics 통합 Home 허브
 *
 * WO-KCOS-KPA-HOME-PORT-V1: KPA CommunityHomePage 4블록 구조 이식
 * WO-O4O-KCOS-HOME-DESIGN-APPLY-V1: 브랜드/감성 테마 적용
 *
 * 섹션 구조 (KPA canonical):
 * ├─ HeroBannerSection        — 동적 광고 캐러셀 / 브랜드 Hero (기본)
 * ├─ 공지 / K-Beauty 트렌드   — 2-column (좌: 공지, 우: placeholder)
 * ├─ AppEntrySection          — 서비스 바로가기 카드 (brand-card style, shared)
 * └─ CtaGuidanceSection       — Market Trial CTA (shared)
 */

import { useState, useEffect } from 'react';
import { HeroBannerSection } from '../components/community/HeroBannerSection';
import { homeApi } from '../api/home';
import type { HomePageData } from '../api/home';
import { PageHero, PageSection, PageContainer, Card, useTemplate } from '@o4o/ui';
import {
  NewsNoticesSection,
  AppEntrySection,
  CtaGuidanceSection,
  O4OHelpSection,
} from '@o4o/shared-space-ui';
import type { NoticeItem } from '@o4o/shared-space-ui';

// ─── Inline SVG Icons ──────────────────────────────────────

const ForumIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const EducationIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const SignageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
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


const ResourcesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);


const TrendIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

// ─── Main Component ─────────────────────────────────────────

export function HomePage() {
  const tpl = useTemplate();
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeApi.prefetchAll()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Notice items ──
  const noticeItems: NoticeItem[] = (data?.notices ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    date: n.date,
    isPinned: n.isPinned,
  }));

  return (
    <div style={styles.page}>
      {/* 1. Hero 배너 (동적 광고 캐러셀 / 브랜드 Hero) */}
      <PageHero>
        <HeroBannerSection ads={data?.heroAds ?? []} />
      </PageHero>

      {/* 2. 공지 / K-Beauty 트렌드 (2-column) */}
      <PageSection>
        <PageContainer>
          <div className="flex flex-col md:flex-row gap-5">
            {/* Left: 공지사항 */}
            <div className="flex-1 min-w-0">
              <NewsNoticesSection
                title="공지"
                items={noticeItems}
                loading={loading}
                viewAllHref="/forum"
                accentColor="var(--color-primary)"
                accentBg="var(--color-primary-light, #fdf2f8)"
              />
            </div>
            {/* Right: K-Beauty 트렌드 Placeholder */}
            <div className="flex-1 min-w-0">
              <div style={twoColStyles.placeholderHeader}>
                <h2 style={twoColStyles.placeholderTitle}>K-Beauty 트렌드</h2>
              </div>
              <Card style={twoColStyles.placeholderCard}>
                <TrendIcon />
                <p style={twoColStyles.placeholderText}>
                  이 영역은 K-Beauty 트렌드 소식이 표시될 예정입니다.
                </p>
                <a
                  href="/community"
                  style={twoColStyles.placeholderLink}
                >
                  커뮤니티 바로가기 →
                </a>
              </Card>
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* 3. 서비스 바로가기 — brand-card style */}
      <PageSection>
        <PageContainer>
          <AppEntrySection
            accentColor="var(--color-primary)"
            cards={[
              { title: '포럼', description: 'K-Beauty 전문가와 토론하고 소통하세요', href: '/forum', icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}><ForumIcon /></span> },
              { title: '강의', description: 'K-Beauty 교육 콘텐츠를 온라인으로 수강하세요', href: '/lms', icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}><EducationIcon /></span> },
              { title: '콘텐츠', description: '플랫폼 콘텐츠를 검색하고 활용하세요', href: '/library/content', icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}><ContentIcon /></span> },
              { title: '자료실', description: 'K-Beauty 관련 자료를 검색하고 활용하세요', href: '/resources', icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}><ResourcesIcon /></span> },
              { title: '디지털 사이니지', description: '매장 디지털 사이니지 콘텐츠를 관리하세요', href: '/signage', icon: <span className={`flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`}><SignageIcon /></span> },
            ]}
          />
        </PageContainer>
      </PageSection>

      {/* 4. Market Trial CTA (shared) */}
      <PageSection>
        <PageContainer>
          <CtaGuidanceSection
            title="유통 참여형 펀딩 (Market Trial)"
            description="서비스 참여자와 함께 제품을 다듬고, 좋은 조건의 유통 환경을 만들어가는 참여형 프로그램"
            href="https://neture.co.kr"
            linkLabel="Neture에서 보기 →"
            icon={<span>🧪</span>}
            accentColor="var(--color-primary)"
            accentBg="var(--color-primary-light, #fdf2f8)"
            external
          />
        </PageContainer>
      </PageSection>

      {/* 5. O4O 도움 + 다른 서비스 (shared) */}
      <PageSection last>
        <PageContainer>
          <O4OHelpSection
            currentServiceKey="k-cosmetics"
            usageTitle="K-Cosmetics 이용 가이드"
            usageItems={[
              {
                title: 'O4O 개요',
                description: 'O4O 서비스 구조와 K-Cosmetics의 역할',
                href: '/guide/intro',
              },
              {
                title: '서비스 활용 방법',
                description: '상품, 콘텐츠, 고객 응대 기반 매장 운영 방식',
                href: '/guide/usage',
              },
              {
                title: '기능별 이용 방법',
                description: '포럼, 강의, 자료실, 매장 기능 구성',
                href: '/guide/features',
              },
            ]}
          />
        </PageContainer>
      </PageSection>
    </div>
  );
}

// ─── Two-column Styles ───────────────────────────────────────

const twoColStyles: Record<string, React.CSSProperties> = {
  placeholderHeader: {
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--color-text-primary, #1e293b)',
    margin: 0,
  },
  placeholderCard: {
    backgroundColor: 'var(--color-bg-primary, #ffffff)',
    /* borderRadius/shadow → Card 컴포넌트 template 자동 적용 */
    border: '1px solid var(--color-border-default, #e2e8f0)',
    padding: '56px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  placeholderText: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--color-text-secondary, #475569)',
    margin: '14px 0',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  placeholderLink: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-primary, #DB2777)',
    textDecoration: 'none',
  },
};

// ─── Page Styles ─────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
  },
};

export default HomePage;
