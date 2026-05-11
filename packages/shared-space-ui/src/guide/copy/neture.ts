/**
 * Neture Guide Copy
 *
 * WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1
 *
 * Neture 공개 이용 가이드의 placeholder copy.
 * 본 WO 범위는 Guide 공간과 구조 생성까지이며, 전체 콘텐츠 완성은 후속 WO 에서 수행한다.
 * 따라서 각 props 는 KPA 구조와 동일한 shape 을 유지하되 placeholder 수준 내용만 포함한다.
 */

import type {
  GuideIntroPageProps,
  GuideIntroStructurePageProps,
  GuideIntroKpaPageProps,
  GuideIntroOperationPageProps,
  GuideIntroConceptPageProps,
  GuideUsagePageProps,
  GuideFeaturesPageProps,
  GuideFeatureManualPageProps,
} from '../types.js';

// ─── /guide/intro ──────────────────────────────────────────────────────

export const netureGuideIntroProps: GuideIntroPageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: 'Neture 개요',
    description:
      'Neture 는 공급자 · 운영자 · 매장 · 파트너가 함께 운영하는 콘텐츠 기반 유통 허브입니다. 본 가이드는 그 구조와 사용 방법을 정리합니다.',
    nextLink: { label: '다음: 서비스 활용 방법 →', to: '/guide/usage' },
  },
  sections: [
    {
      title: 'O4O 기본 구조',
      href: '/guide/intro/structure',
      description:
        'O4O 는 공급자 · 운영자 · 매장이 하나의 플랫폼 위에서 역할을 나누는 구조입니다. Neture 는 이 구조 위에서 유통과 협업을 지원합니다.',
      items: [
        { label: '공급자', detail: '상품과 콘텐츠를 등록하고 유통 정책을 결정합니다.' },
        { label: '운영자', detail: '플랫폼 정책 · 승인 · 콘텐츠 흐름을 관리합니다.' },
        { label: '매장', detail: '공급자의 상품과 콘텐츠를 받아 고객에게 전달합니다.' },
      ],
    },
    {
      title: 'Neture 의 위치',
      href: '/guide/intro/neture',
      description:
        'Neture 는 공급자 중심의 유통 허브로, 매장 실행 서비스(KPA · K-Cosmetics 등)와 연결됩니다. 콘텐츠, 계약, 이벤트, 펀딩의 공통 기반을 제공합니다.',
      items: [
        { label: '공급자 중심 플랫폼', detail: '공급자가 상품 · 콘텐츠 · 유통 정책을 직접 결정합니다.' },
        { label: '콘텐츠 기반 유통', detail: 'B2B / B2C 콘텐츠, 포럼, 자료실이 유통의 중심 채널입니다.' },
        { label: '매장 실행 연결', detail: 'Event Offer · Market Trial 로 오프라인 실행과 직접 연결됩니다.' },
      ],
    },
    {
      title: '운영 구조',
      href: '/guide/intro/operation',
      description:
        '운영자가 정책과 승인을 담당하고, 공급자가 콘텐츠와 유통을 주도합니다. 매장과 커뮤니티는 그 결과를 받아 확산합니다.',
      items: [
        { label: '운영자 중심 정책', detail: '가입 승인, 상품 품질 승인, 서비스 노출 승인을 운영자가 담당합니다.' },
        { label: '공급자 주도 유통', detail: 'distributionType / serviceKeys / Event Offer / Trial 제안권이 공급자에게 있습니다.' },
        { label: '매장 · 커뮤니티 확산', detail: '매장 실행과 포럼 · 자료실 공유로 콘텐츠가 확장됩니다.' },
      ],
    },
    {
      title: '핵심 개념',
      href: '/guide/intro/concept',
      description:
        '소규모 사업자들이 정보 · 구조 · 신뢰를 공유하며 함께 성장하는 것이 O4O 의 방향입니다.',
      items: [
        { label: '소규모 사업자 연대', detail: '개별 매장이 플랫폼을 통해 대형 유통망과 대등하게 협력합니다.' },
        { label: '정보 기반 협력', detail: '공급자의 전문 콘텐츠가 매장 신뢰도와 매출을 높입니다.' },
        { label: '계약 기반 1:N 협력', detail: '공급자와 파트너 · 매장은 명시적 계약으로 협력합니다.' },
      ],
    },
  ],
  bottomNav: {
    home: { label: '← 홈으로', to: '/' },
    next: { label: '서비스 활용 방법 →', to: '/guide/usage' },
    features: { label: '기능별 이용 방법', to: '/guide/features' },
  },
};

// ─── /guide/intro/structure ────────────────────────────────────────────

