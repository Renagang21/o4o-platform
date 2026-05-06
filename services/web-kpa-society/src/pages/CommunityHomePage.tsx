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
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/LoginModalContext';

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
          <div style={placeholderStyles.header}>
            <h2 style={placeholderStyles.title}>약사공론 뉴스</h2>
          </div>
          <Card style={placeholderStyles.card}>
            <NewspaperIcon />
            <p style={placeholderStyles.text}>이 영역은 약사공론 뉴스가 표시될 예정입니다.</p>
            <a
              href="https://www.kpanews.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              style={placeholderStyles.link}
            >
              약사공론 바로가기 →
            </a>
          </Card>
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
    padding: '48px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  text: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--color-text-secondary, #475569)',
    margin: '12px 0',
    textAlign: 'center',
  },
  link: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-primary, #2563EB)',
    textDecoration: 'none',
  },
};

export default CommunityHomePage;
