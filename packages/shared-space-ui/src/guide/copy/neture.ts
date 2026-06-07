/**
 * Neture Guide Copy
 *
 * WO-O4O-NETURE-GUIDE-COPY-CONTENT-V1
 *
 * 공급자 실행 플랫폼 관점에서 작성한 공개용 Guide copy.
 * "좋은 제품을 등록하는 플랫폼"이 아니라
 * "제품이 실제 매장에서 움직이도록 지원하는 플랫폼"이 핵심 메시지.
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
      'Neture는 공급자 실행 플랫폼입니다. 상품 등록부터 콘텐츠 운영 · 계약 · 이벤트까지 — 제품이 실제 매장에서 움직이도록 지원합니다.',
    nextLink: { label: '다음: 서비스 활용 방법 →', to: '/guide/usage' },
  },
  sections: [
    {
      title: 'O4O 기본 구조',
      href: '/guide/intro/structure',
      description:
        'O4O는 공급자 · 운영자 · 매장이 하나의 플랫폼 위에서 역할을 나누는 구조입니다. 공급자가 상품과 전략을 결정하고, 매장이 실행하며, 운영자가 품질과 정책을 관리합니다.',
      items: [
        { label: '공급자', detail: '상품 · 콘텐츠 등록과 유통 전략을 직접 결정합니다.' },
        { label: '운영자', detail: '상품 품질 · 서비스 노출 승인과 정책을 담당합니다.' },
        { label: '매장', detail: '공급자의 상품과 콘텐츠를 받아 고객에게 전달합니다.' },
      ],
    },
    {
      title: 'Neture 의 위치',
      href: '/guide/intro/neture',
      description:
        'Neture는 공급자와 매장 실행 서비스(KPA Society · K-Cosmetics 등)를 연결하는 허브입니다. 콘텐츠 · 계약 · 이벤트 · 유통 참여 펀딩의 공통 기반을 제공합니다.',
      items: [
        { label: '공급자 주도 플랫폼', detail: '유통 범위 · 이벤트 · 가격 전략을 공급자가 직접 구성합니다.' },
        { label: '콘텐츠 기반 유통', detail: 'B2B 콘텐츠 · 포럼 · 자료실이 유통의 핵심 채널입니다.' },
        { label: '오프라인 실행 연결', detail: 'Event Offer · 유통참여형 펀딩으로 매장 실행과 연결됩니다.' },
      ],
    },
    {
      title: '운영 구조',
      href: '/guide/intro/operation',
      description:
        '운영자가 정책과 승인을 담당하고, 공급자가 콘텐츠와 유통을 주도합니다. 매장과 커뮤니티는 그 결과를 받아 확산합니다.',
      items: [
        { label: '운영자 정책 관리', detail: '가입 · 상품 품질 · 서비스 노출 승인을 담당합니다.' },
        { label: '공급자 주도 유통', detail: 'Event Offer · Trial 제안과 유통 범위 선택권이 공급자에게 있습니다.' },
        { label: '매장 · 커뮤니티 확산', detail: '포럼 · 자료실로 콘텐츠가 매장 현장까지 확장됩니다.' },
      ],
    },
    {
      title: '핵심 개념',
      href: '/guide/intro/concept',
      description:
        '소규모 사업자들이 정보 · 구조 · 신뢰를 공유하며 함께 성장하는 것이 O4O의 방향입니다. 개별 매장이 플랫폼을 통해 더 넓은 유통 협력에 참여합니다.',
      items: [
        { label: '소규모 사업자 연대', detail: '개별 매장이 플랫폼을 통해 공급자와 대등하게 협력합니다.' },
        { label: '정보 기반 협력', detail: '공급자의 전문 콘텐츠가 매장 신뢰도와 고객 상담을 높입니다.' },
        { label: '계약 기반 협업', detail: '공급자와 파트너 · 매장은 명시적 계약으로 신뢰를 확보합니다.' },
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
    description:
      'Neture의 공급자 · 운영자 · 매장 구조와 각 역할이 협력하는 방식을 설명합니다. 각 역할은 분리되어 있으며, 플랫폼이 그 사이를 연결합니다.',
    context: [
      { label: '해결 대상', value: '소규모 매장의 운영 부담 — 상품 · 콘텐츠 · 유통 정책 · 고객 응대' },
      { label: '구조 방식', value: '공급자 주도 유통 · 운영자 정책 관리 · 매장 실행 분리' },
    ],
  },
  overview: {
    sectionTitle: '구조 개요',
    cards: [
      { label: '공급자', summary: '상품 · 콘텐츠 · 유통 정책 결정' },
      { label: '운영자', summary: '승인 · 정책 · 품질 관리' },
      { label: '매장', summary: '진열 · 고객 안내 · 판매 실행' },
    ],
  },
  roleDetail: {
    sectionTitle: '역할 상세',
    roles: [
      {
        label: '공급자',
        tasks: [
          '상품 등록 및 콘텐츠 작성',
          '유통 범위와 가격 등급 결정',
          'Event Offer 및 유통참여형 펀딩 제안',
          '파트너와 계약 기반 협업',
        ],
      },
      {
        label: '운영자',
        tasks: [
          '공급자 · 파트너 가입 승인',
          '상품 품질 검수 및 승인',
          '서비스별 노출 승인 및 정책 관리',
        ],
      },
      {
        label: '매장',
        tasks: [
          '승인된 상품 선택 및 진열',
          '고객 안내 및 상담',
          'Event Offer · 유통참여형 펀딩 참여',
        ],
      },
    ],
  },
  relations: {
    sectionTitle: '관계 구조',
    transitionBefore: '개별 매장 직접 거래 구조',
    transitionAfter: '플랫폼 기반 협력 구조',
    mainFlow: ['공급자', '운영자', '매장'],
    subFlow: [
      { from: '상품 등록', mid: '품질 승인', to: '유통 시작' },
      { from: '콘텐츠 작성', mid: '플랫폼 배포', to: '매장 활용' },
      { from: '이벤트 제안', mid: '협의 · 승인', to: '매장 실행' },
    ],
  },
  features: {
    sectionTitle: '주요 기능',
    items: [
      '상품 등록 및 유통 정책 설정',
      'B2B · B2C 콘텐츠 및 자료실',
      'Event Offer · 유통참여형 펀딩',
      '파트너 계약 기반 협업',
    ],
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
      'Neture는 "좋은 제품을 등록하는 플랫폼"이 아닙니다. 제품이 실제 매장에서 진열되고, 고객에게 설명되고, 이벤트로 연결되도록 지원하는 공급자 실행 플랫폼입니다.',
    context: [
      { label: '플랫폼 성격', value: '공급자 중심 · 콘텐츠 기반 · 오프라인 실행 연결' },
      { label: '연결 대상', value: '매장 실행 서비스 (KPA Society · K-Cosmetics 등)' },
    ],
  },
  community: {
    sectionTitle: '공급자 협력 구조',
    cards: [
      { label: '공급자', summary: '상품 · 콘텐츠 · 유통 전략 주도' },
      { label: '파트너', summary: '콘텐츠 협업 · 레퍼럴 · 커미션 기반 확산' },
      { label: '운영자', summary: '품질 승인 · 정책 관리 · 운영 지원' },
    ],
  },
  network: {
    sectionTitle: 'Neture 가 하는 일',
    cards: [
      {
        label: '콘텐츠 기반 유통',
        summary: '공급자 콘텐츠 · 포럼 · 자료실이 매장 고객 상담의 실질적 근거가 됩니다.',
      },
      {
        label: '계약 기반 협력',
        summary: '공급자 · 파트너 · 매장 사이의 협력을 명시적 계약으로 관리합니다.',
      },
      {
        label: '오프라인 실행 연결',
        summary: 'Event Offer · 유통참여형 펀딩으로 온라인 등록이 실제 매장 실행과 연결됩니다.',
      },
    ],
  },
  storeConnection: {
    sectionTitle: '온라인 등록 → 오프라인 실행',
    transitionBefore: '독립적 매장 거래',
    transitionAfter: '플랫폼 기반 유통 협력',
    mainFlow: ['공급자', 'Neture (허브)', '매장 실행 서비스'],
    subFlow: [
      { from: '상품 등록', mid: '품질 검수', to: '유통 정책 적용' },
      { from: 'Event Offer 제안', mid: '다중 서비스 승인', to: '매장 이벤트 실행' },
      { from: '유통참여형 펀딩 작성', mid: '매장 참여 모집', to: '오프라인 진열 · 판매' },
    ],
  },
  roleSummary: {
    sectionTitle: 'Neture 에서 무엇을 할 수 있나',
    items: [
      '공급자로 가입하여 상품을 등록하고 유통 범위를 직접 선택합니다.',
      'B2B · B2C 콘텐츠를 작성하여 매장에 상품 정보와 운영 자료를 전달합니다.',
      'Event Offer로 여러 매장에 동시에 이벤트 참여를 제안합니다.',
      '유통참여형 펀딩으로 오프라인 실행 시나리오를 포함한 유통 펀딩을 운영합니다.',
      '파트너와 계약 기반으로 협력하여 콘텐츠 확산과 레퍼럴을 관리합니다.',
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
    description:
      '공급자 주도 유통과 운영자 정책 · 매장 실행이 연결되는 운영 흐름을 안내합니다. 공급자가 콘텐츠와 이벤트를 제안하면, 운영자가 검토하고, 매장이 실행합니다.',
    context: [
      { label: '운영 주체', value: '운영자 (Neture Admin · Operator)' },
      { label: '실행 주체', value: '공급자 · 파트너 · 매장' },
    ],
  },
  operator: {
    sectionTitle: '운영자의 역할',
    cards: [
      { label: '가입 승인', summary: '공급자 · 파트너 가입 신청을 검토하고 승인합니다.' },
      { label: '상품 품질 승인', summary: '등록된 상품의 정보와 품질 기준을 검수합니다.' },
      { label: '서비스 노출 승인', summary: 'KPA Society · K-Cosmetics 등 서비스별 노출 여부를 결정합니다.' },
    ],
  },
  store: {
    sectionTitle: '매장 실행',
    cards: [
      { label: '상품 노출', summary: '승인된 상품이 매장 화면에 노출되어 고객 상담에 활용됩니다.' },
      { label: 'Event Offer 참여', summary: '공급자가 제안한 이벤트에 매장 단위로 참여합니다.' },
      { label: '오프라인 실행', summary: '진열 · 고객 안내 · 할인 · 프로모션을 현장에서 실행합니다.' },
    ],
  },
  community: {
    sectionTitle: '커뮤니티 확산',
    cards: [
      { label: '포럼', summary: '공급자와 매장이 운영 경험 · 질문 · 노하우를 주고받습니다.' },
      { label: '자료실', summary: '공급자 운영 자료와 매장 활용 자료를 공유합니다.' },
      { label: '공지', summary: '플랫폼 정책 변경과 주요 안내를 확인합니다.' },
    ],
  },
  flow: {
    sectionTitle: '운영 사이클',
    mainFlow: ['정책', '실행', '확산'],
    cycle: ['승인', '유통', '실행', '피드백'],
    subFlow: [
      { from: '운영자 승인', mid: '공급자 등록', to: '매장 노출' },
      { from: '공급자 콘텐츠', mid: '플랫폼 배포', to: '매장 활용' },
      { from: '매장 피드백', mid: '커뮤니티 공유', to: '운영 개선' },
    ],
  },
  features: {
    sectionTitle: '주요 운영 기능',
    items: [
      '가입 · 상품 · 서비스 노출 단계별 승인',
      '콘텐츠 정책 및 자료 관리',
      'Event Offer · 유통참여형 펀딩 검토 및 운영',
    ],
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
    description:
      'O4O는 소규모 사업자들이 정보 · 구조 · 신뢰를 공유하며 함께 성장하는 방향을 지향합니다. 설명이 필요한 제품, 소량 다품종 구조, 콘텐츠 기반 유통이 핵심입니다.',
    context: [
      { label: '지향 방향', value: '정보 · 구조 · 신뢰 공유' },
      { label: '결과', value: '독립적이면서 함께 성장하는 협력' },
    ],
  },
  solidarity: {
    sectionTitle: '소규모 사업자 연대',
    cards: [
      {
        label: '개별 매장의 한계',
        summary: '단독으로는 콘텐츠 제작 · 마케팅 · 유통 협상을 감당하기 어렵습니다.',
      },
      {
        label: '플랫폼 기반 협력',
        summary: '공통 구조 위에서 공급자 · 매장이 함께 운영하며 각자의 부담을 줄입니다.',
      },
      {
        label: '대등한 협상력',
        summary: '연대를 통해 개별 매장도 안정적인 공급자 관계와 운영 지원을 확보합니다.',
      },
    ],
  },
  structure: {
    sectionTitle: '느슨한 연합 구조',
    cards: [
      {
        label: '브랜드 독립',
        summary: '각 매장과 공급자는 자신의 정체성을 유지하면서 플랫폼에 참여합니다.',
      },
      {
        label: '공통 운영 체계',
        summary: '정책 · 콘텐츠 · 유통 흐름은 플랫폼이 공통으로 제공합니다.',
      },
      {
        label: '계약 기반 협력',
        summary: '명시적 계약으로 협력 범위와 조건을 투명하게 관리합니다.',
      },
    ],
  },
  info: {
    sectionTitle: '정보 기반 판매',
    cards: [
      {
        label: '전문 콘텐츠',
        summary: '공급자가 작성한 상품 설명과 매장 대상 안내가 고객 상담의 기반이 됩니다.',
      },
      {
        label: '매장 신뢰도',
        summary: '정확한 콘텐츠가 있는 매장은 고객의 신뢰와 재방문을 높입니다.',
      },
      {
        label: '오프라인 실행 지원',
        summary: '유통참여형 펀딩의 진열 안내 · 고객 멘트 · 기대 효과가 매장 현장을 지원합니다.',
      },
    ],
  },
  competition: {
    sectionTitle: '기존 유통 vs Neture',
    rows: [
      {
        label: '진입 모델',
        items: ['입점 → 노출 → 판매', '가입 → 콘텐츠 + 유통 정책 선택 → 매장 제안'],
        dim: false,
      },
      {
        label: '가격 모델',
        items: ['단일 가격', '고객 등급별 차등 가격 (일반 / 우수 / 최우수)'],
        dim: false,
      },
      {
        label: '파트너 모델',
        items: ['단순 제휴', '계약 기반 1:N 협업 + 커미션 관리'],
        dim: false,
      },
      {
        label: '매장 실행',
        items: ['온라인 종결', '오프라인 시나리오 포함 (유통참여형 펀딩)'],
        dim: false,
      },
    ],
    resultText:
      'Neture는 단순 상품 노출이 아닌, 공급자 주도 콘텐츠 · 계약 · 오프라인 실행까지 연결합니다.',
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
      'Neture를 처음 시작하는 공급자 · 파트너를 위한 단계별 활용 흐름을 안내합니다. 가입부터 실제 매장 실행 연결까지 순서대로 설명합니다.',
    flowBarTitle: '활용 흐름',
    flowLabels: ['가입', '상품 등록', '콘텐츠 운영', 'Event / Trial', '매장 실행', '협력 확장'],
  },
  sections: [
    {
      step: '01',
      title: '공급자 / 파트너 가입',
      routeLabel: '/supplier · /partner',
      description:
        '공급자 또는 파트너로 Neture에 참여합니다. 현재 가입은 문의 · 상담 기반으로 진행되며, 운영자 검토 후 활성화됩니다.',
      items: [
        {
          label: '공급자 가입',
          detail:
            '/supplier 안내 페이지에서 가입 방법을 확인하고, Business Inquiry 또는 Contact를 통해 신청합니다.',
        },
        {
          label: '파트너 가입',
          detail:
            '/partner 안내 페이지에서 협업 유형을 확인하고 가입 신청을 제출합니다.',
        },
      ],
    },
    {
      step: '02',
      title: '상품 등록',
      routeLabel: '/supplier/products',
      description:
        '상품 정보를 입력하고 유통 범위와 가격 등급을 설정합니다. 등록된 상품은 운영자 품질 검수 후 유통이 시작됩니다.',
      items: [
        {
          label: '상품 기본 정보',
          detail: '상품명 · 브랜드 · 카테고리 · 이미지를 입력합니다.',
        },
        {
          label: '가격 등급 설정',
          detail: '고객 등급에 따라 차등 가격을 설정합니다 (일반 / 우수 / 최우수).',
        },
        {
          label: '유통 범위 선택',
          detail: '전체 공개 / 특정 서비스 / 지정 매장 중 원하는 유통 방식을 선택합니다.',
        },
      ],
    },
    {
      step: '03',
      title: '콘텐츠 운영',
      routeLabel: '/supplier/b2b-content · /supplier/library',
      description:
        '매장에 전달할 B2B 콘텐츠와 자료를 준비합니다. 콘텐츠가 충실할수록 매장 현장에서 고객 안내의 품질이 높아집니다.',
      items: [
        {
          label: 'B2B 콘텐츠',
          detail: '매장 담당자를 위한 상품 설명 · 취급 정보 · 영업 포인트를 작성합니다.',
        },
        {
          label: 'B2C 콘텐츠',
          detail: '일반 소비자를 위한 상품 소개 · 효능 · 사용법을 작성합니다.',
        },
        {
          label: '자료실',
          detail: '브로슈어 · 교육 자료 · 제품 소개서를 자료실에 등록해 매장과 공유합니다.',
        },
      ],
    },
    {
      step: '04',
      title: 'Event Offer · 유통참여형 펀딩 제안',
      routeLabel: '/supplier/event-offers · /supplier/market-trial',
      description:
        '이벤트 오퍼와 유통참여형 펀딩으로 매장의 적극적 참여를 이끌어 냅니다.',
      items: [
        {
          label: 'Event Offer',
          detail: '여러 서비스(KPA Society · K-Cosmetics 등)의 매장에 동시에 이벤트를 제안합니다.',
        },
        {
          label: '유통참여형 펀딩',
          detail: '진열 · 고객 안내 · 할인 · 기대 효과를 담은 오프라인 실행 시나리오를 제안합니다.',
        },
      ],
    },
    {
      step: '05',
      title: '매장 실행 · 협력 확장',
      routeLabel: '/store · /forum',
      description:
        '매장은 승인된 상품과 이벤트를 받아 오프라인에서 실행합니다. 파트너와 커뮤니티가 확산을 지원합니다.',
      items: [
        {
          label: '매장 노출',
          detail: '승인된 상품과 이벤트가 매장 화면에 노출됩니다.',
        },
        {
          label: '파트너 협업',
          detail: '파트너가 콘텐츠 · 레퍼럴을 통해 상품 인지도를 확산합니다.',
        },
        {
          label: '커뮤니티 피드백',
          detail: '포럼과 자료실로 운영 노하우를 축적하고 개선합니다.',
        },
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
    description:
      'Neture 주요 기능을 카테고리별로 정리했습니다. 필요한 기능을 선택해 바로 이동합니다.',
    flowBarTitle: '기능 카테고리',
    flowLabels: [
      '공급자',
      '상품',
      'B2B 콘텐츠',
      'Event Offer',
      '유통참여형 펀딩',
      '파트너',
      'Forum / 자료실',
      'Copilot',
    ],
  },
  groups: [
    {
      step: '01',
      title: '공급자 시작하기',
      primaryRoute: '/supplier',
      description:
        'Neture 공급자 가입 경로와 준비 정보, 승인 흐름을 안내합니다.',
      items: [{ label: '공급자 가입 안내', route: '/guide/features/supplier-onboarding' }],
      linkTo: '/guide/features/supplier-onboarding',
    },
    {
      step: '02',
      title: '상품 등록 & 유통',
      primaryRoute: '/supplier/products',
      description:
        '상품 등록, 가격 등급 설정, 유통 범위 선택까지의 흐름을 안내합니다.',
      items: [{ label: '상품 등록 이용 방법', route: '/guide/features/product-registration' }],
      linkTo: '/guide/features/product-registration',
    },
    {
      step: '03',
      title: 'B2B 콘텐츠',
      primaryRoute: '/supplier/b2b-content',
      description:
        '매장 대상 B2B 콘텐츠를 작성하고 고객 안내 자료로 활용하는 방법을 안내합니다.',
      items: [{ label: 'B2B 콘텐츠 이용 방법', route: '/guide/features/b2b-content' }],
      linkTo: '/guide/features/b2b-content',
    },
    {
      step: '04',
      title: 'Event Offer 제안',
      primaryRoute: '/supplier/event-offers',
      description:
        '여러 서비스의 매장에 동시에 이벤트를 제안하는 흐름을 안내합니다.',
      items: [{ label: 'Event Offer 이용 방법', route: '/guide/features/event-offer' }],
      linkTo: '/guide/features/event-offer',
    },
    {
      step: '05',
      title: '유통참여형 펀딩',
      primaryRoute: '/market-trial',
      description:
        '오프라인 실행 시나리오를 포함한 유통참여형 펀딩을 운영하는 방법을 안내합니다.',
      items: [{ label: '유통참여형 펀딩 이용 방법', route: '/guide/features/market-trial' }],
      linkTo: '/guide/features/market-trial',
    },
    {
      step: '06',
      title: '파트너 협력',
      primaryRoute: '/partner',
      description:
        '파트너 협업 유형과 콘텐츠 · 레퍼럴 · 커미션 활용 방법을 안내합니다.',
      items: [{ label: '파트너 프로그램 이용 방법', route: '/guide/features/partner-program' }],
      linkTo: '/guide/features/partner-program',
    },
    {
      step: '07',
      title: 'Forum & 자료실',
      primaryRoute: '/forum',
      description:
        '포럼과 자료실을 통해 운영 정보를 공유하고 활용하는 방법을 안내합니다.',
      items: [{ label: 'Forum / 자료실 이용 방법', route: '/guide/features/forum-resources' }],
      linkTo: '/guide/features/forum-resources',
    },
    {
      step: '08',
      title: '공급자 Copilot Dashboard',
      primaryRoute: '/supplier/dashboard',
      description:
        '공급자 KPI · 운영 요약 · 추천 액션을 한 화면에서 확인하는 방법을 안내합니다.',
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
    description:
      'Neture 공급자 가입 경로와 준비 정보, 승인 흐름, 활성화까지의 과정을 안내합니다. 현재 가입은 문의 · 상담 기반으로 진행됩니다.',
    primaryAction: { label: '공급자 안내로 이동 →', to: '/supplier' },
    flowBarTitle: '가입 흐름',
    flowLabels: ['가입 경로 선택', '신청', '운영자 검토', '활성화'],
  },
  sections: [
    {
      step: '01',
      title: '가입 경로 선택',
      routeLabel: '/supplier',
      description:
        '현재 공급자 가입은 Business Inquiry 또는 Contact 경로를 통해 진행됩니다. 자동 가입 UI는 준비 중이며, 개별 상담을 통해 안내받을 수 있습니다.',
      items: [
        {
          label: '공급자 안내 확인',
          detail: '/supplier 페이지에서 가입 절차와 준비 정보를 먼저 확인합니다.',
        },
        {
          label: 'Business Inquiry',
          detail: '/o4o/business-inquiry에서 가입 의사와 취급 상품군을 전달합니다.',
        },
        {
          label: '직접 문의',
          detail: '/contact를 통해 담당자에게 직접 문의할 수 있습니다.',
        },
      ],
    },
    {
      step: '02',
      title: '신청 정보 준비',
      description:
        '가입 신청 시 다음 정보를 미리 준비하면 검토가 빠르게 진행됩니다.',
      items: [
        {
          label: '업체 정보',
          detail: '공급자명 · 사업자번호 · 담당자 이름',
        },
        {
          label: '연락처',
          detail: '담당자 이메일 · 전화번호',
        },
        {
          label: '운영 계획',
          detail: '취급 상품군 · 희망 유통 범위 · 협업 형태',
        },
      ],
    },
    {
      step: '03',
      title: '운영자 검토',
      description:
        '운영자가 신청 내용을 검토하고 승인 여부를 결정합니다.',
      items: [
        {
          label: '접수 확인',
          detail: '신청 접수 직후 담당자 확인 이메일이 전달됩니다.',
        },
        {
          label: '승인',
          detail: '검토 통과 시 공급자 계정이 활성화됩니다.',
        },
        {
          label: '반려',
          detail: '반려 시 사유가 전달되며 수정 후 재신청할 수 있습니다.',
        },
      ],
    },
    {
      step: '04',
      title: '활성화 및 시작',
      routeLabel: '/supplier/dashboard',
      description:
        '승인 후 공급자 대시보드에 접근하여 상품 등록과 콘텐츠 운영을 시작합니다.',
      items: [
        {
          label: 'Copilot Dashboard',
          detail: '/supplier/dashboard에서 KPI · 추천 액션 · 운영 현황을 확인합니다.',
        },
        {
          label: '첫 상품 등록',
          detail: '/supplier/products에서 첫 상품을 등록하고 유통 정책을 설정합니다.',
        },
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
    description:
      '상품 정보 입력부터 가격 등급 설정, 유통 범위 선택까지의 흐름을 안내합니다. 등록된 상품은 운영자 품질 검수를 거쳐 유통이 시작됩니다.',
    primaryAction: { label: '상품 등록으로 이동 →', to: '/supplier/products' },
    flowBarTitle: '등록 흐름',
    flowLabels: ['상품 식별', '기본 정보', '가격 설정', '유통 정책', '승인 · 유통'],
  },
  sections: [
    {
      step: '01',
      title: '상품 식별',
      description:
        '바코드를 입력하면 동일 상품의 기존 등록 정보를 자동으로 연결합니다. 동일 바코드의 상품은 공통 상품 정보를 공유하며, 공급자별 거래 조건은 별도로 관리됩니다.',
      items: [
        {
          label: '바코드 입력',
          detail: '바코드(GTIN) 입력이 상품 등록의 첫 단계입니다.',
        },
        {
          label: '공통 상품 정보',
          detail: '여러 공급자가 동일 바코드를 등록할 경우 공통 상품 정보를 공유합니다.',
        },
        {
          label: '공급자별 조건',
          detail: '가격 · 유통 범위 · 콘텐츠는 공급자별로 독립적으로 관리됩니다.',
        },
      ],
    },
    {
      step: '02',
      title: '기본 정보 입력',
      description:
        '소비자용 설명과 매장 대상 설명을 분리하여 작성합니다. 양쪽 콘텐츠가 충실할수록 매장 현장 활용도가 높아집니다.',
      items: [
        {
          label: '상품명 · 브랜드 · 카테고리',
          detail: '상품을 분류하고 검색에 사용되는 기본 정보를 입력합니다.',
        },
        {
          label: '소비자용 설명 (B2C)',
          detail: '일반 소비자에게 보여줄 상품 소개와 상세 설명을 작성합니다.',
        },
        {
          label: '매장 대상 설명 (B2B)',
          detail: '매장 담당자에게 전달할 취급 정보 · 영업 포인트 · 주의사항을 작성합니다.',
        },
      ],
    },
    {
      step: '03',
      title: '가격 등급 설정',
      description:
        '고객 등급에 따라 차등 가격을 설정합니다. 등급별 가격 전략은 공급자가 직접 결정합니다.',
      items: [
        {
          label: '일반 가격',
          detail: '기본 고객 등급에 적용되는 가격입니다.',
        },
        {
          label: '우수 고객 가격',
          detail: 'Gold 등급 고객에게 적용되는 가격입니다.',
        },
        {
          label: '최우수 고객 가격',
          detail: 'Platinum 등급 고객에게 적용되는 가격입니다.',
        },
      ],
    },
    {
      step: '04',
      title: '유통 범위 선택',
      description:
        '상품을 어느 범위의 매장에 노출할지 공급자가 직접 결정합니다.',
      items: [
        {
          label: '전체 공개',
          detail: '모든 서비스 · 매장에 자동으로 노출됩니다.',
        },
        {
          label: '서비스 지정',
          detail: 'KPA Society · K-Cosmetics 등 특정 서비스에만 노출합니다. 서비스별 승인이 필요합니다.',
        },
        {
          label: '매장 지정',
          detail: '협력 관계가 있는 특정 매장에만 노출합니다.',
        },
      ],
    },
    {
      step: '05',
      title: '제출 · 승인 · 유통 시작',
      description:
        '등록을 제출하면 운영자 품질 검수를 거칩니다. 승인 후 선택한 유통 범위에 따라 매장에 노출됩니다.',
      items: [
        {
          label: '검수 대기',
          detail: '제출 직후 운영자 검수가 시작됩니다.',
        },
        {
          label: '승인',
          detail: '품질 검수 통과 후 설정한 유통 범위에 따라 노출이 시작됩니다.',
        },
        {
          label: '반려',
          detail: '반려 시 사유를 확인하고 정보를 수정한 뒤 재제출합니다.',
        },
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
    description:
      '매장 담당자에게 전달하는 B2B 콘텐츠를 작성하고 활용하는 방법을 안내합니다. 충실한 B2B 콘텐츠는 매장 현장 상담의 품질을 높입니다.',
    primaryAction: { label: 'B2B 콘텐츠로 이동 →', to: '/supplier/b2b-content' },
    flowBarTitle: '작성 흐름',
    flowLabels: ['상품 선택', '내용 작성', '저장 · 매장 노출'],
  },
  sections: [
    {
      step: '01',
      title: '상품 선택',
      description:
        'B2B 콘텐츠를 작성할 상품을 선택합니다. 승인된 상품에 대해 언제든지 B2B 콘텐츠를 추가하거나 수정할 수 있습니다.',
      items: [
        {
          label: '내 상품 목록',
          detail: '/supplier/products에서 콘텐츠를 작성할 상품을 선택합니다.',
        },
        {
          label: 'B2B 콘텐츠 작성',
          detail: '상품 상세에서 매장 대상 콘텐츠 편집 화면으로 이동합니다.',
        },
      ],
    },
    {
      step: '02',
      title: '콘텐츠 작성',
      description:
        '매장 담당자가 고객에게 상품을 안내할 때 필요한 정보를 작성합니다. 짧은 설명과 상세 설명으로 구성됩니다.',
      items: [
        {
          label: '짧은 설명',
          detail: '매장 담당자가 한눈에 파악할 수 있는 핵심 정보를 1~3문장으로 작성합니다.',
        },
        {
          label: '상세 설명',
          detail: '취급 방법 · 주의사항 · 영업 포인트 · 고객 FAQ 등을 상세히 작성합니다.',
        },
        {
          label: '소비자용 설명 폴백',
          detail: 'B2B 설명이 없는 경우 소비자용 설명이 대신 표시됩니다.',
        },
      ],
    },
    {
      step: '03',
      title: '저장 · 매장 노출',
      description:
        '저장하면 해당 상품을 취급하는 매장에 즉시 반영됩니다. 콘텐츠 수정도 즉시 반영됩니다.',
      items: [
        {
          label: '즉시 반영',
          detail: '저장 후 변경 사항이 즉시 매장에 반영됩니다.',
        },
        {
          label: '매장 확인',
          detail: '매장 담당자가 상품 상세 화면에서 B2B 콘텐츠를 확인합니다.',
        },
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
    description:
      '여러 서비스의 매장에 동시에 이벤트를 제안하는 방법을 안내합니다. 공급자가 기간 · 수량 · 대상 서비스를 설정하고 제안하면, 각 서비스 운영자가 검토 후 매장에 이벤트가 노출됩니다.',
    primaryAction: { label: 'Event Offer 로 이동 →', to: '/supplier/event-offers' },
    flowBarTitle: '제안 흐름',
    flowLabels: ['상품 선택', '서비스 선택', '기간 · 수량 설정', '제안 · 승인 · 실행'],
  },
  sections: [
    {
      step: '01',
      title: '이벤트 상품 선택',
      description:
        '이벤트로 제안할 상품을 선택합니다. 운영자 승인이 완료된 상품만 이벤트 제안이 가능합니다.',
      items: [
        {
          label: '승인 상품 대상',
          detail: '이미 품질 검수를 통과한 상품에 대해 이벤트를 제안합니다.',
        },
        {
          label: '제안 시작',
          detail: '/supplier/event-offers에서 새 이벤트 제안을 시작합니다.',
        },
      ],
    },
    {
      step: '02',
      title: '대상 서비스 선택',
      description:
        '이벤트를 제안할 서비스를 선택합니다. 여러 서비스를 동시에 선택하여 동시 제안이 가능합니다.',
      items: [
        {
          label: 'KPA Society',
          detail: '약국 · 약사 네트워크 매장에 이벤트를 제안합니다.',
        },
        {
          label: 'K-Cosmetics',
          detail: 'K-뷰티 매장 네트워크에 이벤트를 제안합니다.',
        },
        {
          label: '다중 서비스 제안',
          detail: '일부 서비스만 승인되어도 해당 서비스에서 이벤트가 진행됩니다.',
        },
      ],
    },
    {
      step: '03',
      title: '기간 · 수량 설정',
      description: '이벤트 운영 조건을 설정합니다.',
      items: [
        {
          label: '이벤트 기간',
          detail: '이벤트 시작일과 종료일을 설정합니다.',
        },
        {
          label: '전체 수량 한도',
          detail: '이벤트 전체 참여 가능 수량을 설정합니다.',
        },
        {
          label: '매장 · 주문 단위 한도',
          detail: '매장별 · 주문별 참여 한도를 설정하여 특정 매장의 독점을 방지합니다.',
        },
      ],
    },
    {
      step: '04',
      title: '제안 · 승인 · 운영',
      description:
        '서비스별 운영자가 이벤트를 검토하고 승인하면 매장에 노출이 시작됩니다.',
      items: [
        {
          label: '서비스 운영자 승인',
          detail: '각 서비스 운영자가 이벤트 조건을 검토하고 승인 여부를 결정합니다.',
        },
        {
          label: '이벤트 진행 상태',
          detail: '이벤트는 예정 → 진행 중 → 종료(매진 · 기간 만료) 순서로 자동 전환됩니다.',
        },
        {
          label: '매장 참여',
          detail: '승인된 이벤트가 매장에 노출되어 매장 담당자가 고객에게 안내합니다.',
        },
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
    title: '유통참여형 펀딩',
    description:
      '유통참여형 펀딩은 공급자가 제품 개발 또는 유통 준비 단계에서 매장 경영자의 소액 참여를 받고, 개발 완료 후 제품으로 정산하여 초기 매장 도입(매장 랜딩)을 확보하도록 돕는 Neture의 참여형 유통 프로그램입니다. 개발비 전체를 모으는 것이 핵심이 아니라, 제품이 실제 매장에 처음 들어가도록 만드는 것이 핵심입니다.',
    primaryAction: { label: '유통참여형 펀딩으로 이동 →', to: '/market-trial' },
    flowBarTitle: '진행 흐름',
    flowLabels: ['공급자 제안', '운영자 검토', '매장 참여', '제품 정산', '매장 랜딩'],
  },
  index: {
    title: '유통참여형 펀딩 한눈에 보기',
    lead: [
      '개발비 전체 조달이 목적이 아닙니다.',
      '제품 정산을 통해 제품이 실제 매장에 도입(매장 랜딩)되도록 만듭니다.',
      '참여자는 매장 경영자 또는 매장 랜딩이 가능한 사업자가 중심입니다.',
    ],
    cards: [
      { title: '유통참여형 펀딩이란?', audience: '공통', summary: '제품 정산을 통해 초기 매장 랜딩을 만드는 참여형 유통 프로그램입니다.', to: '#overview' },
      { title: '왜 매장 랜딩이 중요한가?', audience: '공통', summary: '매장 진입비용이 높은 제품에게 첫 매장 진입은 성공의 첫 관문입니다.', to: '#store-landing' },
      { title: '공급자는 어떻게 활용하나?', audience: '공급자', summary: '목표 매장 수와 제품 정산 조건을 중심으로 프로그램을 설계합니다.', to: '#supplier' },
      { title: '참여자는 어떤 이익을 얻나?', audience: '매장 경영자', summary: '낮은 부담으로 새 제품을 먼저 확보하고 매장에 도입할 수 있습니다.', to: '#participant' },
      { title: '펀딩 금액과 제품 정산 설계', audience: '공급자', summary: '개발비 전체가 아니라 매장 랜딩이 가능한 금액·정산 기준을 설계합니다.', to: '#settlement' },
      { title: '참여 절차는 어떻게 진행되나?', audience: '공통', summary: '제안 → 검토 → 공개 → 참여 → 정산 → 매장 랜딩 → 후속 유통.', to: '#process' },
      { title: '운영자는 무엇을 확인하나?', audience: '운영자', summary: '투자형 오해 방지와 제품 정산·매장 랜딩 가능성을 확인합니다.', to: '#operator' },
      { title: '자주 묻는 질문', audience: '공통', summary: '투자 상품 여부, 제품 정산, 참여 대상, 목표 금액에 대한 안내.', to: '#faq' },
    ],
  },
  sections: [
    {
      id: 'overview',
      step: '01',
      title: '유통참여형 펀딩이란?',
      description:
        '유통참여형 펀딩의 핵심은 "얼마를 모았는가"가 아니라 "몇 개의 매장에 제품이 실제로 들어갔는가"입니다. 일반적인 개발비 모집·선구매·투자형 펀딩과는 목적이 다릅니다.',
      items: [
        { label: '일반 펀딩과의 차이', detail: '개발비 전체 조달·소비자 선구매가 아니라, 제품 정산을 통한 매장 도입이 목적입니다.' },
        { label: '투자형 펀딩이 아님', detail: '주식·채권·배당·이자·원금 상환 같은 금융적 권리를 제공하지 않습니다.' },
        { label: '제품으로 정산', detail: '참여 금액은 개발 완료 후 제품으로 정산되는 것을 기본으로 합니다.' },
        { label: '초기 매장 랜딩', detail: '공급자와 매장이 함께 제품의 첫 매장 진입을 만드는 구조입니다.' },
      ],
    },
    {
      id: 'store-landing',
      step: '02',
      title: '왜 매장 랜딩이 중요한가?',
      description:
        'O4O가 다루는 다품종·소량·정보중심 제품은 매장에 처음 진입하는 비용이 높습니다. 공급자에게 초기 매장 랜딩은 제품 성공 여부를 가르는 첫 관문입니다.',
      items: [
        { label: 'O4O 대상 제품 특성', detail: '다품종·소량 판매이면서 제품 설명과 정보 전달이 중요한 제품이 많습니다.' },
        { label: '소규모 공급자의 어려움', detail: '매장 영업비·샘플·설명자료·초기 재고·매장 신뢰 확보의 부담이 큽니다.' },
        { label: '첫 관문인 이유', detail: '매장에 들어가야 고객 반응 확인, 설명 방식 검증, 후속 주문, 신뢰자료 확보가 가능합니다.' },
      ],
    },
    {
      id: 'supplier',
      step: '03',
      title: '공급자는 어떻게 활용하나?',
      routeLabel: '/supplier/market-trial/new',
      description:
        '공급자는 개발비 전체를 펀딩으로 받으려 하기보다, 제품이 실제 매장에 들어갈 수 있는 구조를 설계해야 합니다. 목표 금액보다 "몇 개 매장에 랜딩시킬 것인가"를 먼저 정합니다.',
      items: [
        { label: '제품 선정', detail: '개발 중·유통 준비 중이거나 매장 설명·초기 반응 검증이 필요한 제품을 고릅니다.' },
        { label: '목표 설정', detail: '목표 금액보다 목표 매장 수를 먼저 정합니다 (예: 50·100·200개 매장).' },
        { label: '참여 금액', detail: '매장 경영자가 부담 없이 참여할 수 있는 소액으로 설정합니다.' },
        { label: '제품 정산 설계', detail: '개발 완료 후 제품으로 정산하며, 기준은 도매 공급가격 또는 그 이하로 설계합니다.' },
        { label: '매장 실행자료', detail: '제품 설명자료·POP·QR 안내·블로그 소개 문구·고객 응대 FAQ를 준비합니다.' },
        { label: '피드백 수집', detail: '매장·고객 반응, 가격 적정성, 설명 난이도, 재주문 가능성을 모읍니다.' },
      ],
    },
    {
      id: 'participant',
      step: '04',
      title: '참여자는 어떤 이익을 얻나?',
      description:
        '참여자의 이익은 금융 수익이 아니라, 낮은 부담으로 새로운 제품을 먼저 확보하고 매장에서 활용할 수 있는 기회입니다. 참여자는 매장 경영자 또는 매장 랜딩이 가능한 사업자가 적합합니다.',
      items: [
        { label: '먼저 확보', detail: '소액으로 새로운 제품에 먼저 참여하고, 개발 완료 후 제품으로 정산받습니다.' },
        { label: '유리한 조건', detail: '도매 공급가격 또는 그 이하 기준으로 제품을 받아 매장 차별화에 활용할 수 있습니다.' },
        { label: '실행자료 제공', detail: '제품 설명자료와 매장 실행자료를 함께 제공받아 현장 운영이 쉬워집니다.' },
        { label: '주의할 점', detail: '투자 수익 구조가 아니며, 출시 일정·정산 조건은 각 프로그램 안내를 기준으로 확인해야 합니다.' },
      ],
    },
    {
      id: 'settlement',
      step: '05',
      title: '펀딩 금액과 제품 정산은 어떻게 설계하나?',
      description:
        '유통참여형 펀딩에서 가장 중요한 것은 참여자가 제품으로 정산받았을 때 실제 매장에 들여놓을 만한 조건이 되도록 만드는 것입니다. 전체 개발비를 모두 모집하는 구조가 아닙니다.',
      items: [
        { label: '개발비 ≠ 펀딩 목표', detail: '개발비가 3,000만 원이어도 펀딩 목표는 500만 원으로 정할 수 있습니다.' },
        { label: '매장 수가 우선', detail: '소수가 큰 금액을 내기보다, 많은 매장이 부담 없이 참여하는 구조가 적합할 수 있습니다.' },
        { label: '소액 설계', detail: '리워드를 전부 제품으로 받아도 부담 없는 1인당 참여 금액으로 설계합니다.' },
        { label: '정산 기준', detail: '소비자가격 기준 정산은 피하고, 도매 공급가격 또는 그 이하로 정산합니다.' },
        { label: '예시', detail: '개발비 3,000만 원 / 펀딩 목표 500만 원 / 매장 경영자 100명 / 1인 5만 원 → 100개 매장 초기 랜딩.' },
      ],
    },
    {
      id: 'process',
      step: '06',
      title: '참여 절차는 어떻게 진행되나?',
      description:
        '공급자 제안 → 운영자 검토 → 프로그램 공개 → 매장 참여 → 개발·공급 준비 → 제품 정산 → 매장 랜딩 → 피드백 → 후속 유통의 순서로 진행됩니다.',
      items: [
        { label: '1. 공급자 제안', detail: '제품 정보·참여 조건·목표 매장 수·목표 금액·제품 정산 조건을 등록합니다.' },
        { label: '2. 운영자 검토', detail: '제품 적합성, 표시·광고 주의사항, 조건의 명확성, 정산 구조 적정성을 검토합니다.' },
        { label: '3. 프로그램 공개', detail: '제품 소개·참여 조건·모집 기간·수량·정산 방식·제공 자료·주의사항을 안내합니다.' },
        { label: '4. 매장 참여', detail: '/market-trial 에서 매장 경영자 또는 참여 가능 사업자가 조건을 확인하고 신청합니다.' },
        { label: '5. 개발·공급 준비', detail: '제품 개발 또는 생산 준비가 완료되고 공급자는 제품 정산을 준비합니다.' },
        { label: '6. 제품 정산', detail: '참여 금액에 대응하는 제품을 프로그램 안내 기준으로 정산합니다.' },
        { label: '7. 매장 랜딩', detail: '참여 매장이 제품을 실제로 도입하고 실행자료를 활용합니다.' },
        { label: '8. 피드백', detail: '매장·고객 반응, 제품 개선 의견, 후속 주문 가능성을 수집합니다.' },
        { label: '9. 후속 유통', detail: '정식 유통 전환·추가 모집·Event Offer 전환·공급 조건 조정으로 이어집니다.' },
      ],
    },
    {
      id: 'operator',
      step: '07',
      title: '운영자는 무엇을 확인하나?',
      description:
        '운영자는 프로그램이 투자형으로 오해되지 않도록 하고, 제품 정산 구조와 매장 랜딩 가능성이 명확한지 확인합니다.',
      items: [
        { label: '투자형 오해 방지', detail: '외부 문구가 투자형 펀딩처럼 보이지 않는지 확인합니다.' },
        { label: '정산 조건 명확성', detail: '제품 정산 조건과 적용 기준이 명확하고 참여자에게 불리하지 않은지 봅니다.' },
        { label: '참여 대상 적합성', detail: '참여 대상이 매장 랜딩 목적에 맞는지, 참여 금액이 과도하지 않은지 확인합니다.' },
        { label: '표시·광고 위험', detail: '제품 표시·광고·인증 관련 위험이 없는지, 매장 실행자료가 충분한지 점검합니다.' },
        { label: '후속 유통 계획', detail: '공급자가 제품을 실제로 제공할 수 있는지와 후속 유통 계획이 있는지 확인합니다.' },
      ],
    },
    {
      id: 'faq',
      step: '08',
      title: '자주 묻는 질문',
      description:
        '유통참여형 펀딩은 금융투자 상품이 아닙니다. 참여자는 금융적 권리가 아니라 프로그램 조건에 따른 제품 정산과 초기 참여 혜택을 받습니다.',
      items: [
        { label: 'Q. 투자 상품인가요?', detail: '아닙니다. 주식·채권·배당·이자·원금 상환을 제공하지 않으며, 조건에 따라 제품 정산·초기 참여 혜택·매장 실행자료를 제공합니다.' },
        { label: 'Q. 개발비 전체를 모집하나요?', detail: '아닙니다. 핵심은 개발비 전체 조달이 아니라 초기 매장 랜딩입니다. 목표 매장 수와 참여 금액으로 현실적 목표를 정합니다.' },
        { label: 'Q. 참여자는 누구인가요?', detail: '매장 경영자 또는 제품을 매장에 랜딩시킬 수 있는 사업자가 적합합니다. 목적이 소비자 판매가 아니라 실제 매장 진입이기 때문입니다.' },
        { label: 'Q. 참여자는 무엇을 받나요?', detail: '프로그램별 조건에 따라 개발 완료 후 제품으로 정산받고, 제품 설명·매장 안내자료·초기 참여 조건을 제공받습니다.' },
        { label: 'Q. 제품 정산 기준은?', detail: '참여자가 매장에서 활용할 수 있도록 도매 공급가격 또는 그 이하 기준으로 정산하는 것이 바람직합니다.' },
        { label: 'Q. 목표 금액은 어떻게 정하나요?', detail: '전체 개발비보다 초기 매장 랜딩 규모를 기준으로 정합니다 (예: 개발비 3,000만 원이라도 100개 매장 목표로 500만 원).' },
        { label: 'Q. 개발이 완료되지 않으면?', detail: '프로그램별로 일정·정산 가능 조건·지연 시 안내·취소/변경 기준을 사전에 명확히 고지해야 합니다.' },
        { label: 'Q. 참여 후 반드시 판매해야 하나요?', detail: '프로그램 조건에 따라 다르나, 제품을 매장에서 활용하거나 고객 반응을 확인할 의향이 있는 참여자가 적합합니다.' },
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
    description:
      'Neture 파트너 협업 유형과 콘텐츠 · 레퍼럴 · 커미션 활용 방법을 안내합니다. 파트너는 계약 기반으로 공급자와 협력하며, 콘텐츠 제작과 유통 확산에 기여합니다.',
    primaryAction: { label: '파트너 안내로 이동 →', to: '/partner' },
    flowBarTitle: '협력 흐름',
    flowLabels: ['가입 경로', '계약', '콘텐츠 · 레퍼럴', '커미션 조회'],
  },
  sections: [
    {
      step: '01',
      title: '파트너 가입 경로',
      description:
        '협업 형태에 따라 다양한 가입 경로를 제공합니다. 상황에 맞는 경로를 선택합니다.',
      items: [
        {
          label: '공개 신청',
          detail: 'Neture에 관심 있는 누구나 파트너 신청 의사를 전달할 수 있습니다.',
        },
        {
          label: '파트너십 요청',
          detail: '매장 · 공급자와 직접 협력 관계를 제안하고 협상합니다.',
        },
        {
          label: '모집 공고 신청',
          detail: '공급자가 올린 파트너 모집 공고에 지원하여 참여합니다.',
        },
      ],
    },
    {
      step: '02',
      title: '계약',
      description:
        '파트너와 공급자는 명시적 계약을 통해 협력 범위와 커미션 조건을 확정합니다.',
      items: [
        {
          label: '커미션 조건 확정',
          detail: '계약 시점에 커미션율이 확정됩니다. 조건 변경 시 신규 계약이 필요합니다.',
        },
        {
          label: '활성 계약 관리',
          detail: '공급자 1명과 파트너 1명 사이에는 활성 계약 1건만 유지됩니다.',
        },
        {
          label: '독립적 종료',
          detail: '공급자와 파트너 양측이 각자 계약을 종료할 수 있습니다.',
        },
      ],
    },
    {
      step: '03',
      title: '콘텐츠 · 레퍼럴 링크',
      description:
        '계약이 완료되면 파트너 콘텐츠를 작성하고 레퍼럴 링크를 생성하여 상품 확산 활동을 시작합니다.',
      items: [
        {
          label: '콘텐츠 작성',
          detail: '텍스트 · 이미지 · 링크 형태의 콘텐츠를 작성하여 상품을 소개합니다.',
        },
        {
          label: '레퍼럴 링크',
          detail: '파트너 고유 링크를 생성하여 유입 경로를 추적합니다.',
        },
        {
          label: '콘텐츠 연결',
          detail: '파트너 대시보드에서 상품과 콘텐츠를 연결하여 성과를 관리합니다.',
        },
      ],
    },
    {
      step: '04',
      title: '커미션 조회',
      routeLabel: '/partner/settlements',
      description:
        '계약 기반으로 누적된 커미션을 조회합니다. 현재 자동 정산(Payout)은 운영 중이 아니며, 정산은 별도 안내에 따라 진행됩니다.',
      items: [
        {
          label: '활동 현황',
          detail: '활성 계약 수 · 콘텐츠 수 · 누적 커미션을 확인합니다.',
        },
        {
          label: '커미션 내역',
          detail: '항목별 커미션 발생 내역을 상세하게 확인합니다.',
        },
        {
          label: '정산 방식',
          detail: '자동 정산은 현재 준비 중입니다. 정산은 별도 안내에 따라 진행됩니다.',
        },
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
    description:
      '포럼과 자료실을 통해 운영 정보를 공유하고 활용하는 방법을 안내합니다. 공급자와 매장이 경험과 자료를 나누며 함께 운영 역량을 높입니다.',
    primaryAction: { label: '포럼으로 이동 →', to: '/forum' },
    flowBarTitle: '활용 흐름',
    flowLabels: ['포럼 탐색', '글 작성', '자료실', '공지'],
  },
  sections: [
    {
      step: '01',
      title: '포럼 탐색',
      routeLabel: '/forum',
      description:
        '카테고리별 글 목록에서 운영 정보와 노하우를 탐색합니다.',
      items: [
        {
          label: '포럼 진입',
          detail: '/forum에서 카테고리별 글 목록을 확인합니다.',
        },
        {
          label: '검색 · 태그',
          detail: '키워드나 태그로 관심 주제를 빠르게 찾습니다.',
        },
      ],
    },
    {
      step: '02',
      title: '글 작성 · 참여',
      routeLabel: '/forum/write',
      description:
        '운영 경험 · 질문 · 정보를 글로 작성하고 댓글로 참여합니다.',
      items: [
        {
          label: '글 작성',
          detail: '제목 · 내용 · 태그를 입력하여 운영 경험이나 질문을 공유합니다.',
        },
        {
          label: '댓글 참여',
          detail: '다른 사용자의 글에 답변이나 의견을 달아 커뮤니티에 기여합니다.',
        },
      ],
    },
    {
      step: '03',
      title: '자료실',
      routeLabel: '/resources',
      description:
        '공급자 운영 자료와 매장 활용 자료를 공유하고 다운로드합니다.',
      items: [
        {
          label: 'Neture 자료실',
          detail: '/resources에서 플랫폼 공식 자료 · 가이드 · 브로슈어를 확인합니다.',
        },
        {
          label: '공급자 자료 등록',
          detail: '/supplier/library에서 공급자가 직접 운영 자료를 등록하고 관리합니다.',
        },
        {
          label: '자료 활용',
          detail: '매장 담당자가 자료를 다운로드하여 고객 안내와 진열에 활용합니다.',
        },
      ],
    },
    {
      step: '04',
      title: '공지',
      routeLabel: '/notices',
      description:
        '플랫폼 정책 변경 · 주요 안내를 확인합니다.',
      items: [
        {
          label: '공지 목록',
          detail: '/notices에서 최신 공지와 정책 안내를 확인합니다.',
        },
        {
          label: '정책 변경 안내',
          detail: '플랫폼 운영 정책 변경 사항이 공지로 안내됩니다.',
        },
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
    description:
      '공급자 KPI · 운영 요약 · 추천 액션을 한 화면에서 확인하는 방법을 안내합니다. 대시보드는 현재 상태를 파악하고 다음 운영 방향을 결정하는 데 활용합니다.',
    primaryAction: { label: 'Copilot 대시보드로 이동 →', to: '/supplier/dashboard' },
    flowBarTitle: '활용 흐름',
    flowLabels: ['KPI 확인', '운영 요약', '상품 성과', '추천 액션 검토'],
  },
  sections: [
    {
      step: '01',
      title: 'KPI 확인',
      description:
        '공급자 활동의 핵심 지표를 한눈에 확인합니다.',
      items: [
        {
          label: '요청 처리 현황',
          detail: '승인 요청 · 처리 완료 · 반려 · 대기 건수를 확인합니다.',
        },
        {
          label: '상품 성과',
          detail: '내 상품의 매장 노출 수 · 이벤트 참여 · 확산 현황을 확인합니다.',
        },
      ],
    },
    {
      step: '02',
      title: '운영 요약',
      description:
        '현재 운영 상태를 요약하여 빠르게 파악합니다. 요약은 운영 데이터를 기반으로 생성됩니다.',
      items: [
        {
          label: '상태 요약',
          detail: '현재 활성 이벤트 · 진행 중인 Trial · 대기 중인 요청을 요약합니다.',
        },
        {
          label: '상품 분석',
          detail: '상품별 성과 흐름과 주요 변화를 확인합니다.',
        },
      ],
    },
    {
      step: '03',
      title: '추천 액션 검토',
      description:
        '대시보드가 현재 상태를 바탕으로 다음 운영 액션을 제안합니다. 제안은 참고용이며, 공급자가 직접 검토하고 결정합니다.',
      items: [
        {
          label: '추천 전략',
          detail: '다음에 집중할 운영 액션을 제안합니다 (예: 콘텐츠 보완, 이벤트 제안 등).',
        },
        {
          label: '검토 후 적용',
          detail: '제안된 액션은 공급자가 직접 검토하고 판단하여 적용합니다.',
        },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/o4o-overview (모든 사업자 공통 진입) ────────────────────────
// WO-O4O-NETURE-GUIDE-BUSINESS-ACTOR-IA-PHASE1-V1 (Phase 1)

export const netureGuideO4OOverviewProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '이용 안내',
    title: 'O4O 개요',
    description:
      'O4O는 매장 판매 환경을 만드는 서비스입니다. 좋은 제품이 매장에서 잘 설명되고, 고객이 이해하고, 실제로 판매되도록 — 공급자 · 운영자 · 판매자 · 파트너가 각자의 역할로 함께 만드는 구조입니다. 모든 사업자가 먼저 읽는 공통 입구입니다.',
    primaryAction: { label: 'O4O 플랫폼 자세히 보기 →', to: '/o4o' },
    flowBarTitle: '이해 흐름',
    flowLabels: ['대상 시장', '제품 특징', '해결 과제', '3자 구조', '운영 방식', '활용 사업자'],
  },
  index: {
    title: 'O4O 개요 한눈에 보기',
    lead: [
      'O4O는 좋은 제품이 매장에서 실제로 판매되도록 만드는 서비스입니다.',
      '공급자 · 운영자 · 판매자가 각자의 역할로 협력합니다.',
      '운영 방식은 승인 상품 · 이벤트 오퍼 · 판매자 모집 · 유통참여형 펀딩 · 매장 HUB · 내 매장으로 구성됩니다.',
    ],
    cards: [
      { title: 'O4O란 무엇인가', audience: '공통', summary: '매장 판매 환경을 만드는 서비스입니다.', to: '#what' },
      { title: '어떤 시장을 위한 것인가', audience: '공통', summary: '다품종 · 소량 · 정보 전달이 중요한 시장을 위한 구조입니다.', to: '#market' },
      { title: 'O4O 대상 제품의 특징', audience: '공통', summary: '유통비용 · 정보 전달 · 공급자의 필요라는 공통점이 있습니다.', to: '#product' },
      { title: 'O4O가 해결하려는 것', audience: '공통', summary: '유통비용을 낮추고 좋은 제품의 시장 진입을 돕습니다.', to: '#problem' },
      { title: '공급자 · 운영자 · 판매자', audience: '공통', summary: '세 주체와 파트너가 각자의 역할로 협력합니다.', to: '#roles' },
      { title: '누가 O4O를 운영할 수 있는가', audience: '공통', summary: '조직 형태가 아니라 가진 자산으로 판단 — 매장 · 공급망 · 전문성 · 고객군.', to: '#service-operator' },
      { title: 'O4O 주요 운영 방식', audience: '공통', summary: '승인 상품 · 이벤트 오퍼 · 판매자 모집 · 유통참여형 펀딩 · 매장 HUB · 내 매장.', to: '#operations' },
      { title: '누가 활용하나', audience: '공통', summary: '공급자 · 운영자 · 판매자 · 파트너가 활용합니다.', to: '#actors' },
    ],
  },
  sections: [
    {
      id: 'what',
      step: '01',
      title: 'O4O는 매장 판매 환경을 만드는 서비스입니다',
      description:
        'O4O는 온라인 판매몰을 만드는 서비스가 아닙니다. 제품이 실제 오프라인 매장에서 진열되고, 설명되고, 고객에게 전달되어 판매로 이어지도록 — 매장의 판매 환경 자체를 만드는 것이 목적입니다.',
      items: [
        { label: '매장 중심', detail: '판매가 일어나는 곳은 매장입니다. O4O는 매장이 더 잘 설명하고 판매하도록 돕습니다.' },
        { label: '온라인은 도구', detail: '온라인 콘텐츠 · QR · 사이니지는 매장 판매를 돕는 실행 도구이지 목적이 아닙니다.' },
        { label: '정보가 판매로', detail: '제품 정보와 건강 정보가 매장에서 전달될 때 고객이 이해하고 구매로 이어집니다.' },
      ],
    },
    {
      id: 'market',
      step: '02',
      title: 'O4O가 대상으로 하는 시장',
      description:
        'O4O는 대형 유통이 잘 다루지 못하는 시장을 위한 구조입니다. 종류가 많고, 한 번에 적게 팔리며, 유통비용이 크고, 제품과 건강에 대한 설명이 있어야 판매되는 제품군이 중심입니다. 이런 시장은 매장의 전문가 역할(설명·상담)이 판매를 좌우합니다.',
      items: [
        { label: '다품종', detail: '제품 종류가 많아 일률적인 대량 유통으로는 다루기 어렵습니다.' },
        { label: '소량 판매', detail: '한 매장에서 한 번에 많이 팔리지 않아 초기 진입이 어렵습니다.' },
        { label: '유통비용이 큼', detail: '소량 · 다품종일수록 매장에 닿기까지의 영업 · 물류 · 설명 비용이 상대적으로 큽니다.' },
        { label: '제품 정보 전달 중요', detail: '제품을 설명하지 않으면 고객이 가치를 이해하기 어렵습니다.' },
        { label: '건강 정보 전달 중요', detail: '건강기능식품 · 의약외품처럼 올바른 건강 정보 전달이 신뢰의 핵심인 제품이 많습니다.' },
        { label: '매장 전문가 역할 중요', detail: '매장의 설명 · 상담이 구매 결정을 좌우하므로, 매장이 전문가로 기능할 수 있어야 합니다.' },
      ],
    },
    {
      id: 'product',
      step: '03',
      title: 'O4O 대상 제품의 특징',
      description:
        'O4O가 다루는 제품은 공통된 어려움을 가지고 있습니다. 좋은 제품이어도 유통비용과 설명 부담 때문에 매장에 들어가기 어렵고, 그래서 공급자는 새로운 유통 방식을 검토할 충분한 이유가 있습니다.',
      items: [
        { label: '생산비보다 큰 유통비', detail: '제품 자체의 생산비보다 매장까지 닿는 유통 · 영업 · 설명 비용이 더 큰 경우가 많습니다.' },
        { label: '정보 전달이 판매를 좌우', detail: '제품 정보 전달이 제대로 되어야 판매로 이어집니다. 설명 없이는 가치가 전달되지 않습니다.' },
        { label: '건강 정보 전달 중요', detail: '건강과 직결된 제품은 올바른 건강 정보 전달이 신뢰와 구매의 핵심입니다.' },
        { label: '공급자의 새 유통 니드', detail: '기존 유통으로는 비용 · 진입이 어려워, 공급자는 새로운 유통 방식을 검토할 충분한 니드가 있습니다.' },
      ],
    },
    {
      id: 'problem',
      step: '04',
      title: 'O4O가 해결하려는 것',
      description:
        'O4O는 좋은 제품이 비용과 설명의 벽에 막혀 시장에 들어가지 못하는 문제를 풉니다. 매장이 부담 없이 좋은 제품을 다루고, 고객이 정보를 통해 이해하도록 돕습니다.',
      items: [
        { label: '유통비용 감소', detail: '운영 구조 · 콘텐츠 · 매장 자산을 공동으로 공유해, 공급자와 매장 양쪽의 진입 비용을 낮춥니다.' },
        { label: '좋은 제품의 시장 진입', detail: '초기 매장 랜딩과 운영자 승인을 통해, 알려지지 않은 좋은 제품도 실제 매장에 들어갈 길을 만듭니다.' },
        { label: '판매자의 관심 유도', detail: '좋은 제품 · 매장 활용 자산(POP · QR · 콘텐츠 등) · 이벤트 오퍼라는 세 가지로, 매장 경영자가 부담 없이 다뤄볼 동기를 만듭니다.' },
        { label: '제품 · 건강 정보 전달', detail: '매장에서 고객에게 올바른 제품 정보와 건강 정보가 전달되어, 설명 기반의 판매가 이뤄지도록 합니다.' },
      ],
    },
    {
      id: 'roles',
      step: '05',
      title: '공급자 · 운영자 · 판매자',
      description:
        'O4O는 세 주체가 각자의 역할을 맡고, 파트너가 이를 돕는 구조입니다. 한 주체가 모든 것을 통제하지 않고 역할을 나눠 협력합니다.',
      items: [
        { label: '공급자', detail: '제품 · 브랜드 · 마케팅 원천 자료를 제공하는 사업자입니다. 제품이 매장에서 움직이도록 자료와 조건을 만듭니다.' },
        { label: '운영자', detail: '매장 네트워크를 구성 · 운영하는 사업자입니다. 자료를 받아 매장 실행 자산으로 구성하고 매장을 지원합니다.' },
        { label: '판매자(매장)', detail: '실제 고객을 만나는 매장입니다. 무엇을 노출하고 어떻게 활용할지 매장이 결정합니다.' },
        { label: '파트너', detail: '제휴 · 마케팅 · 레퍼럴 등으로 공급자 · 운영자 · 매장의 실행을 돕는 협력 주체입니다.' },
      ],
    },
    {
      id: 'service-operator',
      step: '06',
      title: '누가 O4O를 활용하여 서비스를 운영할 수 있는가',
      description:
        'O4O는 협동조합 같은 특정 조직 형태를 요구하지 않습니다. 중요한 것은 "지금 어떤 자산을 가지고 있는가"입니다. 아래 중 하나라도 해당된다면, 당신은 O4O를 활용해 서비스를 운영하는 운영자가 될 수 있습니다. (사업자 유형별 상세 안내는 O4O 플랫폼 소개에서 확인하세요.)',
      items: [
        { label: '이미 참여 매장을 가지고 있는가', detail: '협동조합 준비 그룹 · 지역 약국 모임 · 전문약사 그룹 · 관광객 대상 약국 네트워크 · 화장품 전문매장 네트워크 · 창고형 약국 협의체 등. 이미 여러 매장과 관계가 있다면 이벤트 오퍼 · 운영자 승인 상품 · 콘텐츠 운영 · 매장 HUB를 운영할 수 있습니다.' },
        { label: '이미 공급망을 가지고 있는가', detail: '도매상 · 제조사 · 수입사 · 총판 · 브랜드사 등. 이미 제품과 거래 매장을 보유하고 있다면 판매자 모집 · 이벤트 오퍼 · 콘텐츠 제공 · 운영자 서비스를 운영할 수 있습니다.' },
        { label: '특정 분야의 전문성을 가지고 있는가', detail: '당뇨 · 영양 · 여성건강 · 스포츠 영양 · 피부관리 등. 전문성을 중심으로 전문 네트워크를 운영할 수 있습니다.' },
        { label: '특정 고객군을 가지고 있는가', detail: '관광객 · 시니어 · 특정 질환군 · 특정 라이프스타일 그룹 등. 특정 고객군에 특화된 서비스를 운영할 수 있습니다.' },
        { label: '핵심은 조직 형태가 아니라 자산', detail: 'O4O는 특정 조직 형태를 위한 서비스가 아닙니다. 중요한 것은 어떤 자산을 가지고 있으며, 참여 매장에게 어떤 가치를 제공할 수 있는가입니다.' },
      ],
    },
    {
      id: 'operations',
      step: '07',
      title: 'O4O 주요 운영 방식',
      description:
        'O4O는 제품이 매장에 도달하는 여러 운영 방식을 제공합니다. 각 방식은 제품 단계와 매장 상황에 따라 선택해 활용합니다.',
      items: [
        { label: '운영자 승인 상품', detail: '운영자가 검토 · 승인한 상품을 매장이 안심하고 다룰 수 있도록 합니다.' },
        { label: '이벤트 오퍼', detail: '특정 참여 그룹의 매장에 한정해 제공하는 특별 공급 조건입니다.' },
        { label: '판매자 모집', detail: '제품을 다룰 매장을 모집해 초기 유통 기반을 만듭니다.' },
        { label: '유통참여형 펀딩', detail: '매장의 소액 참여를 받아 제품으로 정산하고 초기 매장 랜딩을 확보합니다.' },
        { label: '매장 HUB', detail: '매장이 운영자가 구성한 자료 · 상품 · 콘텐츠를 받아보는 공간입니다.' },
        { label: '내 매장', detail: '매장이 받은 자료를 자기 매장에 맞게 활용 · 운영하는 공간입니다.' },
      ],
    },
    {
      id: 'actors',
      step: '08',
      title: '누가 O4O를 활용하나',
      description:
        '아래 네 주체가 O4O를 활용합니다. 자신의 입장에 맞는 가이드로 이동해 구체적인 활용 방법을 확인할 수 있습니다.',
      items: [
        { label: '공급자', detail: '제품 · 콘텐츠를 매장에 유통하려는 사업자 — 상품 등록 · 이벤트 오퍼 · 유통참여형 펀딩 활용.' },
        { label: '운영자', detail: '매장 네트워크를 구성 · 운영하려는 사업자(협동조합 · 세미 프랜차이즈 · 전문 네트워크) — 운영자 가이드 참고.' },
        { label: '판매자(매장)', detail: '내 매장에서 상품 · 콘텐츠를 활용하려는 매장 경영자 — 매장 HUB · 내 매장 활용.' },
        { label: '파트너', detail: '제휴 · 마케팅 · 레퍼럴로 협력하려는 주체 — 파트너 가이드 참고.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 이용 안내', to: '/guide' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/for-operator (매장 네트워크 운영자 가이드) ──────────────────
// WO-O4O-NETURE-GUIDE-BUSINESS-ACTOR-IA-PHASE1-V1 (Phase 2)

export const netureGuideForOperatorProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '이용 안내',
    title: '매장 네트워크 운영자 가이드',
    description:
      '운영자는 매장 네트워크를 구성하고 운영하는 사업자입니다. 협동조합 · 협동조합 준비 그룹 · 세미 프랜차이즈 · 전문 네트워크 운영자가 여기에 해당합니다. 이 문서는 설득이나 제안서가 아니라, 운영자가 실제로 무엇을 어떻게 하는지 설명하는 운영 매뉴얼입니다.',
    primaryAction: { label: '운영 참여 검토 신청 →', to: '/o4o/apply' },
    flowBarTitle: '운영 흐름',
    flowLabels: ['자료 수신', '구성 · 제작', '승인 상품', '매장 모집', '이벤트 · 펀딩', '정산 · 지원'],
  },
  index: {
    title: '운영자 가이드 한눈에 보기',
    lead: [
      '운영자는 공급자 자료를 받아 매장 실행 자산으로 구성하고 매장을 지원합니다.',
      '운영자 승인 상품 · 이벤트 오퍼 · 판매자 모집 · 유통참여형 펀딩으로 매장에 제품을 연결합니다.',
      '협동조합 · 세미 프랜차이즈 · 전문 네트워크 형태로 운영을 적용할 수 있습니다.',
    ],
    cards: [
      { title: '운영자는 무엇을 하는가', audience: '공통', summary: '자료 수신 · 구성 · 매장 지원 · 운영 수익을 담당합니다.', to: '#role' },
      { title: 'O4O에서 운영자의 역할', audience: '공통', summary: '공급자와 매장 사이에서 실행 자산을 만들고 연결합니다.', to: '#o4o-role' },
      { title: '공급자와의 관계', audience: '공통', summary: '원천 자료를 받아 매장 실행 자산으로 구성합니다.', to: '#supplier' },
      { title: '공급자와 운영자의 협력', audience: '공통', summary: '공급자가 제공하는 제품 · 설명서 · 이미지 · POP · QR · 영상 · 교육 자료를 매장에 연결합니다.', to: '#supplier-collab' },
      { title: '참여 매장과의 관계', audience: '공통', summary: '매장을 모집하고 자료 · 상품 · 지원을 제공합니다.', to: '#store' },
      { title: '매장 HUB 운영', audience: '공통', summary: '매장이 받아보는 자료 · 상품 · 콘텐츠 공간을 운영합니다.', to: '#hub' },
      { title: '운영자 승인 상품', audience: '공통', summary: '검토 · 승인한 상품을 매장이 안심하고 다루게 합니다.', to: '#approved' },
      { title: '이벤트 오퍼', audience: '중요', summary: '특정 참여 그룹을 위한 특별 공급 조건 — 유통질서 주의.', to: '#event' },
      { title: '콘텐츠 운영', audience: '공통', summary: '공급자 자료 활용 + 직접 · 조합원 · 외부 전문가 제작.', to: '#content' },
      { title: '콘텐츠 운영의 현실', audience: '공통', summary: '좋은 콘텐츠는 공급자가 보유한 경우가 많고, 운영자는 이를 확보 · 정리해 제공합니다.', to: '#content-reality' },
      { title: '판매자 모집', audience: '공통', summary: '제품을 다룰 매장을 모집해 운영 기반을 만듭니다.', to: '#recruit' },
      { title: '주문 · 배송 · 정산', audience: '공통', summary: '주문에서 정산까지의 흐름과 운영자 역할입니다.', to: '#settlement' },
      { title: '서비스 운영 사업자 형태 예시', audience: '공통', summary: '판매자 기반 · 공급자 기반 운영자 형태 예시.', to: '#examples' },
      { title: '약국 네트워크 운영 안내 →', audience: '약국', summary: '여러 약국이 함께 운영을 준비한다면 — 업종별 사업 운영 안내서로 이동.', to: '/guide/business/pharmacy-network' },
      { title: '공급자 네트워크 운영 안내 →', audience: '공급자', summary: '도매 · 제조 · 수입사가 매장을 지원하는 서비스를 운영한다면 — 공급자 기반 운영 안내서로 이동.', to: '/guide/business/supplier-network' },
      { title: '콘텐츠 네트워크 운영 안내 →', audience: '공통', summary: '콘텐츠를 중심으로 공급자 · 운영자 · 매장이 연결되는 운영 구조 — 콘텐츠 운영 안내서로 이동.', to: '/guide/business/content-network' },
      { title: '이벤트 오퍼 운영 안내 →', audience: '공통', summary: '이벤트 오퍼를 왜 운영 · 참여하는가 — 유통질서 · 특별 공급 조건 안내서로 이동.', to: '/guide/business/event-offer' },
      { title: '운영자 승인 상품 운영 안내 →', audience: '공통', summary: '새 제품을 운영자가 검토해 참여 매장이 도입하는 구조 — 승인 상품 안내서로 이동.', to: '/guide/business/approved-product' },
      { title: '판매자 모집 운영 안내 →', audience: '공통', summary: '세 주체가 함께 판매 네트워크를 형성하는 이유 · 구조 — 판매자 모집 안내서로 이동.', to: '/guide/business/seller-recruitment' },
      { title: '유통참여형 펀딩 운영 안내 →', audience: '공통', summary: '출시 전 · 초기 제품의 시장 검증 · 초기 유통망 형성 — 유통참여형 펀딩 안내서로 이동.', to: '/guide/business/market-trial' },
    ],
  },
  sections: [
    {
      id: 'role',
      step: '01',
      title: '운영자는 무엇을 하는가',
      description:
        '운영자는 단순히 자료를 정리해 전달하는 역할이 아닙니다. 참여 매장이 판매에 실제로 활용할 수 있는 환경 — 상품 · 자료 · 콘텐츠 · 매장 자산 — 을 구성하고, 매장을 모집 · 지원하며, 그 운영으로 수익 모델을 만드는 능동적인 사업 주체입니다.',
      items: [
        { label: '판매 환경 구성', detail: '참여 매장이 바로 판매에 활용할 수 있는 상품 · 자료 · 콘텐츠 · 매장 자산 환경을 구성합니다.' },
        { label: '자료 수신', detail: '공급자가 보낸 제품 · 브랜드 · 마케팅 원천 자료를 받습니다.' },
        { label: '구성 · 제작', detail: '받은 자료를 매장 실행 자산(상세 · POP · QR · 콘텐츠 등)으로 구성합니다.' },
        { label: '큐레이션', detail: '어떤 상품 · 자료를 어떤 매장에 보낼지 선별하고 묶습니다.' },
        { label: '매장 지원', detail: '매장 모집 · 안내 · 실행 지원으로 매장이 잘 판매하도록 돕습니다.' },
        { label: '운영 수익', detail: '운영 구조 위에서 자신의 수익 모델을 설계합니다.' },
      ],
    },
    {
      id: 'o4o-role',
      step: '02',
      title: 'O4O에서 운영자의 역할',
      description:
        '운영자는 공급자와 매장 사이에 위치합니다. 공급자의 원천 자료를 매장이 실제로 쓸 수 있는 형태로 바꾸고, 매장이 부담 없이 좋은 제품을 다루도록 연결하는 것이 핵심 역할입니다.',
      items: [
        { label: '연결자', detail: '공급자의 제품 · 자료와 매장의 판매 현장을 잇습니다.' },
        { label: '실행 자산 제작', detail: '원천 자료를 매장이 그대로 쓸 수 있는 실행 자산으로 만듭니다.' },
        { label: '품질 관문', detail: '매장에 나갈 상품 · 자료를 검토 · 승인해 신뢰를 보장합니다.' },
        { label: '매장 결정 존중', detail: '무엇을 노출 · 활용할지 최종 선택은 매장에 있습니다. 운영자는 지원자입니다.' },
      ],
    },
    {
      id: 'supplier',
      step: '03',
      title: '공급자와의 관계',
      description:
        '운영자는 공급자로부터 원천 자료를 받습니다. 원천 자료는 그대로 매장에 나가는 것이 아니라, 운영자가 매장 실행 자산으로 구성해야 비로소 매장에서 쓸 수 있게 됩니다.',
      items: [
        { label: '원천 자료 수신', detail: '제품 정보 · 이미지 · 설명 · 인증자료 등 공급자의 원천 자료를 받습니다.' },
        { label: '실행 자산으로 변환', detail: '원천 자료를 매장 상세 · POP · QR · 콘텐츠 등 실행 자산으로 가공합니다.' },
        { label: '조건 협의', detail: '공급 조건 · 가격 · 유통 범위를 공급자와 협의해 확정합니다.' },
        { label: '유통질서 존중', detail: '공급자가 정한 가격 · 유통 정책을 임의로 훼손하지 않습니다.' },
      ],
    },
    {
      id: 'supplier-collab',
      step: '04',
      title: '공급자와 운영자의 협력',
      description:
        '공급자는 제품만이 아니라 판매에 필요한 다양한 자료를 함께 제공할 수 있습니다. 운영자는 이를 확보 · 정리하여 참여 매장이 활용할 수 있는 형태로 전달합니다. 공급자가 가진 자산을 운영자가 매장 현장으로 연결하는 협력 관계입니다.',
      items: [
        { label: '공급자가 제공할 수 있는 것', detail: '제품 · 제품 설명서 · 제품 이미지 · POP · QR 자료 · 블로그 자료 · 영상 자료 · 교육 자료 등을 제공할 수 있습니다.' },
        { label: '운영자의 역할', detail: '공급자가 제공한 자료를 확보하고 정리해, 참여 매장이 바로 쓸 수 있는 형태로 매장 HUB에 전달합니다.' },
        { label: '부족한 부분 보완', detail: '공급자 자료가 부족하면 운영자가 직접 제작하거나 외부 전문가 · 조합원 참여로 보완합니다.' },
        { label: '협력의 방향', detail: '공급자의 자산과 운영자의 구성 역량을 합쳐, 매장이 적은 부담으로 좋은 판매 환경을 갖추도록 만듭니다.' },
      ],
    },
    {
      id: 'store',
      step: '05',
      title: '참여 매장과의 관계',
      description:
        '운영자는 매장을 모집하고, 매장이 바로 쓸 수 있는 자료 · 상품 · 지원을 제공합니다. 매장에 무엇을 강제하지 않고, 매장이 선택해 활용하도록 돕는 관계입니다.',
      items: [
        { label: '매장 모집', detail: '네트워크에 참여할 매장을 모집하고 참여 조건을 안내합니다.' },
        { label: '자료 · 상품 제공', detail: '매장 HUB를 통해 승인 상품과 실행 자료를 전달합니다.' },
        { label: '실행 지원', detail: '매장의 활용 질문 · 운영 이슈를 지원합니다.' },
        { label: '매장 자율', detail: '노출 · 활용 여부는 매장이 결정하며 운영자는 이를 존중합니다.' },
      ],
    },
    {
      id: 'hub',
      step: '06',
      title: '매장 HUB 운영',
      description:
        '매장 HUB는 매장이 운영자가 구성한 자료 · 상품 · 콘텐츠를 받아보는 공간입니다. 운영자는 HUB에 무엇을 올리고 어떻게 묶을지 구성하고, 매장은 HUB에서 필요한 것을 가져가 자기 매장에 적용합니다.',
      items: [
        { label: 'HUB 구성', detail: '매장에 제공할 상품 · 자료 · 콘텐츠를 HUB에 게시하고 분류합니다.' },
        { label: '대상 지정', detail: '어떤 자료를 어떤 매장 · 그룹에 노출할지 정합니다.' },
        { label: '매장 활용', detail: '매장은 HUB에서 받은 자료를 내 매장에 맞게 활용합니다.' },
        { label: '갱신', detail: '제품 · 정책 변경 시 HUB 자료를 갱신해 최신 상태를 유지합니다.' },
      ],
    },
    {
      id: 'approved',
      step: '07',
      title: '운영자 승인 상품',
      description:
        '운영자 승인 상품은 운영자가 검토하고 승인한 상품입니다. 매장은 운영자가 승인했다는 신뢰를 바탕으로 안심하고 상품을 다룰 수 있습니다.',
      items: [
        { label: '검토', detail: '제품 정보 · 자료 · 조건 · 표시광고 위험을 검토합니다.' },
        { label: '승인', detail: '검토를 통과한 상품을 매장에 노출 가능한 상태로 승인합니다.' },
        { label: '신뢰 보장', detail: '매장은 운영자 승인을 신뢰의 근거로 삼아 상품을 다룹니다.' },
        { label: '관리', detail: '문제 발생 시 노출을 조정하거나 승인을 회수합니다.' },
      ],
    },
    {
      id: 'event',
      step: '08',
      title: '이벤트 오퍼',
      description:
        '이벤트 오퍼는 특정 참여 그룹의 매장에 한정해 제공하는 특별 공급 조건입니다. 운영자가 반드시 짚고 넘어가야 할, 흔한 오해와 그 의미가 있습니다.',
      items: [
        { label: '협동조합 준비 그룹의 흔한 오해', detail: '협동조합 준비 그룹은 흔히 "많이 모이면 더 저렴하게 구매할 수 있다"고 생각하는 경우가 있습니다. 그러나 실제로는 그렇게 단순하지 않습니다.' },
        { label: '공급자는 유통질서에 매우 민감', detail: 'O4O 대상 제품 공급자는 기존 거래선 · 가격 정책 보호 등 유통질서에 매우 민감합니다. 무리한 가격 인하는 받아들이기 어렵습니다.' },
        { label: '대량구매 할인이 아니라 특별 공급 조건', detail: '이벤트 오퍼는 "많이 모으면 싸지는" 대량구매 할인 구조라기보다, 특정 운영자 또는 특정 참여 매장에게 제공되는 특별 공급 조건으로 이해하는 것이 적절합니다.' },
        { label: '판매자의 니드', detail: '판매자는 현재 판매 중인 제품을 좋은 조건으로 구매하고 싶은 니드가 있습니다.' },
        { label: '공급자의 선택', detail: '공급자는 모두가 아니라 특정 그룹에게 특별 공급 조건을 제공할 수 있습니다.' },
        { label: '운영자의 역할', detail: '운영자는 참여 그룹을 명확히 하고, 공급자의 유통질서를 해치지 않는 선에서 조건을 조율해 참여 매장을 지원합니다.' },
      ],
    },
    {
      id: 'content',
      step: '09',
      title: '콘텐츠 운영',
      description:
        '운영자는 매장에 제공할 콘텐츠를 운영합니다. 공급자 자료를 활용하는 것은 물론, 운영자가 직접 제작하거나 조합원이 참여해 만들거나 외부 전문가를 활용하는 등 여러 방식으로 콘텐츠를 확보할 수 있습니다.',
      items: [
        { label: '공급자 자료 활용', detail: '공급자가 제공한 원천 자료를 매장 콘텐츠로 가공해 활용합니다.' },
        { label: '운영자 직접 제작', detail: '운영자가 자체적으로 매장용 콘텐츠 · 안내문 · 캠페인을 제작합니다.' },
        { label: '조합원 참여 제작', detail: '협동조합 · 네트워크 구성원이 함께 콘텐츠를 만들고 공유할 수 있습니다.' },
        { label: '외부 전문가 활용', detail: '필요한 콘텐츠는 외부 전문가 · 작가 · 제작자를 활용해 확보할 수도 있습니다.' },
        { label: '매장 활용 자산 운영', detail: 'POP · QR · 블로그 · 디지털사이니지 등 매장 활용 자산을 구성 · 배포합니다.' },
      ],
    },
    {
      id: 'content-reality',
      step: '10',
      title: '콘텐츠 운영의 현실',
      description:
        '좋은 콘텐츠는 운영자가 직접 만드는 경우도 있지만, 현실적으로는 공급자가 이미 보유하고 있는 경우가 많습니다. 공급자는 마케팅 비용을 들여 자료를 제작하기 때문입니다. 운영자의 핵심 역량은 "직접 다 만드는 것"이 아니라 "좋은 자료를 확보하고 정리해 매장에 전달하는 것"입니다.',
      items: [
        { label: '공급자가 보유한 경우가 많음', detail: '제품을 가장 잘 아는 공급자가 설명 · 이미지 · 영상 등 좋은 콘텐츠를 이미 보유한 경우가 많습니다.' },
        { label: '공급자의 마케팅 투자', detail: '공급자는 마케팅 비용을 사용해 제품 자료 · 콘텐츠를 제작하는 경우가 많습니다.' },
        { label: '운영자는 확보 · 정리', detail: '운영자는 이런 자료를 확보하고 매장이 바로 쓸 수 있게 정리해 제공합니다.' },
        { label: '직접 제작은 보완', detail: '운영자의 직접 제작 · 조합원 참여 · 외부 전문가는 부족한 부분을 보완하는 수단입니다.' },
      ],
    },
    {
      id: 'recruit',
      step: '11',
      title: '판매자 모집',
      description:
        '운영자는 제품을 다룰 매장(판매자)을 모집해 운영 기반을 만듭니다. 모집은 단순 가입이 아니라, 매장이 실제로 제품을 활용하도록 연결하는 과정입니다.',
      items: [
        { label: '대상 정의', detail: '어떤 업종 · 지역 · 성격의 매장을 모집할지 정합니다.' },
        { label: '참여 안내', detail: '참여 조건 · 제공 자료 · 기대 효과를 매장에 안내합니다.' },
        { label: '온보딩', detail: '참여 매장이 매장 HUB · 승인 상품 · 자료를 활용하도록 돕습니다.' },
        { label: '관계 유지', detail: '지속적인 자료 제공 · 지원으로 매장과의 관계를 유지합니다.' },
      ],
    },
    {
      id: 'settlement',
      step: '12',
      title: '주문 · 배송 · 정산 흐름',
      description:
        '매장이 상품을 주문하면 공급자 · 운영자 · 매장 사이에서 주문 · 배송 · 정산이 이루어집니다. 운영자는 이 흐름이 원활하게 진행되도록 조율하고 매장을 지원합니다.',
      items: [
        { label: '주문', detail: '매장이 승인 상품을 주문하면 주문 정보가 공급자 · 운영자에게 전달됩니다.' },
        { label: '배송', detail: '공급자가 제품을 공급 · 배송하며, 무재고 모델에서는 매장 재고 부담이 줄어듭니다.' },
        { label: '정산', detail: '판매 · 공급 조건에 따라 공급자 · 운영자 · 매장 간 정산이 이루어집니다.' },
        { label: '운영자 역할', detail: '운영자는 흐름을 모니터링하고 문제 발생 시 조율 · 지원합니다.' },
      ],
    },
    {
      id: 'examples',
      step: '13',
      title: '서비스 운영 사업자 형태 예시',
      description:
        '운영자(서비스 운영 사업자)는 한 가지 출신이 아닙니다. 이미 매장을 가진 쪽(판매자 기반)에서 출발할 수도, 이미 공급망을 가진 쪽(공급자 기반)에서 출발할 수도 있습니다. 아래는 가능한 형태의 예시일 뿐, 특정 조직이나 성공사례가 아닙니다.',
      items: [
        { label: '판매자 기반 서비스 운영 사업자', detail: '협동조합 · 관광객 대상 약국 네트워크 · 창고형 약국 네트워크 · 화장품 전문매장 네트워크 · 전문약사 네트워크 · 지역 약국 네트워크 등. 매장들이 뭉쳐 운영자가 되는 형태입니다.' },
        { label: '공급자 기반 서비스 운영 사업자', detail: '도매상 · 제조사 · 수입사 · 총판 · 브랜드사 등. 이미 가진 제품과 거래선 · 네트워크를 기반으로 운영자가 되는 형태입니다.' },
        { label: '결합 방식은 다양', detail: '세미 프랜차이즈처럼 느슨한 결합부터 협동조합 같은 공동 운영까지, 결합 방식은 자유롭게 선택할 수 있습니다.' },
        { label: '공통 원칙', detail: '어떤 형태든 매장 자율 존중 · 공급자 유통질서 존중 · 좋은 콘텐츠 확보 중심이라는 점은 동일합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← O4O 개요', to: '/guide/o4o-overview' },
    home: { label: '이용 안내로', to: '/guide' },
  },
};

// ─── /guide/for-seller (내 매장 활용 가이드) ───────────────────────────
// WO-O4O-NETURE-GUIDE-BUSINESS-ACTOR-PHASE2-V1

export const netureGuideForSellerProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '이용 안내',
    title: '내 매장 활용 가이드',
    description:
      '운영자와 공급자가 제공한 상품 · 자료 · 오퍼를 내 매장에 어떻게 적용하고 활용하는지 안내합니다. 어려운 준비 없이 매장 HUB에서 필요한 자료를 골라 POP · QR · 콘텐츠 · 디지털사이니지로 매장에 적용하고, 이벤트 오퍼와 승인 상품을 활용하는 흐름을 설명하는 매장 경영자용 사용 매뉴얼입니다.',
    primaryAction: { label: '내 매장으로 이동 →', to: '/store/my-products' },
    flowBarTitle: '활용 흐름',
    flowLabels: ['자료 확인', '승인 상품', '이벤트 오퍼', '매장 적용', '주문 · 정산', '시작하기'],
  },
  index: {
    title: '내 매장 활용 한눈에 보기',
    lead: [
      '매장이 직접 콘텐츠를 만들지 않아도 운영자 · 공급자가 제공한 자료를 골라 쓰면 됩니다.',
      'POP · QR · 블로그 · 영상 · 디지털사이니지 자료를 내 매장에 맞게 적용합니다.',
      '이벤트 오퍼와 운영자 승인 상품을 확인하고 참여 여부를 매장이 직접 판단합니다.',
    ],
    cards: [
      { title: '내 매장은 무엇을 하는 공간인가', audience: '매장', summary: '제공받은 제품 · 자료 · 오퍼를 확인하고 골라 매장에 적용하는 공간입니다.', to: '#what-store' },
      { title: '매장 HUB에서 자료 확인하기', audience: '매장', summary: '제품 · 승인 상품 · 오퍼 · POP · QR · 콘텐츠 · 공지를 한곳에서 확인합니다.', to: '#hub' },
      { title: '운영자 승인 상품 확인하기', audience: '매장', summary: '운영자가 검토한 상품을 설명자료와 함께 보고 도입 여부를 판단합니다.', to: '#approved' },
      { title: '이벤트 오퍼 참여하기', audience: '중요', summary: '최저가 공동구매가 아니라 특정 참여 매장을 위한 특별 공급 조건입니다.', to: '#event' },
      { title: '매장 활용 자산 사용하기', audience: '매장', summary: '이미지 · 설명서 · POP · QR · 블로그 · 영상 · 사이니지 · 상담자료를 활용합니다.', to: '#assets' },
      { title: 'POP 활용', audience: '매장', summary: '매장 안에서 제품을 안내하고 소비자 관심과 상담으로 연결합니다.', to: '#pop' },
      { title: 'QR 활용', audience: '매장', summary: '제품 · 건강 정보를 소비자에게 연결하는 안내 통로로 씁니다.', to: '#qr' },
      { title: '블로그 · 콘텐츠 활용', audience: '매장', summary: '직접 만들지 않아도 제공받은 콘텐츠로 소비자 설명과 신뢰를 만듭니다.', to: '#blog' },
      { title: '디지털사이니지 활용', audience: '매장', summary: '매장 TV · 디스플레이에 제품 · 건강 정보를 매장 자율로 노출합니다.', to: '#signage' },
      { title: '주문 · 배송 · 정산 흐름', audience: '매장', summary: '확인 → 주문/참여 → 공급자 배송 → 문의까지의 흐름을 안내합니다.', to: '#settlement' },
      { title: '매장에서 실제로 시작하는 방법', audience: '매장', summary: '네트워크 참여 → 내 매장 접속 → HUB 확인 → 자료 적용 → 오퍼/상품 참여.', to: '#start' },
    ],
  },
  sections: [
    {
      id: 'what-store',
      step: '01',
      title: '내 매장은 무엇을 하는 공간인가',
      description:
        '내 매장은 새로운 일을 만들어야 하는 공간이 아닙니다. 운영자와 공급자가 이미 준비해 둔 제품 · 자료 · 오퍼를 확인하고, 우리 매장에 필요한 것을 골라 적용하는 공간입니다.',
      items: [
        { label: '제공받은 것 확인', detail: '운영자 또는 공급자가 제공한 제품 · 자료 · 이벤트 오퍼를 확인합니다.' },
        { label: '필요한 자료 선택', detail: '매장에 필요한 상품과 자료를 골라 가져옵니다. 전부 쓸 필요는 없습니다.' },
        { label: '매장 판매 환경 구성', detail: '고른 자료를 POP · QR · 콘텐츠 · 사이니지로 매장에 적용합니다.' },
        { label: '선택은 매장의 몫', detail: '무엇을 노출하고 활용할지는 매장이 결정합니다. 강제되는 것은 없습니다.' },
      ],
    },
    {
      id: 'hub',
      step: '02',
      title: '매장 HUB에서 자료 확인하기',
      description:
        '매장 HUB는 운영자가 매장에 제공한 자료가 모이는 공간입니다. 여기서 우리 매장에 필요한 제품과 자료를 확인하고 가져갑니다.',
      items: [
        { label: '운영자가 제공한 제품', detail: '운영자가 매장에 공급하는 제품 목록을 확인합니다.' },
        { label: '운영자 승인 상품', detail: '운영자가 검토 · 승인한 상품을 안심하고 확인합니다.' },
        { label: '이벤트 오퍼', detail: '참여 매장에게 제공되는 특별 공급 조건을 확인합니다.' },
        { label: 'POP · QR 자료', detail: '매장에 붙이거나 비치할 수 있는 POP · QR 자료를 받습니다.' },
        { label: '블로그 · 영상 · 사이니지 자료', detail: '소비자 설명에 쓸 콘텐츠와 매장 화면용 자료를 받습니다.' },
        { label: '상담 자료 · 공지', detail: '상담에 쓸 설명자료와 운영자 공지 · 정책 변경 안내를 확인합니다.' },
      ],
    },
    {
      id: 'approved',
      step: '03',
      title: '운영자 승인 상품 확인하기',
      description:
        '운영자 승인 상품은 운영자가 미리 검토한 상품입니다. 매장은 운영자의 검토를 신뢰의 근거로 삼아, 우리 매장에 들일지 판단하면 됩니다.',
      items: [
        { label: '검토된 상품 확인', detail: '운영자가 검토 · 승인한 상품을 매장 HUB에서 확인합니다.' },
        { label: '설명자료와 함께 검토', detail: '제품 설명자료 · 가격 · 조건을 함께 보고 매장 적합성을 판단합니다.' },
        { label: '도입 여부 판단', detail: '우리 매장 고객에게 맞는지 보고 도입 여부를 매장이 결정합니다.' },
        { label: '주문 또는 활용', detail: '도입하기로 하면 주문하거나 관련 자료를 매장에 활용합니다.' },
      ],
    },
    {
      id: 'event',
      step: '04',
      title: '이벤트 오퍼 참여하기',
      description:
        '이벤트 오퍼는 단순한 최저가 공동구매가 아닙니다. 매장이 꼭 이해해야 할 점이 있습니다 — 많이 모인다고 무조건 싸지는 구조가 아니며, 특정 참여 매장에게 제공되는 특별 공급 조건입니다.',
      items: [
        { label: '최저가 공동구매가 아님', detail: '단순히 가장 싼 가격을 모으는 공동구매와는 성격이 다릅니다.' },
        { label: '많이 모인다고 무조건 싸지지 않음', detail: '참여가 많다고 가격이 무한정 내려가지 않습니다. 조건은 공급자와의 합의로 정해집니다.' },
        { label: '공급자는 유통질서에 민감', detail: '공급자는 기존 거래선 · 가격 정책 보호에 민감하므로 조건에는 한계가 있습니다.' },
        { label: '특정 참여 매장을 위한 특별 조건', detail: '이벤트 오퍼는 특정 운영자 · 특정 참여 매장에게만 제공되는 한정 공급 조건입니다.' },
        { label: '참여 여부는 매장이 판단', detail: '매장은 제시된 조건 · 기간 · 수량을 확인하고 참여 여부를 직접 결정합니다.' },
      ],
    },
    {
      id: 'assets',
      step: '05',
      title: '매장 활용 자산 사용하기',
      description:
        '매장은 제공받은 다양한 자료를 그대로 또는 매장에 맞게 활용할 수 있습니다. 아래 자료는 모두 매장에서 쓸 수 있으며, 필요한 것을 골라 쓰면 됩니다.',
      items: [
        { label: '제품 이미지', detail: '매장 안내 · 온라인 · 인쇄물에 쓸 수 있는 제품 이미지입니다.' },
        { label: '제품 설명서', detail: '제품 특징과 사용법을 담은 설명자료입니다.' },
        { label: 'POP', detail: '매장 내부에 비치 · 부착하는 제품 안내물입니다.' },
        { label: 'QR', detail: '제품 · 건강 정보로 연결되는 QR 코드 자료입니다.' },
        { label: '블로그', detail: '소비자 설명에 활용하는 블로그 · 글 콘텐츠입니다.' },
        { label: '영상', detail: '제품 소개 · 사용법 등을 담은 영상 자료입니다.' },
        { label: '디지털사이니지', detail: '매장 화면에 띄우는 디지털 안내 자료입니다.' },
        { label: '교육 자료', detail: '직원 · 고객 교육에 쓰는 자료입니다.' },
        { label: '상담 자료', detail: '고객 상담 시 활용하는 설명자료입니다.' },
        { label: '홍보 자료', detail: '매장 홍보 · 이벤트 안내에 쓰는 자료입니다.' },
        { label: '기타 활용 자료', detail: '그 밖에 매장에서 활용 가능한 자료를 함께 제공받습니다.' },
      ],
    },
    {
      id: 'pop',
      step: '06',
      title: 'POP 활용',
      description:
        'POP는 매장 안에서 제품을 알리고 소비자의 관심을 끌어 상담으로 이어주는 가장 기본적인 자료입니다.',
      items: [
        { label: '매장 내 제품 안내', detail: '제품 옆 · 계산대 · 진열대에 비치해 제품을 안내합니다.' },
        { label: '소비자 관심 유도', detail: '눈에 띄는 안내로 소비자가 제품에 관심을 갖게 합니다.' },
        { label: '상담 전 안내', detail: '상담 전 소비자가 먼저 정보를 접하도록 돕습니다.' },
        { label: '구비 여부와 연결', detail: '매장에 갖춘 제품과 연결해 바로 구매 · 상담으로 이어집니다.' },
      ],
    },
    {
      id: 'qr',
      step: '07',
      title: 'QR 활용',
      description:
        'QR은 종이 한 장으로 소비자를 제품 정보 · 건강 정보로 연결하는 안내 통로입니다. 매장 안팎 어디에나 붙여 활용할 수 있습니다.',
      items: [
        { label: '제품 정보 연결', detail: 'QR로 제품 상세 정보 · 설명자료로 바로 연결합니다.' },
        { label: '건강 정보 연결', detail: '제품과 관련된 건강 정보를 소비자에게 제공합니다.' },
        { label: '소비자 안내', detail: '소비자가 스스로 정보를 확인하도록 도와 설명 부담을 줄입니다.' },
        { label: '매장 내·외부 활용', detail: 'POP · 진열대 · 출입구 · 외부 안내물 등 어디에나 붙여 활용합니다.' },
      ],
    },
    {
      id: 'blog',
      step: '08',
      title: '블로그 · 콘텐츠 활용',
      description:
        '매장이 직접 콘텐츠를 만들지 않아도 됩니다. 운영자 또는 공급자가 제공한 블로그 · 콘텐츠를 활용해 소비자에게 설명하고 신뢰를 쌓을 수 있습니다.',
      items: [
        { label: '직접 제작 불필요', detail: '매장이 콘텐츠를 직접 만들지 않아도 제공받은 자료로 충분합니다.' },
        { label: '제공 자료 활용', detail: '운영자 · 공급자가 만든 검증된 콘텐츠를 그대로 활용합니다.' },
        { label: '소비자 설명', detail: '제품 설명 · 사용법 · 건강 정보를 소비자에게 전달합니다.' },
        { label: '신뢰 형성', detail: '꾸준한 정보 제공으로 매장에 대한 소비자 신뢰를 만듭니다.' },
      ],
    },
    {
      id: 'signage',
      step: '09',
      title: '디지털사이니지 활용',
      description:
        '디지털사이니지는 매장의 TV나 디스플레이에 제품 · 건강 정보를 띄우는 방식입니다. 소규모 매장도 간단히 매장 안내 환경을 만들 수 있고, 본부에 묶이지 않고 매장이 자율적으로 활용합니다.',
      items: [
        { label: '매장 화면 노출', detail: '매장 TV · 디스플레이에 제품 · 건강 정보를 띄웁니다.' },
        { label: '간단한 구성', detail: '소규모 매장도 복잡한 준비 없이 매장 안내 환경을 만듭니다.' },
        { label: '매장 자율 활용', detail: '본부에 묶이는 방식이 아니라 매장이 필요에 맞게 자율로 운영합니다.' },
      ],
    },
    {
      id: 'settlement',
      step: '10',
      title: '주문 · 배송 · 정산 흐름',
      description:
        '제품을 주문하거나 오퍼에 참여하면, 공급자 배송과 정산이 이어집니다. 매장은 흐름만 이해하면 되고, 운영자가 전체 지원 구조를 제공합니다.',
      items: [
        { label: '오퍼 · 상품 확인', detail: '매장 HUB에서 이벤트 오퍼 또는 승인 상품을 확인합니다.' },
        { label: '주문 또는 참여', detail: '필요한 상품을 주문하거나 이벤트 오퍼에 참여합니다.' },
        { label: '공급자 배송', detail: '공급자가 제품을 매장으로 배송합니다.' },
        { label: '누락 · 반품 · 문의', detail: '누락 · 반품 · 문의가 있으면 안내된 흐름에 따라 처리합니다.' },
        { label: '운영자 지원', detail: '운영자가 전체 흐름을 지원하므로 매장은 혼자 해결하지 않아도 됩니다.' },
      ],
    },
    {
      id: 'start',
      step: '11',
      title: '매장에서 실제로 시작하는 방법',
      description:
        '처음 시작할 때는 아래 순서를 따르면 됩니다. 한 번에 다 할 필요 없이, 필요한 것부터 골라 매장에 적용해 보세요.',
      items: [
        { label: '1. 운영자 네트워크 참여', detail: '참여할 운영자 네트워크(협동조합 · 세미 프랜차이즈 · 전문 네트워크)에 참여합니다.' },
        { label: '2. 내 매장 접속', detail: '내 매장에 접속해 매장 운영 화면을 엽니다.' },
        { label: '3. 매장 HUB 확인', detail: '운영자가 제공한 제품 · 자료 · 오퍼를 매장 HUB에서 확인합니다.' },
        { label: '4. 필요한 자료 선택', detail: '우리 매장에 필요한 상품과 자료를 골라 가져옵니다.' },
        { label: '5. 매장에 적용', detail: 'POP · QR · 콘텐츠 · 디지털사이니지를 매장에 적용합니다.' },
        { label: '6. 오퍼 · 승인 상품 참여', detail: '이벤트 오퍼에 참여하거나 운영자 승인 상품을 도입합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 운영자 가이드', to: '/guide/for-operator' },
    home: { label: '이용 안내로', to: '/guide' },
  },
};

// ─── /guide/business/pharmacy-network (약국 네트워크 운영 안내) ──────────
// WO-O4O-NETURE-BUSINESS-GUIDE-PHARMACY-NETWORK-V1
// 첫 번째 사업 운영 안내서(Business Guide). 협동조합 전용 아님 — 약국 연합 전반 대상.

export const netureGuideBusinessPharmacyNetworkProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '사업 운영 안내',
    title: '약국 네트워크 운영 안내',
    description:
      '여러 약국이 함께 무언가를 해보려는 그룹을 위한 운영 안내서입니다. 협동조합 준비 그룹 · 지역 약국 모임 · 전문약사 네트워크 · 관광객 대상 약국 네트워크 · 창고형 약국 네트워크 등이 대상이며, 협동조합 전용 문서가 아닙니다. 처음 기대하는 것, 실제로 만나는 문제, O4O로 할 수 있는 것, 운영자가 해야 할 일을 설명합니다. 제안서 · 홍보 · 성공사례가 아니라 운영 안내 문서입니다.',
    primaryAction: { label: '운영 참여 검토 신청 →', to: '/o4o/apply' },
    flowBarTitle: '안내 흐름',
    flowLabels: ['처음 기대', '실제 과제', 'O4O 활용', '운영자 역할', '참여 약국', '시작'],
  },
  index: {
    title: '약국 네트워크 운영 한눈에 보기',
    lead: [
      '"많은 약국이 모이면 싸게 산다"는 기대만으로는 운영이 굴러가지 않습니다.',
      '실제 과제는 제품 확보 · 공급 협상 · 콘텐츠 · 참여 유지 · 운영 수익 구조입니다.',
      '운영자는 참여 약국이 활용할 수 있는 환경을 구성하는 사업 주체입니다.',
    ],
    cards: [
      { title: '이 문서의 대상', audience: '공통', summary: '여러 약국이 함께 운영을 준비하는 그룹.', to: '#audience' },
      { title: '처음에 생각하는 것', audience: '공통', summary: '모이면 저렴 · 공동구매 경쟁력 · 좋은 제품 확보.', to: '#expectation' },
      { title: '실제 운영에서 만나는 문제', audience: '공통', summary: '제품 확보 · 공급 협상 · 인력 · 콘텐츠 · 참여 유지 · 수익 구조.', to: '#challenge' },
      { title: 'O4O는 무엇을 제공하는가', audience: '공통', summary: '운영자가 목적에 맞게 쓰는 운영 수단들.', to: '#o4o-offer' },
      { title: '운영자는 실제로 무엇을 하는가', audience: '운영자', summary: '공급자 협력 · 콘텐츠 확보 · 승인 상품 · 오퍼 · 매장 지원.', to: '#operator-do' },
      { title: '참여 약국은 무엇을 하는가', audience: '약국', summary: '내 매장 · HUB · 승인 상품 · 오퍼 · 콘텐츠 · 소비자 응대.', to: '#store-do' },
      { title: '콘텐츠 운영은 어떻게 이루어지나', audience: '공통', summary: '공급자 보유 자료 중심 + 직접 · 조합원 · 외부 전문가.', to: '#content' },
      { title: '이벤트 오퍼는 무엇인가', audience: '중요', summary: '최저가 공동구매가 아니라 특별 공급 조건.', to: '#event' },
      { title: '실제 운영 흐름', audience: '공통', summary: '공급자 → 운영자 → 참여 약국 → 소비자.', to: '#flow' },
      { title: '시작 방법', audience: '공통', summary: '운영자 등록 → 약국 확보 → 공급자 협력 → 콘텐츠 → 운영.', to: '#start' },
    ],
  },
  sections: [
    {
      id: 'audience',
      step: '01',
      title: '이 문서의 대상',
      description:
        '이 문서는 여러 약국이 함께 무언가를 운영해 보려는 그룹을 위한 것입니다. 협동조합은 대표적인 예시일 뿐, 협동조합 전용 문서가 아닙니다.',
      items: [
        { label: '협동조합 준비 그룹', detail: '협동조합을 준비하거나 검토 중인 약국 그룹.' },
        { label: '지역 약국 모임', detail: '같은 지역의 약국들이 모인 느슨한 모임.' },
        { label: '전문약사 그룹', detail: '특정 분야 전문성을 중심으로 모인 약사 그룹.' },
        { label: '약국 네트워크 전반', detail: '관광객 대상 · 창고형 · 기타 약국 연합체 등 형태는 다양합니다.' },
      ],
    },
    {
      id: 'expectation',
      step: '02',
      title: '많은 사람들이 처음에 생각하는 것',
      description:
        '약국 네트워크를 준비하는 그룹은 보통 아래와 같은 기대로 시작합니다. 여기서는 옳고 그름을 판단하지 않고, 일반적으로 기대하는 내용을 그대로 정리합니다.',
      items: [
        { label: '모이면 저렴하게 산다', detail: '여러 약국이 모이면 더 저렴하게 구매할 수 있을 것이라 기대합니다.' },
        { label: '공동구매로 경쟁력', detail: '공동구매를 하면 경쟁력이 생길 것이라 기대합니다.' },
        { label: '좋은 제품 확보', detail: '좋은 제품을 함께 쉽게 도입할 수 있을 것이라 기대합니다.' },
      ],
    },
    {
      id: 'challenge',
      step: '03',
      title: '실제 운영에서 만나게 되는 문제',
      description:
        '막상 운영을 시작하면 기대와는 다른 현실적인 과제를 만나게 됩니다. 이는 누구의 잘못이 아니라, 함께 운영할 때 자연스럽게 생기는 운영 과제입니다.',
      items: [
        { label: '제품을 지속적으로 찾기 어렵다', detail: '한 번 좋은 제품을 찾아도, 계속해서 새 제품을 발굴 · 유지하기가 어렵습니다.' },
        { label: '공급 조건 협상이 어렵다', detail: '공급자와의 가격 · 조건 협상은 생각보다 복잡하고 유통질서에 민감합니다.' },
        { label: '운영 인력이 필요하다', detail: '자료 정리 · 매장 안내 · 조율을 맡을 운영 인력이 필요합니다.' },
        { label: '콘텐츠가 부족하다', detail: '매장에서 쓸 설명 · 안내 콘텐츠를 직접 만들기는 부담이 큽니다.' },
        { label: '참여 약국 유지가 어렵다', detail: '초기 참여는 모여도, 지속적으로 참여를 유지하기가 어렵습니다.' },
        { label: '운영 수익 구조가 없다', detail: '운영을 지속할 수 있는 수익 구조가 없으면 오래 가기 어렵습니다.' },
      ],
    },
    {
      id: 'o4o-offer',
      step: '04',
      title: 'O4O는 무엇을 제공하는가',
      description:
        'O4O는 위 운영 과제를 푸는 데 쓸 수 있는 수단을 제공합니다. 기능 자체보다, 운영자가 어떤 목적으로 사용하는지를 기준으로 보면 됩니다.',
      items: [
        { label: '이벤트 오퍼', detail: '참여 약국에게 특별 공급 조건을 제공하는 수단입니다.' },
        { label: '운영자 승인 상품', detail: '운영자가 검토 · 승인한 상품을 약국이 안심하고 다루게 합니다.' },
        { label: '판매자 모집', detail: '제품을 다룰 약국을 모집해 운영 기반을 만듭니다.' },
        { label: '서비스 한정 판매', detail: '특정 네트워크 · 참여 약국에 한정해 제품을 공급할 수 있습니다.' },
        { label: '유통참여형 펀딩', detail: '약국의 소액 참여로 제품을 정산하고 초기 매장 도입을 만듭니다.' },
        { label: '매장 HUB', detail: '약국이 받아보는 상품 · 자료 · 콘텐츠 공간입니다.' },
        { label: '콘텐츠 운영', detail: '매장에서 쓸 설명 · 안내 콘텐츠를 확보 · 제공합니다.' },
        { label: '매장 활용 자산', detail: 'POP · QR · 블로그 · 사이니지 등 매장 실행 자산을 제공합니다.' },
      ],
    },
    {
      id: 'operator-do',
      step: '05',
      title: '운영자는 실제로 무엇을 하는가',
      description:
        '운영자는 단순 관리자가 아니라, 참여 약국이 활용할 수 있는 환경을 구성하는 사업 주체입니다. 아래가 운영자의 실제 일입니다.',
      items: [
        { label: '공급자와 협력', detail: '공급자로부터 제품 · 자료 · 조건을 확보하고 유통질서를 존중하며 협력합니다.' },
        { label: '콘텐츠 확보', detail: '공급자 자료를 확보 · 정리하거나 직접 · 외부 제작으로 콘텐츠를 마련합니다.' },
        { label: '운영자 승인 상품 운영', detail: '약국에 나갈 상품을 검토 · 승인하고 관리합니다.' },
        { label: '이벤트 오퍼 운영', detail: '참여 약국을 위한 특별 공급 조건을 공급자와 조율해 운영합니다.' },
        { label: '참여 매장 지원', detail: '약국의 활용 질문 · 운영 이슈를 지원합니다.' },
        { label: '매장 HUB 운영', detail: '상품 · 자료 · 콘텐츠를 HUB에 구성해 약국에 전달합니다.' },
      ],
    },
    {
      id: 'store-do',
      step: '06',
      title: '참여 약국은 무엇을 하는가',
      description:
        '참여 약국은 새로운 일을 만들지 않아도 됩니다. 운영자가 구성해 둔 것을 골라 내 매장에 적용하면 됩니다.',
      items: [
        { label: '내 매장 활용', detail: '운영자가 제공한 것을 내 매장에 맞게 활용합니다.' },
        { label: '매장 HUB 활용', detail: 'HUB에서 필요한 상품 · 자료 · 콘텐츠를 가져옵니다.' },
        { label: '운영자 승인 상품 활용', detail: '검토된 상품을 안심하고 도입 · 판매합니다.' },
        { label: '이벤트 오퍼 참여', detail: '제시된 조건을 확인하고 참여 여부를 판단합니다.' },
        { label: '콘텐츠 활용', detail: '제공받은 POP · QR · 콘텐츠로 소비자에게 설명합니다.' },
        { label: '소비자 응대 활용', detail: '상담 자료를 활용해 소비자 응대 · 신뢰 형성에 씁니다.' },
      ],
    },
    {
      id: 'content',
      step: '07',
      title: '콘텐츠 운영은 어떻게 이루어지나',
      description:
        '좋은 콘텐츠는 운영자가 다 만들어야 하는 것이 아닙니다. 제품을 가장 잘 아는 공급자가 이미 보유한 경우가 많고, 운영자는 이를 확보 · 정리해 약국에 제공합니다. 직접 · 조합원 · 외부 전문가 제작은 이를 보완합니다.',
      items: [
        { label: '공급자가 가장 많이 보유', detail: '공급자는 마케팅 비용으로 자료를 만들어, 좋은 콘텐츠를 이미 보유한 경우가 많습니다.' },
        { label: '운영자 직접 제작', detail: '필요한 콘텐츠를 운영자가 직접 만들 수 있습니다.' },
        { label: '조합원 참여 제작', detail: '참여 약사 · 구성원이 함께 콘텐츠를 만들 수 있습니다.' },
        { label: '외부 전문가 활용', detail: '필요하면 외부 전문가 · 제작자를 활용할 수 있습니다.' },
        { label: '공급자 자료 정리 제공', detail: '공급자 자료를 매장이 바로 쓸 수 있게 정리해 제공합니다.' },
        { label: '활용 가능한 자료', detail: '제품 이미지 · 제품 설명서 · POP · QR · 블로그 · 영상 · 디지털사이니지 · 교육자료 · 상담자료 · 홍보자료 · 기타 자료 모두 활용할 수 있습니다.' },
      ],
    },
    {
      id: 'event',
      step: '08',
      title: '이벤트 오퍼는 무엇인가',
      description:
        '이벤트 오퍼는 약국 네트워크에서 가장 많이 오해하는 부분입니다. "많이 모이면 무조건 저렴하게 산다"는 기대와 실제 의미는 다릅니다.',
      items: [
        { label: '흔한 오해', detail: '"많이 모이면 무조건 저렴하게 구매할 수 있다"고 생각하는 경우가 많습니다.' },
        { label: '실제 의미', detail: '공급자는 유통질서에 민감하므로, 이벤트 오퍼는 대량구매 할인보다 특정 운영자 · 특정 참여 그룹에 제공되는 특별 공급 조건에 가깝습니다.' },
        { label: '참여 약국 관점', detail: '현재 판매 중인 제품을 좋은 조건으로 공급받고 싶은 니드를 채워줍니다.' },
        { label: '공급자 관점', detail: '새로운 매장 진입 · 경쟁 제품 대체 · 신규 취급 유도를 위해 특정 그룹에 조건을 제공합니다.' },
      ],
    },
    {
      id: 'flow',
      step: '09',
      title: '실제 운영 흐름',
      description:
        '실제 운영은 공급자 → 운영자 → 참여 약국 → 소비자로 이어집니다. 각 단계의 역할은 다음과 같습니다.',
      items: [
        { label: '공급자', detail: '제품과 원천 자료 · 공급 조건을 제공합니다.' },
        { label: '운영자', detail: '자료를 실행 자산으로 구성하고, 승인 상품 · 오퍼 · HUB를 운영하며 약국을 지원합니다.' },
        { label: '참여 약국', detail: '받은 상품 · 자료를 내 매장에 적용하고 소비자에게 판매 · 설명합니다.' },
        { label: '소비자', detail: '약국에서 제품 정보 · 건강 정보를 전달받아 이해하고 구매합니다.' },
      ],
    },
    {
      id: 'start',
      step: '10',
      title: '시작 방법',
      description:
        '처음 시작할 때는 아래 순서를 따르면 됩니다. 한 번에 다 갖추지 않아도 되고, 가능한 것부터 시작하면 됩니다.',
      items: [
        { label: '1. 운영자 등록', detail: '운영자로 참여를 신청하고 네트워크 운영을 준비합니다.' },
        { label: '2. 참여 약국 확보', detail: '함께할 약국을 모으고 참여 조건을 안내합니다.' },
        { label: '3. 공급자 협력', detail: '제품 · 자료 · 조건을 제공할 공급자와 협력합니다.' },
        { label: '4. 콘텐츠 확보', detail: '공급자 자료를 확보 · 정리하거나 직접 · 외부 제작으로 마련합니다.' },
        { label: '5. 이벤트 오퍼 운영', detail: '참여 약국을 위한 특별 공급 조건을 조율 · 운영합니다.' },
        { label: '6. 운영자 승인 상품 운영', detail: '약국에 나갈 상품을 검토 · 승인해 운영합니다.' },
        { label: '7. 매장 HUB 운영', detail: '상품 · 자료 · 콘텐츠를 HUB로 구성해 약국에 전달합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 운영자 가이드', to: '/guide/for-operator' },
    home: { label: '이용 안내로', to: '/guide' },
  },
};

// ─── /guide/business/supplier-network (공급자 네트워크 운영 안내) ────────
// WO-O4O-NETURE-BUSINESS-GUIDE-SUPPLIER-NETWORK-V1
// 두 번째 사업 운영 안내서. 공급자 기반 운영자 — 매장을 지원하는 서비스 운영.

export const netureGuideBusinessSupplierNetworkProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '사업 운영 안내',
    title: '공급자 네트워크 운영 안내',
    description:
      '도매상 · 제조사 · 수입사 · 총판 · 브랜드사 등 공급자가 O4O를 활용해 매장을 지원하는 서비스를 운영하는 방법을 설명합니다. O4O는 쇼핑몰 · 입점몰 · 드랍쉬핑 · 공동구매 플랫폼과 다릅니다. 상품 등록법 같은 기능 매뉴얼이 아니라, 공급자가 어떻게 서비스 운영자가 될 수 있는지를 설명하는 사업 운영 안내서입니다.',
    primaryAction: { label: '운영 참여 검토 신청 →', to: '/o4o/apply' },
    flowBarTitle: '안내 흐름',
    flowLabels: ['처음 오해', '제품 특징', '공급자 니드', 'O4O 활용', '콘텐츠 · 오퍼', '시작'],
  },
  index: {
    title: '공급자 네트워크 운영 한눈에 보기',
    lead: [
      'O4O는 쇼핑몰 · 입점몰 · 드랍쉬핑 · 공동구매가 아닙니다.',
      '공급자가 매장을 지원하는 서비스를 운영하도록 설계된 플랫폼입니다.',
      '좋은 콘텐츠를 가장 많이 가진 쪽은 공급자이며, 운영자는 이를 활용합니다.',
    ],
    cards: [
      { title: '이 문서의 대상', audience: '공급자', summary: '도매 · 제조 · 수입 · 총판 · 브랜드사 등 공급 사업자.', to: '#audience' },
      { title: '처음에 생각하는 것', audience: '공급자', summary: '쇼핑몰? 입점몰? 드랍쉬핑? 공동구매? — O4O는 다릅니다.', to: '#misread' },
      { title: 'O4O 대상 제품의 특징', audience: '공통', summary: '유통비용 · 다품종 소량 · 정보 전달 · 매장 전문가.', to: '#product' },
      { title: '공급자가 실제로 원하는 것', audience: '공급자', summary: '신규 매장 · 기존 매장 유지 · 신규 제품 · 경쟁 제품 대체.', to: '#supplier-want' },
      { title: 'O4O는 무엇을 제공하는가', audience: '공급자', summary: '공급자가 목적에 맞게 쓰는 운영 수단들.', to: '#o4o-offer' },
      { title: '공급자는 실제로 무엇을 하는가', audience: '공급자', summary: '제품 · 콘텐츠 제공 · 오퍼 · 모집 · 운영자 협력 · 매장 지원.', to: '#supplier-do' },
      { title: '콘텐츠는 왜 중요한가', audience: '공통', summary: '좋은 콘텐츠를 가장 많이 가진 쪽은 공급자입니다.', to: '#content' },
      { title: '이벤트 오퍼는 왜 하는가', audience: '중요', summary: '저가 판매가 아니라 매장 진입 · 제품 도입 · 대체를 위한 조건.', to: '#event' },
      { title: '유통참여형 펀딩은 무엇인가', audience: '공급자', summary: '공급자가 독자 운영 — 개발 · 검증 · 초기 매장 확보.', to: '#funding' },
      { title: '실제 운영 흐름', audience: '공통', summary: '공급자 → 운영자 → 참여 매장 → 소비자.', to: '#flow' },
      { title: '시작 방법', audience: '공급자', summary: '등록 → 제품 · 콘텐츠 → 모집 · 오퍼 → 운영자 협력 · 매장 지원.', to: '#start' },
    ],
  },
  sections: [
    {
      id: 'audience',
      step: '01',
      title: '이 문서의 대상',
      description:
        '이 문서는 제품을 공급하는 사업자가, 단순 납품을 넘어 매장을 지원하는 서비스를 운영하려 할 때 읽는 안내서입니다.',
      items: [
        { label: '도매상', detail: '여러 매장에 제품을 공급하는 도매 사업자.' },
        { label: '제조사', detail: '직접 제품을 만들어 유통하려는 제조 사업자.' },
        { label: '수입사 · 총판', detail: '해외 제품을 들여오거나 총판으로 유통하는 사업자.' },
        { label: '브랜드사 · 전문 공급사', detail: '브랜드 · 특정 분야 전문 제품을 공급하거나 공급 네트워크를 운영하려는 사업자.' },
      ],
    },
    {
      id: 'misread',
      step: '02',
      title: '많은 공급자들이 처음에 생각하는 것',
      description:
        '새로운 플랫폼을 접하면 공급자는 보통 익숙한 구조로 이해하려 합니다. 여기서는 옳고 그름을 판단하지 않고, 일반적으로 떠올리는 생각을 정리합니다. O4O는 쇼핑몰 · 입점몰 · 드랍쉬핑 · 공동구매와는 다릅니다.',
      items: [
        { label: '제품을 등록하면 판매되는가', detail: '등록만 하면 알아서 팔릴 것이라 기대하기 쉽습니다.' },
        { label: '판매자를 많이 모으면 되는가', detail: '판매자 수만 늘리면 될 것이라 생각하기 쉽습니다.' },
        { label: '공동구매를 열면 되는가', detail: '공동구매로 가격을 낮추면 될 것이라 생각하기 쉽습니다.' },
        { label: '쇼핑몰처럼 운영하면 되는가', detail: '익숙한 쇼핑몰 · 입점몰 방식으로 이해하기 쉽습니다.' },
      ],
    },
    {
      id: 'product',
      step: '03',
      title: 'O4O 대상 제품의 특징',
      description:
        'O4O는 대형 유통이 잘 다루지 못하는 제품을 위한 구조입니다. 공급자가 이 특징을 이해해야 왜 매장 지원이 필요한지가 보입니다.',
      items: [
        { label: '유통비용이 크다', detail: '소량 · 다품종일수록 매장에 닿는 영업 · 물류 · 설명 비용이 큽니다.' },
        { label: '다품종 소량 판매', detail: '종류가 많고 한 매장에서 적게 팔려 대량 유통이 어렵습니다.' },
        { label: '제품 정보 전달 중요', detail: '설명 없이는 고객이 제품 가치를 이해하기 어렵습니다.' },
        { label: '건강 정보 전달 중요', detail: '건강과 직결된 제품은 올바른 정보 전달이 신뢰의 핵심입니다.' },
        { label: '매장 전문가 역할 중요', detail: '매장의 설명 · 상담이 구매를 좌우하므로 매장 지원이 중요합니다.' },
      ],
    },
    {
      id: 'supplier-want',
      step: '04',
      title: '공급자가 실제로 원하는 것',
      description:
        '공급자의 진짜 목적은 단순 판매 등록이 아니라, 제품이 매장에 들어가고 유지되며 팔리는 것입니다.',
      items: [
        { label: '신규 매장 확보', detail: '제품을 새로 취급할 매장을 확보하고 싶습니다.' },
        { label: '기존 매장 유지', detail: '이미 거래하는 매장과의 관계를 유지 · 강화하고 싶습니다.' },
        { label: '신규 제품 도입', detail: '새 제품을 매장에 도입시키고 싶습니다.' },
        { label: '경쟁 제품 대체', detail: '매장에서 경쟁 제품을 자사 제품으로 대체하고 싶습니다.' },
        { label: '제품 정보 전달', detail: '제품 · 건강 정보가 매장과 고객에게 제대로 전달되길 바랍니다.' },
        { label: '판매 지원', detail: '매장이 잘 팔 수 있도록 자료 · 조건으로 지원하고 싶습니다.' },
      ],
    },
    {
      id: 'o4o-offer',
      step: '05',
      title: 'O4O는 무엇을 제공하는가',
      description:
        'O4O는 공급자가 위 목적을 이루는 데 쓸 수 있는 수단을 제공합니다. 기능 자체보다 공급자가 어떤 목적으로 활용하는지를 기준으로 보면 됩니다.',
      items: [
        { label: '판매자 모집', detail: '제품을 취급할 매장을 모집해 유통 기반을 만듭니다.' },
        { label: '이벤트 오퍼', detail: '특정 운영자 · 참여 매장에 특별 공급 조건을 제공합니다.' },
        { label: '운영자 승인 상품', detail: '운영자 검토를 거쳐 매장이 안심하고 다루게 합니다.' },
        { label: '서비스 한정 판매', detail: '특정 네트워크 · 참여 매장에 한정해 공급할 수 있습니다.' },
        { label: '유통참여형 펀딩', detail: '개발 · 검증 단계에서 초기 참여 매장을 확보합니다.' },
        { label: '콘텐츠 제공', detail: '제품 설명 · 안내 콘텐츠를 매장에 제공합니다.' },
        { label: '매장 HUB', detail: '매장이 제품 · 자료 · 콘텐츠를 받아보는 공간입니다.' },
      ],
    },
    {
      id: 'supplier-do',
      step: '06',
      title: '공급자는 실제로 무엇을 하는가',
      description:
        '공급자는 제품만 넘기는 것이 아니라, 매장이 잘 팔 수 있는 환경을 함께 만드는 데 참여합니다.',
      items: [
        { label: '제품 제공', detail: '매장에 공급할 제품과 공급 조건을 준비합니다.' },
        { label: '콘텐츠 제공', detail: '제품 설명 · 이미지 · 영상 등 보유 콘텐츠를 제공합니다.' },
        { label: '이벤트 오퍼 운영', detail: '특정 운영자 · 참여 매장을 위한 특별 공급 조건을 운영합니다.' },
        { label: '판매자 모집', detail: '제품을 취급할 매장을 모집합니다.' },
        { label: '운영자 협력', detail: '운영자와 협력해 매장에 제품 · 자료가 닿도록 합니다.' },
        { label: '매장 지원', detail: '매장의 판매 · 설명을 자료와 조건으로 지원합니다.' },
      ],
    },
    {
      id: 'content',
      step: '07',
      title: '콘텐츠는 왜 중요한가',
      description:
        '운영자가 모든 콘텐츠를 만드는 구조가 아닙니다. 제품을 가장 잘 아는 공급자가 좋은 콘텐츠를 가장 많이 보유하며, 공급자가 제공하면 운영자가 매장에 맞게 활용합니다. 공급자는 전문 제작사와 협력해 콘텐츠를 마련할 수도 있습니다.',
      items: [
        { label: '공급자가 가장 많이 보유', detail: '제품을 만든 · 들여온 공급자가 가장 정확하고 풍부한 콘텐츠를 가집니다.' },
        { label: '전문 제작사와 협력', detail: '필요하면 전문 제작사와 협력해 콘텐츠를 제작할 수 있습니다.' },
        { label: '운영자가 활용', detail: '공급자가 제공한 자료를 운영자가 매장에 맞게 정리 · 활용합니다.' },
        { label: '활용 가능한 자료', detail: '제품 설명서 · 제품 이미지 · POP · QR 자료 · 블로그 자료 · 영상 자료 · 교육 자료 · 상담 자료 · 홍보 자료 · 기타 자료 모두 제공 · 활용할 수 있습니다.' },
      ],
    },
    {
      id: 'event',
      step: '08',
      title: '이벤트 오퍼는 왜 하는가',
      description:
        '이벤트 오퍼는 무조건 싸게 파는 행사가 아닙니다. 공급자는 유통질서에 민감하며, 이벤트 오퍼는 명확한 목적을 위해 특정 대상에게만 제공하는 특별 공급 조건입니다.',
      items: [
        { label: '유통질서에 민감', detail: '공급자는 기존 거래선 · 가격 정책 보호에 민감합니다. 무차별 저가는 유통질서를 해칩니다.' },
        { label: '저가 판매가 목적이 아님', detail: '대량구매 할인이 목적이 아니라, 분명한 운영 목적을 위한 조건입니다.' },
        { label: '특정 운영자 · 특정 참여 매장', detail: '모두에게 푸는 할인이 아니라, 특정 운영자 · 특정 참여 매장에게만 제공합니다.' },
        { label: '목적: 신규 매장 진입', detail: '제품을 새 매장에 진입시키기 위해 조건을 제공합니다.' },
        { label: '목적: 신규 제품 도입', detail: '새 제품을 매장에 도입시키기 위해 조건을 제공합니다.' },
        { label: '목적: 경쟁 제품 대체', detail: '매장의 경쟁 제품을 자사 제품으로 대체하기 위해 조건을 제공합니다.' },
      ],
    },
    {
      id: 'funding',
      step: '09',
      title: '유통참여형 펀딩은 무엇인가',
      description:
        '유통참여형 펀딩은 공급자가 독자적으로 운영할 수 있는 수단입니다. 개발비 전체 조달이 목적이 아니라, 제품이 실제 매장에 처음 들어가도록(초기 참여 매장 확보) 만드는 것이 핵심입니다. 운영자 사업 모델이 아니라 공급자 관점의 수단입니다.',
      items: [
        { label: '공급자가 독자 운영', detail: '공급자가 직접 펀딩을 설계 · 운영할 수 있습니다.' },
        { label: '제품 개발', detail: '개발 · 유통 준비 단계의 제품을 대상으로 할 수 있습니다.' },
        { label: '시장 검증', detail: '매장 · 고객 반응으로 제품의 시장성을 검증합니다.' },
        { label: '초기 참여 매장 확보', detail: '제품 정산을 통해 제품이 실제 매장에 처음 도입되게 합니다.' },
        { label: '제품 정보 공유', detail: '참여 매장에 제품 정보 · 설명자료를 함께 공유합니다.' },
      ],
    },
    {
      id: 'flow',
      step: '10',
      title: '실제 운영 흐름',
      description:
        '실제 운영은 공급자 → 운영자 → 참여 매장 → 소비자로 이어집니다. 각 단계의 역할은 다음과 같습니다.',
      items: [
        { label: '공급자', detail: '제품 · 콘텐츠 · 공급 조건을 제공하고 오퍼 · 모집을 운영합니다.' },
        { label: '운영자', detail: '공급자 자료를 매장 실행 자산으로 구성하고 매장을 모집 · 지원합니다.' },
        { label: '참여 매장', detail: '받은 제품 · 자료를 내 매장에 적용하고 소비자에게 판매 · 설명합니다.' },
        { label: '소비자', detail: '매장에서 제품 · 건강 정보를 전달받아 이해하고 구매합니다.' },
      ],
    },
    {
      id: 'start',
      step: '11',
      title: '시작 방법',
      description:
        '처음 시작할 때는 아래 순서를 따르면 됩니다. 한 번에 다 갖추지 않아도 되고, 가능한 것부터 시작하면 됩니다.',
      items: [
        { label: '1. 공급자 등록', detail: '공급자로 참여를 등록합니다.' },
        { label: '2. 제품 등록', detail: '매장에 공급할 제품을 등록합니다.' },
        { label: '3. 콘텐츠 준비', detail: '제품 설명 · 이미지 · 영상 등 보유 콘텐츠를 준비합니다.' },
        { label: '4. 판매자 모집', detail: '제품을 취급할 매장을 모집합니다.' },
        { label: '5. 이벤트 오퍼', detail: '특정 운영자 · 참여 매장을 위한 특별 공급 조건을 운영합니다.' },
        { label: '6. 운영자 협력', detail: '운영자와 협력해 매장에 제품 · 자료가 닿게 합니다.' },
        { label: '7. 매장 지원', detail: '매장의 판매 · 설명을 지속적으로 지원합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 운영자 가이드', to: '/guide/for-operator' },
    home: { label: '이용 안내로', to: '/guide' },
  },
};

// ─── /guide/business/content-network (콘텐츠 네트워크 운영 안내) ─────────
// WO-O4O-NETURE-BUSINESS-GUIDE-CONTENT-NETWORK-V1
// 세 번째 사업 운영 안내서. 콘텐츠를 중심으로 공급자·운영자·매장이 연결되는 운영 구조.

export const netureGuideBusinessContentNetworkProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '사업 운영 안내',
    title: '콘텐츠 네트워크 운영 안내',
    description:
      '공급자 · 운영자 · 참여 매장이 콘텐츠를 활용해 소비자에게 제품 정보와 건강 정보를 전달하는 환경을 어떻게 구성하는지 설명합니다. 콘텐츠 제작 툴 사용법 · 블로그 작성법 · 디자인 제작 방법이 아니라, 콘텐츠를 중심으로 세 주체가 연결되는 O4O 운영 구조를 설명하는 안내서입니다.',
    primaryAction: { label: '운영 참여 검토 신청 →', to: '/o4o/apply' },
    flowBarTitle: '안내 흐름',
    flowLabels: ['왜 콘텐츠', '누가 만드나', '어디에 있나', '운영자 · 매장', '수익 구조', '시작'],
  },
  index: {
    title: '콘텐츠 네트워크 운영 한눈에 보기',
    lead: [
      'O4O 대상 제품은 정보 · 건강 정보 전달이 판매를 좌우합니다.',
      '좋은 콘텐츠를 가장 많이 가진 쪽은 제품을 만든 · 들여온 공급자입니다.',
      '콘텐츠 운영은 비용이 아니라 운영자의 사업 모델이 될 수 있습니다.',
    ],
    cards: [
      { title: '이 문서의 대상', audience: '공통', summary: '운영자 · 공급자 · 네트워크 운영자.', to: '#audience' },
      { title: '왜 콘텐츠가 중요한가', audience: '공통', summary: '소비자는 제품 차이를 알기 어렵고, 매장 설명이 판매를 좌우.', to: '#why' },
      { title: '콘텐츠는 누가 만드는가', audience: '공통', summary: '공급자 · 운영자 · 참여 매장 · 외부 전문가.', to: '#who-makes' },
      { title: '좋은 콘텐츠는 어디에 있는가', audience: '공통', summary: '제품을 가장 잘 아는 공급자가 가장 많이 보유.', to: '#where' },
      { title: '운영자는 무엇을 하는가', audience: '운영자', summary: '확보 · 정리 · 제공 · 지원 · 운영 정책 결정.', to: '#operator' },
      { title: '참여 매장은 무엇을 하는가', audience: '매장', summary: '자료 활용 · 소비자 안내 · 상담 · 매장 맞춤 활용.', to: '#store' },
      { title: '어떤 자료들이 활용되는가', audience: '공통', summary: '이미지 · 설명서 · POP · QR · 블로그 · 영상 · 사이니지 · 교육 · 상담 · 건강정보.', to: '#assets' },
      { title: '콘텐츠 운영 흐름', audience: '공통', summary: '공급자 → 운영자 → 참여 매장 → 소비자.', to: '#flow' },
      { title: '콘텐츠 운영과 수익 구조', audience: '중요', summary: '콘텐츠 운영은 운영자의 사업 모델이 될 수 있습니다.', to: '#revenue' },
      { title: 'O4O가 콘텐츠 제작 기능을 만들지 않는 이유', audience: '공통', summary: '플랫폼은 저장 · 배포 · 활용 환경을 제공합니다.', to: '#no-tool' },
      { title: '시작 방법', audience: '공통', summary: '공급자 · 콘텐츠 확보 → 운영 정책 → 매장 → HUB → 지원.', to: '#start' },
    ],
  },
  sections: [
    {
      id: 'audience',
      step: '01',
      title: '이 문서의 대상',
      description:
        '이 문서는 콘텐츠를 중심으로 매장을 지원하는 서비스를 운영하거나, 좋은 콘텐츠를 매장에 닿게 하려는 사업자를 위한 것입니다.',
      items: [
        { label: '운영자 · 네트워크 운영자', detail: '협동조합 준비 그룹 · 약국 네트워크 운영자 · 전문 네트워크 운영자 등.' },
        { label: '공급자', detail: '제조사 · 도매상 · 브랜드사 등 제품과 콘텐츠를 보유한 공급 사업자.' },
        { label: '콘텐츠로 매장을 지원하려는 모두', detail: '콘텐츠를 활용해 매장 · 소비자 소통을 만들려는 주체.' },
      ],
    },
    {
      id: 'why',
      step: '02',
      title: '왜 콘텐츠가 중요한가',
      description:
        'O4O 대상 제품은 다품종 · 소량 판매이면서 정보 · 건강 정보 전달이 중요합니다. 제품만 진열한다고 팔리지 않고, 콘텐츠가 있어야 소비자가 이해하고 매장이 설명할 수 있습니다.',
      items: [
        { label: 'O4O 대상 제품 특성', detail: '다품종 · 소량 판매 · 제품 정보 전달 중요 · 건강 정보 전달 중요.' },
        { label: '소비자는 제품 차이를 알기 어렵다', detail: '제품군은 알아도, 매장에 있는 특정 제품의 차이와 특징은 알기 어렵습니다.' },
        { label: '매장 전문가의 설명이 중요', detail: '제품 정보와 건강 정보 전달이 판매에 직접 영향을 줍니다. 콘텐츠는 그 설명을 돕습니다.' },
      ],
    },
    {
      id: 'who-makes',
      step: '03',
      title: '콘텐츠는 누가 만드는가',
      description:
        'O4O는 특정 한 주체만 콘텐츠를 만드는 구조가 아닙니다. 여러 주체가 함께 콘텐츠를 만들고 활용할 수 있습니다.',
      items: [
        { label: '공급자', detail: '제품을 가장 잘 아는 공급자가 핵심 콘텐츠를 만듭니다.' },
        { label: '운영자', detail: '운영자가 필요한 콘텐츠를 직접 만들거나 보완합니다.' },
        { label: '참여 매장', detail: '매장이 현장에 맞는 콘텐츠를 만들거나 활용합니다.' },
        { label: '외부 전문가', detail: '필요하면 외부 전문가 · 제작사가 콘텐츠를 만듭니다.' },
      ],
    },
    {
      id: 'where',
      step: '04',
      title: '현실에서 좋은 콘텐츠는 어디에 있는가',
      description:
        '현실적으로 가장 좋은 콘텐츠는 제품을 만든 · 들여온 공급자가 가장 많이 보유합니다. O4O가 공급자 콘텐츠를 중요하게 보는 이유입니다.',
      items: [
        { label: '공급자가 가장 많이 보유', detail: '제품을 가장 잘 아는 공급자가 가장 정확하고 풍부한 콘텐츠를 가집니다.' },
        { label: '전문 제작사 활용', detail: '공급자는 전문 제작사를 활용해 콘텐츠를 제작하기도 합니다.' },
        { label: '마케팅 비용 투입', detail: '공급자는 마케팅 비용을 들여 제품 자료 · 콘텐츠를 만듭니다.' },
        { label: '제품 정보 자료 보유', detail: '제품 정보 · 인증 · 설명에 대해 가장 많은 자료를 보유합니다.' },
      ],
    },
    {
      id: 'operator',
      step: '05',
      title: '운영자는 무엇을 하는가',
      description:
        '운영자는 단순 전달자가 아니라, 콘텐츠 운영 환경을 구성하는 사업 주체입니다.',
      items: [
        { label: '콘텐츠 확보', detail: '공급자 자료를 확보하거나 직접 · 외부 제작으로 마련합니다.' },
        { label: '콘텐츠 정리', detail: '매장이 바로 쓸 수 있도록 분류 · 정리합니다.' },
        { label: '콘텐츠 제공', detail: '매장 HUB를 통해 매장에 전달합니다.' },
        { label: '참여 매장 지원', detail: '매장의 활용 질문 · 운영을 지원합니다.' },
        { label: '콘텐츠 운영 정책 결정', detail: '무엇을 어떤 매장에 어떻게 제공할지 운영 정책을 정합니다.' },
      ],
    },
    {
      id: 'store',
      step: '06',
      title: '참여 매장은 무엇을 하는가',
      description:
        '매장은 제공받은 콘텐츠를 활용해 소비자와 소통합니다. 직접 만들지 않아도 됩니다.',
      items: [
        { label: '자료 활용', detail: '제공받은 콘텐츠를 내 매장에 맞게 활용합니다.' },
        { label: '소비자 안내', detail: 'POP · QR · 콘텐츠로 소비자에게 제품을 안내합니다.' },
        { label: '상담 활용', detail: '상담 자료를 활용해 소비자 응대 · 설명에 씁니다.' },
        { label: '매장 내 노출', detail: '매장 화면 · 진열대 · 안내물에 콘텐츠를 노출합니다.' },
        { label: '매장 맞춤 활용', detail: '매장 특성과 고객에 맞게 골라 활용합니다.' },
      ],
    },
    {
      id: 'assets',
      step: '07',
      title: '어떤 자료들이 활용되는가',
      description:
        '아래 자료는 모두 콘텐츠 운영에 활용됩니다. 필요한 것을 골라 쓰면 됩니다.',
      items: [
        { label: '제품 이미지', detail: '매장 안내 · 온라인 · 인쇄물에 쓰는 제품 이미지.' },
        { label: '제품 설명서', detail: '제품 특징 · 사용법을 담은 설명자료.' },
        { label: 'POP', detail: '매장 내 비치 · 부착 안내물.' },
        { label: 'QR', detail: '제품 · 건강 정보로 연결되는 QR 자료.' },
        { label: '블로그', detail: '소비자 설명에 쓰는 글 콘텐츠.' },
        { label: '영상', detail: '제품 소개 · 사용법 영상.' },
        { label: '디지털사이니지', detail: '매장 화면용 디지털 안내 자료.' },
        { label: '교육자료', detail: '직원 · 고객 교육 자료.' },
        { label: '상담자료', detail: '소비자 상담 시 활용하는 설명자료.' },
        { label: '홍보자료', detail: '매장 홍보 · 이벤트 안내 자료.' },
        { label: '건강정보 자료', detail: '제품과 관련된 건강 정보 자료.' },
        { label: '기타 자료', detail: '그 밖에 매장에서 활용 가능한 자료.' },
      ],
    },
    {
      id: 'flow',
      step: '08',
      title: '콘텐츠 운영 흐름',
      description:
        '콘텐츠는 공급자 → 운영자 → 참여 매장 → 소비자로 흐릅니다. 각 단계의 역할은 다음과 같습니다.',
      items: [
        { label: '공급자', detail: '제품 콘텐츠 · 자료를 제공합니다.' },
        { label: '운영자', detail: '자료를 확보 · 정리해 매장이 쓸 수 있게 제공합니다.' },
        { label: '참여 매장', detail: '제공받은 콘텐츠를 매장에서 활용합니다.' },
        { label: '소비자', detail: '매장에서 제품 · 건강 정보를 전달받아 이해하고 구매합니다.' },
      ],
    },
    {
      id: 'revenue',
      step: '09',
      title: '콘텐츠 운영과 수익 구조',
      description:
        '콘텐츠 운영은 비용만 발생하는 활동이 아닙니다. 각 주체의 니드가 맞물리면 운영자의 사업 모델이 될 수 있습니다.',
      items: [
        { label: '공급자의 홍보 니드', detail: '공급자는 제품을 알리고 매장에 노출하고 싶은 니드가 있습니다.' },
        { label: '공급자의 콘텐츠 제공 니드', detail: '공급자는 좋은 콘텐츠를 매장에 닿게 하고 싶은 니드가 있습니다.' },
        { label: '운영자의 콘텐츠 운영 서비스', detail: '운영자는 콘텐츠 확보 · 정리 · 제공을 하나의 운영 서비스로 제공할 수 있습니다.' },
        { label: '참여 매장의 활용', detail: '매장은 직접 만들 필요 없이 좋은 자료를 활용할 수 있습니다.' },
        { label: '운영자의 사업 모델', detail: '세 주체의 니드가 맞물려, 콘텐츠 운영 자체가 운영자의 수익 모델이 될 수 있습니다.' },
      ],
    },
    {
      id: 'no-tool',
      step: '10',
      title: 'O4O가 콘텐츠 제작 기능을 만들지 않는 이유',
      description:
        'O4O는 자동 콘텐츠 제작 플랫폼을 지향하지 않습니다. 좋은 콘텐츠는 이미 공급자가 보유하고 있고, 플랫폼은 그것을 잘 저장 · 배포 · 활용하는 환경을 제공하는 데 집중합니다.',
      items: [
        { label: '좋은 콘텐츠는 공급자가 보유', detail: '제품을 가장 잘 아는 공급자가 이미 좋은 콘텐츠를 가지고 있습니다.' },
        { label: '공급자는 전문 제작사를 활용', detail: '공급자는 필요하면 전문 제작사를 활용해 콘텐츠를 만듭니다.' },
        { label: '운영자는 오프라인 협력 가능', detail: '운영자는 오프라인 협력 · 직접 제작으로 부족한 부분을 보완할 수 있습니다.' },
        { label: '플랫폼은 환경 제공', detail: 'O4O는 콘텐츠를 저장 · 배포 · 활용하는 환경을 제공하는 데 집중합니다.' },
      ],
    },
    {
      id: 'start',
      step: '11',
      title: '시작 방법',
      description:
        '처음 시작할 때는 아래 순서를 따르면 됩니다. 가능한 것부터 시작하면 됩니다.',
      items: [
        { label: '1. 공급자 확보', detail: '콘텐츠 · 제품을 제공할 공급자와 협력합니다.' },
        { label: '2. 콘텐츠 확보', detail: '공급자 자료를 확보하거나 직접 · 외부 제작으로 마련합니다.' },
        { label: '3. 운영 정책 수립', detail: '무엇을 어떤 매장에 어떻게 제공할지 운영 정책을 정합니다.' },
        { label: '4. 참여 매장 확보', detail: '콘텐츠를 활용할 매장을 모읍니다.' },
        { label: '5. 매장 HUB 제공', detail: '매장 HUB로 콘텐츠를 전달합니다.' },
        { label: '6. 콘텐츠 활용 지원', detail: '매장이 잘 활용하도록 지속적으로 지원합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 운영자 가이드', to: '/guide/for-operator' },
    home: { label: '이용 안내로', to: '/guide' },
  },
};

// ─── /guide/business/event-offer (이벤트 오퍼 운영 안내) ────────────────
// WO-O4O-NETURE-BUSINESS-GUIDE-EVENT-OFFER-V1
// 네 번째 사업 운영 안내서. 왜 이벤트 오퍼를 운영·참여하는가 — 유통질서·특별 공급 조건.

export const netureGuideBusinessEventOfferProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '사업 운영 안내',
    title: '이벤트 오퍼 운영 안내',
    description:
      '공급자 · 운영자 · 참여 매장이 이벤트 오퍼를 왜 활용하는지, 어떤 목적으로 운영하는지 설명합니다. 기능 사용법이나 공동구매 운영법이 아닙니다. 특히 "많이 모이면 무조건 싸게 산다"는 일반적 인식과, O4O의 유통질서 · 특별 공급 조건 개념의 차이를 정리하는 운영 안내서입니다.',
    primaryAction: { label: '운영 참여 검토 신청 →', to: '/o4o/apply' },
    flowBarTitle: '안내 흐름',
    flowLabels: ['처음 인식', '무엇인가', '3주체 목적', '유통질서', '특별 공급 조건', '시작'],
  },
  index: {
    title: '이벤트 오퍼 운영 한눈에 보기',
    lead: [
      '이벤트 오퍼는 단순 공동구매 · 대량구매 할인이 아닙니다.',
      '공급자는 유통질서에 민감하며, 무조건 저가 판매가 목적이 아닙니다.',
      '이벤트 오퍼는 특정 운영자 · 특정 참여 매장에 제공되는 특별 공급 조건에 가깝습니다.',
    ],
    cards: [
      { title: '이 문서의 대상', audience: '공통', summary: '공급자 · 운영자 · 참여 매장.', to: '#audience' },
      { title: '처음에 생각하는 것', audience: '공통', summary: '공동구매 · 대량구매 할인 · 많이 모이면 저렴.', to: '#misread' },
      { title: 'O4O의 이벤트 오퍼는 무엇인가', audience: '공통', summary: '단순 공동구매 기능이 아니라 세 주체의 운영 구조.', to: '#what' },
      { title: '공급자는 왜 하는가', audience: '공급자', summary: '신규 매장 · 신규 제품 · 인지도 · 경쟁 제품 대체.', to: '#supplier-why' },
      { title: '운영자는 왜 운영하는가', audience: '운영자', summary: '참여 매장 지원 · 공급자 협력 · 운영 서비스.', to: '#operator-why' },
      { title: '참여 매장은 왜 참여하는가', audience: '매장', summary: '좋은 공급 조건 · 신규 제품 검토 · 판매 기회.', to: '#store-why' },
      { title: '유통질서와 이벤트 오퍼', audience: '중요', summary: '저가 행사가 아니라 특정 대상 · 특정 조건.', to: '#order' },
      { title: '특별 공급 조건이라는 개념', audience: '중요', summary: '대량구매 할인보다 특별 공급 조건에 가깝습니다.', to: '#special-supply' },
      { title: '이벤트 오퍼와 콘텐츠', audience: '공통', summary: '단순 가격 행사가 아닌 이유 — 콘텐츠가 함께.', to: '#content' },
      { title: '실제 운영 흐름', audience: '공통', summary: '공급자 → 오퍼 제안 → 운영자 → 참여 매장 → 소비자.', to: '#flow' },
      { title: '시작 방법', audience: '공통', summary: '공급자 협력 → 기획 → 콘텐츠 → 모집 → 운영 → 결과.', to: '#start' },
    ],
  },
  sections: [
    {
      id: 'audience',
      step: '01',
      title: '이 문서의 대상',
      description:
        '이벤트 오퍼는 O4O에서 가장 관심을 많이 받는 운영 구조 중 하나입니다. 아래 주체가 함께 활용합니다.',
      items: [
        { label: '공급자', detail: '도매 · 제조 · 수입 · 브랜드사 등 제품을 공급하는 사업자.' },
        { label: '운영자', detail: '협동조합 준비 그룹 · 약국 네트워크 운영자 등 서비스를 운영하는 주체.' },
        { label: '참여 매장', detail: '오퍼에 참여해 제품을 다루는 매장.' },
      ],
    },
    {
      id: 'misread',
      step: '02',
      title: '많은 사람들이 처음에 생각하는 것',
      description:
        '이벤트 오퍼를 처음 보면 보통 익숙한 개념으로 이해합니다. 여기서는 옳고 그름을 판단하지 않고, 일반적으로 떠올리는 생각을 정리합니다.',
      items: [
        { label: '공동구매', detail: '여럿이 모여 함께 사는 공동구매로 이해하기 쉽습니다.' },
        { label: '대량구매 할인', detail: '많이 사면 깎아주는 대량구매 할인으로 이해하기 쉽습니다.' },
        { label: '많이 모이면 저렴', detail: '참여가 많을수록 무조건 싸진다고 기대하기 쉽습니다.' },
      ],
    },
    {
      id: 'what',
      step: '03',
      title: 'O4O의 이벤트 오퍼는 무엇인가',
      description:
        'O4O의 이벤트 오퍼는 단순한 공동구매 기능이 아닙니다. 공급자 · 운영자 · 참여 매장이 각자의 목적을 가지고 함께 활용하는 운영 구조입니다.',
      items: [
        { label: '공급자', detail: '명확한 운영 목적(신규 매장 · 제품 도입 등)을 위해 특별 공급 조건을 제공합니다.' },
        { label: '운영자', detail: '참여 매장을 지원하고 공급자와 조율하며 오퍼를 운영합니다.' },
        { label: '참여 매장', detail: '제시된 조건을 확인하고 참여 여부를 판단해 제품을 다룹니다.' },
      ],
    },
    {
      id: 'supplier-why',
      step: '04',
      title: '공급자는 왜 이벤트 오퍼를 하는가',
      description:
        '공급자에게 이벤트 오퍼는 단순 할인 행사가 아니라, 명확한 운영 목적을 이루기 위한 수단입니다.',
      items: [
        { label: '신규 매장 확보', detail: '제품을 새로 취급할 매장을 확보합니다.' },
        { label: '신규 제품 도입', detail: '새 제품을 매장에 도입시킵니다.' },
        { label: '신규 브랜드 인지도 확보', detail: '새 브랜드를 매장 · 소비자에게 알립니다.' },
        { label: '경쟁 제품 대체', detail: '매장의 경쟁 제품을 자사 제품으로 대체합니다.' },
        { label: '특정 그룹 대상 공급', detail: '모두가 아니라 특정 운영자 · 참여 그룹에 조건을 제공합니다.' },
        { label: '제품 정보 전달 기회', detail: '제품 · 건강 정보를 매장 · 소비자에게 전달할 기회를 만듭니다.' },
      ],
    },
    {
      id: 'operator-why',
      step: '05',
      title: '운영자는 왜 이벤트 오퍼를 운영하는가',
      description:
        '운영자에게 이벤트 오퍼는 참여 매장을 지원하고 공급자와 협력하는 운영 서비스의 한 축입니다.',
      items: [
        { label: '참여 매장 지원', detail: '좋은 조건을 매장에 연결해 매장 운영을 지원합니다.' },
        { label: '공급자 협력', detail: '공급자의 목적을 이해하고 유통질서를 해치지 않게 조율합니다.' },
        { label: '운영 서비스 제공', detail: '오퍼 운영을 하나의 운영 서비스로 제공합니다.' },
        { label: '운영자 승인 상품과 연계', detail: '검토 · 승인한 상품과 연계해 신뢰를 더합니다.' },
        { label: '콘텐츠 운영과 연계', detail: '오퍼 제품의 콘텐츠를 함께 제공해 매장 활용을 돕습니다.' },
      ],
    },
    {
      id: 'store-why',
      step: '06',
      title: '참여 매장은 왜 참여하는가',
      description:
        '참여 매장에게 이벤트 오퍼는 좋은 조건으로 제품을 검토 · 도입할 기회입니다.',
      items: [
        { label: '좋은 공급 조건', detail: '현재 판매 중인 · 새로운 제품을 좋은 조건으로 공급받습니다.' },
        { label: '신규 제품 검토', detail: '새 제품을 부담 없이 검토 · 도입할 수 있습니다.' },
        { label: '운영자 추천 상품 검토', detail: '운영자가 검토 · 추천한 상품을 안심하고 봅니다.' },
        { label: '콘텐츠 활용', detail: '제품 콘텐츠를 함께 받아 매장에서 활용합니다.' },
        { label: '판매 기회 확보', detail: '좋은 조건과 자료로 새로운 판매 기회를 만듭니다.' },
      ],
    },
    {
      id: 'order',
      step: '07',
      title: '유통질서와 이벤트 오퍼',
      description:
        '이벤트 오퍼를 이해하려면 유통질서를 먼저 이해해야 합니다. 공급자는 유통질서에 민감하며, 이벤트 오퍼는 무차별 저가 행사가 아닙니다.',
      items: [
        { label: '공급자는 유통질서에 민감', detail: '기존 거래선 · 가격 정책 보호 때문에 무리한 가격 인하는 받아들이기 어렵습니다.' },
        { label: '무조건 저가 판매가 목적이 아님', detail: '가장 싸게 파는 것이 목적이 아니라, 분명한 운영 목적을 위한 조건입니다.' },
        { label: '모든 매장 대상 행사가 아님', detail: '누구나 참여하는 공개 할인이 아닙니다.' },
        { label: '특정 운영자', detail: '특정 운영자가 운영하는 범위에서 제공됩니다.' },
        { label: '특정 참여 그룹', detail: '특정 참여 매장 · 그룹에게만 제공됩니다.' },
        { label: '특정 조건', detail: '기간 · 수량 · 대상이 정해진 특정 조건으로 운영됩니다.' },
      ],
    },
    {
      id: 'special-supply',
      step: '08',
      title: '특별 공급 조건이라는 개념',
      description:
        '그래서 이벤트 오퍼는 "많이 모으면 싸지는" 대량구매 할인이라기보다, 특정 운영자 또는 특정 참여 매장에게 제공되는 특별 공급 조건에 가깝습니다. 이 점이 O4O 이벤트 오퍼를 이해하는 핵심입니다.',
      items: [
        { label: '대량구매 할인과의 차이', detail: '참여 수가 많다고 무한정 싸지는 구조가 아닙니다. 조건은 공급자와의 합의로 정해집니다.' },
        { label: '특정 대상에게 제공', detail: '특정 운영자 · 특정 참여 매장이라는 분명한 대상에게 제공됩니다.' },
        { label: '목적이 있는 조건', detail: '신규 매장 · 제품 도입 · 대체 등 공급자의 목적이 있는 조건입니다.' },
        { label: '유통질서와 정합', detail: '공급자의 유통질서를 해치지 않는 선에서 설계됩니다.' },
      ],
    },
    {
      id: 'content',
      step: '09',
      title: '이벤트 오퍼와 콘텐츠',
      description:
        '이벤트 오퍼가 단순 가격 행사가 아닌 이유는 콘텐츠가 함께하기 때문입니다. 좋은 조건만이 아니라, 제품을 설명하고 소비자에게 안내하는 콘텐츠가 함께 제공됩니다.',
      items: [
        { label: '공급자 콘텐츠', detail: '제품 설명 · 이미지 · 영상 등 공급자가 보유한 콘텐츠가 함께 제공됩니다.' },
        { label: '운영자 콘텐츠', detail: '운영자가 매장에 맞게 정리 · 보완한 콘텐츠를 더합니다.' },
        { label: '매장 활용 자료', detail: 'POP · QR · 사이니지 등 매장에서 바로 쓸 자료가 함께합니다.' },
        { label: '소비자 안내', detail: '소비자에게 제품 · 건강 정보를 전달해 단순 가격 경쟁을 넘어섭니다.' },
      ],
    },
    {
      id: 'flow',
      step: '10',
      title: '실제 운영 흐름',
      description:
        '실제 운영은 공급자의 오퍼 제안에서 시작해 운영자 · 참여 매장을 거쳐 소비자에게 닿습니다.',
      items: [
        { label: '공급자', detail: '운영 목적에 맞는 이벤트 오퍼와 특별 공급 조건 · 콘텐츠를 준비합니다.' },
        { label: '이벤트 오퍼 제안', detail: '특정 운영자 · 참여 그룹을 대상으로 오퍼를 제안합니다.' },
        { label: '운영자', detail: '오퍼를 검토 · 조율하고 참여 매장에 안내 · 지원합니다.' },
        { label: '참여 매장', detail: '조건을 확인하고 참여해 제품 · 콘텐츠를 매장에 적용합니다.' },
        { label: '소비자', detail: '매장에서 제품 · 건강 정보를 전달받아 이해하고 구매합니다.' },
      ],
    },
    {
      id: 'start',
      step: '11',
      title: '시작 방법',
      description:
        '처음 시작할 때는 아래 순서를 따르면 됩니다. 가능한 것부터 시작하면 됩니다.',
      items: [
        { label: '1. 공급자 협력', detail: '오퍼를 제공할 공급자와 목적 · 조건을 협의합니다.' },
        { label: '2. 이벤트 오퍼 기획', detail: '대상 · 조건 · 기간 · 수량을 명확히 기획합니다.' },
        { label: '3. 콘텐츠 확보', detail: '제품 설명 · 매장 활용 자료를 함께 준비합니다.' },
        { label: '4. 참여 매장 모집', detail: '오퍼에 참여할 매장을 모집하고 조건을 안내합니다.' },
        { label: '5. 운영', detail: '오퍼를 진행하고 매장 참여 · 공급을 조율합니다.' },
        { label: '6. 결과 확인', detail: '매장 반응 · 참여 결과를 확인하고 다음 운영에 반영합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 운영자 가이드', to: '/guide/for-operator' },
    home: { label: '이용 안내로', to: '/guide' },
  },
};

// ─── /guide/business/approved-product (운영자 승인 상품 운영 안내) ───────
// WO-O4O-NETURE-BUSINESS-GUIDE-APPROVED-PRODUCT-V1
// 다섯 번째 사업 운영 안내서. 새 제품 → 운영자 검토 → 참여 매장 도입.

export const netureGuideBusinessApprovedProductProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '사업 운영 안내',
    title: '운영자 승인 상품 운영 안내',
    description:
      '공급자 · 운영자 · 참여 매장이 운영자 승인 상품을 왜 활용하는지 설명합니다. 상품 등록 방법이나 승인 기능 사용법이 아닙니다. 이벤트 오퍼가 "기존 제품의 특별 공급 조건"이라면, 운영자 승인 상품은 "새로운 제품을 운영자가 검토해 참여 매장이 안심하고 도입하는" 구조에 가깝습니다.',
    primaryAction: { label: '운영 참여 검토 신청 →', to: '/o4o/apply' },
    flowBarTitle: '안내 흐름',
    flowLabels: ['도입 어려움', '무엇인가', '3주체 목적', '콘텐츠', '모집 관계', '시작'],
  },
  index: {
    title: '운영자 승인 상품 운영 한눈에 보기',
    lead: [
      '새로운 제품을 매장이 직접 다 검토하기는 어렵습니다.',
      '운영자가 참여 매장을 대신해 제품을 검토하고 정리합니다.',
      '매장은 운영자 검토를 신뢰의 근거로 삼아 새 제품을 안심하고 도입합니다.',
    ],
    cards: [
      { title: '이 문서의 대상', audience: '공통', summary: '공급자 · 운영자 · 참여 매장.', to: '#audience' },
      { title: '새 제품 도입은 왜 어려운가', audience: '공통', summary: '제품 수 · 검토 시간 · 정보 부족 · 설명 부담.', to: '#why-hard' },
      { title: '운영자 승인 상품은 무엇인가', audience: '공통', summary: '단순 승인 기능이 아니라 세 주체의 구조.', to: '#what' },
      { title: '공급자는 왜 활용하는가', audience: '공급자', summary: '신규 제품 소개 · 매장 진입 · 경쟁 제품 대체.', to: '#supplier-why' },
      { title: '운영자는 왜 활용하는가', audience: '운영자', summary: '참여 매장 지원 · 제품 검토 · 정보 정리 · 네트워크 운영.', to: '#operator-why' },
      { title: '참여 매장은 왜 활용하는가', audience: '매장', summary: '검토 시간 절약 · 제품/콘텐츠 확보 · 운영자 지원.', to: '#store-why' },
      { title: '콘텐츠와 운영자 승인 상품', audience: '공통', summary: '새 제품 도입에는 콘텐츠가 중요합니다.', to: '#content' },
      { title: '판매자 모집과의 관계', audience: '공통', summary: '모집 · 서비스 한정 판매 · 승인 상품의 연결.', to: '#recruit-relation' },
      { title: '실제 운영 흐름', audience: '공통', summary: '공급자 → 운영자 검토 → 참여 매장 → 소비자.', to: '#flow' },
      { title: '운영자 승인 상품과 네트워크', audience: '공통', summary: '협동조합 · 전문 · 지역 · 공급자 기반 네트워크.', to: '#network' },
      { title: '시작 방법', audience: '공통', summary: '공급자 협력 → 제품 검토 → 콘텐츠 → 매장 안내 → 운영.', to: '#start' },
    ],
  },
  sections: [
    {
      id: 'audience',
      step: '01',
      title: '이 문서의 대상',
      description:
        '이 문서는 새로운 제품을 매장에 소개 · 도입하려는 주체와, 그 검토를 대신해 줄 운영을 준비하는 주체를 위한 것입니다.',
      items: [
        { label: '공급자', detail: '새로운 제품을 소개 · 도입하려는 도매 · 제조 · 수입 · 브랜드사.' },
        { label: '운영자', detail: '협동조합 준비 그룹 · 약국 네트워크 운영자 등 참여 매장을 대신해 제품을 검토 · 정리하는 주체.' },
        { label: '참여 매장', detail: '새 제품을 검토 · 도입하려는 매장.' },
      ],
    },
    {
      id: 'why-hard',
      step: '02',
      title: '새로운 제품을 도입하는 것은 왜 어려운가',
      description:
        '매장이 새 제품을 직접 다 검토하기는 현실적으로 어렵습니다. 그래서 운영자의 검토가 의미를 가집니다.',
      items: [
        { label: '제품 수가 많다', detail: '다품종 시장에서는 검토할 새 제품이 끊임없이 많습니다.' },
        { label: '검토 시간이 부족하다', detail: '매장은 일상 운영만으로도 바빠 제품 검토 시간을 내기 어렵습니다.' },
        { label: '정보가 부족하다', detail: '제품을 판단할 정보 · 자료가 충분하지 않은 경우가 많습니다.' },
        { label: '기존 제품을 쉽게 중단할 수 없다', detail: '새 제품을 들이려면 기존 제품 · 진열을 조정해야 하는 부담이 있습니다.' },
        { label: '소비자 설명이 필요하다', detail: '새 제품은 소비자에게 설명할 자료 · 준비가 필요합니다.' },
      ],
    },
    {
      id: 'what',
      step: '03',
      title: '운영자 승인 상품은 무엇인가',
      description:
        '운영자 승인 상품은 단순한 승인 기능이 아니라, 공급자 · 운영자 · 참여 매장이 함께 활용하는 구조입니다. 운영자가 참여 매장을 대신해 제품을 검토하고, 매장은 그 검토를 신뢰의 근거로 삼습니다.',
      items: [
        { label: '공급자', detail: '새 제품과 자료 · 조건을 운영자에게 제출합니다.' },
        { label: '운영자', detail: '제품 · 자료 · 조건 · 표시광고 위험을 검토하고 승인 · 정리합니다.' },
        { label: '참여 매장', detail: '운영자 검토를 신뢰의 근거로 새 제품을 안심하고 검토 · 도입합니다.' },
      ],
    },
    {
      id: 'supplier-why',
      step: '04',
      title: '공급자는 왜 활용하는가',
      description:
        '공급자에게 운영자 승인 상품은 새로운 제품을 신뢰 있게 매장에 소개하는 통로입니다.',
      items: [
        { label: '신규 제품 소개', detail: '새 제품을 운영자 검토를 거쳐 신뢰 있게 소개합니다.' },
        { label: '신규 매장 진입', detail: '검토된 상품으로 새 매장에 진입할 가능성을 높입니다.' },
        { label: '경쟁 제품 대체', detail: '매장의 경쟁 제품을 자사 제품으로 대체할 기회를 만듭니다.' },
        { label: '제품 정보 전달', detail: '제품 · 건강 정보를 운영자 · 매장에 전달합니다.' },
        { label: '판매자 모집', detail: '검토된 상품을 다룰 매장을 모집하는 기반이 됩니다.' },
      ],
    },
    {
      id: 'operator-why',
      step: '05',
      title: '운영자는 왜 활용하는가',
      description:
        '운영자에게 승인 상품은 참여 매장을 지원하는 핵심 운영 활동입니다.',
      items: [
        { label: '참여 매장 지원', detail: '매장이 직접 못 하는 제품 검토를 대신해 지원합니다.' },
        { label: '제품 검토', detail: '제품 · 자료 · 조건 · 위험을 검토해 매장에 나갈 상품을 가립니다.' },
        { label: '정보 정리', detail: '제품 정보를 매장이 바로 쓸 수 있게 정리합니다.' },
        { label: '콘텐츠 제공', detail: '검토한 상품의 콘텐츠를 함께 제공합니다.' },
        { label: '네트워크 운영', detail: '승인 상품을 축으로 매장 네트워크를 운영합니다.' },
      ],
    },
    {
      id: 'store-why',
      step: '06',
      title: '참여 매장은 왜 활용하는가',
      description:
        '참여 매장에게 승인 상품은 검토 부담을 덜고 새 제품을 안심하고 도입하는 방법입니다.',
      items: [
        { label: '검토 시간 절약', detail: '운영자가 검토했으므로 매장의 검토 부담이 줄어듭니다.' },
        { label: '제품 정보 확보', detail: '정리된 제품 정보를 함께 받습니다.' },
        { label: '콘텐츠 확보', detail: '제품 설명 · 매장 활용 콘텐츠를 함께 받습니다.' },
        { label: '신규 제품 검토', detail: '새 제품을 부담 없이 검토 · 도입할 수 있습니다.' },
        { label: '운영자 지원 활용', detail: '운영자의 지원을 받아 도입 · 판매를 진행합니다.' },
      ],
    },
    {
      id: 'content',
      step: '07',
      title: '콘텐츠와 운영자 승인 상품',
      description:
        '새로운 제품 도입에는 콘텐츠가 특히 중요합니다. 소비자가 처음 보는 제품일수록 설명 · 안내 자료가 있어야 매장이 다룰 수 있습니다.',
      items: [
        { label: '제품 설명서', detail: '제품 특징 · 사용법을 담은 설명자료.' },
        { label: '이미지', detail: '매장 안내 · 온라인 · 인쇄용 제품 이미지.' },
        { label: 'POP', detail: '매장 내 비치 · 부착 안내물.' },
        { label: 'QR', detail: '제품 · 건강 정보로 연결되는 QR 자료.' },
        { label: '블로그', detail: '소비자 설명에 쓰는 글 콘텐츠.' },
        { label: '영상', detail: '제품 소개 · 사용법 영상.' },
        { label: '교육자료', detail: '직원 · 고객 교육 자료.' },
        { label: '상담자료', detail: '소비자 상담 시 활용하는 설명자료.' },
        { label: '건강정보 자료', detail: '제품과 관련된 건강 정보 자료.' },
      ],
    },
    {
      id: 'recruit-relation',
      step: '08',
      title: '판매자 모집과의 관계',
      description:
        '판매자 모집 · 서비스 한정 판매 · 운영자 승인 상품은 서로 다른 기능이지만, 새 제품을 매장에 연결하는 과정에서 함께 연결될 수 있습니다.',
      items: [
        { label: '판매자 모집', detail: '제품을 다룰 매장을 모집해 유통 기반을 만듭니다.' },
        { label: '서비스 한정 판매', detail: '특정 네트워크 · 참여 매장에 한정해 제품을 공급합니다.' },
        { label: '운영자 승인 상품', detail: '운영자가 검토 · 승인한 상품을 매장이 안심하고 다룹니다.' },
        { label: '연결되는 방식', detail: '승인 상품을 축으로 매장을 모집하고, 특정 매장에 한정 공급하는 식으로 연결할 수 있습니다.' },
      ],
    },
    {
      id: 'flow',
      step: '09',
      title: '실제 운영 흐름',
      description:
        '실제 운영은 공급자의 제품 제출에서 시작해 운영자 검토 · 참여 매장을 거쳐 소비자에게 닿습니다.',
      items: [
        { label: '공급자', detail: '새 제품과 자료 · 조건을 운영자에게 제출합니다.' },
        { label: '운영자 검토', detail: '제품 · 자료 · 조건 · 위험을 검토해 승인 · 정리하고 콘텐츠를 준비합니다.' },
        { label: '참여 매장', detail: '승인 상품을 검토 · 도입하고 콘텐츠를 활용해 판매합니다.' },
        { label: '소비자', detail: '매장에서 제품 · 건강 정보를 전달받아 이해하고 구매합니다.' },
      ],
    },
    {
      id: 'network',
      step: '10',
      title: '운영자 승인 상품과 네트워크',
      description:
        '운영자 승인 상품은 여러 형태의 네트워크 위에서 운영될 수 있습니다. 아래는 형태의 예시이며, 특정 조직 사례가 아닙니다.',
      items: [
        { label: '협동조합', detail: '조합이 운영자로서 제품을 검토 · 승인해 조합원 매장에 제공합니다.' },
        { label: '전문 네트워크', detail: '특정 분야 전문 네트워크가 전문성을 기준으로 제품을 검토합니다.' },
        { label: '지역 네트워크', detail: '지역 단위 네트워크가 지역 매장에 맞는 제품을 검토 · 제공합니다.' },
        { label: '공급자 기반 네트워크', detail: '공급자가 운영자가 되어 자사 · 협력 제품을 검토 · 제공합니다.' },
      ],
    },
    {
      id: 'start',
      step: '11',
      title: '시작 방법',
      description:
        '처음 시작할 때는 아래 순서를 따르면 됩니다. 가능한 것부터 시작하면 됩니다.',
      items: [
        { label: '1. 공급자 협력', detail: '제품을 제출할 공급자와 협력합니다.' },
        { label: '2. 제품 검토', detail: '제품 · 자료 · 조건 · 위험을 검토해 승인 상품을 가립니다.' },
        { label: '3. 콘텐츠 확보', detail: '제품 설명 · 매장 활용 콘텐츠를 확보합니다.' },
        { label: '4. 참여 매장 안내', detail: '승인 상품을 참여 매장에 안내합니다.' },
        { label: '5. 운영', detail: '도입 · 판매를 지원하고 매장 반응을 다음 검토에 반영합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 운영자 가이드', to: '/guide/for-operator' },
    home: { label: '이용 안내로', to: '/guide' },
  },
};

// ─── /guide/business/seller-recruitment (판매자 모집 운영 안내) ──────────
// WO-O4O-NETURE-BUSINESS-GUIDE-SELLER-RECRUITMENT-V1
// 여섯 번째 사업 운영 안내서. 세 주체가 함께 판매 네트워크를 형성하는 이유·구조.

export const netureGuideBusinessSellerRecruitmentProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '사업 운영 안내',
    title: '판매자 모집 운영 안내',
    description:
      '공급자 · 운영자 · 참여 매장이 판매자 모집을 왜 활용하는지, 어떤 목적으로 운영하는지 설명합니다. 기능 사용법이나 단순 입점 · 영업 모집 방법이 아닙니다. 세 주체가 함께 판매 네트워크를 형성하는 이유와 구조를 설명하는 운영 안내서이며, 운영자 승인 상품 · 콘텐츠 · 이벤트 오퍼와 자연스럽게 연결됩니다.',
    primaryAction: { label: '운영 참여 검토 신청 →', to: '/o4o/apply' },
    flowBarTitle: '안내 흐름',
    flowLabels: ['처음 접근', '무엇인가', '3주체 목적', '승인 상품 연계', '콘텐츠 · 오퍼', '시작'],
  },
  index: {
    title: '판매자 모집 운영 한눈에 보기',
    lead: [
      '판매자 모집은 단순 입점 모집 · 판매처 늘리기가 아닙니다.',
      '공급자 · 운영자 · 참여 매장이 함께 판매 네트워크를 형성하는 과정입니다.',
      '제품 등록만으로 이루어지지 않고, 콘텐츠 · 검토 · 조건이 함께합니다.',
    ],
    cards: [
      { title: '이 문서의 대상', audience: '공통', summary: '공급자 · 운영자 · 참여 매장.', to: '#audience' },
      { title: '처음에 생각하는 것', audience: '공급자', summary: '광고 · 쇼핑몰 등록 · 판매처 늘리기.', to: '#misread' },
      { title: 'O4O의 판매자 모집은 무엇인가', audience: '공통', summary: '단순 입점 모집이 아니라 판매 네트워크 형성.', to: '#what' },
      { title: '공급자는 왜 하는가', audience: '공급자', summary: '신규 매장 · 제품 도입 · 인지도 · 지역 · 전문 매장.', to: '#supplier-why' },
      { title: '운영자는 왜 하는가', audience: '운영자', summary: '참여 매장 지원 · 네트워크 확대 · 승인 상품 · 콘텐츠.', to: '#operator-why' },
      { title: '참여 매장은 왜 참여하는가', audience: '매장', summary: '새 제품 검토 · 운영자 검토 활용 · 차별화 상품.', to: '#store-why' },
      { title: '판매자 모집과 운영자 승인 상품', audience: '공통', summary: '신규 제품 → 운영자 검토 → 참여 매장 도입.', to: '#approved-relation' },
      { title: '판매자 모집과 콘텐츠', audience: '공통', summary: '제품 등록만으로 안 됩니다 — 콘텐츠가 함께.', to: '#content' },
      { title: '판매자 모집과 이벤트 오퍼', audience: '공통', summary: '서로 다른 구조이지만 함께 활용될 수 있습니다.', to: '#event-relation' },
      { title: '실제 운영 흐름', audience: '공통', summary: '공급자 → 모집 제안 → 운영자 → 참여 매장 → 소비자.', to: '#flow' },
      { title: '시작 방법', audience: '공통', summary: '등록 → 제품 · 콘텐츠 → 모집 → 운영자 협력 → 매장 확보.', to: '#start' },
    ],
  },
  sections: [
    {
      id: 'audience',
      step: '01',
      title: '이 문서의 대상',
      description:
        '이 문서는 제품을 판매할 매장을 찾는 주체, 그 연결을 운영하는 주체, 새 제품을 검토하려는 매장을 위한 것입니다.',
      items: [
        { label: '공급자', detail: '제조사 · 수입사 · 브랜드사 · 도매상 · 총판 등 제품을 판매할 매장을 찾는 사업자.' },
        { label: '운영자', detail: '협동조합 · 약국 네트워크 운영자 · 전문 네트워크 운영자 등 공급자와 매장을 연결하는 주체.' },
        { label: '참여 매장', detail: '약국 · 전문매장 · 기타 판매점 등 새 제품을 검토 · 판매하려는 매장.' },
      ],
    },
    {
      id: 'misread',
      step: '02',
      title: '많은 공급자들이 처음에 생각하는 것',
      description:
        '새 제품을 출시하면 보통 익숙한 방법을 먼저 떠올립니다. 여기서는 옳고 그름을 판단하지 않고, 일반적으로 생각하는 접근을 정리합니다.',
      items: [
        { label: '광고를 하면 된다', detail: '광고로 알리면 판매가 따라올 것이라 생각하기 쉽습니다.' },
        { label: '쇼핑몰에 등록하면 된다', detail: '쇼핑몰에 올리면 팔릴 것이라 기대하기 쉽습니다.' },
        { label: '판매처가 늘어나면 된다', detail: '판매처 수만 늘리면 될 것이라 생각하기 쉽습니다.' },
      ],
    },
    {
      id: 'what',
      step: '03',
      title: 'O4O의 판매자 모집은 무엇인가',
      description:
        'O4O의 판매자 모집은 단순 입점 모집이 아닙니다. 공급자 · 운영자 · 참여 매장이 함께 활용하는 운영 구조이며, 판매 네트워크를 형성하는 과정입니다.',
      items: [
        { label: '공급자', detail: '제품을 다룰 매장을 찾고, 검토 · 조건 · 콘텐츠를 준비합니다.' },
        { label: '운영자', detail: '공급자와 매장을 연결하고, 검토 · 지원으로 네트워크를 만듭니다.' },
        { label: '참여 매장', detail: '제시된 제품 · 조건을 검토하고 참여 여부를 판단합니다.' },
      ],
    },
    {
      id: 'supplier-why',
      step: '04',
      title: '공급자는 왜 판매자 모집을 하는가',
      description:
        '공급자에게 판매자 모집은 제품을 다룰 매장을 신뢰 있게 확보하는 과정입니다.',
      items: [
        { label: '신규 매장 확보', detail: '제품을 취급할 새 매장을 확보합니다.' },
        { label: '신규 제품 도입', detail: '새 제품을 매장에 도입시킵니다.' },
        { label: '브랜드 인지도 확대', detail: '브랜드를 더 많은 매장 · 소비자에게 알립니다.' },
        { label: '지역 확장', detail: '특정 지역으로 판매 매장을 확장합니다.' },
        { label: '전문 매장 확보', detail: '제품에 맞는 전문 매장을 확보합니다.' },
        { label: '제품 정보 전달', detail: '제품 · 건강 정보를 매장에 전달합니다.' },
      ],
    },
    {
      id: 'operator-why',
      step: '05',
      title: '운영자는 왜 판매자 모집을 하는가',
      description:
        '운영자에게 판매자 모집은 네트워크를 키우고 참여 매장을 지원하는 핵심 운영 활동입니다.',
      items: [
        { label: '참여 매장 지원', detail: '좋은 제품 · 조건을 매장에 연결해 지원합니다.' },
        { label: '네트워크 확대', detail: '참여 매장을 늘려 운영 기반을 키웁니다.' },
        { label: '승인 상품 운영', detail: '검토 · 승인한 상품을 다룰 매장을 모읍니다.' },
        { label: '콘텐츠 운영', detail: '제품 콘텐츠를 함께 제공해 매장 활용을 돕습니다.' },
        { label: '공급자 협력', detail: '공급자의 목적을 이해하고 매장 연결을 조율합니다.' },
      ],
    },
    {
      id: 'store-why',
      step: '06',
      title: '참여 매장은 왜 참여하는가',
      description:
        '참여 매장에게 판매자 모집은 검토된 새 제품과 자료를 확보하는 기회입니다.',
      items: [
        { label: '새로운 제품 검토', detail: '새 제품을 부담 없이 검토 · 도입할 수 있습니다.' },
        { label: '운영자 검토 활용', detail: '운영자가 검토한 제품이라 안심하고 봅니다.' },
        { label: '콘텐츠 확보', detail: '제품 설명 · 매장 활용 콘텐츠를 함께 받습니다.' },
        { label: '판매 기회 확보', detail: '좋은 제품 · 자료로 새 판매 기회를 만듭니다.' },
        { label: '차별화 상품 확보', detail: '다른 매장과 차별화할 제품을 확보합니다.' },
      ],
    },
    {
      id: 'approved-relation',
      step: '07',
      title: '판매자 모집과 운영자 승인 상품',
      description:
        '판매자 모집은 운영자 승인 상품과 자연스럽게 연결됩니다. 새 제품이 운영자 검토를 거쳐 참여 매장에 도입되는 흐름이 판매자 모집의 한 축입니다.',
      items: [
        { label: '신규 제품', detail: '공급자가 새 제품을 운영자에게 제출합니다.' },
        { label: '운영자 검토', detail: '운영자가 제품을 검토 · 승인하고 정리합니다.' },
        { label: '참여 매장 도입', detail: '모집된 참여 매장이 승인 상품을 검토 · 도입합니다.' },
        { label: '연결 구조', detail: '승인 상품을 축으로 매장을 모집하면, 매장은 검토된 제품을 안심하고 받습니다.' },
      ],
    },
    {
      id: 'content',
      step: '08',
      title: '판매자 모집과 콘텐츠',
      description:
        '판매자 모집은 제품 등록만으로 이루어지지 않습니다. 콘텐츠가 함께 제공될 때 매장이 제품을 다루기 쉬워지고 모집 효과가 높아집니다.',
      items: [
        { label: '제품 설명서', detail: '제품 특징 · 사용법 설명자료.' },
        { label: '이미지', detail: '매장 안내 · 온라인 · 인쇄용 제품 이미지.' },
        { label: 'POP', detail: '매장 내 비치 · 부착 안내물.' },
        { label: 'QR', detail: '제품 · 건강 정보로 연결되는 QR 자료.' },
        { label: '블로그', detail: '소비자 설명에 쓰는 글 콘텐츠.' },
        { label: '영상', detail: '제품 소개 · 사용법 영상.' },
        { label: '교육자료', detail: '직원 · 고객 교육 자료.' },
        { label: '상담자료', detail: '소비자 상담 시 활용하는 설명자료.' },
        { label: '건강정보 자료', detail: '제품과 관련된 건강 정보 자료.' },
      ],
    },
    {
      id: 'event-relation',
      step: '09',
      title: '판매자 모집과 이벤트 오퍼',
      description:
        '판매자 모집과 이벤트 오퍼는 서로 다른 구조이지만 함께 활용될 수 있습니다. 모집으로 매장을 확보하고, 이벤트 오퍼로 참여를 유도하는 식으로 연결됩니다.',
      items: [
        { label: '신규 제품', detail: '판매자 모집은 새 제품을 다룰 매장을 찾는 데 강합니다.' },
        { label: '기존 제품', detail: '이벤트 오퍼는 기존 제품을 좋은 조건으로 다루게 하는 데 강합니다.' },
        { label: '특별 공급 조건', detail: '이벤트 오퍼의 특별 공급 조건으로 모집된 매장의 참여를 유도할 수 있습니다.' },
        { label: '참여 유도', detail: '두 구조를 함께 써서 매장 확보와 참여를 동시에 만들 수 있습니다.' },
      ],
    },
    {
      id: 'flow',
      step: '10',
      title: '실제 운영 흐름',
      description:
        '실제 운영은 공급자의 모집 제안에서 시작해 운영자 · 참여 매장을 거쳐 소비자에게 닿습니다.',
      items: [
        { label: '공급자', detail: '제품 · 콘텐츠 · 조건을 준비하고 모집을 제안합니다.' },
        { label: '판매자 모집 제안', detail: '제품을 다룰 매장의 조건 · 대상을 정해 제안합니다.' },
        { label: '운영자', detail: '제품을 검토 · 정리하고 매장을 모집 · 연결 · 지원합니다.' },
        { label: '참여 매장', detail: '제품 · 조건을 검토하고 참여해 콘텐츠를 활용해 판매합니다.' },
        { label: '소비자', detail: '매장에서 제품 · 건강 정보를 전달받아 이해하고 구매합니다.' },
      ],
    },
    {
      id: 'start',
      step: '11',
      title: '시작 방법',
      description:
        '처음 시작할 때는 아래 순서를 따르면 됩니다. 가능한 것부터 시작하면 됩니다.',
      items: [
        { label: '1. 공급자 등록', detail: '공급자로 참여를 등록합니다.' },
        { label: '2. 제품 준비', detail: '매장에 제안할 제품과 조건을 준비합니다.' },
        { label: '3. 콘텐츠 준비', detail: '제품 설명 · 매장 활용 콘텐츠를 준비합니다.' },
        { label: '4. 판매자 모집', detail: '제품을 다룰 매장을 대상 · 조건을 정해 모집합니다.' },
        { label: '5. 운영자 협력', detail: '운영자와 협력해 검토 · 연결 · 지원을 진행합니다.' },
        { label: '6. 참여 매장 확보', detail: '참여 매장을 확보하고 지속적인 관계로 이어갑니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 운영자 가이드', to: '/guide/for-operator' },
    home: { label: '이용 안내로', to: '/guide' },
  },
};

// ─── /guide/business/market-trial (유통참여형 펀딩 운영 안내) ────────────
// WO-O4O-NETURE-BUSINESS-GUIDE-MARKET-TRIAL-V1
// 일곱 번째 사업 운영 안내서. 출시 전·초기 제품 — 공급자 중심 시장 검증·초기 유통망.

export const netureGuideBusinessMarketTrialProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '사업 운영 안내',
    title: '유통참여형 펀딩 운영 안내',
    description:
      '공급자가 새로운 제품을 시장에 소개하고, 초기 참여 매장을 확보하며, 시장 반응을 확인하는 과정을 설명합니다. 펀딩 등록 방법이나 투자 설명이 아닙니다. 이미 출시된 제품을 다루는 다른 안내서와 달리, 유통참여형 펀딩은 출시 전 · 초기 단계 제품을 다루는 공급자 중심 운영 구조입니다.',
    primaryAction: { label: '운영 참여 검토 신청 →', to: '/o4o/apply' },
    flowBarTitle: '안내 흐름',
    flowLabels: ['소개 어려움', '무엇인가', '3주체 목적', '콘텐츠', '모집 · 오퍼 연계', '시작'],
  },
  index: {
    title: '유통참여형 펀딩 운영 한눈에 보기',
    lead: [
      '유통참여형 펀딩은 투자 상품이 아니라 공급자 중심의 시장 검증 구조입니다.',
      '출시 전 · 초기 단계 제품의 시장 반응을 확인하고 초기 참여 매장을 확보합니다.',
      '핵심은 자금 조달이 아니라 제품의 초기 유통망 형성입니다.',
    ],
    cards: [
      { title: '이 문서의 대상', audience: '공통', summary: '공급자 · 운영자 · 참여 매장.', to: '#audience' },
      { title: '새 제품 소개는 왜 어려운가', audience: '공급자', summary: '시장 반응 · 초기 판매처 · 정보 전달 · 홍보 비용.', to: '#why-hard' },
      { title: '유통참여형 펀딩은 무엇인가', audience: '공통', summary: '공급자 중심 시장 검증 · 초기 유통망 — 투자 상품 아님.', to: '#what' },
      { title: '공급자는 왜 활용하는가', audience: '공급자', summary: '제품 검증 · 초기 매장 · 시장 반응 · 브랜드 소개.', to: '#supplier-why' },
      { title: '운영자는 왜 참여하는가', audience: '운영자', summary: '공급자 지원 · 매장 연결 · 콘텐츠 · 네트워크 활성화.', to: '#operator-why' },
      { title: '참여 매장은 왜 참여하는가', audience: '매장', summary: '신규 제품 확인 · 초기 도입 기회 · 운영자 지원.', to: '#store-why' },
      { title: '콘텐츠와 유통참여형 펀딩', audience: '공통', summary: '신규 제품은 콘텐츠가 특히 중요합니다.', to: '#content' },
      { title: '유통참여형 펀딩과 판매자 모집', audience: '공통', summary: '초기 판매자 확보 · 판매 네트워크 형성.', to: '#recruit-relation' },
      { title: '유통참여형 펀딩과 이벤트 오퍼', audience: '공통', summary: '초기 제품과 출시 후 제품 — 서로 다른 구조.', to: '#event-relation' },
      { title: '실제 운영 흐름', audience: '공통', summary: '공급자 → 유통참여형 펀딩 → 운영자 → 참여 매장 → 소비자.', to: '#flow' },
      { title: '시작 방법', audience: '공통', summary: '제품 · 콘텐츠 → 운영자 협력 → 매장 모집 → 시장 검증.', to: '#start' },
    ],
  },
  sections: [
    {
      id: 'audience',
      step: '01',
      title: '이 문서의 대상',
      description:
        '이 문서는 새로운 · 초기 단계 제품을 시장에 소개하려는 주체와, 그 초기 유통을 함께 만드는 주체를 위한 것입니다.',
      items: [
        { label: '공급자', detail: '제조사 · 수입사 · 브랜드사 · 도매상 등 새 제품을 시장에 소개하려는 사업자.' },
        { label: '운영자', detail: '공급자를 지원하고 참여 매장을 연결하는 네트워크 운영자.' },
        { label: '참여 매장', detail: '새 제품을 먼저 확인 · 도입하려는 매장.' },
      ],
    },
    {
      id: 'why-hard',
      step: '02',
      title: '새로운 제품을 시장에 소개하는 것은 왜 어려운가',
      description:
        '공급자가 새 제품을 출시할 때는 여러 어려움을 만납니다. 유통참여형 펀딩은 이 문제를 함께 푸는 운영 구조입니다.',
      items: [
        { label: '시장 반응 확인', detail: '출시 전에는 제품이 시장에서 어떻게 받아들여질지 알기 어렵습니다.' },
        { label: '초기 판매처 확보', detail: '아직 검증되지 않은 제품을 다룰 초기 매장을 찾기 어렵습니다.' },
        { label: '제품 정보 전달', detail: '새 제품일수록 매장 · 소비자에게 설명할 정보 전달이 어렵습니다.' },
        { label: '콘텐츠 준비', detail: '제품을 설명할 콘텐츠를 처음부터 준비하는 부담이 큽니다.' },
        { label: '홍보 비용', detail: '초기 홍보 · 영업 비용 부담이 큽니다.' },
      ],
    },
    {
      id: 'what',
      step: '03',
      title: '유통참여형 펀딩은 무엇인가',
      description:
        '유통참여형 펀딩은 공급자 중심으로 새 제품의 시장 반응을 확인하고 초기 유통망을 만드는 운영 구조입니다. 투자 수익을 약속하는 금융 상품이 아닙니다.',
      items: [
        { label: '공급자 중심 구조', detail: '공급자가 새 제품을 소개하고 초기 유통을 만드는 것을 중심으로 합니다.' },
        { label: '투자 상품이 아님', detail: '주식 · 배당 · 이자 같은 금융 수익을 약속하지 않습니다. 목적은 자금 조달이 아닙니다.' },
        { label: '시장 검증 구조', detail: '제품의 시장 반응 · 매장 수요 · 소비자 관심을 확인합니다.' },
        { label: '초기 유통망 형성', detail: '핵심은 제품이 실제 매장에 처음 도입되는 초기 유통망을 만드는 것입니다.' },
      ],
    },
    {
      id: 'supplier-why',
      step: '04',
      title: '공급자는 왜 활용하는가',
      description:
        '공급자에게 유통참여형 펀딩은 새 제품을 검증하고 초기 매장을 확보하는 통로입니다.',
      items: [
        { label: '제품 검증', detail: '출시 전 · 초기 제품의 시장성을 검증합니다.' },
        { label: '초기 매장 확보', detail: '제품을 처음 다룰 초기 참여 매장을 확보합니다.' },
        { label: '시장 반응 확인', detail: '매장 · 소비자 반응을 확인해 제품 · 전략을 다듬습니다.' },
        { label: '콘텐츠 활용', detail: '제품 콘텐츠를 함께 제공해 매장 활용 · 소비자 설명을 돕습니다.' },
        { label: '신규 브랜드 소개', detail: '새 브랜드를 매장 · 소비자에게 소개합니다.' },
      ],
    },
    {
      id: 'operator-why',
      step: '05',
      title: '운영자는 왜 참여하는가',
      description:
        '운영자에게 유통참여형 펀딩은 공급자를 지원하고 네트워크를 활성화하는 운영 활동입니다.',
      items: [
        { label: '공급자 지원', detail: '공급자의 초기 제품 소개 · 검증을 지원합니다.' },
        { label: '참여 매장 연결', detail: '제품에 맞는 참여 매장을 연결합니다.' },
        { label: '콘텐츠 운영', detail: '제품 콘텐츠를 정리 · 제공해 매장 활용을 돕습니다.' },
        { label: '네트워크 활성화', detail: '새 제품 · 참여 기회로 매장 네트워크를 활성화합니다.' },
      ],
    },
    {
      id: 'store-why',
      step: '06',
      title: '참여 매장은 왜 참여하는가',
      description:
        '참여 매장에게 유통참여형 펀딩은 새 제품을 먼저 확인하고 초기에 도입할 기회입니다.',
      items: [
        { label: '신규 제품 확인', detail: '새로운 제품을 남보다 먼저 확인합니다.' },
        { label: '초기 도입 기회', detail: '초기 단계에 제품을 도입할 기회를 얻습니다.' },
        { label: '제품 정보 확보', detail: '제품 설명 · 자료를 함께 확보합니다.' },
        { label: '운영자 지원 활용', detail: '운영자의 지원을 받아 도입 · 판매를 진행합니다.' },
      ],
    },
    {
      id: 'content',
      step: '07',
      title: '콘텐츠와 유통참여형 펀딩',
      description:
        '신규 제품은 콘텐츠가 특히 중요합니다. 소비자가 처음 보는 제품일수록 설명 · 안내 자료가 있어야 매장이 다루고 소비자가 이해할 수 있습니다.',
      items: [
        { label: '제품 설명서', detail: '제품 특징 · 사용법 설명자료.' },
        { label: '이미지', detail: '매장 안내 · 온라인 · 인쇄용 제품 이미지.' },
        { label: 'POP', detail: '매장 내 비치 · 부착 안내물.' },
        { label: 'QR', detail: '제품 · 건강 정보로 연결되는 QR 자료.' },
        { label: '블로그', detail: '소비자 설명에 쓰는 글 콘텐츠.' },
        { label: '영상', detail: '제품 소개 · 사용법 영상.' },
        { label: '교육자료', detail: '직원 · 고객 교육 자료.' },
        { label: '건강정보 자료', detail: '제품과 관련된 건강 정보 자료.' },
      ],
    },
    {
      id: 'recruit-relation',
      step: '08',
      title: '유통참여형 펀딩과 판매자 모집',
      description:
        '유통참여형 펀딩은 판매자 모집과 연결될 수 있습니다. 초기 단계에서 확보한 참여 매장이 판매 네트워크의 출발점이 됩니다.',
      items: [
        { label: '신규 제품', detail: '유통참여형 펀딩은 새 제품의 초기 단계를 다룹니다.' },
        { label: '초기 판매자 확보', detail: '초기 참여 매장이 첫 판매자가 됩니다.' },
        { label: '판매 네트워크 형성', detail: '초기 매장을 기반으로 판매자 모집으로 네트워크를 넓힐 수 있습니다.' },
      ],
    },
    {
      id: 'event-relation',
      step: '09',
      title: '유통참여형 펀딩과 이벤트 오퍼',
      description:
        '유통참여형 펀딩과 이벤트 오퍼는 서로 다른 운영 구조입니다. 다루는 제품 단계가 다릅니다.',
      items: [
        { label: '초기 제품', detail: '유통참여형 펀딩은 출시 전 · 초기 단계 제품을 다룹니다.' },
        { label: '출시 후 제품', detail: '이벤트 오퍼는 이미 출시된 기존 제품을 다룹니다.' },
        { label: '특별 공급 조건', detail: '검증을 거쳐 출시된 후에는 이벤트 오퍼의 특별 공급 조건으로 이어질 수 있습니다.' },
      ],
    },
    {
      id: 'flow',
      step: '10',
      title: '실제 운영 흐름',
      description:
        '실제 운영은 공급자의 유통참여형 펀딩에서 시작해 운영자 · 참여 매장을 거쳐 소비자에게 닿습니다.',
      items: [
        { label: '공급자', detail: '새 제품과 콘텐츠 · 조건을 준비해 유통참여형 펀딩을 시작합니다.' },
        { label: '유통참여형 펀딩', detail: '시장 검증과 초기 유통망 형성을 목적으로 운영합니다.' },
        { label: '운영자', detail: '공급자를 지원하고 참여 매장을 연결 · 지원합니다.' },
        { label: '참여 매장', detail: '새 제품을 초기에 확인 · 도입하고 콘텐츠를 활용합니다.' },
        { label: '소비자', detail: '매장에서 제품 · 건강 정보를 전달받아 이해하고 구매합니다.' },
      ],
    },
    {
      id: 'start',
      step: '11',
      title: '시작 방법',
      description:
        '처음 시작할 때는 아래 순서를 따르면 됩니다. 가능한 것부터 시작하면 됩니다.',
      items: [
        { label: '1. 제품 준비', detail: '시장에 소개할 새 · 초기 제품과 조건을 준비합니다.' },
        { label: '2. 콘텐츠 준비', detail: '제품 설명 · 매장 활용 콘텐츠를 준비합니다.' },
        { label: '3. 운영자 협력', detail: '운영자와 협력해 참여 매장 연결 · 지원을 준비합니다.' },
        { label: '4. 참여 매장 모집', detail: '제품을 먼저 다룰 초기 참여 매장을 모집합니다.' },
        { label: '5. 시장 검증', detail: '매장 · 소비자 반응을 확인해 다음 유통 단계로 이어갑니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 운영자 가이드', to: '/guide/for-operator' },
    home: { label: '이용 안내로', to: '/guide' },
  },
};
