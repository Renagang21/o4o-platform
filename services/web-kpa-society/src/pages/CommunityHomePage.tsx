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
import { Loader2 } from 'lucide-react';
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
import type { HomePageData, LatestItem } from '../api/home';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/LoginModalContext';

// ─── 최신 활동 섹션 (WO-O4O-KPA-HOME-LATEST-ACTIVITY-SECTION-V1) ──────────

const LATEST_TABS = [
  { key: 'all',      label: '전체' },
  { key: 'forum',    label: '포럼' },
  { key: 'course',   label: '강의' },
  { key: 'content',  label: '콘텐츠' },
  { key: 'signage',  label: '사이니지' },
  { key: 'resource', label: '자료실' },
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
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 m-0">최신글</h2>
        <Link to="/home/latest" className="text-sm text-blue-600 hover:text-blue-700 font-medium no-underline">
          전체 보기 →
        </Link>
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
    homeApi.getLatest({ type: latestTab, limit: 8 })
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
              badge: '약사/약국 서비스',
              title: '약사 커뮤니티와 약국 경영 서비스',
              subtitle: '약사 커뮤니티와 약국 경영 서비스를 한 곳에서',
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
        icon: <span>🧪</span>,
        accentColor: 'var(--color-primary)',
        accentBg: 'var(--color-primary-light, #eff6ff)',
        external: true,
      }}
      help={{
        currentServiceKey: 'kpa-society',
        usageTitle: 'KPA-Society 이용 가이드',
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
