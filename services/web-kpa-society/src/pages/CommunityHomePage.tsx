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
 * WO-KPA-HOME-STRUCTURE-REFINEMENT-V1: 홈 구조 정리 (4블록 허브)
 * WO-KPA-COMMUNITY-ACCESS-GATE-V1: 비로그인 사용자 서비스 카드 클릭 시 로그인 유도
 * WO-O4O-STANDARD-HOME-TEMPLATE-V1: StandardHomeTemplate 적용
 *
 * 섹션 구조 (3블록):
 * ├─ HeroBannerSection        — 동적 광고 캐러셀 (KPA 고유)
 * ├─ 공지 / 약사공론 뉴스     — 2-column (좌: 공지, 우: placeholder)
 * ├─ AppEntrySection          — 서비스 바로가기 카드 5개 (shared)
 * └─ CtaGuidanceSection       — Market Trial CTA (shared)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Network, Users, BookOpen } from 'lucide-react';
import { PageHero, Card, useTemplate } from '@o4o/ui';
import {
  HeroBannerSection,
  StandardHomeTemplate,
  LatestActivitySection,
  LATEST_ACTIVITY_ACCENTS,
  LATEST_ACTIVITY_SUMMARY_LIMIT,
  buildLatestActivityTabs,
  AppEntrySection,
  O4OHelpSection,
  ForumIcon,
  EducationIcon,
  ContentIcon,
  SignageIcon,
  ResourcesIcon,
} from '@o4o/shared-space-ui';
import type { NoticeItem } from '@o4o/shared-space-ui';
import { homeApi } from '../api/home';
import type { HomePageData, LatestItem } from '../api/home';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/LoginModalContext';

// ─── 최신 활동 섹션 (WO-O4O-KPA-HOME-LATEST-ACTIVITY-SECTION-V1) ──────────
// WO-O4O-COMMUNITY-HOME-LATEST-ACTIVITY-SECTION-COMMONIZATION-V1:
//   3서비스에 인라인 복제돼 있던 구현을 공통 View(@o4o/shared-space-ui `LatestActivitySection`) 로
//   이관했다. 여기에는 KPA 정책(탭 바로가기 경로 · accent)만 남는다.

const LATEST_TABS = buildLatestActivityTabs();


// ─── 서비스 전용 아이콘 ─────────────────────────────────────
// ForumIcon, EducationIcon, ContentIcon, SignageIcon, ResourcesIcon → @o4o/shared-space-ui

const NewspaperIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6z" />
  </svg>
);

// ─── Main Component ─────────────────────────────────────────