export const netureGuideIntroStructureProps: GuideIntroStructurePageProps = {
  hero: {
    eyebrow: 'Neture 개요',
    title: 'O4O 기본 구조',
    description: '공급자 · 운영자 · 매장 구조 (placeholder)',
    context: [
      { label: '해결 대상', value: '소규모 매장의 운영 부담 — 상품 · 콘텐츠 · 유통 정책 · 고객 응대' },
      { label: '구조 방식', value: '공급자 주도 유통 · 운영자 정책 · 매장 실행 분리' },
    ],
  },
  overview: {
    sectionTitle: '구조 개요',
    cards: [
      { label: '공급자', summary: '상품 · 콘텐츠 · 유통 정책' },
      { label: '운영자', summary: '승인 · 정책 · 관리' },
      { label: '매장', summary: '진열 · 상담 · 판매' },
    ],
  },
  roleDetail: {
    sectionTitle: '역할 상세',
    roles: [
      { label: '공급자', tasks: ['상품 등록', '콘텐츠 제작', '유통 정책 결정', 'Event Offer / Trial 제안'] },
      { label: '운영자', tasks: ['가입 승인', '상품 품질 승인', '서비스 노출 승인'] },
      { label: '매장', tasks: ['상품 선택', '고객 응대', '판매 실행'] },
    ],
  },
  relations: {
    sectionTitle: '관계 구조',
    transitionBefore: '개별 매장 직접 거래 구조',
    transitionAfter: '플랫폼 기반 협력 구조',
    mainFlow: ['공급자', '운영자', '매장'],
    subFlow: [
      { from: '상품', mid: '승인', to: '유통' },
      { from: '콘텐츠', mid: '정리', to: '확산' },
      { from: '제안', mid: '협의', to: '실행' },
    ],
  },
  features: {
    sectionTitle: '주요 기능',
    items: ['상품 · 유통 정책', '콘텐츠 · 자료실', 'Event Offer · Market Trial', '파트너 협업'],
  },
  bottomNav: {
    prev: { label: '← Neture 개요', to: '/guide/intro' },
    next: { label: 'Neture 의 위치 →', to: '/guide/intro/neture' },
  },
};

// ─── /guide/intro/neture (서비스 위치 페이지) ──────────────────────────

export const netureGuideIntroNetureProps: GuideIntroKpaPageProps = {
  hero: {
    eyebrow: 'Neture 개요',
    title: 'Neture 의 위치',
    description:
      'Neture 는 공급자 중심의 콘텐츠 기반 유통 허브입니다. 매장 실행 서비스(KPA · K-Cosmetics 등)와 분리되어 지원 허브 역할을 수행합니다.',
    context: [
      { label: '플랫폼 성격', value: '공급자 중심 · 콘텐츠 기반 · 유통 허브' },
      { label: '연결 대상', value: '매장 실행 서비스 (KPA · K-Cosmetics 등)' },
    ],
  },
  community: {
    sectionTitle: '공급자 협력 구조',
    cards: [
      { label: '공급자', summary: '상품 · 콘텐츠 · 유통 정책' },
      { label: '파트너', summary: '콘텐츠 · 레퍼럴 · 커미션' },
      { label: '운영자', summary: '승인 · 정책 · 지원' },
    ],
  },
  network: {
    sectionTitle: 'Neture 의 역할',
    cards: [
      { label: '콘텐츠 기반 유통', summary: 'B2B / B2C 콘텐츠, 포럼, 자료실의 공통 채널' },
      { label: '계약 기반 협력', summary: '공급자 · 파트너 · 매장 사이의 명시적 계약 관리' },
      { label: '오프라인 실행 연결', summary: 'Event Offer · Market Trial 로 매장 실행과 연결' },
    ],
  },
  storeConnection: {
    sectionTitle: '매장 실행 연결',
    transitionBefore: '독립적 매장 거래',
    transitionAfter: '플랫폼 기반 유통 협력',
    mainFlow: ['공급자', 'Neture (허브)', '매장 실행 서비스'],
    subFlow: [
      { from: '상품 등록', mid: 'Master 자동 해석', to: '유통 정책 적용' },
      { from: 'Event Offer 제안', mid: '다중 서비스', to: '매장 실행' },
      { from: 'Market Trial', mid: '참여 · 정산', to: '오프라인 시나리오' },
    ],
  },
  roleSummary: {
    sectionTitle: 'Neture 에서 무엇을 할 수 있나',
    items: [
      '공급자 가입 · 상품 등록 · 유통 정책 선택',
      'B2B / B2C 콘텐츠 작성 · 자료실 운영',
      'Event Offer 제안 · Market Trial 작성',
      '파트너로 콘텐츠 · 레퍼럴 · 커미션 협업',
      'Forum / 자료실 / Notice 사용',
    ],
  },
  bottomNav: {
    prev: { label: '← O4O 기본 구조', to: '/guide/intro/structure' },
    next: { label: '운영 구조 →', to: '/guide/intro/operation' },
  },
};

// ─── /guide/intro/operation ────────────────────────────────────────────

