/**
 * HomePage - K-Cosmetics 통합 Home 허브
 *
 * WO-KCOS-KPA-HOME-PORT-V1: KPA CommunityHomePage 4블록 구조 이식
 * WO-O4O-KCOS-HOME-DESIGN-APPLY-V1: 브랜드/감성 테마 적용
 * WO-O4O-STANDARD-HOME-TEMPLATE-V1: StandardHomeTemplate 적용
 *
 * 섹션 구조 (KPA canonical):
 * ├─ HeroBannerSection        — 동적 광고 캐러셀 / 브랜드 Hero (기본)
 * ├─ 공지 / K-Beauty 트렌드   — 2-column (좌: 공지, 우: placeholder)
 * ├─ AppEntrySection          — 서비스 바로가기 카드 (brand-card style, shared)
 * └─ CtaGuidanceSection       — Market Trial CTA (shared)
 */

import { useState, useEffect } from 'react';
import { PageHero, Card, useTemplate } from '@o4o/ui';
import {
  HeroBannerSection,
  StandardHomeTemplate,
  ForumIcon,
  EducationIcon,
  ContentIcon,
  SignageIcon,
  ResourcesIcon,
} from '@o4o/shared-space-ui';
import type { NoticeItem } from '@o4o/shared-space-ui';
import { homeApi } from '../api/home';
import type { HomePageData } from '../api/home';

// ─── 서비스 전용 아이콘 ─────────────────────────────────────
// ForumIcon, EducationIcon, ContentIcon, SignageIcon, ResourcesIcon → @o4o/shared-space-ui

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

  const noticeItems: NoticeItem[] = (data?.notices ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    date: n.date,
    isPinned: n.isPinned,
  }));

  const iconCls = `flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`;

  return (
    <StandardHomeTemplate
      heroSlot={
        <PageHero>
          <HeroBannerSection
            ads={data?.heroAds ?? []}
            fallback={{
              badge: 'K-Cosmetics Community',
              title: 'K-Beauty Community Hub',
              subtitle: 'Forum, Video, Resources all in one place',
              primaryColor: 'var(--color-primary, #DB2777)',
              bgColor: '#fdf2f8',
              borderColor: '#fce7f3',
            }}
          />
        </PageHero>
      }
      notices={noticeItems}
      noticesLoading={loading}
      noticesViewAllHref="/forum"
      noticesAccentBg="var(--color-primary-light, #fdf2f8)"
      noticesGap="gap-5"
      noticesRightSlot={
        <>
          <div style={placeholderStyles.header}>
            <h2 style={placeholderStyles.title}>K-Beauty 트렌드</h2>
          </div>
          <Card style={placeholderStyles.card}>
            <TrendIcon />
            <p style={placeholderStyles.text}>이 영역은 K-Beauty 트렌드 소식이 표시될 예정입니다.</p>
            <a href="/community" style={placeholderStyles.link}>
              커뮤니티 바로가기 →
            </a>
          </Card>
        </>
      }
      appEntryCards={[
        { title: '포럼', description: 'K-Beauty 전문가와 토론하고 소통하세요', href: '/forum', icon: <span className={iconCls}><ForumIcon /></span> },
        { title: '강의', description: 'K-Beauty 교육 콘텐츠를 온라인으로 수강하세요', href: '/lms', icon: <span className={iconCls}><EducationIcon /></span> },
        { title: '콘텐츠', description: '플랫폼 콘텐츠를 검색하고 활용하세요', href: '/library/content', icon: <span className={iconCls}><ContentIcon /></span> },
        { title: '자료실', description: 'K-Beauty 관련 자료를 검색하고 활용하세요', href: '/resources', icon: <span className={iconCls}><ResourcesIcon /></span> },
        { title: '디지털 사이니지', description: '매장 디지털 사이니지 콘텐츠를 관리하세요', href: '/signage', icon: <span className={iconCls}><SignageIcon /></span> },
      ]}
      cta={{
        title: '유통 참여형 펀딩 (Market Trial)',
        description: '서비스 참여자와 함께 제품을 다듬고, 좋은 조건의 유통 환경을 만들어가는 참여형 프로그램',
        href: 'https://neture.co.kr',
        linkLabel: 'Neture에서 보기 →',
        icon: <span>🧪</span>,
        accentColor: 'var(--color-primary)',
        accentBg: 'var(--color-primary-light, #fdf2f8)',
        external: true,
      }}
      help={{
        currentServiceKey: 'k-cosmetics',
        usageTitle: 'K-Cosmetics 이용 가이드',
        usageItems: [
          { title: 'O4O 개요', description: 'O4O 서비스 구조와 K-Cosmetics의 역할', href: '/guide/intro' },
          { title: '서비스 활용 방법', description: '상품, 콘텐츠, 고객 응대 기반 매장 운영 방식', href: '/guide/usage' },
          { title: '기능별 이용 방법', description: '포럼, 강의, 자료실, 매장 기능 구성', href: '/guide/features' },
        ],
      }}
    />
  );
}

// ─── Notices Right Placeholder Styles ───────────────────────

const placeholderStyles: Record<string, React.CSSProperties> = {
  header: { marginBottom: 12 },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--color-text-primary, #1e293b)',
    margin: 0,
  },
  card: {
    backgroundColor: 'var(--color-bg-primary, #ffffff)',
    border: '1px solid var(--color-border-default, #e2e8f0)',
    padding: '56px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  text: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--color-text-secondary, #475569)',
    margin: '14px 0',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  link: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-primary, #DB2777)',
    textDecoration: 'none',
  },
};

export default HomePage;
