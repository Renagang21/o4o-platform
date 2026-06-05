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
import { Loader2, Store, Network, Users, FlaskConical } from 'lucide-react';
import { PageHero, Card, useTemplate } from '@o4o/ui';
import {
  HeroBannerSection,
  StandardHomeTemplate,
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
// WO-O4O-KPA-HOME-LATEST-SUMMARY-LIMIT-AND-TAB-SHORTCUT-V1: 메인 화면 요약 성격에 맞춰
//   탭별 표시 개수 제한 + 탭별 해당 공간 바로가기 추가.

const LATEST_SUMMARY_LIMIT = 6;

const LATEST_TABS = [
  { key: 'all',      label: '전체',     shortcutHref: null,         shortcutLabel: null },
  { key: 'forum',    label: '포럼',     shortcutHref: '/forum',     shortcutLabel: '포럼 바로가기' },
  { key: 'course',   label: '강의',     shortcutHref: '/lms',       shortcutLabel: '강의 바로가기' },
  { key: 'content',  label: '콘텐츠',   shortcutHref: '/content',   shortcutLabel: '콘텐츠 바로가기' },
  { key: 'signage',  label: '사이니지', shortcutHref: '/signage',   shortcutLabel: '사이니지 바로가기' },
  { key: 'resource', label: '자료실',   shortcutHref: '/resources', shortcutLabel: '자료실 바로가기' },
] as const;

const LATEST_BADGE: Record<string, { label: string; cls: string }> = {
  forum:    { label: '포럼',     cls: 'bg-blue-100 text-blue-700' },
  course:   { label: '강의',     cls: 'bg-purple-100 text-purple-700' },
  content:  { label: '콘텐츠',   cls: 'bg-emerald-100 text-emerald-700' },
  resource: { label: '자료실',   cls: 'bg-amber-100 text-amber-700' },
  signage:  { label: '사이니지', cls: 'bg-rose-100 text-rose-700' },
};

interface LatestSectionProps {
  items: LatestItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  loading: boolean;
}

function LatestActivitySection({ items, activeTab, onTabChange, loading }: LatestSectionProps) {
  const currentTab = LATEST_TABS.find((t) => t.key === activeTab);
  const hasTabShortcut = !loading && items.length > 0 && currentTab?.shortcutHref;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800 m-0">최신글</h2>
      </div>

      {/* 탭 필터 */}
      <div className="flex gap-2 flex-wrap mb-4">
        {LATEST_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">등록된 글이 없습니다</div>
      ) : (
        <div className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-200 overflow-hidden">
          {items.map((item) => {
            const badge = LATEST_BADGE[item.type];
            const date = new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            return (
              <Link
                key={`${item.type}-${item.id}`}
                to={item.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors no-underline group"
              >
                <span className={`shrink-0 inline-block px-2 py-0.5 text-xs font-semibold rounded ${badge?.cls ?? 'bg-slate-100 text-slate-600'}`}>
                  {badge?.label ?? item.type}
                </span>
                <span className="flex-1 min-w-0 font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                  {item.title}
                </span>
                {item.authorName && (
                  <span className="shrink-0 text-xs text-slate-400 hidden sm:block">{item.authorName}</span>
                )}
                <span className="shrink-0 text-xs text-slate-400">{date}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* 탭별 바로가기 — 전체 탭은 요약 성격이므로 skip, 카테고리 탭만 해당 공간 바로가기 표시 */}
      {hasTabShortcut && (
        <div className="mt-3 flex justify-end">
          <Link
            to={currentTab.shortcutHref!}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 no-underline whitespace-nowrap"
          >
            {currentTab.shortcutLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}

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
    homeApi.getLatest({ type: latestTab, limit: LATEST_SUMMARY_LIMIT })
      .then((res) => setLatestItems(res.data ?? []))
      .catch(() => setLatestItems([]))
      .finally(() => setLatestLoading(false));
  }, [latestTab]);

  const noticeItems: NoticeItem[] = (data?.notices ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    date: n.publishedAt || n.createdAt,
    isPinned: n.isPinned,
    href: `/content/${n.id}`,
  }));

  const iconCls = `flex items-center justify-center shrink-0 ${tpl?.icon?.wrapper ?? ''} ${tpl?.icon?.icon ?? 'text-primary'}`;

  return (
    <StandardHomeTemplate
      heroSlot={
        <PageHero>
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
          items={latestItems}
          activeTab={latestTab}
          onTabChange={setLatestTab}
          loading={latestLoading}
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
              description: '직원이 많지 않아도 AI · 운영자 지원 · 매장 실행 도구를 활용해 정보 전달 경쟁력을 만들 수 있습니다',
              href: '/guide/for/store-owner',
              icon: <span className={iconCls}><Store size={24} /></span>,
            },
            {
              title: '서비스 운영자',
              description: '공급자 협력 · 자료 구성 · 매장 지원 · AI 보조를 활용해 지역 생태계를 운영합니다',
              href: '/guide/for/operator',
              icon: <span className={iconCls}><Network size={24} /></span>,
            },
            {
              title: '커뮤니티 참여자',
              description: '정보 · 경험 · 강의 · 콘텐츠가 실제 현장 활용으로 연결됩니다',
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
        { title: '디지털 사이니지', description: '약국 디지털 미디어를 관리하세요', href: '/signage', icon: <span className={iconCls}><SignageIcon size={24} /></span> },
        { title: '자료실', description: '자료를 저장하고 AI 작업에 활용하세요', href: '/resources', icon: <span className={iconCls}><ResourcesIcon /></span> },
      ]}
      appEntryOnCardClick={handleCardClick}
      cta={{
        title: '유통 참여형 펀딩 (Market Trial)',
        description: '서비스 참여자와 함께 제품을 다듬고, 좋은 조건의 유통 환경을 만들어가는 참여형 프로그램',
        href: 'https://neture.co.kr',
        linkLabel: 'Neture에서 보기 →',
        // O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1: Market Trial 표준 아이콘 (Neture 기준 정렬)
        icon: <FlaskConical size={28} className="text-primary" />,
        accentColor: 'var(--color-primary)',
        accentBg: 'var(--color-primary-light, #eff6ff)',
        external: true,
      }}
      help={{
        currentServiceKey: 'kpa-society',
        usageTitle: 'KPA-Society 이용 가이드',
        // WO-O4O-KPA-HOME-OTHER-SERVICES-SECTION-ALIGNMENT-V1: 다른 서비스 블록은
        //   Home 맨 아래(valueGuideSlot 하단)로 이동했으므로 Help 슬롯에서는 숨김.
        showServices: false,
        usageItems: [
          { title: 'O4O 개요', description: 'O4O 서비스 구조와 KPA-Society의 역할', href: '/guide/intro' },
          { title: '서비스 활용 방법', description: '상품, 콘텐츠, 고객 응대 기반 매장 운영 방식', href: '/guide/usage' },
          { title: '기능별 이용 방법', description: '포럼, 강의, 자료실, 매장 기능 구성', href: '/guide/features' },
        ],
      }}
    />
  );
}

export default CommunityHomePage;
