/**
 * GuideHomePage — Neture 이용 안내 통합 허브
 *
 * WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1
 * WO-O4O-NETURE-HEADER-AND-GUIDE-CONSOLIDATION-V1
 *
 * 상단 메뉴 단순화(Home / 이용 안내 / Contact Us)에 따라
 * /guide가 통합 이용 안내 허브 역할을 맡는다.
 *
 * 제거된 상단 메뉴(Supplier / Partner / O4O 소개 / 유통참여형 펀딩)의
 * 안내 기능을 이 허브에서 흡수한다.
 *
 * 포함 항목:
 *   01. Neture 둘러보기
 *   02. 공급자 이용 안내 (역할 설명 + 시작 가이드 + 문의 진입)
 *   03. 파트너 이용 안내 (역할 설명 + 프로그램 가이드 + 문의 진입)
 *   04. 유통참여형 펀딩
 *   05. 상품 등록 & 유통
 *   06. Event Offer
 *   07. Forum & 자료실
 *   08. 공급자 Copilot
 *   09. O4O 플랫폼 소개
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
    eyebrow: '이용 안내',
    title: 'Neture 이용 안내',
    description:
      'Neture의 구조와 참여 방법, 기능별 사용 방법을 안내합니다. 공급자 · 파트너 · 유통참여형 펀딩 · 플랫폼 소개까지 아래 항목을 선택해 이동하세요.',
    flowBarTitle: '안내 영역',
    flowLabels: ['Neture 개요', '공급자', '파트너', '유통 펀딩', '상품', 'Event', 'Forum', 'Copilot', 'O4O 소개'],
  },
  groups: [
    {
      step: '01',
      title: 'Neture 둘러보기',
      primaryRoute: '/guide/intro',
      description: '공급자 · 운영자 · 매장 구조와 Neture의 역할을 한눈에.',
      items: [{ label: 'Neture 둘러보기', route: '/guide/intro' }],
      linkTo: '/guide/intro',
    },
    {
      step: '02',
      title: '공급자 이용 안내',
      primaryRoute: '/supplier',
      description:
        '공급자는 제품 · 브랜드 · 마케팅 원천 자료를 운영자에게 전달하는 사업자입니다. Neture에서 공급자는 상품 등록 · 제안 · 주문 · 정산 등 공급자 업무 대시보드를 이용하며, 로그인 후 공급자 권한이 확인되면 공급자 대시보드로 이동합니다.',
      items: [
        { label: '공급자 참여 안내', route: '/supplier' },
        { label: '공급자 시작 가이드', route: '/guide/features/supplier-onboarding' },
        { label: '공급자 문의하기', route: '/contact' },
      ],
      linkTo: '/supplier',
    },
    {
      step: '03',
      title: '파트너 이용 안내',
      primaryRoute: '/partner',
      description:
        '파트너는 공급자 · 운영자 · 매장 실행을 돕는 협력 주체입니다. 제휴 · 마케팅 · 운영 협력 · 콘텐츠/서비스 협력 등으로 참여할 수 있으며, 로그인 후 파트너 권한이 확인되면 파트너 대시보드로 이동합니다.',
      items: [
        { label: '파트너 참여 안내', route: '/partner' },
        { label: '파트너 프로그램 가이드', route: '/guide/features/partner-program' },
        { label: '파트너 문의하기', route: '/contact' },
      ],
      linkTo: '/partner',
    },
    {
      step: '04',
      title: '유통참여형 펀딩',
      primaryRoute: '/guide/features/market-trial',
      description: '유통참여형 펀딩 — 오프라인 실행 시나리오 포함 펀딩. 모집 · 진행 · 정산 흐름.',
      items: [
        { label: '유통참여형 펀딩 보러 가기', route: '/market-trial' },
        { label: '유통참여형 펀딩 이용 방법', route: '/guide/features/market-trial' },
      ],
      linkTo: '/guide/features/market-trial',
    },
    {
      step: '05',
      title: '상품 등록 & 유통',
      primaryRoute: '/guide/features/product-registration',
      description: '바코드 기반 상품 등록 · 가격 등급 설정 · 유통 범위 선택.',
      items: [{ label: '상품 등록 이용 방법', route: '/guide/features/product-registration' }],
      linkTo: '/guide/features/product-registration',
    },
    {
      step: '06',
      title: 'Event Offer 제안하기',
      primaryRoute: '/guide/features/event-offer',
      description: '이벤트 오퍼 다중 서비스 동시 제안.',
      items: [{ label: 'Event Offer 이용 방법', route: '/guide/features/event-offer' }],
      linkTo: '/guide/features/event-offer',
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
      description: 'KPI 확인 · 운영 요약 · 추천 액션.',
      items: [{ label: 'Copilot Dashboard 이용 방법', route: '/guide/features/copilot-dashboard' }],
      linkTo: '/guide/features/copilot-dashboard',
    },
    {
      step: '09',
      title: 'O4O 플랫폼 소개',
      primaryRoute: '/o4o',
      description: 'O4O(Online for Offline) 플랫폼의 개념 · 구조 · 업종별 활용 방법.',
      items: [{ label: 'O4O 플랫폼 알아보기', route: '/o4o' }],
      linkTo: '/o4o',
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
