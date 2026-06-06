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
      '매장이 실제로 참여하는 오프라인 실행 기반의 유통 펀딩 방법을 안내합니다. 공급자가 진열 · 고객 안내 · 할인 조건까지 포함한 실행 시나리오를 제안하고, 매장이 참여 여부를 결정합니다.',
    primaryAction: { label: '유통참여형 펀딩으로 이동 →', to: '/market-trial' },
    flowBarTitle: '운영 흐름',
    flowLabels: ['Trial 작성', '오프라인 시나리오', '제출 · 승인', '매장 참여', '실행 · 정산'],
  },
  sections: [
    {
      step: '01',
      title: 'Trial 기본 정보 작성',
      routeLabel: '/supplier/market-trial/new',
      description:
        '공급자가 Trial 초안을 작성합니다. 어떤 상품을, 어떤 조건으로, 몇 개 매장에 제안할지를 설정합니다.',
      items: [
        {
          label: '상품 및 소개',
          detail: '제목 · 한 줄 설명 · 소개 영상 · 상세 설명을 작성합니다.',
        },
        {
          label: '참여 조건',
          detail: '최대 참여 매장 수 · 펀딩 기간 · Trial 운영 기간을 설정합니다.',
        },
        {
          label: '경제 조건',
          detail: '목표 금액 · 매장당 단가 · 정산 방식(제품 또는 현금)을 설정합니다.',
        },
      ],
    },
    {
      step: '02',
      title: '오프라인 실행 시나리오',
      description:
        'Trial의 핵심은 오프라인 실행입니다. 매장이 실제로 어떻게 이 상품을 운영해야 하는지 구체적인 시나리오를 작성합니다.',
      items: [
        {
          label: '진열 위치',
          detail: '매장 어디에 어떻게 진열할지 구체적으로 안내합니다.',
        },
        {
          label: '고객 안내 멘트',
          detail: '매장 담당자가 고객에게 어떻게 설명할지 멘트 예시를 제공합니다.',
        },
        {
          label: '할인 · 프로모션',
          detail: '추가 할인 조건이나 사은품 등 프로모션 내용을 작성합니다.',
        },
        {
          label: '기대 효과',
          detail: '참여 매장이 얻을 수 있는 기대 효과와 성과 목표를 설명합니다.',
        },
      ],
    },
    {
      step: '03',
      title: '제출 · 운영자 승인',
      description:
        '작성된 Trial을 제출하면 운영자가 검토합니다. 승인되면 매장 참여 모집이 시작됩니다.',
      items: [
        {
          label: '제출',
          detail: '초안 저장 후 준비가 되면 운영자 검토를 위해 제출합니다.',
        },
        {
          label: '운영자 검토',
          detail: '운영자가 내용과 조건을 검토하고 승인 여부를 결정합니다.',
        },
        {
          label: '참여 모집 시작',
          detail: '승인 후 매장 참여 모집이 시작됩니다.',
        },
      ],
    },
    {
      step: '04',
      title: '매장 참여 · 실행 · 정산',
      description:
        '매장이 Trial에 참여 신청하고 오프라인에서 실행한 뒤 정산을 받습니다.',
      items: [
        {
          label: '매장 참여 신청',
          detail: '/market-trial 에서 매장이 Trial을 확인하고 참여를 신청합니다.',
        },
        {
          label: '오프라인 실행',
          detail: '매장은 공급자가 제시한 시나리오에 따라 진열 · 고객 안내 · 프로모션을 진행합니다.',
        },
        {
          label: '정산',
          detail: '실행 결과에 따라 제품 또는 현금으로 정산이 이루어집니다. 정산 방식은 참여 시 선택합니다.',
        },
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