export function CommunityHomePage() {
  const tpl = useTemplate();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openLoginModal, setOnLoginSuccess } = useAuthModal();
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestItems, setLatestItems] = useState<LatestItem[]>([]);
  const [latestTab, setLatestTab] = useState('all');
  const [latestLoading, setLatestLoading] = useState(true);
  // WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1: 오류/0건 구분 + 재시도
  const [latestError, setLatestError] = useState(false);
  const [latestReloadKey, setLatestReloadKey] = useState(0);

  // WO-KPA-COMMUNITY-ACCESS-GATE-V1: 비로그인 사용자 카드 클릭 시 로그인 유도
  const handleCardClick = useCallback((href: string, e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setOnLoginSuccess(() => { navigate(href); });
      openLoginModal();
    }
  }, [isAuthenticated, navigate, openLoginModal, setOnLoginSuccess]);

  useEffect(() => {
    homeApi.prefetchAll()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLatestLoading(true);
    setLatestError(false);
    homeApi.getLatest({ type: latestTab, limit: LATEST_ACTIVITY_SUMMARY_LIMIT })
      .then((res) => {
        // 계약 위반(비배열)도 실패로 간주 — 빈 목록으로 위장하지 않는다
        if (!Array.isArray(res?.data)) { setLatestItems([]); setLatestError(true); return; }
        setLatestItems(res.data);
      })
      .catch(() => { setLatestItems([]); setLatestError(true); })
      .finally(() => setLatestLoading(false));
  }, [latestTab, latestReloadKey]);

  // WO-O4O-KPA-MAIN-HOME-LINK-CANONICAL-ALIGNMENT-V1:
  //   공지 데이터는 `/home/notices` → cms_contents 다. 기존 href `/content/{id}` 는
  //   kpa_contents 상세를 조회하는 경로라 클릭 시 "콘텐츠를 찾을 수 없습니다" 가 떴다.
  //   KPA 에는 cms_contents 를 표시하는 공개 상세 라우트가 없으므로(=/content/notice 는
  //   /content 로 redirect) 잘못된 링크를 노출하지 않고 비링크로 표시한다.
  //   NewsNoticesSection 이 href 없는 항목을 이미 지원하며, K-Cosmetics 도 동일 방식이다.
  const noticeItems: NoticeItem[] = (data?.notices ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    date: n.publishedAt || n.createdAt,
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
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#065f46' }}>🧪 체험용 계정 제공</p>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#047857', lineHeight: 1.5 }}>
                주요 기능을 확인할 수 있는 공용 계정입니다. 입력한 데이터는 예고 없이 초기화될 수 있습니다.
              </p>
            </div>
            <Link to="/login" style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#fff', background: '#059669', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              체험 계정 보기
            </Link>
          </div>
          <HeroBannerSection
            ads={data?.heroAds ?? []}
            fallback={{
              // WO-O4O-KPA-HERO-FALLBACK-VALUE-COPY-V1:
              // Hero fallback 을 "커뮤니티 소개" 에서 "O4O 가치 전달" 로 전환.
              // Philosophy §8 최우선 명제 ("정보를 실행 경쟁력으로 전환") 직접 표현.
              // 3 요소 (AI · 운영자 자료 · 매장 도구) + "작은 약국" 으로 가치 명제 보존.
              badge: '약사·약국 O4O 플랫폼',
              title: '정보를 매장 실행 경쟁력으로 연결합니다',
              subtitle: 'AI · 운영자 자료 · 매장 도구를 연결해 작은 약국도 경쟁력을 만듭니다',
              // WO-KPA-HOME-HERO-COLOR-COMPOSITION-REFINE-V1:
              // blue band + 떠 있는 white card + 은은한 accent 로 시각 계층 강화 (문구·구조 동일)
              decorated: true,
            }}
          />
        </PageHero>
      }
      notices={noticeItems}
      noticesLoading={loading}
      noticesAccentBg="var(--color-primary-light, #eff6ff)"
      noticesRightSlot={
        <>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-slate-800 m-0">약사공론 뉴스</h2>
          </div>
          <Card className="flex flex-col items-center justify-center py-12 px-4 min-h-[200px]">
            <NewspaperIcon />
            <p className="text-[0.9375rem] font-medium text-slate-500 my-3 text-center">
              이 영역은 약사공론 뉴스가 표시될 예정입니다.
            </p>
            <a
              href="https://www.kpanews.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue-600 no-underline"
            >
              약사공론 바로가기 →
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
          accent={LATEST_ACTIVITY_ACCENTS.blue}
        />
      }
      // WO-O4O-KPA-HOME-ROLE-USAGE-MANUAL-RECLASSIFY-V1:
      //   이 영역은 작업 시작 진입(CTA)이 아니라 "사용자 유형별 활용 안내(매뉴얼)" 다.
      //   따라서 상단 진입 영역이 아니라 이용 가이드 영역(after-help)에 배치한다.
      //   (KPA 한정 재해석 — Neture 의 역할 카드는 시작 진입 성격이라 before-app-entry 유지)
      valueGuidePlacement="after-help"
      valueGuideSlot={
        // WO-O4O-KPA-HOME-VALUE-CARDS-V1 / RECLASSIFY-V1:
        // "내 역할에 따른 활용 방법" — 역할(매장 경영자/운영자/커뮤니티 참여자)별로
        // KPA-Society 활용 안내. /guide/for/{store-owner,operator,member} 로 연결.
        // AppEntrySection 패턴 재사용 — 데스크탑 3열 / 태블릿 2+1 / 모바일 stack.
        // WO-O4O-KPA-HOME-OTHER-SERVICES-SECTION-ALIGNMENT-V1: 역할 카드 아래에
        //   "다른 서비스 소개"(보조 안내)를 Home 맨 아래로 배치.
        <>
        <AppEntrySection
          title="내 역할에 따른 활용 방법"
          accentColor="var(--color-primary)"
          cards={[
            {
              title: '매장 경영자',
              description: 'AI · 운영자 지원 · 매장 실행 도구 활용',
              href: '/guide/for/store-owner',
              icon: <span className={iconCls}><Store size={24} /></span>,
            },
            {
              title: '서비스 운영자',
              description: '공급자 협력 · 자료 구성 · 매장 지원',
              href: '/guide/for/operator',
              icon: <span className={iconCls}><Network size={24} /></span>,
            },
            {
              title: '커뮤니티 참여자',
              description: '정보 · 경험 · 강의 · 콘텐츠 활용',
              href: '/guide/for/member',
              icon: <span className={iconCls}><Users size={24} /></span>,
            },
          ]}
        />
        {/* "다른 서비스 소개" — O4O 생태계 다른 서비스 보조 안내. O4OHelpSection
            services-only(Block 2) 재사용으로 카드 스타일·링크·필터 동일 유지. */}
        <O4OHelpSection
          showUsage={false}
          servicesTitle="다른 서비스 소개"
          currentServiceKey="kpa-society"
        />
        </>
      }
      appEntryCards={[
        { title: '포럼', description: '동료 약사와 질문·토론으로 전문성을 높이세요', href: '/forum', icon: <span className={iconCls}><ForumIcon /></span> },
        { title: '강의', description: '보수교육·세미나를 온라인으로 수강하세요', href: '/lms', icon: <span className={iconCls}><EducationIcon /></span> },
        { title: '콘텐츠', description: '플랫폼 콘텐츠를 검색하고 활용하세요', href: '/content', icon: <span className={iconCls}><ContentIcon /></span> },
        { title: '디지털사이니지', description: '매장 화면에 송출할 콘텐츠를 관리하세요', href: '/signage', icon: <span className={iconCls}><SignageIcon size={24} /></span> },
        { title: '자료실', description: '자료를 저장하고 AI 작업에 활용하세요', href: '/resources', icon: <span className={iconCls}><ResourcesIcon /></span> },
      ]}
      appEntryOnCardClick={handleCardClick}
      // WO-O4O-KPA-MAIN-HOME-GUIDANCE-DENSITY-SIMPLIFICATION-V1:
      //   `/guide/usage` 진입은 이 CTA 하나만 유지한다(아래 help.usageItems 의 중복 항목 제거).
      //   description 에서 '기능별' 을 뺀 이유 — 바로 아래 '기능별 이용 방법' 카드와 같은 말을 반복했다.
      cta={{
        title: 'KPA-Society 활용이 처음이신가요?',
        description: '서비스 구조와 이용 방법을 가이드에서 확인하세요',
        href: '/guide/usage',
        linkLabel: '이용 가이드 보기 →',
        icon: <BookOpen size={28} className="text-primary" />,
        accentColor: 'var(--color-primary)',
        accentBg: 'var(--color-primary-light, #eff6ff)',
      }}
      help={{
        currentServiceKey: 'kpa-society',
        usageTitle: 'KPA-Society 이용 가이드',
        // WO-O4O-KPA-HOME-OTHER-SERVICES-SECTION-ALIGNMENT-V1: 다른 서비스 블록은
        //   Home 맨 아래(valueGuideSlot 하단)로 이동했으므로 Help 슬롯에서는 숨김.
        showServices: false,
        // WO-O4O-KPA-MAIN-HOME-GUIDANCE-DENSITY-SIMPLIFICATION-V1:
        //   '서비스 활용 방법'(→ /guide/usage) 제거 — 바로 위 CTA 와 같은 화면으로 가는 중복 진입이었다.
        //   목적지(/guide/usage)는 CTA 에 그대로 남아 있어 접근 경로가 사라지지 않는다.
        usageItems: [
          { title: 'O4O 개요', description: 'O4O 서비스 구조와 KPA-Society의 역할', href: '/guide/intro' },
          { title: '기능별 이용 방법', description: '포럼, 강의, 자료실, 매장 기능 구성', href: '/guide/features' },
        ],
      }}
    />
  );
}

export default CommunityHomePage;