export const netureGuideIntroOperationProps: GuideIntroOperationPageProps = {
  hero: {
    eyebrow: 'Neture 개요',
    title: '운영 구조',
    description: '운영자 · 매장 · 커뮤니티 운영 구조 (placeholder)',
    context: [
      { label: '운영 주체', value: '운영자 (Neture Admin · Operator)' },
      { label: '실행 주체', value: '공급자 · 파트너 · 매장' },
    ],
  },
  operator: {
    sectionTitle: '운영자',
    cards: [
      { label: '가입 승인', summary: '공급자 · 파트너 가입 신청 검토' },
      { label: '상품 품질 승인', summary: 'Offer 단위 품질 검수' },
      { label: '서비스 노출 승인', summary: 'KPA · K-Cosmetics 등 서비스별 노출 승인' },
    ],
  },
  store: {
    sectionTitle: '매장 실행',
    cards: [
      { label: '매장 상품 노출', summary: '승인된 Offer 를 매장에서 진열' },
      { label: 'Event Offer 참여', summary: '이벤트 오퍼에 매장 단위로 참여' },
      { label: '오프라인 실행', summary: '진열 · 고객 안내 · 할인 · 기대 효과' },
    ],
  },
  community: {
    sectionTitle: '커뮤니티 확산',
    cards: [
      { label: '포럼', summary: '공급자 · 매장 간 질문 · 답변' },
      { label: '자료실', summary: '공급자 자료 · 매장 활용 자료' },
      { label: 'Notice', summary: '플랫폼 공지 · 정책 안내' },
    ],
  },
  flow: {
    sectionTitle: '운영 사이클',
    mainFlow: ['정책', '실행', '확산'],
    cycle: ['승인', '유통', '실행', '피드백'],
    subFlow: [
      { from: '운영자 승인', mid: '공급자 등록', to: '매장 노출' },
      { from: '공급자 콘텐츠', mid: '플랫폼 확산', to: '매장 활용' },
      { from: '매장 피드백', mid: '커뮤니티 공유', to: '정책 반영' },
    ],
  },
  features: {
    sectionTitle: '주요 운영 기능',
    items: ['가입 · 상품 · 서비스 노출 승인', '콘텐츠 정책 관리', 'Event Offer · Trial 검토'],
  },
  bottomNav: {
    prev: { label: '← Neture 의 위치', to: '/guide/intro/neture' },
    next: { label: '핵심 개념 →', to: '/guide/intro/concept' },
  },
};

// ─── /guide/intro/concept ──────────────────────────────────────────────

export const netureGuideIntroConceptProps: GuideIntroConceptPageProps = {
  hero: {
    eyebrow: 'Neture 개요',
    title: '핵심 개념',
    description: '소규모 사업자 연대와 콘텐츠 기반 협력 (placeholder)',
    context: [
      { label: '방향', value: '정보 · 구조 · 신뢰 공유' },
      { label: '결과', value: '독립적이면서 함께 성장하는 협력' },
    ],
  },
  solidarity: {
    sectionTitle: '소규모 사업자 연대',
    cards: [
      { label: '개별 매장의 한계', summary: '단독으로는 콘텐츠 · 마케팅 · 유통 협상 어려움' },
      { label: '플랫폼 기반 협력', summary: '공통 구조 위에서 함께 운영' },
      { label: '대등한 협상력', summary: '연대를 통한 공급자 · 매장 협상력 확보' },
    ],
  },
  structure: {
    sectionTitle: '느슨한 연합 구조',
    cards: [
      { label: '브랜드 독립', summary: '각 매장 · 공급자의 정체성 유지' },
      { label: '공통 운영 체계', summary: '플랫폼 정책 · 콘텐츠 · 유통 흐름 공유' },
      { label: '계약 기반 협력', summary: '명시적 계약으로 신뢰 확보' },
    ],
  },
  info: {
    sectionTitle: '정보 기반 판매',
    cards: [
      { label: '전문 콘텐츠', summary: '공급자의 B2B / B2C 콘텐츠 전환' },
      { label: '매장 신뢰도', summary: '콘텐츠가 매장의 전문성 · 신뢰를 높임' },
      { label: '오프라인 실행', summary: 'Trial 의 진열 · 고객 안내 · 기대 효과' },
    ],
  },
  competition: {
    sectionTitle: '기존 유통 vs Neture',
    rows: [
      { label: '진입 모델', items: ['입점 → 노출 → 판매', '가입 → 콘텐츠 + 유통 정책 → 매장 제안'], dim: false },
      { label: '가격 모델', items: ['단일 가격', '3단 가격 등급 (general / gold / platinum)'], dim: false },
      { label: '파트너 모델', items: ['단일 affiliate', '3 경로 가입 + 계약 기반 1:N + commission 스냅샷'], dim: false },
      { label: '매장 실행', items: ['온라인 종결', '오프라인 시나리오 포함 (Market Trial)'], dim: false },
    ],
    resultText: 'Neture 는 단순 상품 노출이 아닌, 공급자 주도 콘텐츠 · 계약 · 오프라인 실행을 연결합니다.',
  },
  summary: {
    sectionTitle: '한 줄 요약',
    items: [
      '공급자 중심 · 콘텐츠 기반 · 매장 실행 연결의 유통 허브.',
      '계약과 정보를 공유하며 함께 성장하는 협력 구조.',
    ],
  },
  bottomNav: {
    prev: { label: '← 운영 구조', to: '/guide/intro/operation' },
    backHome: { label: 'Neture 개요로', to: '/guide/intro' },
  },
};

