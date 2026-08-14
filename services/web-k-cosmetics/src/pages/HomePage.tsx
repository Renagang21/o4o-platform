/**
 * HomePage - K-Cosmetics 통합 Home 허브
 *
 * WO-KCOS-KPA-HOME-PORT-V1: KPA CommunityHomePage 4블록 구조 이식
 * WO-O4O-KCOS-HOME-DESIGN-APPLY-V1: 브랜드/감성 테마 적용
 * WO-O4O-STANDARD-HOME-TEMPLATE-V1: StandardHomeTemplate 적용
 * WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-UI-ALIGNMENT-V1: 최신 활동 섹션 추가
 *
 * 섹션 구조 (KPA canonical):
 * ├─ HeroBannerSection        — 동적 광고 캐러셀 / 브랜드 Hero (기본)
 * ├─ 공지 / K-Beauty 트렌드   — 2-column (좌: 공지, 우: placeholder)
 * ├─ 최신 활동                 — 탭 + 목록 (forum/course/content/resource/signage)
 * ├─ AppEntrySection          — 서비스 바로가기 카드 (brand-card style, shared)
 * └─ CtaGuidanceSection       — Market Trial CTA (shared)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FlaskConical } from 'lucide-react';
import { PageHero, Card, useTemplate } from '@o4o/ui';
import {
  HeroBannerSection,
  LatestActivitySection,
  LATEST_ACTIVITY_ACCENTS,
  LATEST_ACTIVITY_SUMMARY_LIMIT,
  buildLatestActivityTabs,
  StandardHomeTemplate,
  ForumIcon,
  EducationIcon,
  ContentIcon,
  SignageIcon,
  ResourcesIcon,
} from '@o4o/shared-space-ui';
import type { NoticeItem } from '@o4o/shared-space-ui';
import { homeApi } from '../api/home';
import type { HomePageData, LatestItem } from '../api/home';
// WO-O4O-HOME-TEMP-EXPERIENCE-ACCOUNT-NOTICE-V1: 체험 계정 안내 CTA → 로그인 모달
import { useLoginModal } from '../contexts/LoginModalContext';

// ─── 서비스 전용 아이콘 ─────────────────────────────────────
// ForumIcon, EducationIcon, ContentIcon, SignageIcon, ResourcesIcon → @o4o/shared-space-ui

const TrendIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

// ─── 최신 활동 섹션 (WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-UI-ALIGNMENT-V1) ──
// WO-O4O-COMMUNITY-HOME-LATEST-ACTIVITY-SECTION-COMMONIZATION-V1:
//   3서비스 인라인 복제를 공통 View(@o4o/shared-space-ui `LatestActivitySection`) 로 이관.
//   K-Cosmetics 정책(콘텐츠/사이니지 공간 경로 · pink accent)만 여기에 남는다.

const LATEST_TABS = buildLatestActivityTabs({
  content: '/store-hub/content',
  signage: '/store/marketing/signage/playlist',
});


// ─── Main Component ─────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const tpl = useTemplate();
  const { openLoginModal } = useLoginModal();
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  // WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-UI-ALIGNMENT-V1
  const [latestItems, setLatestItems] = useState<LatestItem[]>([]);
  const [latestTab, setLatestTab] = useState('all');
  const [latestLoading, setLatestLoading] = useState(true);
  // WO-O4O-COMMUNITY-HOME-LATEST-ACTIVITY-SECTION-COMMONIZATION-V1:
  //   공통 View 의 4상태 계약(loading/error/empty/list) 에 맞춰 실패 상태를 분리한다.
  const [latestError, setLatestError] = useState(false);
  const [latestReloadKey, setLatestReloadKey] = useState(0);

  useEffect(() => {
    homeApi.prefetchAll()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // WO-O4O-GLYCOPHARM-KCOS-HOME-LATEST-UI-ALIGNMENT-V1
  useEffect(() => {
    setLatestLoading(true);
    setLatestError(false);
    homeApi.getLatest({ type: latestTab, limit: LATEST_ACTIVITY_SUMMARY_LIMIT })
      .then((items) => setLatestItems(items))
      .catch(() => {
        setLatestItems([]);
        setLatestError(true);
      })
      .finally(() => setLatestLoading(false));
  }, [latestTab, latestReloadKey]);

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
          {/* WO-O4O-HOME-TEMP-EXPERIENCE-ACCOUNT-NOTICE-V1: 임시 공용 체험 계정 안내 (추후 제거 예정) */}
          <div style={{ background: '#ffffff', border: '1px solid #a7f3d0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}><FlaskConical size={15} aria-hidden="true" />체험용 계정 제공</p>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#047857', lineHeight: 1.5 }}>
                주요 기능을 확인할 수 있는 공용 계정입니다. 입력한 데이터는 예고 없이 초기화될 수 있습니다.
              </p>
            </div>
            <button type="button" onClick={openLoginModal} style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#fff', background: '#059669', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              체험 계정 보기
            </button>
          </div>
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
            <a href="/forum" style={placeholderStyles.link}>
              커뮤니티 바로가기 →
            </a>
          </Card>
        </>
      }
      latestSlot={
        <LatestActivitySection
          tabs={LATEST_TABS}
          items={latestItems}
          activeTab={latestTab}
          onTabChange={setLatestTab}
          loading={latestLoading}
          loadError={latestError}
          onRetry={() => setLatestReloadKey((k) => k + 1)}
          navigate={(path) => navigate(path)}
          accent={LATEST_ACTIVITY_ACCENTS.pink}
        />
      }
      appEntryCards={[
        { title: '포럼', description: 'K-Beauty 전문가와 토론하고 소통하세요', href: '/forum', icon: <span className={iconCls}><ForumIcon /></span> },
        { title: '강의', description: 'K-Beauty 교육 콘텐츠를 온라인으로 수강하세요', href: '/lms', icon: <span className={iconCls}><EducationIcon /></span> },
        { title: '콘텐츠', description: '플랫폼 콘텐츠를 검색하고 활용하세요', href: '/store-hub/content', icon: <span className={iconCls}><ContentIcon /></span> },
        { title: '자료실', description: 'K-Beauty 관련 자료를 검색하고 활용하세요', href: '/resources', icon: <span className={iconCls}><ResourcesIcon /></span> },
        { title: '디지털사이니지', description: '매장 화면에 송출할 콘텐츠를 관리하세요', href: '/signage', icon: <span className={iconCls}><SignageIcon /></span> },
      ]}
      cta={{
        title: 'K-Cosmetics 활용이 처음이신가요?',
        description: '서비스 구조와 기능별 이용 방법을 가이드에서 확인하세요',
        href: '/guide/usage',
        linkLabel: '이용 가이드 보기 →',
        icon: <BookOpen size={28} className="text-primary" />,
        accentColor: 'var(--color-primary)',
        accentBg: 'var(--color-primary-light, #fdf2f8)',
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
