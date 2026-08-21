/**
 * PharmacyHub Guide Copy
 *
 * WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1
 *
 * PharmacyHub 는 공통 Guide View(@o4o/shared-space-ui) 를 그대로 채택한다.
 * 이 파일은 **데이터만** 제공하며 View 를 복제하지 않는다.
 *
 * 문구 기준 (§5 · §8):
 *   - KPA / K-Cosmetics / GlycoPharm 문구를 그대로 복사하지 않는다.
 *   - 실제 PharmacyHub route · 메뉴(PHARMACY_HUB_STORE_CONFIG) · 화면 동작에 근거해 작성한다.
 *   - 구현되지 않은 기능은 안내하지 않는다.
 *
 * PharmacyHub 실제 기능 축 (2026-08-20 기준):
 *   커뮤니티  /community · /forum · /education
 *   약국 상품·거래  /store-owner/products · /cart · /orders (+ /payment)
 *   매장 제품  /store-owner/handled-products · /local-products
 *   콘텐츠·자료함  /store-owner/content · /library · /blog
 *   매장 실행  /store-owner/qr · /pop · /signage · /tablets · /manuals
 *   설정  /store-owner/info · /account
 *   탐색 진입점  /store-hub
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
  GuideServiceIntroPageProps,
} from '../types.js';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Compass,
  GraduationCap,
  LayoutGrid,
  MessagesSquare,
  MonitorPlay,
  Pill,
  ShoppingCart,
  Store,
} from 'lucide-react';

// ─── /guide/intro ──────────────────────────────────────────────────────

export const pharmacyHubGuideIntroProps: GuideIntroPageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: 'O4O 개요',
    description:
      'O4O 플랫폼의 구조와 PharmacyHub 가 그 안에서 어떤 역할을 하는지 정리합니다. 약국이 공급 상품을 받아 매장에서 실제로 쓰기까지의 흐름을 먼저 이해하면 각 메뉴의 위치가 분명해집니다.',
    nextLink: { label: '다음: 서비스 활용 방법 →', to: '/guide/usage' },
  },
  sections: [
    {
      title: 'O4O 기본 구조',
      href: '/guide/intro/structure',
      description:
        'O4O 는 공급자 · 운영자 · 매장이 하나의 플랫폼 위에서 역할을 나누는 구조입니다. PharmacyHub 에서 매장은 약국입니다.',
      items: [
        { label: '공급자', detail: '약국에 공급할 상품을 등록하고 공급 조건을 설정합니다.' },
        { label: '운영자', detail: '가입 신청을 검토·승인하고 서비스 정책과 약관을 관리합니다.' },
        { label: '약국(매장)', detail: '공급 상품을 주문하고, 매장 제품 · 콘텐츠 · 실행 자산으로 고객을 응대합니다.' },
      ],
    },
    {
      title: 'PharmacyHub 위치',
      href: '/guide/intro/kpa',
      description:
        'PharmacyHub 는 약국 경영에 필요한 상품 수급과 매장 실행을 한 서비스 안에서 잇는 O4O 서비스입니다.',
      items: [
        { label: '약국 중심 서비스', detail: '약국이 직접 공급 상품을 탐색·주문하고 매장 운영까지 이어갑니다.' },
        { label: '커뮤니티 · 교육', detail: '포럼과 교육 콘텐츠로 매장 운영 정보를 나눕니다.' },
        { label: '매장 실행 연결', detail: '주문한 상품이 QR · POP · 사이니지 · 태블릿 · 설명서로 매장에서 쓰입니다.' },
      ],
    },
    {
      title: '운영 구조',
      href: '/guide/intro/operation',
      description:
        '운영자가 참여 자격과 정책을 관리하고, 공급자가 상품을 제공하며, 약국이 실행합니다. 세 축이 순환하면서 서비스가 유지됩니다.',
      items: [
        { label: '운영자', detail: '가입 신청 승인 · 법정정보/약관 설정을 담당합니다.' },
        { label: '공급자', detail: '상품 제공 설정으로 약국이 볼 수 있는 공급 상품을 구성합니다.' },
        { label: '약국', detail: '공급 상품을 주문하고 매장 자산으로 전환해 고객에게 전달합니다.' },
      ],
    },
    {
      title: '핵심 개념',
      href: '/guide/intro/concept',
      description:
        '개별 약국이 혼자 준비하기 어려운 상품 정보와 매장 자료를 플랫폼에서 공유해 함께 활용하는 것이 목표입니다.',
      items: [
        { label: '약국 연대', detail: '개별 약국이 공통 구조를 공유해 준비 부담을 줄입니다.' },
        { label: '정보 기반 상담', detail: '상품 설명서 · 콘텐츠가 매장 상담을 뒷받침합니다.' },
        { label: '실행까지 연결', detail: '자료를 보관만 하지 않고 QR · POP · 사이니지로 바로 씁니다.' },
      ],
    },
  ],
  bottomNav: {
    home: { label: '← 홈으로', to: '/' },
    next: { label: '서비스 활용 방법 →', to: '/guide/usage' },
    features: { label: '기능별 이용 방법', to: '/guide/features' },
    // WO-O4O-GUIDE-ENTRY-AND-LANDING-COMMONIZATION-V1 §9: 서비스 소개 landing 상호 연결
    serviceGuide: { label: '서비스 소개', to: '/service-guide' },
  },
};

// ─── /guide/intro/structure ────────────────────────────────────────────

export const pharmacyHubGuideIntroStructureProps: GuideIntroStructurePageProps = {
  hero: {
    eyebrow: 'O4O 개요',
    title: 'O4O 기본 구조',
    description: '공급자 · 운영자 · 약국이 각자 역할을 맡고 정해진 흐름으로 연결됩니다.',
    context: [
      { label: '구성', value: '공급자 · 운영자 · 약국' },
      { label: '연결', value: '공급 상품 → 주문 → 매장 실행' },
    ],
  },
  overview: {
    sectionTitle: '세 주체',
    cards: [
      { label: '공급자', summary: '상품 등록 · 공급 조건 설정' },
      { label: '운영자', summary: '가입 승인 · 정책 · 약관' },
      { label: '약국', summary: '주문 · 매장 제품 · 매장 실행' },
    ],
  },
  roleDetail: {
    sectionTitle: '역할별 업무',
    roles: [
      {
        label: '공급자',
        tasks: ['상품 제공 설정', '공급가 · 공급 조건 관리', '약국이 볼 목록 구성'],
      },
      {
        label: '운영자',
        tasks: ['가입 신청 검토 · 승인', '서비스 법정정보 · 약관 설정', '참여 자격 관리'],
      },
      {
        label: '약국',
        tasks: ['공급 상품 탐색 · 주문', '매장 제품 구성', '콘텐츠 · 실행 자산 제작'],
      },
    ],
  },
  relations: {
    sectionTitle: '연결 흐름',
    transitionBefore: '각 주체가 따로 움직이면',
    transitionAfter: '플랫폼 위에서는 이렇게 이어집니다',
    mainFlow: ['공급자 상품 등록', '약국 주문', '매장 제품 등록', '매장 실행'],
    subFlow: [
      { from: '운영자', mid: '가입 승인', to: '약국 참여' },
      { from: '공급 상품', mid: '주문 · 결제', to: '주문 내역' },
      { from: '매장 경영활용 제품', mid: '설명서 · 콘텐츠', to: 'QR · POP · 사이니지' },
    ],
  },
  features: {
    sectionTitle: '구조가 주는 것',
    items: [
      '약국이 상품 정보를 직접 만들지 않아도 됩니다',
      '주문과 매장 실행이 같은 서비스에서 이어집니다',
      '자료가 매장에서 쓰이는 형태까지 연결됩니다',
    ],
  },
  bottomNav: {
    prev: { label: '← O4O 개요', to: '/guide/intro' },
    next: { label: 'PharmacyHub 위치 →', to: '/guide/intro/kpa' },
  },
};

// ─── /guide/intro/kpa (서비스 위치) ────────────────────────────────────

export const pharmacyHubGuideIntroKpaProps: GuideIntroKpaPageProps = {
  hero: {
    eyebrow: 'O4O 개요',
    title: 'PharmacyHub 위치',
    description: '약국 경영에 필요한 상품 수급과 매장 실행을 한 서비스로 잇습니다.',
    context: [
      { label: '대상', value: '약국 경영자 · 공급자 · 운영자' },
      { label: '축', value: '커뮤니티 · 상품 거래 · 매장 실행' },
    ],
  },
  community: {
    sectionTitle: '커뮤니티',
    cards: [
      { label: '포럼', summary: '약국 운영 · 상품 정보 교류' },
      { label: '교육', summary: '매장 운영 · 상품 이해 콘텐츠' },
      { label: '내 글', summary: '내가 쓴 글 모아보기' },
    ],
  },
  network: {
    sectionTitle: '상품 거래',
    cards: [
      { label: '공급 상품', summary: '공급자가 제공한 상품 탐색' },
      { label: '장바구니 · 주문', summary: '담아서 한 번에 주문 · 결제' },
      { label: '주문 내역', summary: '진행 상태 확인' },
    ],
  },
  storeConnection: {
    sectionTitle: '매장 연결',
    transitionBefore: '주문에서 끝나지 않고',
    transitionAfter: '매장에서 쓰는 형태까지 이어집니다',
    mainFlow: ['공급 상품 주문', '매장 경영활용 제품 등록', '콘텐츠 · 설명서', '매장 실행 자산'],
    subFlow: [
      { from: '매장 제품', mid: '상품 설명서', to: 'QR' },
      { from: '매장 콘텐츠', mid: '자료함', to: 'POP · 블로그' },
      { from: '자료 · 콘텐츠', mid: '재생 목록', to: '사이니지 · 태블릿' },
    ],
  },
  roleSummary: {
    sectionTitle: '한 줄 정리',
    items: [
      '약국이 주문한 상품이 매장 자산으로 이어집니다',
      '커뮤니티가 운영 정보를 보완합니다',
      '별도 도구 없이 한 서비스에서 처리합니다',
    ],
  },
  bottomNav: {
    prev: { label: '← O4O 기본 구조', to: '/guide/intro/structure' },
    next: { label: '운영 구조 →', to: '/guide/intro/operation' },
  },
};

// ─── /guide/intro/operation ────────────────────────────────────────────

export const pharmacyHubGuideIntroOperationProps: GuideIntroOperationPageProps = {
  hero: {
    eyebrow: 'O4O 개요',
    title: '운영 구조',
    description: '운영자 · 약국 · 커뮤니티가 어떤 순서로 맞물리는지 정리합니다.',
    context: [
      { label: '시작', value: '가입 신청 · 승인' },
      { label: '순환', value: '공급 → 주문 → 실행 → 정보 공유' },
    ],
  },
  operator: {
    sectionTitle: '운영자',
    cards: [
      { label: '가입 신청 관리', summary: '신청 검토 · 승인 · 반려' },
      { label: '서비스 정책', summary: '법정정보 · 약관 설정' },
      { label: '참여 자격', summary: '역할별 접근 범위 관리' },
    ],
  },
  store: {
    sectionTitle: '약국',
    cards: [
      { label: '상품 수급', summary: '공급 상품 탐색 · 주문 · 결제' },
      { label: '매장 구성', summary: '매장 경영활용 제품 · 자체 상품' },
      { label: '매장 실행', summary: 'QR · POP · 사이니지 · 태블릿 · 설명서' },
    ],
  },
  community: {
    sectionTitle: '커뮤니티',
    cards: [
      { label: '포럼', summary: '질문 · 사례 공유' },
      { label: '교육', summary: '운영 · 상품 이해 학습' },
      { label: '검색', summary: '필요한 글 찾기' },
    ],
  },
  flow: {
    sectionTitle: '전체 흐름',
    mainFlow: ['가입 신청', '운영자 승인', '공급 상품 주문', '매장 실행'],
    cycle: ['실행', '경험', '공유', '개선'],
    subFlow: [
      { from: '가입 신청', mid: '운영자 검토', to: '약국 참여' },
      { from: '공급자 상품 제공', mid: '약국 주문', to: '주문 내역' },
      { from: '매장 실행', mid: '포럼 공유', to: '다른 약국' },
    ],
  },
  features: {
    sectionTitle: '기억할 점',
    items: [
      '가입 승인 전에는 열람 범위가 제한됩니다',
      '약국 업무 메뉴는 승인 이후 열립니다',
      '운영자 · 공급자 메뉴는 해당 역할에게만 보입니다',
    ],
  },
  bottomNav: {
    prev: { label: '← PharmacyHub 위치', to: '/guide/intro/kpa' },
    next: { label: '핵심 개념 →', to: '/guide/intro/concept' },
  },
};

// ─── /guide/intro/concept ──────────────────────────────────────────────

export const pharmacyHubGuideIntroConceptProps: GuideIntroConceptPageProps = {
  hero: {
    eyebrow: 'O4O 개요',
    title: '핵심 개념',
    description: '연대 · 구조 · 정보 기반 상담',
    context: [
      { label: '문제', value: '약국이 상품 자료를 혼자 준비하는 부담' },
      { label: '방향', value: '공유된 자료를 매장 실행까지 연결' },
    ],
  },
  solidarity: {
    sectionTitle: '연대 — 왜 필요한가',
    cards: [
      { label: '개별 준비의 한계', summary: '상품 정보 · 매장 자료를 약국마다 따로 준비' },
      { label: '공유 구조', summary: '공급자 · 운영자가 만든 자료를 함께 사용' },
      { label: '효과', summary: '준비 시간 감소 · 상담 근거 확보' },
    ],
  },
  structure: {
    sectionTitle: '구조 — 어떻게 구성되는가',
    cards: [
      { label: '운영자 역할', summary: '참여 자격 · 정책 관리' },
      { label: '공급자 역할', summary: '상품과 공급 조건 제공' },
      { label: '약국 역할', summary: '선택 · 주문 · 매장 실행' },
    ],
  },
  info: {
    sectionTitle: '정보 — 무엇이 경쟁력이 되는가',
    cards: [
      { label: '상품 설명서', summary: '상담에 바로 쓰는 제품 정보' },
      { label: '매장 콘텐츠', summary: '매장이 직접 쓰거나 가져온 자료' },
      { label: '실행 자산', summary: 'QR · POP · 사이니지로 고객에게 전달' },
    ],
  },
  competition: {
    sectionTitle: '무엇이 달라지는가',
    rows: [
      { label: '기존', items: ['자료 개별 준비', '주문과 매장 분리', '실행 도구 별도'], dim: true },
      { label: 'PharmacyHub', items: ['자료 공유', '주문 → 매장 연결', '한 서비스에서 실행'], dim: false },
    ],
    resultText: '준비 부담은 줄이고 상담 근거는 남깁니다',
  },
  summary: {
    sectionTitle: '핵심 정리',
    items: [
      '약국 중심 O4O 서비스',
      '공급 상품 주문과 매장 실행이 이어짐',
      '상품 설명서 · 콘텐츠가 상담을 뒷받침',
      '커뮤니티가 운영 정보를 보완',
    ],
  },
  bottomNav: {
    prev: { label: '← 운영 구조', to: '/guide/intro/operation' },
    backHome: { label: 'O4O 개요로 돌아가기', to: '/guide/intro' },
  },
};

// ─── /guide/usage ──────────────────────────────────────────────────────

export const pharmacyHubGuideUsageProps: GuideUsagePageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: '서비스 활용 방법',
    description:
      '가입부터 매장 실행까지 실제 순서대로 정리했습니다. 각 단계는 PharmacyHub 에 실제로 있는 화면만 안내합니다.',
    flowBarTitle: '이용 흐름',
    flowLabels: ['가입 신청', '승인', '공급 상품 주문', '매장 제품', '매장 실행'],
  },
  sections: [
    {
      step: '01',
      title: '가입 신청과 승인',
      routeLabel: '/join · /join/status',
      description: '약국 경영자 · 공급자로 참여하려면 먼저 가입 신청이 필요합니다. 운영자 승인 후 업무 메뉴가 열립니다.',
      items: [
        { label: '가입 신청', detail: '가입 신청 화면에서 참여 유형과 정보를 입력합니다.' },
        { label: '상태 확인', detail: '가입 상태 확인 화면에서 검토 진행 상황을 볼 수 있습니다.' },
        { label: '승인 이후', detail: '승인되면 매장 허브 · 내 약국 메뉴가 상단에 나타납니다.' },
      ],
    },
    {
      step: '02',
      title: '커뮤니티 참여',
      routeLabel: '/community · /forum · /education',
      description: '운영 정보를 나누고 교육 콘텐츠를 이용합니다. 승인 전에도 커뮤니티 진입점은 열려 있습니다.',
      items: [
        { label: '포럼', detail: '약국 운영과 상품에 대한 글을 읽고 작성합니다.' },
        { label: '교육', detail: '교육 과정과 강의를 순서대로 학습합니다.' },
        { label: '검색 · 내 글', detail: '커뮤니티 글을 검색하고 내가 쓴 글을 모아 봅니다.' },
      ],
    },
    {
      step: '03',
      title: '공급 상품 주문',
      routeLabel: '/store-owner/{products, cart, orders}',
      description: '공급자가 제공한 상품을 탐색해 장바구니에 담고 한 번에 주문합니다.',
      items: [
        { label: '공급 상품', detail: '공급자 · 규제 유형(의약품 · 의약외품 · 건강기능식품 · 화장품)으로 좁혀 찾습니다.' },
        { label: '장바구니', detail: '공급자별 합계와 배송비를 확인하고 결제로 넘어갑니다.' },
        { label: '주문 내역', detail: '주문 상태와 상세 내역을 확인합니다.' },
      ],
    },
    {
      step: '04',
      title: '매장 제품 구성',
      routeLabel: '/store-owner/{handled-products, local-products}',
      description: '주문한 상품을 매장에서 다루는 제품으로 등록합니다. 공급 상품과 다른 축이라 메뉴가 분리되어 있습니다.',
      items: [
        { label: '매장 경영활용 제품', detail: '공급 상품에서 추가해 매장에서 취급할 제품으로 등록합니다.' },
        { label: '매장 자체 상품', detail: 'O4O 공급과 무관하게 약국이 직접 등록하는 상품입니다.' },
        { label: '분류', detail: '등록한 제품을 분류해 정리합니다.' },
      ],
    },
    {
      step: '05',
      title: '콘텐츠와 자료함',
      routeLabel: '/store-owner/{content, library, blog}',
      description: '매장에서 쓸 글과 자료를 준비합니다. 직접 작성하거나 제공된 자료를 가져옵니다.',
      items: [
        { label: '매장 콘텐츠', detail: '직접 작성하거나 가져온 자료를 매장 콘텐츠로 보관합니다.' },
        { label: '자료함', detail: '보관된 자료에서 콘텐츠 작성 · 블로그 글쓰기로 이어갑니다.' },
        { label: '블로그', detail: '매장 블로그 글을 작성하고 관리합니다.' },
      ],
    },
    {
      step: '06',
      title: '매장 실행',
      routeLabel: '/store-owner/{qr, pop, signage, tablets, manuals}',
      description: '준비한 제품과 자료를 매장에서 실제로 쓰는 형태로 만듭니다.',
      items: [
        { label: 'QR', detail: '매장 제품 · 콘텐츠 · 외부 링크를 연결한 QR 을 만듭니다.' },
        { label: 'POP · 사이니지', detail: '인쇄물과 화면 재생 목록을 구성합니다.' },
        { label: '태블릿 · 설명서', detail: '태블릿을 등록해 화면 세트를 적용하고 상품 설명서를 확인합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← O4O 개요', to: '/guide/intro' },
    next: { label: '기능별 이용 방법 →', to: '/guide/features' },
  },
};

// ─── /guide/features ───────────────────────────────────────────────────

export const pharmacyHubGuideFeaturesProps: GuideFeaturesPageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: '기능별 이용 방법',
    description: 'PharmacyHub 에 실제로 있는 기능만 정리했습니다. 각 항목에서 상세 안내로 이동할 수 있습니다.',
    flowBarTitle: '기능 축',
    flowLabels: ['커뮤니티', '상품 거래', '매장 제품', '콘텐츠·자료함', '매장 실행'],
  },
  groups: [
    {
      step: '01',
      title: '커뮤니티',
      primaryRoute: '/community',
      description: '약국 운영 정보를 나누고 교육 콘텐츠를 이용합니다.',
      items: [
        { label: '포럼', route: '/forum' },
        { label: '커뮤니티 검색', route: '/community/search' },
        { label: '내 글', route: '/forum/my-posts' },
        { label: '교육', route: '/education' },
      ],
      linkTo: '/guide/features/forum',
    },
    {
      step: '02',
      title: '약국 상품 · 거래',
      primaryRoute: '/store-owner/products',
      description: '공급 상품을 탐색해 장바구니에 담고 주문 · 결제합니다.',
      items: [
        { label: '공급 상품', route: '/store-owner/products' },
        { label: '장바구니', route: '/store-owner/cart' },
        { label: '주문 내역', route: '/store-owner/orders' },
      ],
      linkTo: '/guide/features/supply-order',
    },
    {
      step: '03',
      title: '매장 제품',
      primaryRoute: '/store-owner/handled-products',
      description: '매장에서 다루는 제품을 등록해 정리합니다.',
      items: [
        { label: '매장 경영활용 제품', route: '/store-owner/handled-products' },
        { label: '매장 자체 상품', route: '/store-owner/local-products' },
      ],
      linkTo: '/guide/features/store-products',
    },
    {
      step: '04',
      title: '콘텐츠 · 자료함',
      primaryRoute: '/store-owner/content',
      description: '매장에서 쓸 글과 자료를 만들고 보관합니다.',
      items: [
        { label: '매장 콘텐츠', route: '/store-owner/content' },
        { label: '자료함', route: '/store-owner/library' },
        { label: '블로그', route: '/store-owner/blog' },
      ],
      linkTo: '/guide/features/content',
    },
    {
      step: '05',
      title: '매장 실행',
      primaryRoute: '/store-owner/qr',
      description: '준비한 자료를 매장에서 쓰는 형태로 만듭니다.',
      items: [
        { label: 'QR 이용 방법', route: '/guide/features/qr' },
        { label: 'POP 이용 방법', route: '/guide/features/pop' },
        { label: '디지털 사이니지 이용 방법', route: '/guide/features/signage' },
        { label: '태블릿 이용 방법', route: '/guide/features/tablet' },
        { label: '상품 설명서 이용 방법', route: '/guide/features/manuals' },
      ],
      linkTo: '/guide/features/qr',
    },
  ],
  bottomNav: {
    prev: { label: '← 서비스 활용 방법', to: '/guide/usage' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/forum ─────────────────────────────────────────────

export const pharmacyHubGuideFeatureForumProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '커뮤니티 이용 방법',
    description: '포럼 · 검색 · 내 글 · 교육으로 구성된 커뮤니티 영역 이용 순서입니다.',
    primaryAction: { label: '커뮤니티로 이동 →', to: '/community' },
    flowBarTitle: '이용 순서',
    flowLabels: ['커뮤니티 홈', '포럼', '글 작성', '내 글'],
  },
  sections: [
    {
      step: '01',
      title: '커뮤니티 홈',
      routeLabel: '/community',
      description: '포럼 · 교육 · 검색 · 내 글 진입점이 모여 있습니다.',
      items: [
        { label: '진입 카드', detail: '홈 상단 카드에서 원하는 영역으로 바로 이동합니다.' },
        { label: '가입 전', detail: '가입 승인 전에는 글쓰기 등 일부 기능이 제한됩니다.' },
      ],
    },
    {
      step: '02',
      title: '포럼 읽기 · 쓰기',
      routeLabel: '/forum',
      description: '약국 운영과 상품에 대한 글을 확인하고 작성합니다.',
      items: [
        { label: '글 목록', detail: '포럼에서 최근 글을 확인합니다.' },
        { label: '글 작성', detail: '글쓰기에서 제목과 내용을 입력해 등록합니다.' },
        { label: '수정', detail: '내가 쓴 글은 편집 화면에서 수정합니다.' },
      ],
    },
    {
      step: '03',
      title: '검색과 내 글',
      routeLabel: '/community/search · /forum/my-posts',
      description: '필요한 글을 찾고 내가 작성한 글을 모아 봅니다.',
      items: [
        { label: '검색', detail: '커뮤니티 글을 한 번에 검색합니다.' },
        { label: '내 글', detail: '내가 작성한 글 목록을 확인합니다.' },
      ],
    },
    {
      step: '04',
      title: '교육',
      routeLabel: '/education',
      description: '매장 운영 · 상품 이해 교육 콘텐츠를 이용합니다.',
      items: [
        { label: '과정 선택', detail: '교육 목록에서 과정을 선택합니다.' },
        { label: '강의 수강', detail: '과정 안의 강의를 순서대로 진행합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/supply-order ──────────────────────────────────────

export const pharmacyHubGuideFeatureSupplyOrderProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '공급 상품 주문 방법',
    description: '공급 상품 탐색부터 장바구니 · 주문 · 주문 내역 확인까지의 순서입니다.',
    primaryAction: { label: '공급 상품으로 이동 →', to: '/store-owner/products' },
    flowBarTitle: '주문 순서',
    flowLabels: ['공급 상품', '상세 확인', '장바구니', '주문 · 결제', '주문 내역'],
  },
  sections: [
    {
      step: '01',
      title: '공급 상품 찾기',
      routeLabel: '/store-owner/products',
      description: '공급자가 제공한 상품 목록을 확인합니다.',
      items: [
        { label: '공급자 선택', detail: '공급자 전체 또는 특정 공급자로 목록을 좁힙니다.' },
        { label: '규제 유형', detail: '의약품 · 의약외품 · 건강기능식품 · 화장품으로 구분해 봅니다.' },
        { label: '공급가', detail: '서비스 공급가가 적용된 금액을 확인합니다.' },
      ],
    },
    {
      step: '02',
      title: '상세 확인',
      routeLabel: '/store-owner/products/:offerId',
      description: '상품 상세에서 공급 조건을 확인하고 장바구니에 담습니다.',
      items: [
        { label: '상품 정보', detail: '공급자 · 공급가 · 상품 정보를 확인합니다.' },
        { label: '장바구니 담기', detail: '필요한 수량으로 장바구니에 담습니다.' },
      ],
    },
    {
      step: '03',
      title: '장바구니',
      routeLabel: '/store-owner/cart',
      description: '담은 상품을 공급자별로 확인하고 결제로 넘어갑니다.',
      items: [
        { label: '공급자별 합계', detail: '공급자 합계와 배송비 합계를 확인합니다.' },
        { label: '결제 예정 금액', detail: '상품 합계와 배송비를 더한 결제 예정 금액을 확인합니다.' },
        { label: '주문하지 못한 상품', detail: '주문할 수 없는 상품은 별도로 표시됩니다.' },
      ],
    },
    {
      step: '04',
      title: '주문 내역',
      routeLabel: '/store-owner/orders',
      description: '주문 이후 진행 상태를 확인합니다.',
      items: [
        { label: '목록', detail: '주문 내역에서 주문을 확인합니다.' },
        { label: '상세', detail: '주문 상세에서 항목과 상태를 확인합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/store-products ────────────────────────────────────

export const pharmacyHubGuideFeatureStoreProductsProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '매장 제품 관리 방법',
    description: '매장 경영활용 제품과 매장 자체 상품은 서로 다른 축입니다. 각각의 등록 방법을 정리합니다.',
    primaryAction: { label: '매장 경영활용 제품으로 이동 →', to: '/store-owner/handled-products' },
    flowBarTitle: '구성 순서',
    flowLabels: ['공급 상품에서 추가', '매장 제품 등록', '분류', '실행 자산 연결'],
  },
  sections: [
    {
      step: '01',
      title: '매장 경영활용 제품',
      routeLabel: '/store-owner/handled-products',
      description: 'O4O 공급 상품 중 매장에서 취급할 제품을 등록합니다.',
      items: [
        { label: '공급 상품에서 추가', detail: '공급 상품 목록에서 선택해 매장 제품으로 추가합니다.' },
        { label: '분류', detail: '분류를 지정하지 않으면 미분류로 표시됩니다.' },
      ],
    },
    {
      step: '02',
      title: '매장 자체 상품',
      routeLabel: '/store-owner/local-products',
      description: 'O4O 공급과 무관하게 약국이 직접 등록하는 상품입니다.',
      items: [
        { label: '직접 등록', detail: '매장에서 자체적으로 다루는 상품을 등록합니다.' },
        { label: '공급 상품과 구분', detail: '주문 대상인 공급 상품과 별도 메뉴로 관리합니다.' },
      ],
    },
    {
      step: '03',
      title: '실행 자산으로 연결',
      routeLabel: '/store-owner/{qr, manuals}',
      description: '등록한 매장 제품은 QR · 상품 설명서로 이어집니다.',
      items: [
        { label: 'QR 연결', detail: 'QR 만들기에서 매장 경영활용 제품을 연결 대상으로 선택합니다.' },
        { label: '상품 설명서', detail: '설명서가 있는 제품은 설명서 화면에서 확인합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/content ───────────────────────────────────────────

export const pharmacyHubGuideFeatureContentProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '콘텐츠 · 자료함 이용 방법',
    description: '매장에서 쓸 글과 자료를 만들고 보관해 블로그 · POP · QR 로 이어갑니다.',
    primaryAction: { label: '매장 콘텐츠로 이동 →', to: '/store-owner/content' },
    flowBarTitle: '이용 순서',
    flowLabels: ['매장 콘텐츠', '자료함', '블로그', '실행 자산'],
  },
  sections: [
    {
      step: '01',
      title: '매장 콘텐츠 작성',
      routeLabel: '/store-owner/content',
      description: '매장에서 활용할 내용을 직접 작성하거나 가져온 자료로 보관합니다.',
      items: [
        { label: '직접 작성', detail: '콘텐츠 작성에서 제목과 내용을 입력해 저장합니다.' },
        { label: '가져온 자료', detail: '제공된 자료를 가져와 매장 콘텐츠로 보관합니다.' },
        { label: '수정 · 삭제', detail: '보관한 콘텐츠는 콘텐츠 수정에서 다시 편집합니다.' },
      ],
    },
    {
      step: '02',
      title: '자료함',
      routeLabel: '/store-owner/library',
      description: '보관된 자료를 모아 보고 다음 작업으로 이어갑니다.',
      items: [
        { label: '콘텐츠 작성', detail: '자료함에서 바로 콘텐츠 작성으로 이동합니다.' },
        { label: '블로그 글쓰기', detail: '자료함에서 블로그 글쓰기로 이동합니다.' },
      ],
    },
    {
      step: '03',
      title: '블로그',
      routeLabel: '/store-owner/blog',
      description: '매장 블로그 글을 작성하고 관리합니다.',
      items: [
        { label: '글 작성', detail: '새 글에서 제목과 내용을 입력해 등록합니다.' },
        { label: '수정', detail: '등록한 글은 편집 화면에서 수정합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/qr ────────────────────────────────────────────────

export const pharmacyHubGuideFeatureQrProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: 'QR 이용 방법',
    description: '매장 제품 · 콘텐츠 · 외부 링크를 연결한 QR 을 만들어 매장에 배치합니다.',
    primaryAction: { label: 'QR 로 이동 →', to: '/store-owner/qr' },
    flowBarTitle: '이용 순서',
    flowLabels: ['연결 대상 선택', '이름 입력', 'QR 만들기', '스캔 통계'],
  },
  sections: [
    {
      step: '01',
      title: '연결 대상 선택',
      routeLabel: '/store-owner/qr',
      description: 'QR 이 열어줄 대상을 먼저 정합니다.',
      items: [
        { label: '매장 경영활용 제품', detail: '등록한 매장 제품을 대상으로 선택합니다.' },
        { label: '매장 콘텐츠 · 자료', detail: '보관한 콘텐츠나 자료를 대상으로 선택합니다.' },
        { label: '외부 링크', detail: '외부 주소를 직접 입력해 연결합니다.' },
      ],
    },
    {
      step: '02',
      title: 'QR 만들기',
      routeLabel: '/store-owner/qr',
      description: '이름을 붙여 QR 을 생성합니다.',
      items: [
        { label: '이름', detail: '예: 감기약 코너 안내 — 매장에서 알아볼 이름을 입력합니다.' },
        { label: '만들기', detail: '만들기를 눌러 QR 을 생성합니다.' },
        { label: '이름 수정', detail: '생성 후에도 이름을 수정할 수 있습니다.' },
      ],
    },
    {
      step: '03',
      title: '스캔 통계',
      routeLabel: '/store-owner/qr',
      description: '만든 QR 이 얼마나 쓰였는지 확인합니다.',
      items: [{ label: '최근 7일', detail: '최근 스캔 현황을 확인합니다.' }],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/pop ───────────────────────────────────────────────

export const pharmacyHubGuideFeaturePopProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: 'POP 이용 방법',
    description: '매장에 붙일 안내물을 직접 작성하거나 운영자 자료에서 가져옵니다.',
    primaryAction: { label: 'POP 으로 이동 →', to: '/store-owner/pop' },
    flowBarTitle: '이용 순서',
    flowLabels: ['작성 · 가져오기', '내용 입력', '저장', '발행'],
  },
  sections: [
    {
      step: '01',
      title: '작성 방법 선택',
      routeLabel: '/store-owner/pop',
      description: '직접 작성하거나 제공된 자료를 가져옵니다.',
      items: [
        { label: '직접 작성', detail: '제목과 내용을 입력해 새로 만듭니다.' },
        { label: '운영자 자료 가져오기', detail: '제공된 자료를 가져와 매장용으로 씁니다.' },
      ],
    },
    {
      step: '02',
      title: '내용 입력',
      routeLabel: '/store-owner/pop',
      description: '매장에 붙일 문구를 작성합니다.',
      items: [
        { label: '제목', detail: '예: 환절기 건강관리 안내 — 제목은 반드시 입력합니다.' },
        { label: '내용', detail: 'POP 에 넣을 내용을 입력합니다.' },
      ],
    },
    {
      step: '03',
      title: '상태 관리',
      routeLabel: '/store-owner/pop',
      description: '작성한 POP 의 상태를 관리합니다.',
      items: [
        { label: '작성 중', detail: '저장만 하면 작성 중 상태로 남습니다.' },
        { label: '발행됨 · 보관됨', detail: '사용 중인 항목과 보관한 항목을 구분합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/signage ───────────────────────────────────────────

export const pharmacyHubGuideFeatureSignageProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '디지털 사이니지 이용 방법',
    description: '매장 화면에 재생할 목록을 만들어 항목을 추가합니다.',
    primaryAction: { label: '디지털 사이니지로 이동 →', to: '/store-owner/signage' },
    flowBarTitle: '이용 순서',
    flowLabels: ['재생 목록 만들기', '항목 추가', '순서 정리'],
  },
  sections: [
    {
      step: '01',
      title: '재생 목록 만들기',
      routeLabel: '/store-owner/signage',
      description: '매장 화면에서 돌릴 재생 목록을 먼저 만듭니다.',
      items: [{ label: '목록 생성', detail: '재생 목록 만들기로 새 목록을 추가합니다.' }],
    },
    {
      step: '02',
      title: '항목 추가',
      routeLabel: '/store-owner/signage',
      description: '재생할 항목을 목록에 담습니다.',
      items: [
        { label: '항목 추가', detail: '항목 추가에서 재생할 자료를 선택합니다.' },
        { label: '선택 즉시 반영', detail: '선택하면 목록에 추가됩니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/tablet ────────────────────────────────────────────

export const pharmacyHubGuideFeatureTabletProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '태블릿 이용 방법',
    description: '매장 태블릿을 등록하고 저장된 화면 세트를 적용합니다.',
    primaryAction: { label: '태블릿으로 이동 →', to: '/store-owner/tablets' },
    flowBarTitle: '이용 순서',
    flowLabels: ['태블릿 등록', '화면 세트 선택', '적용'],
  },
  sections: [
    {
      step: '01',
      title: '태블릿 등록',
      routeLabel: '/store-owner/tablets',
      description: '매장에서 쓸 태블릿을 등록합니다.',
      items: [
        { label: '등록', detail: '태블릿 등록으로 기기를 추가합니다.' },
        { label: '등록된 태블릿', detail: '등록된 태블릿 목록에서 상태를 확인합니다.' },
      ],
    },
    {
      step: '02',
      title: '화면 세트 적용',
      routeLabel: '/store-owner/tablets',
      description: '저장된 화면 세트를 태블릿에 연결합니다.',
      items: [
        { label: '저장된 화면 세트', detail: '적용할 화면 세트를 선택합니다.' },
        { label: '미적용', detail: '화면 세트를 지정하지 않은 태블릿은 미적용으로 표시됩니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/manuals ───────────────────────────────────────────

export const pharmacyHubGuideFeatureManualsProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '상품 설명서 이용 방법',
    description: '매장 상담에 쓸 상품 설명서를 찾아 확인합니다.',
    primaryAction: { label: '상품 설명서로 이동 →', to: '/store-owner/manuals' },
    flowBarTitle: '이용 순서',
    flowLabels: ['제품 검색', '설명서 확인', '상담 활용'],
  },
  sections: [
    {
      step: '01',
      title: '제품 검색',
      routeLabel: '/store-owner/manuals',
      description: '설명서를 볼 제품을 찾습니다.',
      items: [
        { label: '검색', detail: '제품명 · 브랜드로 검색합니다.' },
        { label: '설명서 없음', detail: '설명서가 없는 제품은 설명서 없음으로 표시됩니다.' },
      ],
    },
    {
      step: '02',
      title: '설명서 확인',
      routeLabel: '/store-owner/manuals/:listingId',
      description: '선택한 제품의 설명서를 확인합니다.',
      items: [
        { label: '본문', detail: '제품 설명 본문을 확인합니다.' },
        { label: '언어', detail: '제공되는 언어(예: 한국어)를 선택해 봅니다.' },
      ],
    },
    {
      step: '03',
      title: '매장에서 쓰기',
      routeLabel: '/store-owner/qr',
      description: '설명서는 QR 로 연결해 고객이 직접 보게 할 수 있습니다.',
      items: [{ label: 'QR 연결', detail: 'QR 만들기에서 해당 제품을 연결 대상으로 선택합니다.' }],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /service-guide ────────────────────────────────────────────────────

export const pharmacyHubServiceIntroProps: GuideServiceIntroPageProps = {
  badge: '서비스 안내',
  headline: '약국 경영을 위한 O4O 서비스 안내',
  lead: 'PharmacyHub 는 약국이 공급 상품을 직접 탐색·주문하고, 그 상품을 매장에서 쓰는 형태까지 한 서비스 안에서 잇는 O4O 서비스입니다.',
  heroActions: [
    { to: '/join', label: '가입 신청하기', icon: ArrowRight },
    { to: '/guide/intro', label: '이용 가이드 보기', icon: BookOpen },
  ],
  intro: {
    title: '서비스 소개',
    paragraphs: [
      '약국은 상품을 들이는 일과 매장에서 고객에게 설명하는 일을 따로 준비해 왔습니다. PharmacyHub 는 이 둘을 하나의 흐름으로 연결합니다.',
      '공급자가 제공한 상품을 약국이 직접 탐색해 주문하고, 주문한 상품을 매장 제품으로 등록한 뒤 설명서 · 콘텐츠 · QR · POP · 사이니지로 매장에서 바로 활용합니다.',
      '포럼과 교육으로 다른 약국의 운영 경험을 참고할 수 있습니다.',
    ],
  },
  audiences: {
    title: '이용 대상',
    description: '역할에 따라 열리는 메뉴가 다릅니다.',
    cards: [
      { icon: Store, title: '약국 경영자', desc: '공급 상품 주문부터 매장 실행까지 약국 운영 전반을 담당합니다.' },
      { icon: Boxes, title: '공급자', desc: '약국에 제공할 상품과 공급 조건을 설정합니다.' },
      { icon: Compass, title: '운영자', desc: '가입 신청을 검토·승인하고 서비스 정책을 관리합니다.' },
    ],
  },
  features: {
    title: '주요 기능',
    description: '현재 제공 중인 기능입니다.',
    cards: [
      { icon: ShoppingCart, title: '공급 상품 주문', desc: '공급자별·규제 유형별로 상품을 찾아 장바구니에 담고 한 번에 주문합니다.' },
      { icon: Pill, title: '매장 제품 관리', desc: '주문한 상품을 매장 경영활용 제품으로 등록하고, 매장 자체 상품도 따로 관리합니다.' },
      { icon: BookOpen, title: '콘텐츠 · 자료함', desc: '매장에서 쓸 글을 작성하거나 제공된 자료를 가져와 보관하고 블로그로 이어갑니다.' },
      { icon: MonitorPlay, title: '매장 실행 자산', desc: 'QR · POP · 디지털 사이니지 · 태블릿 · 상품 설명서를 매장에서 바로 사용합니다.' },
      { icon: MessagesSquare, title: '커뮤니티', desc: '포럼에서 약국 운영과 상품 정보를 나누고 필요한 글을 검색합니다.' },
      { icon: GraduationCap, title: '교육', desc: '매장 운영과 상품 이해를 돕는 교육 과정을 수강합니다.' },
    ],
    note: '역할과 가입 승인 상태에 따라 이용 가능한 메뉴가 달라집니다.',
  },
  steps: {
    title: '이용 흐름',
    description: '가입부터 매장 실행까지의 순서입니다.',
    items: [
      { no: '01', title: '가입 신청' },
      { no: '02', title: '운영자 승인' },
      { no: '03', title: '공급 상품 주문' },
      { no: '04', title: '매장 제품 등록' },
      { no: '05', title: '매장 실행' },
    ],
  },
  relatedGuide: {
    title: '기능 사용 가이드',
    description: '서비스 소개를 확인했다면, 실제 기능을 어떻게 쓰는지는 이용 가이드에서 이어서 볼 수 있습니다.',
    links: [
      { to: '/guide/intro', label: 'O4O 개요', icon: BookOpen },
      { to: '/guide/usage', label: '서비스 활용 방법', icon: Compass },
      { to: '/guide/features', label: '기능별 이용 방법', icon: LayoutGrid },
    ],
  },
  contact: {
    title: '문의 안내',
    body: '참여를 검토 중이거나 이용 중 궁금한 점이 있으면 가입 신청 화면에서 정보를 남겨 주세요. 운영자가 확인 후 안내합니다.',
    note: '가입 신청 상태는 가입 상태 확인 화면에서 언제든 볼 수 있습니다.',
    action: { to: '/join', label: '가입 신청하기' },
  },
};