// ─── /guide/usage ──────────────────────────────────────────────────────

export const netureGuideUsageProps: GuideUsagePageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: '서비스 활용 방법',
    description:
      'Neture 사용 흐름을 단계별로 정리합니다. 가입 → 상품 등록 → 유통 정책 → 이벤트 제안 → 매장 실행 순서입니다.',
    flowBarTitle: '활용 흐름',
    flowLabels: ['가입', '상품 등록', '유통 정책', 'Event / Trial', '매장 실행', '협력 확장'],
  },
  sections: [
    {
      step: '01',
      title: '공급자 / 파트너 가입',
      routeLabel: '/supplier · /partner',
      description: '공급자 또는 파트너로 Neture 에 참여합니다.',
      items: [
        { label: '공급자 가입', detail: '/supplier 에서 가입 안내 확인. 운영자 승인 후 활성화됩니다.' },
        { label: '파트너 가입', detail: '/partner 에서 3 경로 중 하나로 가입 신청합니다.' },
      ],
    },
    {
      step: '02',
      title: '상품 등록',
      routeLabel: '/supplier/products',
      description: 'barcode 기반으로 ProductMaster 가 자동 해석되고, Offer 단위로 등록합니다.',
      items: [
        { label: 'barcode 입력', detail: '동일 barcode → 동일 master, master:offer = 1:N' },
        { label: '가격 등급', detail: 'general / gold / platinum 3단 가격 설정' },
        { label: 'B2B · B2C 콘텐츠', detail: '소비자 설명과 매장 대상 설명을 분리해 작성' },
      ],
    },
    {
      step: '03',
      title: '유통 정책 선택',
      routeLabel: '/supplier/products',
      description: 'PUBLIC / SERVICE / PRIVATE 중 유통 범위를 선택합니다.',
      items: [
        { label: 'PUBLIC', detail: '모든 서비스 · 매장에 자동 노출' },
        { label: 'SERVICE', detail: '특정 서비스(KPA · K-Cos)별 노출 승인 필요' },
        { label: 'PRIVATE', detail: '지정 매장(allowedSellerIds)에만 노출' },
      ],
    },
    {
      step: '04',
      title: 'Event Offer · Market Trial 제안',
      routeLabel: '/supplier/event-offers · /supplier/market-trial',
      description: '이벤트 오퍼와 유통 참여형 펀딩을 제안합니다.',
      items: [
        { label: 'Event Offer', detail: '다중 서비스(KPA + K-Cos) 동시 제안 가능' },
        { label: 'Market Trial', detail: '오프라인 시나리오(진열 · 안내 · 할인 · 기대 효과) 포함' },
      ],
    },
    {
      step: '05',
      title: '매장 실행 · 협력 확장',
      routeLabel: '/store · /forum',
      description: '매장은 승인된 상품과 이벤트를 받아 오프라인에서 실행합니다.',
      items: [
        { label: '매장 노출', detail: '승인된 Offer 가 매장에 자동 노출' },
        { label: '파트너 협업', detail: '레퍼럴 링크 · 콘텐츠로 추가 확산' },
        { label: '커뮤니티 피드백', detail: '포럼과 자료실로 운영 노하우 축적' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← Neture 개요', to: '/guide/intro' },
    next: { label: '기능별 이용 방법 →', to: '/guide/features' },
  },
};

// ─── /guide/features ───────────────────────────────────────────────────

export const netureGuideFeaturesProps: GuideFeaturesPageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: '기능별 이용 방법',
    description: 'Neture 주요 기능을 카테고리별로 정리했습니다. 필요한 기능을 선택해 바로 이동합니다.',
    flowBarTitle: '기능 카테고리',
    flowLabels: ['공급자', '상품', 'B2B 콘텐츠', 'Event Offer', 'Market Trial', '파트너', 'Forum / 자료실', 'Copilot'],
  },
  groups: [
    {
      step: '01',
      title: '공급자 시작하기',
      primaryRoute: '/supplier',
      description: 'Neture 공급자 가입 경로와 승인 흐름을 안내합니다.',
      items: [
        { label: '공급자 가입 안내', route: '/guide/features/supplier-onboarding' },
      ],
      linkTo: '/guide/features/supplier-onboarding',
    },
    {
      step: '02',
      title: '상품 등록 & 유통',
      primaryRoute: '/supplier/products',
      description: 'barcode 기반 ProductMaster, 3단 가격 등급, 유통 정책 선택까지의 흐름.',
      items: [
        { label: '상품 등록 이용 방법', route: '/guide/features/product-registration' },
      ],
      linkTo: '/guide/features/product-registration',
    },
    {
      step: '03',
      title: 'B2B 콘텐츠',
      primaryRoute: '/supplier/b2b-content',
      description: '매장 대상 B2B 콘텐츠 작성과 B2C 콘텐츠와의 분리.',
      items: [
        { label: 'B2B 콘텐츠 이용 방법', route: '/guide/features/b2b-content' },
      ],
      linkTo: '/guide/features/b2b-content',
    },
    {
      step: '04',
      title: 'Event Offer 제안',
      primaryRoute: '/supplier/event-offers',
      description: '다중 서비스 동시 제안이 가능한 이벤트 오퍼 흐름.',
      items: [
        { label: 'Event Offer 이용 방법', route: '/guide/features/event-offer' },
      ],
      linkTo: '/guide/features/event-offer',
    },
    {
      step: '05',
      title: '유통 참여형 펀딩 (Market Trial)',
      primaryRoute: '/market-trial',
      description: '오프라인 실행 시나리오를 포함한 유통 참여형 펀딩.',
      items: [
        { label: 'Market Trial 이용 방법', route: '/guide/features/market-trial' },
      ],
      linkTo: '/guide/features/market-trial',
    },
    {
      step: '06',
      title: '파트너 협력',
      primaryRoute: '/partner',
      description: '파트너 가입 3 경로와 콘텐츠 · 레퍼럴 · 커미션 활용.',
      items: [
        { label: '파트너 프로그램 이용 방법', route: '/guide/features/partner-program' },
      ],
      linkTo: '/guide/features/partner-program',
    },
    {
      step: '07',
      title: 'Forum & 자료실',
      primaryRoute: '/forum',
      description: '커뮤니티 활용과 공급자 · 매장 자료 공유.',
      items: [
        { label: 'Forum / 자료실 이용 방법', route: '/guide/features/forum-resources' },
      ],
      linkTo: '/guide/features/forum-resources',
    },
    {
      step: '08',
      title: '공급자 Copilot Dashboard',
      primaryRoute: '/supplier/dashboard',
      description: 'KPI · AI 요약 · 상품 성과 · 매장 확산을 한 화면에서.',
      items: [
        { label: 'Copilot Dashboard 이용 방법', route: '/guide/features/copilot-dashboard' },
      ],
      linkTo: '/guide/features/copilot-dashboard',
    },
  ],
  bottomNav: {
    prev: { label: '← 서비스 활용 방법', to: '/guide/usage' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/supplier-onboarding ───────────────────────────────

export const netureGuideFeatureSupplierOnboardingProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '공급자 가입 안내',
    description: '공급자 가입 경로 · 승인 흐름 · 활성화 (placeholder)',
    primaryAction: { label: '공급자 안내로 이동 →', to: '/supplier' },
    flowBarTitle: '가입 흐름',
    flowLabels: ['가입 경로 선택', '신청', '운영자 승인', '활성화'],
  },
  sections: [
    {
      step: '01',
      title: '가입 경로 선택',
      routeLabel: '/supplier',
      description: '현재 공급자 가입은 Contact / Business Inquiry 경로로 안내됩니다.',
      items: [
        { label: '/supplier 안내 확인', detail: 'Supplier landing 에서 가입 안내를 확인합니다.' },
        { label: 'Business Inquiry', detail: '/o4o/business-inquiry 로 가입 신청 의사를 전달합니다.' },
        { label: 'Contact', detail: '/contact 로 직접 문의도 가능합니다.' },
      ],
    },
    {
      step: '02',
      title: '신청',
      description: '필수 정보를 제출합니다.',
      items: [
        { label: '업체명', detail: '공급자명 · 사업자번호 · 담당자 정보' },
        { label: '연락처', detail: '담당자 이메일 · 전화번호' },
        { label: '운영 범위', detail: '취급 상품군 · 희망 유통 정책' },
      ],
    },
    {
      step: '03',
      title: '운영자 승인',
      description: '운영자가 신청을 검토하고 승인합니다.',
      items: [
        { label: 'PENDING', detail: '신청 접수 직후 상태입니다.' },
        { label: 'APPROVED', detail: '승인 시 공급자 권한이 활성화됩니다.' },
        { label: 'REJECTED', detail: '거절 시 사유가 전달됩니다.' },
      ],
    },
    {
      step: '04',
      title: '활성화',
      routeLabel: '/supplier/dashboard',
      description: '승인 후 공급자 대시보드와 상품 등록 화면에 진입할 수 있습니다.',
      items: [
        { label: 'Supplier Dashboard', detail: '/supplier/dashboard 에서 KPI · 추천 액션 확인' },
        { label: '상품 등록 시작', detail: '/supplier/products 에서 첫 상품을 등록합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/product-registration ──────────────────────────────

export const netureGuideFeatureProductRegistrationProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '상품 등록 & 유통',
    description: 'barcode 기반 ProductMaster · 3단 가격 등급 · 유통 정책 선택 (placeholder)',
    primaryAction: { label: '상품 등록으로 이동 →', to: '/supplier/products' },
    flowBarTitle: '등록 흐름',
    flowLabels: ['barcode 입력', 'Master 해석', '가격 설정', '유통 정책', '제출'],
  },
  sections: [
    {
      step: '01',
      title: 'barcode 입력',
      description: '동일 barcode 는 동일 ProductMaster 로 자동 해석됩니다.',
      items: [
        { label: 'GTIN / barcode', detail: '필수 입력. master 자동 해석 키' },
        { label: '동일 master 공유', detail: '여러 공급자가 같은 master 에 offer 등록 가능' },
        { label: '단일 master 파이프라인', detail: '외부 masterId 직접 주입 금지' },
      ],
    },
    {
      step: '02',
      title: '기본 정보',
      description: '상품의 기본 정보를 입력합니다.',
      items: [
        { label: '상품명 / 브랜드', detail: 'name · brandName · categoryId' },
        { label: 'B2C 설명', detail: 'consumerShortDescription · consumerDetailDescription (HTML)' },
        { label: 'B2B 설명', detail: 'businessShortDescription · businessDetailDescription (HTML)' },
      ],
    },
    {
      step: '03',
      title: '가격 설정 (3단 등급)',
      description: '소비자 등급별 차등 가격을 설정합니다.',
      items: [
        { label: 'priceGeneral', detail: '일반 가격' },
        { label: 'priceGold', detail: 'Gold 등급 가격' },
        { label: 'pricePlatinum', detail: 'Platinum 등급 가격' },
      ],
    },
    {
      step: '04',
      title: '유통 정책',
      description: 'distributionType 으로 유통 범위를 결정합니다.',
      items: [
        { label: 'PUBLIC', detail: '모든 서비스 · 매장 자동 노출' },
        { label: 'SERVICE', detail: 'serviceKeys[] 지정 후 서비스별 승인' },
        { label: 'PRIVATE', detail: 'allowedSellerIds[] 지정 매장에만 노출' },
      ],
    },
    {
      step: '05',
      title: '제출 · 승인',
      description: '운영자 품질 검수 후 노출됩니다.',
      items: [
        { label: 'PENDING', detail: '제출 직후 상태' },
        { label: 'APPROVED', detail: '품질 검수 통과 → 유통 시작' },
        { label: 'REJECTED', detail: '거절 시 사유 확인 후 수정' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/b2b-content ───────────────────────────────────────

export const netureGuideFeatureB2BContentProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: 'B2B 콘텐츠',
    description: '매장 대상 B2B 콘텐츠 작성 (placeholder)',
    primaryAction: { label: 'B2B 콘텐츠로 이동 →', to: '/supplier/b2b-content' },
    flowBarTitle: '작성 흐름',
    flowLabels: ['상품 선택', '콘텐츠 작성', '저장 · 노출'],
  },
  sections: [
    {
      step: '01',
      title: '상품 선택',
      description: 'B2B 콘텐츠를 작성할 상품을 선택합니다.',
      items: [
        { label: '내 상품 목록', detail: '/supplier/products 에서 상품 선택' },
        { label: 'B2B 콘텐츠 작성', detail: '상품 상세에서 B2B Drawer 진입' },
      ],
    },
    {
      step: '02',
      title: '콘텐츠 작성',
      description: '매장 대상 짧은 설명과 상세 설명을 작성합니다.',
      items: [
        { label: 'B2B short', detail: 'businessShortDescription' },
        { label: 'B2B detail', detail: 'businessDetailDescription (HTML)' },
        { label: 'B2C 폴백', detail: 'B2B 미작성 시 B2C 설명이 폴백으로 사용됨' },
      ],
    },
    {
      step: '03',
      title: '저장 · 노출',
      description: '저장 후 매장 화면에서 B2B 콘텐츠가 노출됩니다.',
      items: [
        { label: '저장', detail: '변경 사항은 즉시 반영됩니다.' },
        { label: '매장 노출', detail: 'B2B 화면에서 매장 사용자가 확인' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/event-offer ───────────────────────────────────────

export const netureGuideFeatureEventOfferProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: 'Event Offer 제안하기',
    description: '이벤트 오퍼 다중 서비스 동시 제안 (placeholder)',
    primaryAction: { label: 'Event Offer 로 이동 →', to: '/supplier/event-offers' },
    flowBarTitle: '제안 흐름',
    flowLabels: ['Offer 선택', '서비스 선택', '기간 · 수량', '제안 · 승인'],
  },
  sections: [
    {
      step: '01',
      title: 'Offer 선택',
      description: '이벤트로 제안할 Offer 를 선택합니다.',
      items: [
        { label: '내 Offer 목록', detail: 'APPROVED 상태의 Offer 만 제안 가능' },
        { label: '제안 진입', detail: '/supplier/event-offers 에서 제안 시작' },
      ],
    },
    {
      step: '02',
      title: '대상 서비스 선택',
      description: '동시에 제안할 서비스를 선택합니다.',
      items: [
        { label: 'KPA Society', detail: 'kpa-groupbuy 로 매장 연결' },
        { label: 'K-Cosmetics', detail: 'k-cosmetics-event-offer 로 매장 연결' },
        { label: '다중 선택', detail: '부분 실패 허용 — 일부만 승인되어도 진행' },
      ],
    },
    {
      step: '03',
      title: '기간 · 수량',
      description: '이벤트 운영 조건을 설정합니다.',
      items: [
        { label: 'start_at / end_at', detail: '이벤트 시작 · 종료 시점' },
        { label: 'total_quantity', detail: '전체 수량 한도' },
        { label: 'per_store / per_order', detail: '매장 · 주문 단위 한도' },
      ],
    },
    {
      step: '04',
      title: '제안 · 승인 · 운영',
      description: '서비스별 승인 후 매장 노출이 시작됩니다.',
      items: [
        { label: 'pending → approved', detail: '서비스 운영자가 승인' },
        { label: 'runtime status', detail: 'upcoming → active → sold_out / ended 자동 전환' },
        { label: '매장 참여', detail: '매장이 이벤트에 참여하여 상품 노출' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/market-trial ──────────────────────────────────────

export const netureGuideFeatureMarketTrialProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '유통 참여형 펀딩 (Market Trial)',
    description: '오프라인 실행 시나리오를 포함한 유통 참여형 펀딩 (placeholder)',
    primaryAction: { label: 'Market Trial 로 이동 →', to: '/market-trial' },
    flowBarTitle: '운영 흐름',
    flowLabels: ['Trial 작성', '제출 · 승인', '참여 모집', '오프라인 실행', '정산'],
  },
  sections: [
    {
      step: '01',
      title: 'Trial 작성',
      routeLabel: '/supplier/market-trial/new',
      description: '공급자가 Trial 초안을 작성합니다.',
      items: [
        { label: '기본 정보', detail: 'title · oneLiner · videoUrl · description' },
        { label: '참여 조건', detail: 'maxParticipants · fundingStartAt / EndAt · trialPeriodDays' },
        { label: '경제 조건', detail: 'targetAmount · trialUnitPrice · rewardRate' },
        { label: 'outcomeSnapshot', detail: '참여 결과(product / cash) 정의' },
      ],
    },
    {
      step: '02',
      title: '오프라인 시나리오',
      description: 'salesScenarioContent 4 섹션으로 매장 실행을 안내합니다.',
      items: [
        { label: '진열 위치', detail: '매장 어디에 어떻게 진열할지' },
        { label: '고객 안내멘트', detail: '고객에게 무엇을 어떻게 안내할지' },
        { label: '할인 / 프로모션', detail: '추가 할인 · 프로모션 조건' },
        { label: '기대 효과', detail: '매장이 얻을 수 있는 기대 효과' },
      ],
    },
    {
      step: '03',
      title: '제출 · 승인',
      description: 'DRAFT → SUBMITTED → RECRUITING 상태 머신.',
      items: [
        { label: 'SUBMITTED', detail: 'PATCH /api/market-trial/:id/submit' },
        { label: 'RECRUITING', detail: '운영자 승인 시 모집 시작' },
      ],
    },
    {
      step: '04',
      title: '참여 · 실행 · 정산',
      description: '매장이 참여하고 오프라인에서 실행한 뒤 정산합니다.',
      items: [
        { label: '참여 신청', detail: '/market-trial 에서 매장이 신청' },
        { label: '정산 선택', detail: '제품 정산 / 현금 정산 중 선택' },
        { label: 'Forum 연결', detail: 'forumPostId 로 운영 후기 공유' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/partner-program ───────────────────────────────────

export const netureGuideFeaturePartnerProgramProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '파트너로 협력하기',
    description: '파트너 가입 3 경로와 콘텐츠 · 레퍼럴 · 커미션 활용 (placeholder)',
    primaryAction: { label: '파트너 안내로 이동 →', to: '/partner' },
    flowBarTitle: '협력 흐름',
    flowLabels: ['가입 경로', '계약', '콘텐츠 · 레퍼럴', '커미션 조회'],
  },
  sections: [
    {
      step: '01',
      title: '가입 경로 3 종',
      description: '상황에 맞는 가입 경로를 선택합니다.',
      items: [
        { label: '공개 신청', detail: 'POST /api/v1/partner/applications — 비로그인 lead 수집' },
        { label: '파트너십 요청', detail: '/partners/requests/create — 매장 · 공급자 매칭 협상' },
        { label: '모집 공고 신청', detail: 'neture_partner_applications — SPO 단위 affiliate 매칭' },
      ],
    },
    {
      step: '02',
      title: '계약',
      description: 'neture_seller_partner_contracts 기반 1:N 계약.',
      items: [
        { label: 'commission_rate 스냅샷', detail: '계약 시점 수수료율 고정 (변경 시 신규 계약)' },
        { label: 'Active 계약 unique', detail: '(seller_id, partner_id) 활성 계약 1 건' },
        { label: '독립적 종료', detail: 'Seller / Partner 각자 종료 가능' },
      ],
    },
    {
      step: '03',
      title: '콘텐츠 · 레퍼럴 링크',
      description: '상품 풀에서 콘텐츠와 레퍼럴 링크를 생성합니다.',
      items: [
        { label: '콘텐츠 작성', detail: 'text / image / link 콘텐츠 생성 (/partner/contents)' },
        { label: 'Referral Link', detail: '/partner/links 에서 고유 링크 생성' },
        { label: 'Content Linking', detail: '대시보드 아이템에 콘텐츠 연결' },
      ],
    },
    {
      step: '04',
      title: '커미션 조회',
      routeLabel: '/partner/settlements',
      description: '계약 기반으로 누적된 커미션을 조회합니다.',
      items: [
        { label: 'KPI', detail: '활성 콘텐츠 · 계약 · 누적 커미션' },
        { label: '목록 · 상세', detail: '커미션 항목별 내역 확인' },
        { label: '자동 정산', detail: '자동 정산(Payout) 은 현재 미구현 — 별도 안내' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/forum-resources ───────────────────────────────────

export const netureGuideFeatureForumResourcesProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: 'Forum & 자료실',
    description: '커뮤니티 활용과 공급자 · 매장 자료 공유 (placeholder)',
    primaryAction: { label: '포럼으로 이동 →', to: '/forum' },
    flowBarTitle: '활용 흐름',
    flowLabels: ['포럼 탐색', '글 작성', '자료실', 'Notice'],
  },
  sections: [
    {
      step: '01',
      title: '포럼 탐색',
      routeLabel: '/forum',
      description: '카테고리별 글 목록에서 정보를 탐색합니다.',
      items: [
        { label: '포럼 진입', detail: '/forum 에서 카테고리별 글 확인' },
        { label: '검색 · 태그', detail: '키워드 · 태그로 관심 주제 탐색' },
      ],
    },
    {
      step: '02',
      title: '글 작성 · 참여',
      routeLabel: '/forum/write',
      description: '질문 · 경험을 글로 작성하고 댓글로 참여합니다.',
      items: [
        { label: '글 작성', detail: '제목 · 내용 · 태그 입력' },
        { label: '댓글 참여', detail: '답변 · 의견 공유' },
      ],
    },
    {
      step: '03',
      title: '자료실',
      routeLabel: '/resources · /content',
      description: '공급자 · 매장 운영 자료를 공유 · 활용합니다.',
      items: [
        { label: '/resources', detail: 'Neture 자료실 — 파일 · 원본 자료' },
        { label: '/content', detail: '플랫폼 공통 콘텐츠' },
        { label: '공급자 자료실', detail: '/supplier/library — 공급자가 직접 관리' },
      ],
    },
    {
      step: '04',
      title: 'Notice',
      routeLabel: '/notices',
      description: '플랫폼 공지 · 정책 안내를 확인합니다.',
      items: [
        { label: '공지 목록', detail: '/notices 에서 최신 공지 확인' },
        { label: '정책 변경 안내', detail: '플랫폼 정책 변경 사항 공지' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/copilot-dashboard ─────────────────────────────────

export const netureGuideFeatureCopilotDashboardProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '공급자 Copilot Dashboard',
    description: '8-Block KPI · AI 요약 · 추천 (placeholder)',
    primaryAction: { label: 'Copilot 대시보드로 이동 →', to: '/supplier/dashboard' },
    flowBarTitle: '활용 흐름',
    flowLabels: ['KPI 확인', 'AI 요약', '상품 성과', '추천 액션'],
  },
  sections: [
    {
      step: '01',
      title: 'KPI 확인',
      description: '공급자 활동의 핵심 지표를 확인합니다.',
      items: [
        { label: '요청 / 승인 / 거절 / 대기', detail: '공급자 요청 처리 현황 KPI' },
        { label: '상품 성과', detail: '내 상품의 노출 · 참여 · 매장 확산' },
      ],
    },
    {
      step: '02',
      title: 'AI 요약',
      description: 'AI 가 현 상태를 요약하고 다음 액션을 제안합니다.',
      items: [
        { label: 'LLM 요약', detail: 'LLM 기반 자연어 요약 (실패 시 Rule-based fallback)' },
        { label: 'AI 상품 분석', detail: '상품별 성과 분석 요약' },
      ],
    },
    {
      step: '03',
      title: '추천 액션',
      description: '8 번째 블록에서 추천 운영 액션을 확인합니다.',
      items: [
        { label: '추천 전략', detail: 'Violet 블록 — AI 가 우선 액션 제안' },
        { label: '검토 후 적용', detail: 'AI 추천은 공급자가 직접 검토 후 적용' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};
