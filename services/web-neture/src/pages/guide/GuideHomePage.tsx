/**
 * GuideHomePage — Neture Guide 진입 (8 카드 그리드)
 *
 * WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1
 *
 * shared-space-ui 의 GuideFeaturesPage 와 동일한 컴포넌트를 사용해 카드 그리드를 표시한다.
 * Home 카드는 Neture Guide 의 8 영역으로 사용자를 안내한다.
 */

import { GuideFeaturesPage as Shared, netureGuideFeaturesProps } from '@o4o/shared-space-ui';
import type { GuideTextRenderer, GuideFeaturesPageProps } from '@o4o/shared-space-ui';
import { GuideEditableSection } from '../../components/guide';

const PAGE_KEY = 'guide/home';

const renderText: GuideTextRenderer = (sectionKey, defaultContent) => (
  <GuideEditableSection pageKey={PAGE_KEY} sectionKey={sectionKey} defaultContent={defaultContent} />
);

const homeProps: GuideFeaturesPageProps = {
  ...netureGuideFeaturesProps,
  hero: {
    eyebrow: '이용 가이드',
    title: 'Neture 이용 가이드',
    description:
      'Neture 의 구조와 사용 방법을 단계별로 안내합니다. 아래 카드를 선택해 필요한 영역으로 바로 이동하세요.',
    flowBarTitle: '주요 영역',
    flowLabels: ['Neture 둘러보기', '공급자', '상품', 'Event', 'Trial', '파트너', 'Forum', 'Copilot'],
  },
  groups: [
    {
      step: '01',
      title: 'Neture 둘러보기',
      primaryRoute: '/guide/intro',
      description: '공급자 · 운영자 · 매장 구조와 Neture 의 역할을 한눈에.',
      items: [{ label: 'Neture 둘러보기', route: '/guide/intro' }],
      linkTo: '/guide/intro',
    },
    {
      step: '02',
      title: '공급자 시작하기',
      primaryRoute: '/guide/features/supplier-onboarding',
      description: '공급자 가입 경로 · 승인 흐름 · 활성화 방법.',
      items: [{ label: '공급자 가입 안내', route: '/guide/features/supplier-onboarding' }],
      linkTo: '/guide/features/supplier-onboarding',
    },
    {
      step: '03',
      title: '상품 등록 & 유통',
      primaryRoute: '/guide/features/product-registration',
      description: 'barcode 기반 Master · 3단 가격 · 유통 정책 선택.',
      items: [{ label: '상품 등록 이용 방법', route: '/guide/features/product-registration' }],
      linkTo: '/guide/features/product-registration',
    },
    {
      step: '04',
      title: 'Event Offer 제안하기',
      primaryRoute: '/guide/features/event-offer',
      description: '이벤트 오퍼 다중 서비스 동시 제안.',
      items: [{ label: 'Event Offer 이용 방법', route: '/guide/features/event-offer' }],
      linkTo: '/guide/features/event-offer',
    },
    {
      step: '05',
      title: '유통 참여형 펀딩',
      primaryRoute: '/guide/features/market-trial',
      description: 'Market Trial — 오프라인 실행 시나리오 포함 펀딩.',
      items: [{ label: 'Market Trial 이용 방법', route: '/guide/features/market-trial' }],
      linkTo: '/guide/features/market-trial',
    },
    {
      step: '06',
      title: '파트너로 협력하기',
      primaryRoute: '/guide/features/partner-program',
      description: '가입 3 경로 · 콘텐츠 · 레퍼럴 · 커미션.',
      items: [{ label: '파트너 프로그램 이용 방법', route: '/guide/features/partner-program' }],
      linkTo: '/guide/features/partner-program',
    },
    {
      step: '07',
      title: 'Forum & 자료실',
      primaryRoute: '/guide/features/forum-resources',
      description: '커뮤니티와 자료실 활용 방법.',
      items: [{ label: 'Forum / 자료실 이용 방법', route: '/guide/features/forum-resources' }],
      linkTo: '/guide/features/forum-resources',
    },
    {
      step: '08',
      title: '공급자 Copilot',
      primaryRoute: '/guide/features/copilot-dashboard',
      description: '8-Block KPI · AI 요약 · 추천 액션.',
      items: [{ label: 'Copilot Dashboard 이용 방법', route: '/guide/features/copilot-dashboard' }],
      linkTo: '/guide/features/copilot-dashboard',
    },
  ],
  bottomNav: {
    prev: { label: '← Neture 홈으로', to: '/' },
    home: { label: '서비스 활용 방법 →', to: '/guide/usage' },
  },
};

export function GuideHomePage() {
  return <Shared {...homeProps} renderText={renderText} />;
}
