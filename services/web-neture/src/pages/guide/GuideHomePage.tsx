/**
 * GuideHomePage — O4O 플랫폼 이용 안내 통합 허브
 *
 * WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1
 * WO-O4O-NETURE-HEADER-AND-GUIDE-CONSOLIDATION-V1
 * WO-O4O-NETURE-GUIDE-HOME-IA-RESTRUCTURE-V1  ← 12 평면 카드 → 목적별 7 섹션 재정렬
 *
 * /guide 는 Neture 서비스 소개가 아니라 O4O 플랫폼 이용 안내 허브다.
 * IR-O4O-NETURE-GUIDE-HOME-IA-AUDIT-V1 결과에 따라 카드를 목적별 7 섹션으로
 * 그룹화하고, 그동안 운영자 가이드 하단에만 숨어 있던 Business Guide 를
 * 허브 1급 섹션으로 노출한다.
 *
 * 섹션 구성 (각 섹션 = 1 group, 카드 = items):
 *   01. O4O 이해 (개요 · 전반 둘러보기 · 플랫폼 소개)
 *   02. 서비스 운영자 안내 (운영자 가이드 + Business Guide ★)
 *   03. O4O 기능 설명 (매뉴얼형 guide 페이지)
 *   04. O4O 기반 사업 안내 (네트워크 운영 예시)
 *   05. 공급자 참여 안내
 *   06. 판매자 / 매장 이용 안내
 *   07. 파트너 안내
 *
 * 구조/route/콘텐츠는 코드 SSOT 유지 — 본 작업은 기존 카드·route 의 재배치다.
 * route 없는 항목(강좌·설문·광고·블로그·POP)은 데드링크 0 원칙으로 미노출.
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
    title: 'O4O 플랫폼 이용 안내',
    description:
      'O4O는 좋은 제품이 실제 매장에서 움직이도록 지원하는 플랫폼입니다. O4O 이해부터 서비스 운영 · 기능 사용 · 사업 운영 · 공급자/판매자/파트너 참여까지, 목적에 맞는 영역을 선택해 이동하세요.',
    flowBarTitle: '안내 영역',
    flowLabels: ['O4O 이해', '서비스 운영자', '기능 설명', '사업 안내', '공급자', '판매자/매장', '파트너'],
  },
  // WO-O4O-NETURE-GUIDE-O4O-BUSINESS-OPERATION-EXAMPLES-V1 (1차 초안):
  //   기능 설명보다 먼저 "O4O 기반으로 어떤 사업 운영 장면을 만들 수 있는가"를 보여주는 대표 예시 4개.
  //   기능 나열·복잡한 사업자 분류 금지. 각 카드는 기존 Business/판매자 Guide 로만 연결(데드링크 0),
  //   마지막 카드는 하단 안내 + 상담 CTA(/contact). 의료행위·KCos commerce 완료 표현 회피. /o4o(/apply) 미사용.
  index: {
    title: 'O4O 기반 사업 운영 예',
    lead: [
      'O4O는 특정 업종 하나를 위한 서비스가 아닙니다. 상품 · 거래선 · 매장 · 콘텐츠를 가진 사업자가 자기 상황에 맞게 조합해 사업을 운영할 수 있는 플랫폼입니다.',
    ],
    cards: [
      { title: '약국들의 협동조합', audience: '약국 네트워크', summary: '회원 약국이 함께 활용할 상품과 안내 콘텐츠를 운영합니다. 공동 상품 · 특가 · 교육 자료 · 매장 안내물을 각 약국이 쉽게 활용하도록 연결합니다.', to: '/guide/business/pharmacy-coop' },
      { title: '관광지 약국 / 화장품 가게', audience: '판매자 · 매장', summary: '관광객에게 제품 설명과 사용법을 쉽게 전달합니다. 다국어 안내 · QR · 영상 · 매장 화면을 활용해 짧은 체류 시간 안에 상품을 이해하도록 돕습니다.', to: '/guide/business/tourist-store' },
      { title: '외국인 고객이 많은 지역 매장', audience: '판매자 · 매장', summary: '외국인 근로자나 장기 체류 고객에게 제품 정보를 쉽게 안내합니다. 언어 장벽이 있는 고객도 제품 설명 · 사용법 · 주의사항을 매장에서 확인할 수 있게 합니다.', to: '/guide/business/foreign-customer-store' },
      { title: '창고형 약국', audience: '약국 네트워크', summary: '많은 상품을 단순 진열하는 데서 끝내지 않고, 상품별 설명과 추천 정보를 함께 제공합니다. QR · POP · 화면 안내를 활용해 고객이 필요한 제품을 더 쉽게 찾고 이해하도록 돕습니다.', to: '/guide/business/warehouse-pharmacy' },
      { title: '내 사업에 맞는 운영 방식 상담하기', audience: '문의', summary: '위 예시는 일부입니다. O4O는 사업자가 가진 상품 · 거래선 · 매장 · 콘텐츠 구조에 맞춰 다양한 방식으로 조합해 사업 운영에 활용할 수 있습니다. 내 사업에 맞는 운영 방식을 상담하려면 문의해 주세요.', to: '/contact' },
    ],
  },
  groups: [
    {
      step: '01',
      title: 'O4O 이해',
      primaryRoute: '/guide/o4o-overview',
      description:
        'O4O가 무엇을 해결하는지 먼저 이해합니다. 유통질서 · 판매 확대 · 유통비용 절감 · 매장의 소비자 설득력, 그리고 공급자 · 서비스 운영자 · 매장으로 이어지는 구조를 안내합니다.',
      items: [
        { label: 'O4O 개요', route: '/guide/o4o-overview' },
        { label: 'O4O 전반 둘러보기', route: '/guide/intro' },
      ],
      linkTo: '/guide/o4o-overview',
    },
    {
      step: '02',
      title: '서비스 운영자 안내',
      primaryRoute: '/guide/for-operator',
      description:
        'O4O 기반 서비스를 운영하려는 사업자를 위한 안내입니다. 협동조합 준비 그룹 · 약국 네트워크 · 전문약사 그룹 · 관광객/창고형 약국 네트워크 · 화장품 전문매장 네트워크 · 도매상/제조사/브랜드사 주도 서비스 · 마케팅 사업자 등이 해당합니다. Business Guide 에서 실제 사업 운영 방법을 확인하세요.',
      items: [
        { label: '운영자 이용 안내', route: '/guide/for-operator' },
        { label: 'Business Guide (사업 운영 안내 모음)', route: '/guide/business' },
      ],
      linkTo: '/guide/for-operator',
    },
    {
      step: '03',
      title: 'O4O 기능 설명',
      primaryRoute: '/guide/features',
      description:
        '사업 모델이 아니라 O4O에서 제공하는 개별 기능의 사용 방법입니다. 각 기능이 O4O에서 어떻게 구현되는지 매뉴얼 수준으로 안내합니다. 아래는 핵심 기능이며, 공급자 시작 가이드 · 파트너 프로그램 가이드는 각각 「공급자 참여 안내」 · 「파트너 안내」에 있습니다. 전체 기능 목록은 「기능 전체 보기」(/guide/features)에서 확인할 수 있습니다.',
      items: [
        { label: '상품 등록 & 유통', route: '/guide/features/product-registration' },
        { label: '콘텐츠(B2B) 운영', route: '/guide/features/b2b-content' },
        { label: '이벤트 오퍼', route: '/guide/features/event-offer' },
        { label: '유통참여형 펀딩', route: '/guide/features/market-trial' },
        { label: 'Forum & 자료실', route: '/guide/features/forum-resources' },
        { label: '공급자 Copilot', route: '/guide/features/copilot-dashboard' },
      ],
      linkTo: '/guide/features',
    },
    {
      step: '04',
      title: 'O4O 기반 사업 안내',
      primaryRoute: '/guide/business',
      description:
        'O4O를 활용한 사업 운영 예시입니다. 누가 어떻게 서비스를 운영하는지를 네트워크 운영 형태로 안내합니다. 이벤트 오퍼 · 운영자 승인 상품 · 판매자 모집 · 유통참여형 펀딩 등 운영 도구는 각 사업 안내와 Business Guide 안에서 연결됩니다.',
      items: [
        { label: '약국 네트워크 운영 안내', route: '/guide/business/pharmacy-network' },
        { label: '공급자 네트워크 운영 안내', route: '/guide/business/supplier-network' },
        { label: '콘텐츠 네트워크 운영 안내', route: '/guide/business/content-network' },
      ],
      linkTo: '/guide/business',
    },
    {
      step: '05',
      title: '공급자 참여 안내',
      primaryRoute: '/supplier',
      description:
        '공급자는 제품을 등록하고 공급 조건을 정해 서비스 운영자와 협력하는 사업자입니다. 제품 등록 · 공급 조건 · 운영자와의 협력 · 이벤트 오퍼 · 판매자 모집 · 유통참여형 펀딩에 참여할 수 있습니다. 공급자 콘텐츠는 서비스 운영자와 협의로 전달되어 운영자가 정리 · 활용합니다.',
      items: [
        { label: '공급자 참여 안내', route: '/supplier' },
        { label: '공급자 시작 가이드', route: '/guide/features/supplier-onboarding' },
      ],
      linkTo: '/supplier',
    },
    {
      step: '06',
      title: '판매자 / 매장 이용 안내',
      primaryRoute: '/guide/for-seller',
      description:
        '매장이 O4O를 실제 매장에서 활용하는 흐름입니다. Neture에서는 상품 확인 · 장바구니 · 주문 · 배송 확인과 매장 HUB 자료 수신, O4O 참여 QR 생성을 중심으로 안내합니다. POP · 블로그 · 디지털사이니지 · 타블렛 활용 등 매장 실행 도구는 서비스별 제공 범위가 다르며, 활용 방법은 각 안내에서 확인할 수 있습니다.',
      items: [
        { label: '내 매장 활용 가이드', route: '/guide/for-seller' },
        { label: '매장 HUB', route: '/workspace/hub' },
        { label: '내 매장 상품', route: '/store/my-products' },
        { label: 'QR 가이드', route: '/seller/qr-guide' },
        { label: 'POP 활용', route: '/guide/for-seller#pop' },
        { label: '블로그 활용', route: '/guide/for-seller#blog' },
        { label: '디지털사이니지', route: '/supplier/signage/manage' },
        { label: '타블렛 활용', route: '/guide/for-seller#tablet' },
        { label: '주문 · 배송', route: '/store/orders' },
      ],
      linkTo: '/guide/for-seller',
    },
    {
      step: '07',
      title: '파트너 안내',
      primaryRoute: '/partner',
      description:
        '현재 파트너는 사이트 URL 기반 제휴자/인플루언서 구조입니다. 제휴 URL · 추천인 구조 · 유입/성과 확인을 안내합니다.',
      items: [
        { label: '파트너 참여 안내', route: '/partner' },
        { label: '파트너 프로그램 가이드', route: '/guide/features/partner-program' },
      ],
      linkTo: '/partner',
    },
  ],
  bottomNav: {
    prev: { label: '← 홈으로', to: '/' },
    home: { label: '서비스 활용 방법 →', to: '/guide/usage' },
  },
};

export function GuideHomePage() {
  return <Shared {...homeProps} renderText={renderText} />;
}
