/**
 * HomePage - K-Cosmetics 통합 Home 허브
 *
 * WO-KCOS-KPA-HOME-PORT-V1: KPA CommunityHomePage 4블록 구조 이식
 *
 * 섹션 구조 (KPA canonical):
 * ├─ HeroBannerSection        — 동적 광고 캐러셀 (community ads)
 * ├─ 공지 / K-Beauty 트렌드   — 2-column (좌: 공지, 우: placeholder)
 * ├─ AppEntrySection          — 서비스 바로가기 카드 (shared)
 * └─ CtaGuidanceSection       — Market Trial CTA (shared)
 */

import { useState, useEffect } from 'react';
import { HeroBannerSection } from '../components/community/HeroBannerSection';
import { homeApi } from '../api/home';
import type { HomePageData } from '../api/home';
import { PageHero, PageSection, PageContainer } from '@o4o/ui';
import {
  NewsNoticesSection,
  AppEntrySection,
  CtaGuidanceSection,
} from '@o4o/shared-space-ui';
import type { NoticeItem } from '@o4o/shared-space-ui';

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

const StoreHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
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

const CommunityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TrendIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

// ─── Accent color ──────────────────────────────────────────

const ACCENT = '#db2777';
const ACCENT_BG = '#fdf2f8';

// ─── Main Component ─────────────────────────────────────────

export function HomePage() {
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
    const id = 'kcos-home-two-col-responsive';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @media (max-width: 768px) {
        .kcos-home-two-col { flex-direction: column !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
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
      {/* 1. Hero 배너 (동적 광고 캐러셀) */}
      <PageHero>
        <HeroBannerSection ads={data?.heroAds ?? []} />
      </PageHero>

      {/* 2. 공지 / K-Beauty 트렌드 (2-column) */}
      <PageSection>
        <PageContainer>
          <div style={twoColStyles.row} className="kcos-home-two-col">
            {/* Left: 공지사항 */}
            <div style={twoColStyles.col}>
              <NewsNoticesSection
                title="공지"
                items={noticeItems}
                loading={loading}
                viewAllHref="/forum"
                accentColor={ACCENT}
                accentBg={ACCENT_BG}
              />
            </div>
            {/* Right: K-Beauty 트렌드 Placeholder */}
            <div style={twoColStyles.col}>
              <div style={twoColStyles.placeholderHeader}>
                <h2 style={twoColStyles.placeholderTitle}>K-Beauty 트렌드</h2>
              </div>
              <div style={twoColStyles.placeholderCard}>
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
              </div>
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* 3. 서비스 바로가기 (shared) */}
      <PageSection>
        <PageContainer>
          <AppEntrySection
            accentColor={ACCENT}
            cards={[
              { title: '포럼', description: 'K-Beauty 전문가와 토론하고 소통하세요', href: '/forum', icon: <ForumIcon /> },
              { title: '강의', description: 'K-Beauty 교육 콘텐츠를 온라인으로 수강하세요', href: '/lms', icon: <EducationIconSvg /> },
              { title: '매장 HUB', description: '매장 채널과 상품을 관리하세요', href: '/store-hub', icon: <StoreHubIcon /> },
              { title: '콘텐츠', description: '플랫폼 콘텐츠를 검색하고 활용하세요', href: '/library/content', icon: <ContentIcon /> },
              { title: '커뮤니티', description: '공지, 광고, 후원 정보를 확인하세요', href: '/community', icon: <CommunityIcon /> },
            ]}
          />
        </PageContainer>
      </PageSection>

      {/* 4. Market Trial CTA (shared) */}
      <PageSection last>
        <PageContainer>
          <CtaGuidanceSection
            title="Market Trial"
            description="서비스 참여자와 함께 제품을 다듬고, 좋은 조건의 유통 환경을 만들어가는 참여형 프로그램"
            href="https://neture.co.kr"
            linkLabel="Neture에서 보기 →"
            icon={<span>🧪</span>}
            external
          />
        </PageContainer>
      </PageSection>
    </div>
  );
}

const twoColStyles: Record<string, React.CSSProperties> = {
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
    color: '#db2777',
    textDecoration: 'none',
  },
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
};

export default HomePage;
