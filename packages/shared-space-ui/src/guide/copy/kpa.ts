/**
 * KPA-Society Guide Copy
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 *
 * 기존 services/web-kpa-society/src/pages/guide/* 파일에서 추출한 데이터를
 * shared Guide 페이지 컴포넌트의 prop 형태로 정리.
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

export const kpaGuideIntroProps: GuideIntroPageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: 'O4O 개요',
    description: 'O4O 플랫폼의 구조와 KPA-Society가 그 안에서 어떤 역할을 하는지 정리합니다.',
    nextLink: { label: '다음: 서비스 활용 방법 →', to: '/guide/usage' },
  },
  sections: [
    {
      title: 'O4O 기본 구조',
      href: '/guide/intro/structure',
      description:
        'O4O는 공급자·운영자·매장이 하나의 플랫폼 위에서 역할을 나누는 구조입니다. 각 주체는 독립적으로 움직이지만 공통된 규칙으로 연결됩니다.',
      items: [
        { label: '공급자', detail: '상품과 콘텐츠를 생산하고 플랫폼에 등록하는 주체입니다.' },
        { label: '운영자', detail: '플랫폼 정책을 설정하고 공급자·매장을 관리합니다.' },
        { label: '매장', detail: '공급자의 상품과 콘텐츠를 받아 고객에게 직접 판매·전달합니다.' },
      ],
    },
    {
      title: 'KPA-Society 위치',
      href: '/guide/intro/kpa',
      description:
        'KPA-Society는 약사 커뮤니티를 기반으로 플랫폼에 참여하는 서비스입니다. 약국은 매장 역할을 하며, 포럼·교육·자료실로 구성원 간 네트워크를 형성합니다.',
      items: [
        { label: '커뮤니티 기반 서비스', detail: '포럼, 교육, 자료실이 약사 네트워크의 중심 채널입니다.' },
        { label: '약사 네트워크', detail: '약사회 회원이 서로 정보를 공유하고 업무를 협력합니다.' },
        { label: '매장 연결 구조', detail: '약국은 O4O 매장으로 등록되어 상품 수급·고객 응대를 운영합니다.' },
      ],
    },
    {
      title: '운영 구조',
      href: '/guide/intro/operation',
      description:
        '운영자가 정책을 설정하면 매장이 실행하고, 커뮤니티가 그 경험을 확장합니다. 세 층위가 순환하며 서비스가 성장합니다.',
      items: [
        { label: '운영자 중심 구조', detail: '승인, 정책, 커미션 등 플랫폼 규칙을 운영자가 담당합니다.' },
        { label: '매장 실행 구조', detail: '약국이 상품을 취급하고 고객에게 직접 서비스를 제공합니다.' },
        { label: '커뮤니티 확장 구조', detail: '포럼과 교육이 매장 운영 노하우를 네트워크 전체에 확산합니다.' },
      ],
    },
    {
      title: '핵심 개념',
      href: '/guide/intro/concept',
      description:
        'O4O 플랫폼이 추구하는 방향은 작은 사업자들이 정보와 구조를 공유하며 함께 성장하는 것입니다.',
      items: [
        { label: '소규모 사업자 연대', detail: '개별 약국이 플랫폼을 통해 대형 유통망과 대등하게 경쟁합니다.' },
        { label: '세미 프랜차이즈 구조', detail: '브랜드 통일 없이도 공통 운영 체계를 공유하는 느슨한 연합 모델입니다.' },
        { label: '정보 기반 판매', detail: '약사의 전문 지식이 콘텐츠로 전환되어 매장 신뢰도와 매출을 높입니다.' },
      ],
    },
    // WO-O4O-KPA-GUIDE-FOR-ROLE-V1: 역할별 활용 가이드 진입
    // WO-O4O-KPA-GUIDE-INTRO-ROLE-CARD-LINK-FIX-V1: 카드별 개별 link 추가
    {
      title: '역할별 활용 가이드',
      href: '/guide/for/store-owner',
      description:
        '내 역할에서 무엇을 얻고 어떻게 활용하는지 정리한 가이드입니다. 기능 사용법보다 활용 가치를 먼저 살펴봅니다.',
      items: [
        {
          label: '매장 경영자',
          detail: '직원이 적어도 매장 운영 자산을 만들어 정보 전달 경쟁력을 높입니다.',
          href: '/guide/for/store-owner',
        },
        {
          label: '서비스 운영자',
          detail: '생태계를 운영하고 매장을 지원하는 운영 사업자입니다.',
          href: '/guide/for/operator',
        },
        {
          label: '커뮤니티 참여자',
          detail: '정보 공유가 실제 현장 활용으로 연결되는 흐름의 출발점입니다.',
          href: '/guide/for/member',
        },
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

export const kpaGuideIntroStructureProps: GuideIntroStructurePageProps = {
  hero: {
    eyebrow: 'O4O 개요',
    title: 'O4O 기본 구조',
    description: '공급자 · 운영자 · 매장 구조',
    context: [
      { label: '해결 대상', value: '소규모 매장의 운영 부담 — 상품, 콘텐츠, 고객 대응' },
      { label: '구조 방식', value: '운영자 중심 구조 · 구성 · 지원 · 실행 분리' },
    ],
  },
  overview: {
    sectionTitle: '구조 개요',
    cards: [
      { label: '공급자', summary: '상품 · 가격 · 콘텐츠' },
      { label: '운영자', summary: '구성 · 관리 · 배포' },
      { label: '매장',   summary: '진열 · 상담 · 판매' },
    ],
  },
  roleDetail: {
    sectionTitle: '역할 상세',
    roles: [
      { label: '공급자', tasks: ['상품 공급', '가격 조건', '콘텐츠 제공'] },
      { label: '운영자', tasks: ['상품 구성', '콘텐츠 구성', '매장 지원'] },
      { label: '매장',   tasks: ['상품 선택', '고객 응대', '판매 실행'] },
    ],
  },
  relations: {
    sectionTitle: '관계 구조',
    transitionBefore: '개별 매장 직접 운영 구조',
    transitionAfter: '운영자 기반 구조',
    mainFlow: ['공급자', '운영자', '매장'],
    subFlow: [
      { from: '상품',   mid: '구성', to: '판매' },
      { from: '콘텐츠', mid: '정리', to: '활용' },
      { from: '정보',   mid: '전달', to: '실행' },
    ],
  },
  features: {
    sectionTitle: '핵심 특징',
    items: [
      '운영자 중심 구조',
      '매장 실행 부담 분리',
      '콘텐츠 기반 판매 구조',
      '매장 직접 운영 부담 최소화',
    ],
  },
  bottomNav: {
    prev: { label: '← O4O 개요', to: '/guide/intro' },
    next: { label: 'KPA-Society 위치 →', to: '/guide/intro/kpa' },
  },
};

// ─── /guide/intro/kpa ──────────────────────────────────────────────────

export const kpaGuideIntroKpaProps: GuideIntroKpaPageProps = {
  hero: {
    eyebrow: 'O4O 개요',
    title: 'KPA-Society 위치',
    description: '커뮤니티 · 네트워크 · 매장 연결',
    context: [
      { label: '커뮤니티', value: '약사 중심 — 정보 · 경험 · 콘텐츠 축적' },
      { label: '연결 구조', value: '정보 기반 매장 실행' },
    ],
  },
  community: {
    sectionTitle: '커뮤니티 — 무엇이 쌓이는가',
    cards: [
      { label: '포럼',   summary: '질문 · 답변 · 경험 공유' },
      { label: '강의',   summary: '지식 전달 · 학습' },
      { label: '콘텐츠', summary: '자료 축적 · 활용 기반' },
    ],
  },
  network: {
    sectionTitle: '네트워크 — 왜 다른 커뮤니티와 다른가',
    cards: [
      { label: '약사 네트워크', summary: '전문 직군 기반 연결' },
      { label: '정보 흐름',     summary: '경험 → 공유 → 확산' },
      { label: '신뢰 구조',     summary: '전문성 기반 신뢰' },
    ],
  },
  storeConnection: {
    sectionTitle: '매장 연결 — 커뮤니티가 매장에 연결되는 구조',
    transitionBefore: '단순 커뮤니티',
    transitionAfter: '매장 실행 연결 구조',
    mainFlow: ['커뮤니티', '매장'],
    subFlow: [
      { from: '정보',   to: '적용' },
      { from: '콘텐츠', to: '설명' },
      { from: '경험',   to: '판매' },
    ],
  },
  roleSummary: {
    sectionTitle: '역할 정리',
    items: [
      '정보 축적 구조',
      '매장 실행 연결 구조',
      '커뮤니티 확장 기반',
      '전문가 기반 정보 네트워크',
    ],
  },
  bottomNav: {
    prev: { label: '← O4O 기본 구조', to: '/guide/intro/structure' },
    next: { label: '운영 구조 →', to: '/guide/intro/operation' },
  },
};

// ─── /guide/intro/operation ────────────────────────────────────────────

export const kpaGuideIntroOperationProps: GuideIntroOperationPageProps = {
  hero: {
    eyebrow: 'O4O 개요',
    title: '운영 구조',
    description: '운영자 · 매장 · 커뮤니티 흐름',
    context: [
      { label: '운영자', value: '구성 · 지원 · 실행 분리' },
      { label: '매장', value: '선택 · 활용 · 판매' },
    ],
  },
  operator: {
    sectionTitle: '운영자 — 무엇을 준비하는가',
    cards: [
      { label: '상품 구성',   summary: '상품 선택 · 구성' },
      { label: '콘텐츠 구성', summary: '자료 정리 · 콘텐츠 구성' },
      { label: '매장 지원',   summary: '진열 · 설명 · 운영 지원' },
    ],
  },
  store: {
    sectionTitle: '매장 — 무엇을 실행하는가',
    cards: [
      { label: '상품 선택', summary: '구성된 상품 선택' },
      { label: '매장 진열', summary: '채널별 상품 진열' },
      { label: '고객 대응', summary: '상담 · 설명 · 판매' },
    ],
  },
  community: {
    sectionTitle: '커뮤니티 — 무엇이 축적되는가',
    cards: [
      { label: '정보 공유', summary: '질문 · 답변 · 사례' },
      { label: '경험 축적', summary: '사용 경험 · 적용 사례' },
      { label: '확산 구조', summary: '정보 → 공유 → 확산' },
    ],
  },
  flow: {
    sectionTitle: '흐름',
    mainFlow: ['운영자', '매장', '커뮤니티'],
    cycle: ['구성', '실행', '공유'],
    subFlow: [
      { from: '상품',   mid: '구성', to: '판매' },
      { from: '콘텐츠', mid: '정리', to: '활용' },
      { from: '경험',   mid: '공유', to: '확산' },
    ],
  },
  features: {
    sectionTitle: '핵심 특징 — 왜 이 구조가 중요한가',
    items: [
      '운영자 중심 구조',
      '매장 실행 부담 분리',
      '커뮤니티 기반 확장',
      '실행과 관리 분리 구조',
    ],
  },
  bottomNav: {
    prev: { label: '← KPA-Society 위치', to: '/guide/intro/kpa' },
    next: { label: '핵심 개념 →', to: '/guide/intro/concept' },
  },
};

// ─── /guide/intro/concept ──────────────────────────────────────────────

export const kpaGuideIntroConceptProps: GuideIntroConceptPageProps = {
  hero: {
    eyebrow: 'O4O 개요',
    title: '핵심 개념',
    description: '연대 · 구조 · 정보 기반 판매',
    context: [
      { label: '문제', value: '소규모 사업자 환경 — 개별 운영 한계' },
      { label: '방향', value: '연대 기반 구조 — 연결 · 협력 · 실행' },
    ],
  },
  solidarity: {
    sectionTitle: '연대 — 왜 필요한가',
    cards: [
      { label: '소규모 사업자', summary: '개별 운영 구조 · 분산된 경쟁' },
      { label: '연결 구조',     summary: '개별 → 연결 · 분산 → 협력' },
      { label: '연대 효과',     summary: '공동 대응 · 정보 공유 · 실행 확대' },
    ],
  },
  structure: {
    sectionTitle: '구조 — 어떻게 구성되는가',
    cards: [
      { label: '세미 프랜차이즈', summary: '중앙 통제 없음 · 자율 기반 구조' },
      { label: '운영자 역할',     summary: '구성 · 지원 · 연결' },
      { label: '매장 역할',       summary: '선택 · 실행 · 판매' },
    ],
  },
  info: {
    sectionTitle: '정보 — 무엇이 경쟁력이 되는가',
    cards: [
      { label: '정보 기반 판매', summary: '설명 중심 · 콘텐츠 활용' },
      { label: '자료 활용',     summary: 'Raw 데이터 · 즉시 활용 구조' },
      { label: 'AI 활용',       summary: '해석 · 생성 · 적용' },
    ],
  },
  competition: {
    sectionTitle: '경쟁력 — 무엇이 달라지는가',
    rows: [
      { label: '기존 구조', items: ['개별 경쟁', '정보 부족', '실행 한계'], dim: true },
      { label: 'O4O 구조',  items: ['연대 기반', '정보 활용', '실행 지원'], dim: false },
    ],
    resultText: '소규모 경쟁력 확보 · 매장 실행 강화',
  },
  summary: {
    sectionTitle: '핵심 정리',
    items: [
      '연대 기반 구조',
      '운영자 중심 구성',
      '정보 기반 판매',
      '소규모 사업자 경쟁력 구조',
    ],
  },
  bottomNav: {
    prev: { label: '← 운영 구조', to: '/guide/intro/operation' },
    backHome: { label: 'O4O 개요로 돌아가기', to: '/guide/intro' },
  },
};

// ─── /guide/usage ──────────────────────────────────────────────────────

export const kpaGuideUsageProps: GuideUsagePageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: '서비스 활용 방법',
    description:
      '약국 매장 운영의 실제 흐름입니다. 상품 확보부터 고객 상담 대응, 콘텐츠 활용까지 단계별로 설명합니다.',
    flowBarTitle: '매장 운영 흐름',
    flowLabels: ['상품 확보', '채널 진열', '고객 유입', '고객 요청', '고객 대응', '콘텐츠 활용', '사이니지'],
  },
  sections: [
    {
      step: '01',
      title: '상품 확보',
      routeLabel: '/store/commerce/products',
      description:
        '플랫폼 B2B 카탈로그에서 취급할 상품을 선택해 내 매장에 추가합니다. 추가된 상품은 주문 작업 시 빠르게 사용할 수 있습니다.',
      items: [
        {
          label: 'B2B 카탈로그 탐색',
          detail: '공급사별로 공급 가능한 상품을 확인합니다. 매장 허브(/store-hub/b2b)에서 상품 목록을 탐색합니다.',
        },
        {
          label: '내 매장에 추가',
          detail: '상품 옆 + 버튼을 누르면 내 매장 취급 목록에 등록됩니다.',
        },
        {
          label: '소매가 및 채널 설정',
          detail: 'B2C 탭(/store/commerce/products/b2c)에서 소매가를 입력하고 채널별 노출을 구성합니다.',
        },
      ],
    },
    {
      step: '02',
      title: '채널 진열',
      routeLabel: '/store/channels',
      description:
        '승인된 상품을 4개 채널(B2C·KIOSK·TABLET·SIGNAGE)에 배치합니다. 채널마다 노출 상품과 진열 순서를 독립적으로 구성합니다.',
      items: [
        {
          label: '채널 선택',
          detail: 'B2C(온라인 스토어), KIOSK, TABLET(키오스크 상담), SIGNAGE(사이니지) 중 목적에 맞는 채널을 선택합니다.',
        },
        {
          label: '상품 추가 및 순서 설정',
          detail: '채널에 상품을 추가하고 진열 순서를 조정합니다. 채널별로 노출 여부를 독립 제어합니다.',
        },
        {
          label: '채널 승인',
          detail: '채널은 플랫폼 승인(PENDING → APPROVED) 후 활성화됩니다. 승인 전에는 고객에게 노출되지 않습니다.',
        },
      ],
    },
    {
      step: '03',
      title: '고객 유입',
      routeLabel: '/store/marketing/qr',
      description:
        'QR 코드를 생성해 고객이 온라인 스토어·태블릿·콘텐츠 페이지로 바로 진입하도록 유도합니다. QR 스캔 분석으로 유입 현황을 파악합니다.',
      items: [
        {
          label: 'QR 코드 생성',
          detail: '목적에 따라 랜딩 유형을 선택합니다. 상품 링크(product), 태블릿 상담(tablet), 콘텐츠 페이지(page), 외부 링크(link).',
        },
        {
          label: 'QR 출력 및 부착',
          detail: '생성된 QR을 인쇄해 매장 진열대·포스터·POP 자료에 부착합니다.',
        },
        {
          label: '스캔 분석',
          detail: '스캔 수, 디바이스 분포, 상위 QR 순위를 /store/analytics/marketing에서 확인합니다.',
        },
      ],
    },
    {
      step: '04',
      title: '고객 요청',
      routeLabel: '/tablet/:slug (고객 화면)',
      description:
        '고객이 태블릿 키오스크에서 관심 상품을 선택하고 상담을 요청합니다. 인증 없이 접근 가능하며, 요청 후 처리 상태를 실시간으로 확인합니다.',
      items: [
        {
          label: '태블릿에서 상품 탐색',
          detail: 'TABLET 채널에 진열된 상품이 그리드로 표시됩니다. 상품을 탭하면 상세 오버레이가 열립니다.',
        },
        {
          label: '관심 표시 / 상담 요청',
          detail: '이름과 메모를 입력해 요청을 제출합니다. 이름과 메모는 선택 사항입니다.',
        },
        {
          label: '상태 실시간 추적',
          detail: '요청 후 화면에서 처리 상태(대기 중 → 확인됨 → 완료)를 3초 간격으로 자동 갱신합니다.',
        },
      ],
    },
    {
      step: '05',
      title: '고객 대응',
      routeLabel: '/store/requests',
      description:
        '직원 화면에서 고객 요청을 실시간으로 확인하고 상태를 처리합니다. 5초 간격으로 자동 갱신되며, 확인·완료·취소 세 가지 액션을 제공합니다.',
      items: [
        {
          label: '요청 실시간 확인',
          detail: '새 요청이 도착하면 목록 상단에 표시됩니다. 상품명, 고객 메모, 요청 시각이 함께 표시됩니다.',
        },
        {
          label: '확인(ACKNOWLEDGED)',
          detail: '"확인" 버튼을 누르면 고객 화면에 "확인됨" 상태가 표시됩니다. 직원이 인지했음을 고객에게 알립니다.',
        },
        {
          label: '완료(COMPLETED) / 취소(CANCELLED)',
          detail: '상담 후 "완료"로 마무리합니다. 필요 시 "취소"로 처리합니다.',
        },
      ],
    },
    {
      step: '06',
      title: '콘텐츠 활용',
      routeLabel: '/store/content',
      description:
        '자료실에 콘텐츠를 업로드하고 게시 상태를 관리합니다. 게시된 콘텐츠는 공개 매장 페이지에 자동으로 노출됩니다.',
      items: [
        {
          label: '자료실 업로드',
          detail: '이미지·문서·동영상을 자료실에 업로드합니다. 초안(draft) 상태로 저장되어 공개 전까지 노출되지 않습니다.',
        },
        {
          label: '게시 상태 관리',
          detail: 'draft → published로 전환하면 공개 스토어에 노출됩니다. 필요 시 hidden으로 숨깁니다.',
        },
        {
          label: '채널 노출 설정',
          detail: '콘텐츠마다 홈(home) 또는 사이니지(signage) 채널 노출 여부를 개별 설정합니다.',
        },
      ],
    },
    {
      step: '07',
      title: '사이니지 운영',
      routeLabel: '/store/marketing/signage/playlist',
      description:
        '매장 디스플레이에 재생할 콘텐츠를 플레이리스트로 구성하고 시간·요일 스케줄을 설정합니다.',
      items: [
        {
          label: '플레이리스트 구성',
          detail: '동영상·이미지를 플레이리스트에 추가하고 재생 순서를 조정합니다.',
        },
        {
          label: '스케줄 설정',
          detail: '시간대·요일별로 다른 플레이리스트를 재생하도록 스케줄을 설정합니다.',
        },
        {
          label: '허브 라이브러리 활용',
          detail: '매장 허브(/store-hub/signage)에서 플랫폼 공용 사이니지 콘텐츠를 탐색해 내 매장에 활용합니다.',
        },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← O4O 개요', to: '/guide/intro' },
    next: { label: '기능별 이용 방법 →', to: '/guide/features' },
  },
};

// ─── /guide/features ───────────────────────────────────────────────────

export const kpaGuideFeaturesProps: GuideFeaturesPageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: '기능별 이용 방법',
    description: 'KPA-Society 주요 기능을 카테고리별로 정리했습니다. 필요한 기능을 선택해 바로 이동합니다.',
    flowBarTitle: '기능 카테고리',
    flowLabels: ['커뮤니티', '강의', '콘텐츠', '자료실', '설문조사', '매장 운영', '사이니지', 'QR · Tablet'],
  },
  groups: [
    {
      step: '01',
      title: '커뮤니티',
      primaryRoute: '/forum',
      description: '약사 간 질문·답변·경험 공유. 카테고리별 포럼에서 현장 노하우를 나눕니다.',
      items: [
        { label: '포럼 이용 방법', route: '/guide/features/forum' },
      ],
      linkTo: '/guide/features/forum',
    },
    {
      step: '02',
      title: '강의',
      primaryRoute: '/lms',
      description: '약사 전문 교육 강의 조회 및 수강. 강의별 레슨 학습과 진행 상황을 확인합니다.',
      items: [
        { label: '강의(LMS) 이용 방법', route: '/guide/features/lms' },
        { label: '강의 목록', route: '/lms' },
        { label: '강의 상세·수강', route: '/lms/course/:id' },
        { label: '내 강의·수강 이력', route: '/mypage/enrollments' },
      ],
      linkTo: '/guide/features/lms',
    },
    {
      step: '03',
      title: '콘텐츠',
      primaryRoute: '/content',
      description: '문서형 콘텐츠, 안내 자료, 마케팅 자료. 플랫폼 공통 콘텐츠를 열람합니다.',
      items: [
        { label: '콘텐츠 이용 방법', route: '/guide/features/content' },
      ],
      linkTo: '/guide/features/content',
    },
    {
      step: '04',
      title: '자료실',
      primaryRoute: '/resources',
      description: '파일 자료, 원본 자료, 매장 활용 자료. 다운로드 가능한 형태로 공유됩니다.',
      items: [
        { label: '자료실 이용 방법', route: '/guide/features/resources' },
      ],
      linkTo: '/guide/features/resources',
    },
    {
      step: '05',
      title: '설문조사',
      primaryRoute: '/surveys',
      description: '설문에 참여해 포인트를 받고, 회원이 직접 설문을 만들어 의견을 모읍니다.',
      items: [
        { label: '설문조사 이용 방법', route: '/guide/features/survey' },
        { label: '설문 목록', route: '/surveys' },
        { label: '설문 만들기', route: '/content/surveys/new' },
        { label: '내 설문 관리', route: '/content/surveys' },
      ],
      linkTo: '/guide/features/survey',
    },
    {
      step: '06',
      title: '매장 운영',
      primaryRoute: '/store',
      description: '약국 매장의 상품·채널·고객 요청을 통합 관리합니다. 승인된 약사 계정 필요.',
      items: [
        { label: '매장 운영 이용 방법', route: '/guide/features/store' },
        { label: '운영 홈', route: '/store' },
        { label: '상품 구성', route: '/store/commerce/products' },
        { label: 'B2C 가격 설정', route: '/store/commerce/products/b2c' },
        { label: '채널 진열', route: '/store/channels' },
        { label: '고객 요청 관리', route: '/store/requests' },
        { label: '주문 관리', route: '/store/commerce/orders' },
      ],
      linkTo: '/guide/features/store',
    },
    {
      step: '07',
      title: '디지털 사이니지',
      primaryRoute: '/store/marketing/signage/playlist',
      description: '매장 디스플레이에 재생할 콘텐츠를 플레이리스트로 구성하고 스케줄을 설정합니다.',
      items: [
        { label: '디지털 사이니지 이용 방법', route: '/guide/features/signage' },
      ],
      linkTo: '/guide/features/signage',
    },
    {
      step: '08',
      title: 'QR · Tablet',
      primaryRoute: '/store/marketing/qr',
      description: 'QR 코드로 고객을 유입하고 태블릿 키오스크로 상담 요청을 연결합니다.',
      items: [
        { label: 'QR · Tablet 이용 방법', route: '/guide/features/qr' },
        { label: 'QR 코드 관리', route: '/store/marketing/qr' },
        { label: '태블릿 키오스크', route: '/tablet/:slug' },
        { label: '마케팅 분석', route: '/store/analytics/marketing' },
      ],
      linkTo: '/guide/features/qr',
    },
  ],
  bottomNav: {
    prev: { label: '← 서비스 활용 방법', to: '/guide/usage' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/signage ───────────────────────────────────────────

export const kpaGuideFeatureSignageProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '디지털 사이니지 이용 방법',
    description: '영상 콘텐츠, 플레이리스트, 매장 TV 노출',
    primaryAction: { label: '플레이리스트 관리로 이동 →', to: '/store/marketing/signage/playlist' },
    flowBarTitle: '이용 흐름',
    flowLabels: ['사이니지 이동', '콘텐츠 준비', '플레이리스트 구성', '매장 적용', '운영 기준', 'AI 활용 기준'],
  },
  sections: [
    {
      step: '01',
      title: '사이니지 이동',
      routeLabel: '/store/marketing/signage/playlist',
      description: '플레이리스트 관리 화면으로 진입해 사이니지 운영을 시작합니다.',
      items: [
        { label: '플레이리스트 진입', detail: '/store/marketing/signage/playlist 로 이동합니다.' },
        { label: '플레이리스트 목록', detail: '매장에 등록된 플레이리스트와 상태를 확인합니다.' },
        { label: '사이니지 관리 화면', detail: '플레이리스트별 콘텐츠 구성과 적용 매장을 관리합니다.' },
      ],
    },
    {
      step: '02',
      title: '콘텐츠 준비',
      description: '재생할 영상 URL과 콘텐츠를 미리 정리합니다.',
      items: [
        { label: '영상 URL (YouTube/Vimeo)', detail: '재생할 외부 영상의 공유 URL을 확보합니다.' },
        { label: '영상 목록 구성', detail: '주제·매장 사용 시점별로 영상 목록을 정리합니다.' },
        { label: '콘텐츠 선택', detail: '플레이리스트에 추가할 콘텐츠를 선택합니다.' },
      ],
    },
    {
      step: '03',
      title: '플레이리스트 구성',
      description: '선택한 콘텐츠를 플레이리스트로 묶고 재생 순서를 정합니다.',
      items: [
        { label: '영상 추가', detail: '플레이리스트에 영상 URL 또는 콘텐츠를 추가합니다.' },
        { label: '순서 변경', detail: '드래그 또는 순서 입력으로 재생 순서를 조정합니다.' },
        { label: '삭제 / 재정렬', detail: '불필요한 항목을 제거하거나 묶음을 다시 정리합니다.' },
      ],
    },
    {
      step: '04',
      title: '매장 적용',
      description: '구성한 플레이리스트를 매장 디스플레이에 적용해 재생합니다.',
      items: [
        { label: '매장 플레이리스트 선택', detail: '매장에서 사용할 플레이리스트를 지정합니다.' },
        { label: 'TV 재생', detail: '매장 TV·디스플레이에서 사이니지 재생 화면을 엽니다.' },
        { label: '전체 화면 재생', detail: '브라우저 전체 화면 모드로 매장 노출 화면을 구성합니다.' },
      ],
    },
    {
      step: '05',
      title: '운영 기준',
      description: '매장 특성에 맞게 사이니지를 운영합니다.',
      items: [
        { label: '매장 맞춤 구성', detail: '매장 위치·고객 연령대·시간대에 맞춰 콘텐츠를 구성합니다.' },
        { label: '콘텐츠 주기적 업데이트', detail: '계절·시즌·재고 변화에 따라 정기적으로 갱신합니다.' },
        { label: '운영자 콘텐츠 활용', detail: '운영자가 배포한 공식 콘텐츠를 우선 활용합니다.' },
      ],
    },
    {
      step: '06',
      title: 'AI 활용 기준',
      description: 'AI로 사이니지 운영을 지원합니다. 사용 전 검토는 필수입니다.',
      items: [
        { label: '콘텐츠 추천', detail: '매장 특성·계절·재고 기반으로 콘텐츠를 추천받습니다.' },
        { label: '플레이리스트 구성 제안', detail: '시간대·고객 흐름을 반영한 재생 순서를 제안받습니다.' },
        { label: '설명 문구 생성', detail: '재생 콘텐츠에 부속할 자막·설명 문구를 생성합니다.' },
        { label: '검토 후 적용', detail: 'AI 결과는 약사·매장 책임자가 반드시 검토한 뒤 적용합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/content ───────────────────────────────────────────
// WO-O4O-KPA-GUIDE-CONTENT-MANUAL-REFRESH-V1: 실제 구현 기준 전면 정비
// - /content = 3-섹션 허브 (문서형/코스형/설문) + 자료실 진입
// - 문서형 콘텐츠 (/content/documents) — 작성·상세·추천·감사 포인트
// - AI로 만들기: URL/텍스트 → HTML 생성 (요약·매장용 변환 설명 제거)
// - 자료실 (/content/resources) — 내 자료함 가져가기
// - 코스형 자료 · 설문은 별도 가이드로 위임

export const kpaGuideFeatureContentProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '콘텐츠 이용 방법',
    description: '문서형 콘텐츠를 읽고 작성하고, AI로 만들고, 자료실에서 가져오는 방법을 안내합니다',
    primaryAction: { label: '콘텐츠 허브로 이동 →', to: '/content' },
    flowBarTitle: '이용 흐름',
    flowLabels: ['콘텐츠 허브', '문서형 콘텐츠', '콘텐츠 작성', 'AI로 만들기', '자료실', '다른 콘텐츠'],
  },
  sections: [
    {
      step: '01',
      title: '콘텐츠 허브',
      routeLabel: '/content',
      description: '문서형 콘텐츠, 코스형 자료, 설문조사를 한 화면에서 미리 보고 진입합니다. 우상단의 자료실 링크로 가져갈 수 있는 자료도 바로 확인합니다.',
      items: [
        { label: '문서형 콘텐츠 섹션', detail: '최근 문서 미리보기. 우측 "더 보기 →"로 전체 목록(/content/documents)으로 이동합니다.' },
        { label: '코스형 자료 섹션', detail: '공개된 코스형 자료가 카드로 표시됩니다. 더 보기로 /content/courses 로 이동합니다.' },
        { label: '설문조사 섹션', detail: '진행 중·완료된 설문이 표시됩니다. 더 보기로 /content/surveys 로 이동합니다.' },
        { label: '등록 버튼', detail: '로그인한 회원은 각 섹션 우상단에서 "문서 등록", "코스형 자료 등록", "설문 등록"으로 진입합니다.' },
        { label: '자료실 진입', detail: '페이지 우상단 "자료실 →" 링크로 /content/resources 로 이동합니다.' },
      ],
    },
    {
      step: '02',
      title: '문서형 콘텐츠',
      routeLabel: '/content/documents',
      description: '회원이 등록한 문서형 콘텐츠를 목록과 상세로 확인합니다. 상세 화면에서 추천·링크 복사·감사 포인트로 작성자에게 반응을 전달합니다.',
      items: [
        { label: '문서 목록', detail: '/content/documents 에서 전체 문서를 최신순으로 봅니다. 클릭하면 Drawer로 미리보기가 열립니다.' },
        { label: '상세 보기', detail: '/content/:id 에서 본문, 제목, 작성자, 요약, 태그, 조회수를 확인합니다.' },
        { label: '추천', detail: '♥ 버튼으로 좋은 콘텐츠를 추천합니다. 로그인 회원만 가능합니다.' },
        { label: '링크 복사', detail: '🔗 버튼으로 현재 콘텐츠 링크를 복사해 다른 채널에 공유합니다.' },
        { label: '감사 포인트', detail: '글 상세에 누적 감사 포인트, 감사한 인원, 최근 감사 메시지가 표시됩니다.' },
      ],
    },
    {
      step: '03',
      title: '콘텐츠 작성',
      routeLabel: '/content/documents/new',
      description: '리치 텍스트 편집기로 콘텐츠를 작성합니다. 초안으로 저장하거나 바로 공개할 수 있고, 작성자만 이후 수정이 가능합니다.',
      items: [
        { label: '제목 입력', detail: '검색·목록에 노출되는 핵심 제목을 입력합니다. (필수)' },
        { label: '본문 작성', detail: '리치 텍스트 편집기에서 텍스트·이미지·링크·표를 정리합니다. 이미지는 본문 안에 직접 삽입합니다.' },
        { label: '요약 입력', detail: '목록·미리보기에서 노출되는 한 줄 요약을 입력합니다. (선택)' },
        { label: '태그 입력', detail: 'Enter 또는 쉼표로 태그를 추가합니다. 최소 1개 이상 필요합니다.' },
        { label: '매장 가져가기 정책', detail: '매장이 내 자료함으로 가져갈 수 있는지 선택합니다. 기본은 "허용", 제한하려면 "제한"을 선택합니다.' },
        { label: '초안 저장 · 공개 저장', detail: '초안은 본인만 보고, 공개는 목록과 자료실 흐름에 노출됩니다.' },
        { label: '수정', detail: '/content/:id/edit 에서 본인이 작성한 콘텐츠를 수정합니다.' },
      ],
    },
    {
      step: '04',
      title: 'AI로 만들기',
      description: '작성 화면 상단의 "AI로 만들기" 버튼으로 URL 또는 텍스트를 입력해 HTML 콘텐츠를 자동 생성합니다.',
      items: [
        { label: 'URL 입력', detail: '웹 페이지 또는 유튜브 URL을 입력하면 AI가 해당 페이지를 HTML 콘텐츠로 변환합니다.' },
        { label: '텍스트 입력', detail: '텍스트를 붙여넣으면 AI가 HTML 형식으로 정리합니다.' },
        { label: '본문 자동 입력', detail: '생성된 HTML은 본문 영역에 자동으로 들어갑니다.' },
        { label: '제목 자동 추출', detail: '제목이 비어 있으면 생성된 HTML의 첫 제목 줄이 자동으로 입력됩니다.' },
        { label: '추가 편집', detail: '생성 후 리치 텍스트 편집기에서 자유롭게 수정하고 태그·요약을 채워 저장합니다.' },
        { label: '이용조건 안내', detail: '원문에 라이선스·이용조건이 감지되면 모달에 경고가 표시됩니다. 검토 후 사용합니다.' },
      ],
    },
    {
      step: '05',
      title: '자료실',
      routeLabel: '/resources',
      description: '자료실은 콘텐츠와 별개의 공동자료실입니다. 활용·등록·내 자료함 가져가기 등 자세한 사용법은 자료실 가이드를 참고합니다.',
      items: [
        { label: '자료실 진입', detail: '/resources 에서 회원들이 함께 이용하는 공동자료실을 확인합니다.' },
        { label: '자료실 가이드 참고', detail: '자료 활용 방식, 등록, 내 자료함 가져가기 등은 /guide/features/resources 를 참고합니다.' },
      ],
    },
    {
      step: '06',
      title: '다른 콘텐츠 이동',
      description: '콘텐츠 허브에서 코스형 자료와 설문조사로 바로 이동합니다. 사용 방법은 각 전용 가이드를 참고합니다.',
      items: [
        { label: '코스형 자료', detail: '/content/courses 에서 공개된 코스형 자료를 확인합니다. 작성은 강사(lms:instructor) 또는 운영자 권한이 필요합니다.' },
        { label: '강의(LMS) 가이드', detail: '강의 수강·작성 흐름은 /guide/features/lms 가이드를 참고합니다.' },
        { label: '설문조사 가이드', detail: '설문 참여·작성·결과 확인·포인트 보상은 /guide/features/survey 가이드를 참고합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/resources ─────────────────────────────────────────
// WO-O4O-KPA-GUIDE-RESOURCES-MANUAL-REFRESH-V1: 실제 구현 기준 전면 정비
// - /resources (ResourcesHubPage) 기준. /content/resources는 별도 진입점
// - usage_type 기반 활용 분기 (READ/LINK/DOWNLOAD)
// - 회원 모달 등록 / 운영자 등록 권한 구분
// - 매장 경영자 한정 "내 자료함 가져가기" → /store/library/resources
// - AI 활용 기준 섹션 제거 (자료실에 AI 진입점 없음)
// - 카테고리/태그 필터 설명 제거 (UI 없음)

export const kpaGuideFeatureResourcesProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '자료실 이용 방법',
    description: '회원들이 함께 이용하는 공동자료실을 둘러보고, 활용하고, 등록하고, 내 매장 자료함으로 가져오는 방법을 안내합니다',
    primaryAction: { label: '자료실로 이동 →', to: '/resources' },
    flowBarTitle: '이용 흐름',
    flowLabels: ['자료실 둘러보기', '자료 활용', '자료 등록', '내 자료함 가져가기', '운영 자료', '콘텐츠와 차이'],
  },
  sections: [
    {
      step: '01',
      title: '자료실 둘러보기',
      routeLabel: '/resources',
      description: '/resources 로 진입해 자료 목록을 확인하고 검색·상세 보기로 원하는 자료를 찾습니다.',
      items: [
        { label: '자료실 진입', detail: '/resources 로 이동하면 공동자료실 메인이 표시됩니다.' },
        { label: '자료 목록', detail: '최신순으로 자료가 표시됩니다. 자료마다 제목, 요약, 등록자, 조회수가 보입니다.' },
        { label: '검색', detail: '상단 검색창에 키워드를 입력해 제목 · 내용 · 등록자 기준으로 자료를 찾습니다.' },
        { label: '자료 상세', detail: '자료를 클릭하면 우측 Drawer에서 본문 · 요약 · 첨부 · 등록일을 확인합니다.' },
        { label: '좋아요', detail: '로그인 회원은 마음에 드는 자료에 좋아요를 누를 수 있습니다.' },
      ],
    },
    {
      step: '02',
      title: '자료 활용',
      description: '자료마다 등록자가 설정한 활용 방식대로 동작합니다. 자료에 표시된 버튼/액션에 맞춰 사용합니다.',
      items: [
        { label: '읽기', detail: '본문이 있는 자료는 Drawer에서 바로 내용을 읽습니다.' },
        { label: '외부 링크', detail: '외부 URL이 연결된 자료는 새 창으로 해당 페이지로 이동합니다.' },
        { label: '다운로드', detail: '파일이 첨부된 자료는 버튼을 눌러 PDF · 이미지 · 문서를 내려받습니다.' },
      ],
    },
    {
      step: '03',
      title: '자료 등록',
      routeLabel: '/resources/new',
      description: '회원이 직접 자료를 등록해 공동자료실에 공유합니다. 본인이 등록한 자료는 이후 수정 · 삭제할 수 있습니다.',
      items: [
        { label: '등록 버튼', detail: '/resources 우상단 "+ 자료 등록" 버튼을 누릅니다. 비로그인 시 로그인 화면으로 이동합니다.' },
        { label: '등록 모달', detail: '제목, 요약, 본문 또는 첨부 파일/링크, 태그, 활용 방식(읽기·링크·다운로드)을 입력합니다.' },
        { label: '본인 자료 수정 / 삭제', detail: '/resources/:id/edit 에서 본인이 등록한 자료를 수정하고, 자료 메뉴에서 삭제합니다.' },
      ],
    },
    {
      step: '04',
      title: '내 자료함 가져가기',
      routeLabel: '/store/library/resources',
      description: '매장 경영자는 마음에 드는 자료를 내 매장 자료함으로 복사해 보관할 수 있습니다.',
      items: [
        { label: '권한', detail: '매장이 연결된 경영자 계정에서만 "내 자료함 가져가기" 메뉴가 표시됩니다.' },
        { label: '단건 가져가기', detail: '자료의 메뉴에서 "내 자료함 가져가기"를 선택하면 내 매장 자료함에 복사됩니다.' },
        { label: '도착지 확인', detail: '가져간 자료는 /store/library/resources (내 자료함 → 자료) 에서 확인합니다.' },
        { label: '원본과 독립', detail: '가져간 자료는 가져간 시점의 사본이며, 원본 자료가 수정되어도 내 자료함에는 영향이 없습니다.' },
        { label: '가져갈 수 없는 자료', detail: '등록자가 "가져가기 제한"으로 설정한 자료는 가져갈 수 없습니다. 메뉴에 "(불가)" 표시가 나타납니다.' },
      ],
    },
    {
      step: '05',
      title: '운영 자료',
      description: '운영자가 등록한 자료도 같은 목록에 함께 표시됩니다. 일반 회원이 등록한 자료와 한 화면에서 확인합니다.',
      items: [
        { label: '함께 표시', detail: '운영자 자료와 회원 자료는 자료실 한 목록에 함께 표시되며, 등록자 이름으로 구분합니다.' },
        { label: '운영자 등록 흐름', detail: '운영자는 별도 메뉴(/operator/resources)에서 자료를 등록 · 수정 · 삭제하고 공개 여부를 관리합니다. 일반 사용은 본 가이드에서 다루지 않습니다.' },
      ],
    },
    {
      step: '06',
      title: '콘텐츠와 자료실 차이',
      description: '콘텐츠와 자료실은 비슷해 보이지만 목적이 다릅니다. 작성이 필요하면 콘텐츠, 활용이 필요하면 자료실을 사용합니다.',
      items: [
        { label: '콘텐츠', detail: '회원이 직접 글을 작성해 공유하는 문서입니다. 리치 텍스트 편집기, AI로 만들기 등 작성 흐름에 초점.' },
        { label: '자료실', detail: '여러 회원이 함께 쓰는 자료 보관소입니다. 읽기 · 다운로드 · 링크 활용 등 사용 흐름에 초점.' },
        { label: '콘텐츠 가이드 참고', detail: '콘텐츠 작성과 AI 만들기 흐름은 /guide/features/content 가이드를 참고합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/survey ────────────────────────────────────────────
// WO-O4O-KPA-GUIDE-SURVEY-MANUAL-NEW-V1: 신규 작성
// - /surveys = 회원용 진입점 (포인트 보상 배지)
// - /content/surveys/new = 설문 만들기 진입점 (SINGLE_CHOICE/MULTIPLE_CHOICE/FREE_TEXT만 노출)
// - /content/surveys = 작성자/관리자용 목록 (검색·상태 필터)
// - /participation 정적 placeholder는 본 가이드에서 안내하지 않음
// - QUIZ 유형, scope 상세, 그래프 디테일은 매뉴얼 범위 외

export const kpaGuideFeatureSurveyProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '설문조사 이용 방법',
    description: '설문에 참여하고 포인트를 받고, 직접 설문을 만들어 의견을 모으는 방법을 안내합니다',
    primaryAction: { label: '설문조사로 이동 →', to: '/surveys' },
    flowBarTitle: '이용 흐름',
    flowLabels: ['설문 둘러보기', '설문 참여', '포인트 보상', '설문 만들기', '결과 보기', '내 설문 관리'],
  },
  sections: [
    {
      step: '01',
      title: '설문 둘러보기',
      routeLabel: '/surveys',
      description: '/surveys 에서 참여 가능한 설문 목록을 확인합니다. 진행 중인 설문이 카드 형태로 표시됩니다.',
      items: [
        { label: '설문 목록 진입', detail: '/surveys 로 이동하면 회원에게 공개된 진행 중 설문이 표시됩니다.' },
        { label: '설문 카드 정보', detail: '제목, 짧은 설명, 응답 수, 마감일이 카드에 함께 표시됩니다.' },
        { label: '포인트 표시', detail: '포인트 보상이 설정된 설문은 카드 우측에 포인트 배지가 표시됩니다.' },
        { label: '설문 상세 진입', detail: '카드를 클릭하면 /surveys/:id 에서 설문 정보와 참여 버튼을 확인합니다.' },
      ],
    },
    {
      step: '02',
      title: '설문 참여',
      routeLabel: '/surveys/:id',
      description: '설문 상세에서 "설문 참여하기" 버튼을 누르면 응답 화면으로 이동합니다. 각 질문에 답하고 제출합니다.',
      items: [
        { label: '참여 버튼', detail: '설문 상세에서 "설문 참여하기"를 누르면 응답 화면이 열립니다.' },
        { label: '응답 제출', detail: '질문에 답한 뒤 제출하면 결과 화면으로 이동합니다.' },
        { label: '비로그인 응답', detail: '로그인하지 않아도 응답할 수 있습니다. 단, 비로그인 응답은 포인트 보상 대상이 아닙니다.' },
        { label: '중복 응답 방지', detail: '같은 브라우저에서 한 설문에 한 번만 응답할 수 있습니다.' },
        { label: '응답 수정', detail: '응답 수정 가능 여부는 설문마다 다릅니다. 수정 허용 설문은 다시 진입했을 때 이전 응답을 불러옵니다.' },
      ],
    },
    {
      step: '03',
      title: '포인트 보상',
      description: '포인트 보상이 설정된 설문은 응답 완료 즉시 포인트가 지급됩니다. 비로그인 응답은 포인트 대상이 아닙니다.',
      items: [
        { label: '포인트 배지', detail: '설문 목록과 상세 화면에서 보상 금액(P) 배지로 표시됩니다.' },
        { label: '즉시 지급', detail: '응답 완료와 동시에 포인트가 지급됩니다. 설문 상세에서 지급 내역이 표시됩니다.' },
        { label: '이미 참여한 설문', detail: '재진입 시 "이미 응답하셨습니다" 안내와 지급된 포인트 금액이 함께 표시됩니다.' },
        { label: '결과 보기 이동', detail: '이미 응답한 설문은 상세 화면에서 "결과 보기" 버튼으로 결과 화면으로 이동합니다.' },
      ],
    },
    {
      step: '04',
      title: '설문 만들기',
      routeLabel: '/content/surveys/new',
      description: '콘텐츠 허브의 "설문 등록" 또는 /content/surveys/new 로 진입해 설문을 만듭니다. 로그인 회원이면 누구나 만들 수 있습니다.',
      items: [
        { label: '진입', detail: '/content/surveys 우상단 "설문 등록" 버튼 또는 /content/surveys/new 로 이동합니다.' },
        { label: '기본 정보', detail: '제목과 설명을 입력합니다.' },
        { label: '질문 추가', detail: '단일 선택, 복수 선택, 자유 응답 중 하나를 골라 질문을 추가합니다. 질문마다 필수 여부를 설정할 수 있습니다.' },
        { label: '평가하지 않는 설문', detail: '설문은 사람을 평가하지 않습니다. 점수 · 등급 · 랭킹 개념이 없으며, 응답을 모으고 보여주는 데 집중합니다.' },
        { label: '초안 저장', detail: 'DRAFT(초안) 상태로 저장하면 본인만 볼 수 있습니다.' },
        { label: '공개 전환', detail: 'ACTIVE(진행) 상태로 전환하면 회원이 참여할 수 있는 설문 목록(/surveys)에 노출됩니다.' },
      ],
    },
    {
      step: '05',
      title: '결과 보기',
      routeLabel: '/participation/:id/results',
      description: '응답이 끝난 설문은 결과 화면으로 이동합니다. 응답자 수와 질문별 집계를 한눈에 확인합니다.',
      items: [
        { label: '응답자 수', detail: '설문 전체 응답자 수와 질문 수, 익명/기명 여부가 요약 영역에 표시됩니다.' },
        { label: '질문별 집계', detail: '선택형 질문은 보기별 응답 분포로, 자유 응답은 답변 목록으로 표시됩니다.' },
        { label: '종료된 설문', detail: '종료된 설문도 같은 결과 화면에서 누적 응답 결과를 확인할 수 있습니다.' },
      ],
    },
    {
      step: '06',
      title: '내 설문 관리',
      routeLabel: '/content/surveys',
      description: '내가 만든 설문은 콘텐츠 허브의 설문 목록에서 관리합니다. 검색과 상태 필터로 빠르게 찾아 진행 상황을 확인합니다.',
      items: [
        { label: '설문 목록', detail: '/content/surveys 에서 작성한 설문과 다른 회원이 만든 설문을 함께 확인합니다.' },
        { label: '검색', detail: '상단 검색창에 키워드를 입력해 설문을 찾습니다.' },
        { label: '상태 필터', detail: '진행중(ACTIVE) · 초안(DRAFT) · 종료(CLOSED) 별로 목록을 좁힐 수 있습니다.' },
        { label: '행 클릭', detail: '진행 중 설문은 응답 화면, 초안·종료 설문은 결과 화면으로 이동합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/qr ────────────────────────────────────────────────

export const kpaGuideFeatureQrTabletProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: 'QR · Tablet 이용 방법',
    description: 'QR 코드로 고객을 유입하고 태블릿 키오스크로 상담 요청을 연결합니다',
    primaryAction: { label: 'QR 코드 관리로 이동 →', to: '/store/marketing/qr' },
    flowBarTitle: '이용 흐름',
    flowLabels: ['기능 개요', 'QR 진입', 'Tablet 화면', '직원 처리', '활용 시나리오', '주의 사항'],
  },
  sections: [
    {
      step: '01',
      title: 'QR · Tablet 기능 개요',
      description: 'QR 코드와 태블릿 키오스크를 연계해 매장 고객 접점을 디지털화합니다. 고객이 QR을 스캔하면 태블릿 상담 화면으로 이동하고, 상담 요청이 직원에게 실시간 전달됩니다.',
      items: [
        { label: 'QR 코드', detail: '매장 진열·POP·TV에 부착해 고객 접근 경로를 만듭니다.' },
        { label: '태블릿 키오스크', detail: '고객이 직접 상품을 탐색하고 관심 표시·상담 요청을 제출합니다.' },
        { label: '직원 처리 화면', detail: '접수된 요청을 실시간으로 확인하고 상태를 처리합니다.' },
      ],
    },
    {
      step: '02',
      title: 'QR 코드 진입 흐름',
      routeLabel: '/store/marketing/qr',
      description: '고객이 QR을 스캔하면 /qr/:slug 랜딩 페이지로 진입한 뒤 태블릿 화면으로 연결됩니다. QR 코드는 /store/marketing/qr에서 생성하고 출력합니다.',
      items: [
        { label: '고객이 QR 스캔', detail: '매장에 부착된 QR 코드를 스마트폰으로 스캔합니다.' },
        { label: '/qr/:slug 진입', detail: '스캔 후 QR 랜딩 페이지로 이동해 매장 정보가 표시됩니다.' },
        { label: '태블릿 화면으로 연결', detail: '랜딩에서 태블릿 상담 화면(/tablet/:slug)으로 자동 이동합니다.' },
      ],
    },
    {
      step: '03',
      title: 'Tablet 고객 화면 흐름',
      routeLabel: '/tablet/:slug',
      description: '고객이 태블릿에서 상품을 탐색하고 관심 요청을 제출합니다. 인증 없이 접근 가능하며, 제출 후 처리 상태를 실시간으로 확인합니다.',
      items: [
        { label: '상품 탐색', detail: 'TABLET 채널에 진열된 상품이 그리드로 표시됩니다. 상품을 탭하면 상세 정보가 열립니다.' },
        { label: '관심 있어요 요청 생성', detail: '이름·메모를 입력해 상담 요청을 제출합니다. 이름과 메모는 선택 사항입니다.' },
        { label: '상태 실시간 확인', detail: '요청 후 처리 상태(대기 중 → 확인됨 → 완료)를 3초 간격으로 자동 갱신합니다.' },
      ],
    },
    {
      step: '04',
      title: '직원 처리 흐름',
      routeLabel: '/store/requests',
      description: '직원 화면에서 고객 요청을 실시간으로 확인하고 상태를 처리합니다. 요청은 NEW → ACKNOWLEDGED → COMPLETED / CANCELED 순으로 진행됩니다.',
      items: [
        { label: 'NEW — 새 요청', detail: '태블릿에서 접수된 요청이 목록 상단에 NEW 뱃지와 함께 표시됩니다.' },
        { label: 'ACKNOWLEDGED — 확인', detail: '"확인" 버튼을 누르면 고객 화면에 확인됨 상태가 표시됩니다.' },
        { label: 'COMPLETED / CANCELED', detail: '상담 완료 후 "완료"로 처리하거나, 취소 사유 발생 시 "취소"로 처리합니다.' },
      ],
    },
    {
      step: '05',
      title: '매장 활용 시나리오',
      description: 'QR · Tablet 기능을 매장 운영에 맞게 활용합니다.',
      items: [
        { label: '진열 상품 상담', detail: '진열대 옆 QR로 태블릿 상담을 연결해 직원이 즉시 응대합니다.' },
        { label: 'TV / POP / QR 연계', detail: '사이니지 TV에 QR을 표시해 고객이 상품 정보 확인과 상담 요청을 한 번에 처리합니다.' },
        { label: '고객 관심 요청 확인', detail: '/store/requests에서 요청 목록을 5초마다 자동 갱신해 대기 고객을 놓치지 않습니다.' },
      ],
    },
    {
      step: '06',
      title: '주의 사항',
      description: 'QR · Tablet 기능 이용 시 반드시 확인해야 할 사항입니다.',
      items: [
        { label: '상담 보조 흐름', detail: 'Tablet은 결제·주문·배송과 직접 연결되지 않습니다. 관심 요청/상담 보조 목적으로만 사용합니다.' },
        { label: '결제·주문 분리', detail: '결제와 주문은 별도 채널(B2C 스토어 등)에서 처리합니다. Tablet 요청만으로 주문이 생성되지 않습니다.' },
        { label: '채널 승인 필요', detail: 'TABLET 채널에 상품이 진열되어 있어야 고객 화면에 상품이 표시됩니다. 승인 전에는 노출되지 않습니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/lms ──────────────────────────────────────────────
// WO-O4O-KPA-GUIDE-LMS-MANUAL-REFRESH-V1: 실제 구현 기준 전면 정비
// - 강의 → 레슨 2단계 구조 (Chapter 제거)
// - 레슨 타입 4종 반영 (텍스트·영상·퀴즈·과제)
// - 학습자/강사 기능 분리

export const kpaGuideFeatureLmsProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '강의(LMS) 이용 방법',
    description: '약사 대상 전문 강의를 수강하고 학습 진행·수료 상태를 관리하는 교육 허브입니다',
    primaryAction: { label: '강의 목록으로 이동 →', to: '/lms' },
    flowBarTitle: '이용 흐름',
    flowLabels: ['강의 찾기', '수강 신청', '강의 학습', '학습 관리', '수료증', '강사 기능'],
  },
  sections: [
    {
      step: '01',
      title: '강의 찾기',
      routeLabel: '/lms',
      description: '강의 목록에서 원하는 강의를 찾습니다. 키워드 검색과 카테고리 필터로 빠르게 탐색할 수 있습니다.',
      items: [
        { label: '강의 목록', detail: '수강 가능한 강의 전체가 표시됩니다. 강의명·강사·카테고리 정보를 확인합니다.' },
        { label: '검색', detail: '키워드를 입력해 강의명 기준으로 검색합니다.' },
        { label: '필터', detail: '카테고리·상태별로 강의를 좁혀 탐색합니다.' },
      ],
    },
    {
      step: '02',
      title: '수강 신청',
      routeLabel: '/lms/course/:id',
      description: '원하는 강의를 선택한 뒤 수강 신청 버튼을 누르면 학습을 시작할 수 있습니다.',
      items: [
        { label: '일반 강의', detail: '수강 신청 즉시 첫 레슨으로 이동합니다.' },
        { label: '회원제 강의', detail: '로그인한 회원만 수강 신청이 가능합니다.' },
        { label: '승인 필요 강의', detail: '강사가 수강 승인을 설정한 강의는 승인 후 학습이 시작됩니다. 승인 대기 중에는 내 강의에서 상태를 확인할 수 있습니다.' },
      ],
    },
    {
      step: '03',
      title: '강의 학습',
      routeLabel: '/lms/course/:courseId/lesson/:lessonId',
      description: '강의는 강의 → 레슨 구조로 구성됩니다. 레슨 단위로 학습이 진행되며, 각 레슨은 텍스트·영상·퀴즈·과제 중 하나로 제공됩니다.',
      items: [
        { label: '텍스트 레슨', detail: '글 형태로 구성된 레슨입니다. 내용을 확인하고 완료 버튼을 누릅니다.' },
        { label: '영상 레슨', detail: '영상을 시청하는 레슨입니다. 일정 비율 이상 시청하면 완료 처리됩니다.' },
        { label: '퀴즈', detail: '문제를 풀고 제출하면 결과가 즉시 표시됩니다.' },
        { label: '과제', detail: '답안을 작성해 제출합니다. 강사의 채점 후 결과를 확인할 수 있습니다.' },
      ],
    },
    {
      step: '04',
      title: '학습 관리',
      routeLabel: '/mypage/enrollments',
      description: '내 강의에서 수강 중인 강의의 진행 상태를 확인합니다.',
      items: [
        { label: '진행률 확인', detail: '수강 중인 강의별 레슨 완료 비율이 표시됩니다.' },
        { label: '내 강의', detail: '진행 중·완료·승인 대기·거절 상태별로 수강 이력을 확인합니다.' },
      ],
    },
    {
      step: '05',
      title: '수료증',
      routeLabel: '/mypage/certificates',
      description: '모든 레슨을 완료하면 수료증이 자동 발급됩니다.',
      items: [
        { label: 'PDF 다운로드', detail: '수료증을 PDF 파일로 내려받을 수 있습니다. 수료 일시와 강의명이 포함됩니다.' },
        { label: '공개 검증', detail: '수료증 링크를 통해 외부에서 수료 사실을 확인할 수 있습니다.' },
      ],
    },
    {
      step: '06',
      title: '강사 기능',
      routeLabel: '/instructor/courses',
      description: '강사는 강의를 직접 만들고 수강생을 관리합니다.',
      items: [
        { label: '강의 만들기', detail: '강의 제목·설명·공개 여부를 설정하고 레슨을 추가합니다.' },
        { label: '레슨 구성', detail: '텍스트·영상·퀴즈·과제 중 타입을 선택해 레슨을 구성합니다.' },
        { label: '수강생 관리', detail: '수강 신청을 승인하거나 거절하고, 수강생별 진행 현황을 확인합니다.' },
        { label: '과제 채점', detail: '제출된 과제를 확인하고 점수를 부여합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/store ─────────────────────────────────────────────

export const kpaGuideFeatureStoreProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '매장 운영 이용 방법',
    description: '약국 매장의 상품·채널·고객 요청을 한 곳에서 관리하는 운영·상담·노출 허브입니다',
    primaryAction: { label: '매장 운영 홈으로 이동 →', to: '/store' },
    flowBarTitle: '이용 흐름',
    flowLabels: ['운영 개요', '진입 경로', '채널 이해', '상품/콘텐츠 운영', '고객 대응', '운영 시나리오'],
  },
  sections: [
    {
      step: '01',
      title: '매장 운영 개요',
      description: '약사 계정이 승인되면 "내 매장"이 자동 생성됩니다. 별도의 매장 개설 절차는 없습니다. 매장은 상품 진열·고객 응대·사이니지 노출을 통합하는 오프라인 경쟁력 강화 허브이며, O4O 구조에서 매장은 공급자의 상품과 콘텐츠를 받아 고객에게 직접 전달하는 실행 주체입니다.',
      items: [
        { label: '자동 생성 매장', detail: '계정 승인 시 내 매장이 자동으로 생성됩니다. 별도 개설 단계 없음.' },
        { label: '운영·상담·노출 허브', detail: '주문/결제 시스템이 아니라 상품 진열, 고객 상담 보조, 사이니지 노출을 관리하는 공간입니다.' },
        { label: 'O4O 매장 역할', detail: '공급자 카탈로그에서 상품을 받아 채널별로 노출하고, 고객 관심 요청에 직원이 대응합니다.' },
      ],
    },
    {
      step: '02',
      title: '매장 진입 경로',
      routeLabel: '/store',
      description: '매장 운영은 여러 경로로 접근합니다. 각 경로는 역할이 구분되어 있습니다.',
      items: [
        { label: '/store (대시보드)', detail: '매장 전체 현황을 한눈에 확인합니다. 최근 요청·채널 상태·상품 수가 표시됩니다.' },
        { label: '/store-hub (운영 허브)', detail: '상품·콘텐츠·사이니지를 통합 관리하는 허브 화면입니다.' },
        { label: '/store/channels (채널 관리)', detail: 'B2C·TABLET·KIOSK·SIGNAGE 채널별 진열 상품을 설정합니다.' },
        { label: '/store/requests (관심 요청)', detail: '태블릿·QR에서 접수된 고객 관심 요청을 확인하고 처리합니다.' },
      ],
    },
    {
      step: '03',
      title: '채널(Channel) 이해',
      routeLabel: '/store/channels',
      description: '채널은 상품이 고객에게 노출되는 방식을 구분한 개념입니다. 같은 상품도 채널에 따라 다른 방식으로 보입니다.',
      items: [
        { label: 'B2C — 공개 URL', detail: '일반 고객이 웹 URL로 접근하는 온라인 매장 채널입니다. B2C 가격이 별도로 설정됩니다.' },
        { label: 'TABLET — 태블릿 키오스크', detail: '매장 내 태블릿에서 고객이 직접 상품을 탐색하는 채널입니다. QR로 연결됩니다.' },
        { label: 'KIOSK — 키오스크', detail: '독립형 키오스크 화면에서 상품을 표시하는 채널입니다.' },
        { label: 'SIGNAGE — 사이니지 TV', detail: '매장 디스플레이에 콘텐츠와 상품을 노출하는 채널입니다. 플레이리스트로 구성합니다.' },
      ],
    },
    {
      step: '04',
      title: '상품/콘텐츠 운영 흐름',
      routeLabel: '/store-hub',
      description: '매장 운영은 상품·콘텐츠·사이니지 3축으로 구성됩니다. 각 축은 공급자에서 매장으로 흐릅니다.',
      items: [
        { label: '상품 축 — 공급자 카탈로그', detail: '공급자 카탈로그에서 상품을 내 매장에 추가(B2B)하고, 채널별로 진열합니다.' },
        { label: '콘텐츠 축 — CMS 복사/활용', detail: '플랫폼 콘텐츠(CMS)를 매장 허브로 복사해 고객 상담과 설명 자료로 활용합니다.' },
        { label: '사이니지 축 — 플레이리스트', detail: '콘텐츠와 상품 이미지를 사이니지 플레이리스트로 구성해 매장 TV에 노출합니다.' },
      ],
    },
    {
      step: '05',
      title: '고객 대응 흐름',
      routeLabel: '/store/requests',
      description: '고객이 QR·Tablet으로 관심 요청을 생성하면, 직원이 /store/requests에서 확인하고 처리합니다. 이 흐름은 주문이 아닌 상담/관심 관리입니다.',
      items: [
        { label: 'Tablet/QR → 관심 요청 생성', detail: '고객이 태블릿에서 상품을 탐색하고 "관심 있어요"를 선택하면 요청이 생성됩니다.' },
        { label: '/store/requests — 직원 확인', detail: '직원 화면에서 NEW 요청을 실시간으로 확인합니다. 5초마다 자동 갱신됩니다.' },
        { label: 'NEW → ACKNOWLEDGED → COMPLETED', detail: '확인 → 상담 진행 → 완료 순으로 상태를 처리합니다. 주문/결제는 별도 흐름입니다.' },
      ],
    },
    {
      step: '06',
      title: '매장 운영 시나리오',
      description: '매장의 물리적 공간과 디지털 채널을 연계하는 운영 시나리오입니다.',
      items: [
        { label: '진열대 + QR + Tablet 연계', detail: '진열대 옆에 QR을 부착해 고객이 태블릿 상담 화면으로 이동하고, 직원이 관심 요청을 받아 즉시 응대합니다.' },
        { label: 'TV(사이니지) + 상품 설명 연결', detail: '사이니지 플레이리스트에 상품 설명 콘텐츠를 추가해 고객이 TV로 정보를 확인하는 흐름을 만듭니다.' },
        { label: '관심 요청 → 상담 이어가기', detail: '/store/requests에서 요청을 확인한 직원이 고객에게 직접 접근해 상담을 이어가며 상담 완료 후 COMPLETED로 처리합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/forum ─────────────────────────────────────────────
// WO-O4O-KPA-GUIDE-FORUM-MANUAL-REFRESH-V1: 실제 구현 기준 전면 정비
// - 포럼 홈/전체 목록 분리, 포럼 선택 Combobox, 인기 태그
// - 글쓰기/수정/댓글/좋아요/공지 라우트 반영
// - 감사 포인트 시스템 추가 (Phase 1 구현 완료)
// - 비공개 포럼 가입 신청 흐름
// - 포럼 개설 신청 (/forum/request)
// - 내 활동 (/mypage/my-forums, /mypage/my-requests)

export const kpaGuideFeatureForumProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '포럼 이용 방법',
    description: '약사 커뮤니티에서 글을 읽고 쓰고 감사 포인트를 주고받는 방법을 안내합니다',
    primaryAction: { label: '포럼으로 이동 →', to: '/forum' },
    flowBarTitle: '이용 흐름',
    flowLabels: ['포럼 탐색', '글 찾기', '글쓰기와 참여', '감사 시스템', '비공개 포럼', '포럼 개설 신청', '내 활동'],
  },
  sections: [
    {
      step: '01',
      title: '포럼 탐색',
      routeLabel: '/forum',
      description: '포럼 홈에서 추천 포럼·활동 글을 확인하거나 전체 글 목록에서 포럼·태그별로 탐색합니다.',
      items: [
        { label: '포럼 홈', detail: '/forum 에서 추천 포럼, 최근 활동 글, 통합 검색이 표시됩니다.' },
        { label: '전체 글 목록', detail: '/forum/all 에서 모든 포럼의 글을 한 번에 봅니다.' },
        { label: '포럼 선택 필터', detail: '전체 글 목록 상단의 Combobox에서 포럼을 선택해 해당 포럼 글만 표시합니다.' },
        { label: '인기 태그', detail: '인기 태그 칩을 클릭하면 해당 태그가 붙은 글만 필터링됩니다.' },
      ],
    },
    {
      step: '02',
      title: '글 찾기',
      routeLabel: '/forum/all',
      description: '키워드 · 태그 · 포럼 조합으로 원하는 글을 빠르게 찾습니다. 필터 상태는 URL에 유지되어 공유·북마크가 가능합니다.',
      items: [
        { label: '키워드 검색', detail: '제목·본문 키워드로 글을 검색합니다. 포럼 홈 통합 검색은 포럼과 글을 함께 찾습니다.' },
        { label: '태그 필터', detail: '글에 부착된 태그를 클릭해 동일 태그 글을 모아 봅니다.' },
        { label: '포럼별 필터', detail: 'Combobox로 특정 포럼만 선택해 해당 포럼 글만 표시합니다.' },
      ],
    },
    {
      step: '03',
      title: '글쓰기와 참여',
      routeLabel: '/forum/write',
      description: '글을 작성·수정하고 다른 회원의 글에 댓글·좋아요로 참여합니다. 포럼 운영자는 중요한 글을 공지로 지정할 수 있습니다.',
      items: [
        { label: '글 작성', detail: '/forum/write 에서 포럼을 선택해 글을 등록합니다. 포럼 안에서는 /forum/:slug/write 로 바로 진입합니다.' },
        { label: '글 수정', detail: '/forum/edit/:id 에서 본인이 작성한 글을 수정합니다.' },
        { label: '글 상세 · 댓글', detail: '/forum/post/:id 에서 본문과 댓글을 확인하고 답변을 등록합니다.' },
        { label: '좋아요', detail: '글 상세 화면에서 👍 버튼으로 좋아요를 누릅니다. 로그인 회원만 가능합니다.' },
        { label: '공지글', detail: '포럼 운영자가 공지로 지정한 글은 목록 상단에 공지 배지와 함께 고정 표시됩니다.' },
      ],
    },
    {
      step: '04',
      title: '감사 시스템',
      routeLabel: '/forum/post/:id',
      description: '도움이 된 글에 감사 포인트와 메시지를 보내고, 글마다 받은 감사 집계를 확인합니다.',
      items: [
        { label: '감사 포인트 보내기', detail: '글 상세 화면의 감사 버튼을 눌러 1P 이상 금액을 선택해 전달합니다. 본인 글에는 전달할 수 없습니다.' },
        { label: '감사 메시지 작성', detail: '포인트와 함께 짧은 메시지를 남겨 작성자에게 의견을 전달합니다.' },
        { label: '감사 요약 확인', detail: '글 상세 화면에서 누적 포인트, 감사한 인원, 최근 감사 메시지를 확인합니다.' },
      ],
    },
    {
      step: '05',
      title: '비공개 포럼',
      description: '포럼은 공개·비공개로 구분됩니다. 비공개 포럼은 가입 신청 후 운영자 승인이 있어야 글을 열람할 수 있습니다.',
      items: [
        { label: '공개 포럼', detail: '누구나 글을 읽을 수 있는 포럼입니다. 로그인하면 글쓰기와 댓글도 가능합니다.' },
        { label: '비공개 포럼', detail: '🔒 표시가 있는 회원 전용 포럼입니다. 가입 승인 회원만 글을 열람할 수 있습니다.' },
        { label: '가입 신청', detail: '비공개 포럼 진입 시 표시되는 "가입 신청" 버튼을 눌러 신청을 보냅니다.' },
        { label: '승인 대기', detail: '신청 후에는 "승인 대기" 상태가 표시됩니다. 포럼 운영자의 승인을 기다립니다.' },
        { label: '승인 완료 후 참여', detail: '승인되면 새로고침으로 글 열람이 시작됩니다. 신청 상태는 /mypage/my-requests 에서 확인합니다.' },
      ],
    },
    {
      step: '06',
      title: '포럼 개설 신청',
      routeLabel: '/forum/request',
      description: '새 포럼이 필요할 때 직접 개설을 신청합니다. 운영자 검토 후 승인되면 포럼이 생성됩니다.',
      items: [
        { label: '포럼 정보 입력', detail: '포럼 이름(2~50자), 설명(10자 이상), 태그(1개 이상), 신청 사유를 입력합니다.' },
        { label: '공개 / 비공개 선택', detail: '신청 폼에서 공개 포럼 또는 비공개 포럼을 선택합니다.' },
        { label: '신청 상태 확인', detail: '신청 후 /mypage/my-requests 에서 검토 · 승인 · 거절 · 보완 요청 상태를 확인합니다.' },
      ],
    },
    {
      step: '07',
      title: '내 활동',
      routeLabel: '/mypage',
      description: '내가 개설한 포럼과 제출한 신청 내역을 마이페이지에서 관리합니다.',
      items: [
        { label: '내 포럼', detail: '/mypage/my-forums 에서 내가 운영하는 포럼 목록, 글 수, 회원 관리 메뉴를 확인합니다.' },
        { label: '회원 관리', detail: '/mypage/my-forums/:forumId/members 에서 비공개 포럼의 가입 신청을 승인 · 거절합니다.' },
        { label: '신청 내역', detail: '/mypage/my-requests 에서 포럼 개설 · 가입 등 모든 신청의 상태를 한곳에서 확인합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/for/store-owner ────────────────────────────────────────────
// WO-O4O-KPA-GUIDE-FOR-ROLE-V1: 역할별 Value Guide — 매장 경영자
// "기능 → 어떻게 쓰는가" 가 아니라 "내 역할에서 무엇을 얻고 어떻게 활용하는가" 관점.
// GuideUsagePageProps (hero + step sections + bottomNav) 재사용.

export const kpaGuideForStoreOwnerProps: GuideUsagePageProps = {
  hero: {
    eyebrow: '역할별 이용 가이드',
    title: '매장 경영자',
    description:
      '직원이 많지 않아도 정보 전달 경쟁력을 높이는 방법. 운영자가 준비한 자료를 받아 활용하거나 직접 매장 자산을 만들어 작은 매장도 큰 조직처럼 운영합니다.',
    flowBarTitle: '활용 흐름',
    flowLabels: ['운영자 자료 받기', '매장 자산 만들기', '고객 소통', '상품·주문', '분석', 'O4O 철학'],
  },
  sections: [
    {
      step: '01',
      title: '운영자가 준비한 자료 받기',
      routeLabel: '/store-hub/content · /store-hub/blog',
      description:
        '운영자가 HUB 에 게시한 콘텐츠와 블로그 자료를 내 매장 자료함으로 가져옵니다. 모든 매장이 같은 자료를 받을 수 있으므로 일관된 정보 전달이 가능합니다.',
      items: [
        { label: 'HUB 콘텐츠 받기', detail: '/store-hub/content — 운영자 게시 자료 조회·가져오기' },
        { label: 'HUB 블로그 받기', detail: '/store-hub/blog — 매장 블로그에 적용 가능' },
        { label: '내 자료함', detail: '/store/library/contents, /store/library/resources — 받은 자료 적재' },
        { label: 'Event Offer 참여', detail: '/store-hub/event-offers — 공급자 이벤트 적용' },
      ],
    },
    {
      step: '02',
      title: '매장 자산 직접 만들기',
      routeLabel: '/store/marketing/{pop, qr, signage}',
      description:
        '직원이 적어도 디지털 도구로 매장 마케팅 자산을 만듭니다. POP 는 AI 보조로 빠르게 초안을 만들 수 있습니다.',
      items: [
        { label: 'POP 제작', detail: '/store/marketing/pop — AI 보조 초안 + 템플릿' },
        { label: 'QR 코드', detail: '/store/marketing/qr — 자동 생성 + 배경/테마 + 인쇄' },
        { label: '디지털 사이니지', detail: '/store/marketing/signage/playlist — 매장 TV 플레이리스트' },
        { label: '매장 제작 자료', detail: '/store/library/production-materials — 직접 만든 자료 보관' },
      ],
    },
    {
      step: '03',
      title: '고객과 매장 블로그로 소통',
      routeLabel: '/store/content/blog',
      description:
        '매장 블로그로 단골 고객과 신규 고객에게 정보를 전달합니다. 운영자 자료를 그대로 쓰거나 매장 톤에 맞게 편집할 수 있습니다.',
      items: [
        { label: '매장 블로그 작성', detail: '/store/content/blog — 게시물 작성/편집' },
        { label: '외부 공개 URL', detail: '/store/:slug/blog — 고객이 직접 조회 가능' },
        { label: '상품 상세 자료', detail: '/store/marketing/product-descriptions — 상품별 설명·효과·사용법' },
      ],
    },
    {
      step: '04',
      title: '상품 마스터와 주문',
      routeLabel: '/store/commerce/*',
      description:
        '취급 상품 정보를 정리하고 B2B 발주 · B2C 판매를 한 곳에서 관리합니다.',
      items: [
        { label: '상품 마스터', detail: '/store/my-products — 취급 상품 정보·가격·재고' },
        { label: 'B2B 발주', detail: '/store/commerce/products — 공급자 카탈로그 조회·주문' },
        { label: 'B2C 판매', detail: '/store/commerce/products/b2c — 온라인 스토어' },
        { label: '주문 관리', detail: '/store/commerce/order-worktable — 주문 상태·배송' },
      ],
    },
    {
      step: '05',
      title: '마케팅 분석으로 의사결정',
      routeLabel: '/store/analytics/marketing',
      description:
        '콘텐츠 조회수 / QR 스캔 / POP 다운로드 통계로 어떤 자료가 효과적인지 확인합니다.',
      items: [
        { label: '마케팅 분석', detail: '/store/analytics/marketing — 자료별 효과 측정' },
        { label: '매장 정보·설정', detail: '/store/info, /store/settings — 매장 외형·템플릿 관리' },
      ],
    },
    {
      step: '06',
      title: 'O4O 철학 — 작은 매장도 큰 조직처럼',
      routeLabel: '(가치 명제)',
      description:
        '작은 매장도 큰 조직처럼 운영 경쟁력을 만들 수 있습니다. O4O 는 정보를 제공하는 플랫폼이 아닙니다. 정보를 실행 경쟁력으로 전환하는 플랫폼입니다.',
      items: [
        { label: '소규모 사업자 경쟁력', detail: '직원이 많지 않아도 운영 도구·자료·AI 로 매장 경쟁력을 만듭니다.' },
        { label: '운영자 지원', detail: '운영자가 만든 자료가 매장에 도착해 일관된 정보 전달을 가능하게 합니다.' },
        { label: 'AI 활용', detail: 'AI 는 매장의 자료 제작을 보조합니다. 사람을 대체하지 않고 경쟁력을 증폭합니다.' },
        { label: '정보 → 실행', detail: '커뮤니티 정보가 운영자 큐레이션을 거쳐 매장 실행 자산이 되는 흐름입니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← O4O 개요', to: '/guide/intro' },
    next: { label: '서비스 운영자 →', to: '/guide/for/operator' },
  },
};

// ─── /guide/for/operator ───────────────────────────────────────────────
// WO-O4O-KPA-GUIDE-FOR-ROLE-V1: 역할별 Value Guide — 서비스 운영자
// 공급자는 독립 역할로 노출하지 않고 "운영자 협력" 내부에 포함.
// 미구현 Workspace 는 §05 "준비 중" 섹션에 명시 (사용자 기대치 관리).

export const kpaGuideForOperatorProps: GuideUsagePageProps = {
  hero: {
    eyebrow: '역할별 이용 가이드',
    title: '서비스 운영자',
    description:
      '서비스 운영자는 생태계를 운영하고 매장을 지원합니다. 단순 관리자가 아니라 공급자 자료를 받아 매장 실행 자산으로 구성하는 운영 사업자입니다.',
    flowBarTitle: '운영자 흐름',
    flowLabels: ['공급자 협력', '콘텐츠 구성', '매장 HUB', '매장·회원 지원', '준비 중', 'O4O 철학'],
  },
  sections: [
    {
      step: '01',
      title: '공급자 협력 — 자료 수신·검수',
      routeLabel: '/operator/{product-applications, event-offers, collaboration-requests}',
      description:
        '공급자는 O4O 내부에 직접 등록하지 않습니다. 공급자 자료는 운영자가 오프라인으로 받아 등록·검수해 매장에 전달합니다. 운영자가 공급자 협력의 게이트입니다.',
      items: [
        { label: '상품 판매 신청 승인', detail: '/operator/product-applications — 매장 측 상품 등록 검수' },
        { label: 'Event Offer 승인', detail: '/operator/event-offers — 공급자 이벤트 검수·매장 배포' },
        { label: '협업 문의', detail: '/operator/collaboration-requests — 외부 협력사 문의 관리' },
      ],
    },
    {
      step: '02',
      title: '콘텐츠·자료 구성과 게시',
      routeLabel: '/operator/{content-hub, resources, guide-contents, ai-report}',
      description:
        '운영자가 직접 콘텐츠를 작성하거나 자료실을 정리해서 매장 HUB 로 게시합니다. AI 리포트로 운영 데이터를 참고합니다.',
      items: [
        { label: '콘텐츠 작성·HUB 게시', detail: '/operator/content-hub — RichTextEditor 기반 항목별 게시' },
        { label: '자료실 관리', detail: '/operator/resources — 자료 등록·분류·배포' },
        { label: '가이드 콘텐츠 편집', detail: '/operator/guide-contents — 사용자 가이드 inline 편집' },
        { label: 'AI 리포트 조회', detail: '/operator/ai-report — 운영 데이터 분석' },
      ],
    },
    {
      step: '03',
      title: '매장 HUB 운영 — 사이니지·미디어',
      routeLabel: '/operator/signage/*',
      description:
        '매장이 사용하는 사이니지 / 미디어 / 플레이리스트를 중앙에서 관리하고 배포합니다. 현재는 전체 매장 대상 일괄 배포가 중심입니다.',
      items: [
        { label: 'HQ 미디어', detail: '/operator/signage/hq-media — 중앙 미디어 자산' },
        { label: 'HQ 플레이리스트', detail: '/operator/signage/hq-playlists — 매장 사이니지 플레이리스트' },
        { label: '강제 콘텐츠', detail: '/operator/signage/forced-content — 전체 매장 강제 노출' },
        { label: '매장 목록', detail: '/operator/stores — 매장 현황·상세 조회' },
      ],
    },
    {
      step: '04',
      title: '매장·회원 지원과 커뮤니티 운영',
      routeLabel: '/operator/{members, pharmacy-requests, forum-management, lms, surveys}',
      description:
        '회원·약국 신청을 승인하고 포럼·LMS·설문 등 커뮤니티 활동을 운영합니다. 운영자는 매장과 회원에게 운영 서비스를 제공하는 사업자입니다.',
      items: [
        { label: '회원 관리', detail: '/operator/members — 가입 승인·역할·자격 관리' },
        { label: '약국 신청 승인', detail: '/operator/pharmacy-requests — 매장 가입 처리' },
        { label: '포럼 관리', detail: '/operator/forum-management — 포럼 개설 승인·콘텐츠' },
        { label: 'LMS 강의 운영', detail: '/operator/lms — 강의 개설·강사·커리큘럼' },
        { label: '설문 운영', detail: '/operator/surveys — 설문 작성·배포·응답 분석' },
      ],
    },
    {
      step: '05',
      title: '준비 중인 운영 도구',
      routeLabel: '(단계별 활성화 중)',
      description:
        'O4O 운영자 책임 중 다음 영역은 단계별로 활성화 중입니다. 현재는 위 4 단계를 중심으로 운영하시면 됩니다.',
      items: [
        { label: '공급자 자료 정식 등록 (Workspace A)', detail: '준비 중 — 현재는 콘텐츠 직접 작성으로 대체' },
        { label: 'AI 콘텐츠 가공 도구 (Workspace B)', detail: '준비 중 — 초안 생성 / 요약 / 이미지 도구' },
        { label: '매장별 맞춤 큐레이션 (Workspace C)', detail: '준비 중 — 현재는 전체 매장 일괄 배포' },
        { label: '매장 1:1 지원 (Workspace D)', detail: '준비 중 — 메시징 · 매장별 맞춤 데이터' },
        { label: '운영 수익 모델 (Workspace E)', detail: '준비 중 — 패키지 · 구독 모델' },
      ],
    },
    {
      step: '06',
      title: 'O4O 철학 — 운영자는 매장을 지원하는 사업자',
      routeLabel: '(가치 명제)',
      description:
        '운영자는 관리자가 아니라 매장을 지원하는 운영 사업자입니다. 공급자 자료 + 커뮤니티 데이터 + AI + 운영 경험 + 현장 이해를 활용하여 매장 실행 자산을 생산·구성·운영합니다.',
      items: [
        { label: '소규모 사업자 경쟁력', detail: '개별 매장이 운영자 지원으로 큰 조직과 대등하게 운영합니다.' },
        { label: '3 자 협력 구조', detail: '공급자 → 운영자 → AI 활용 → 매장 HUB → 매장 실행 흐름의 중간 책임자입니다.' },
        { label: 'AI 활용', detail: 'AI 는 운영자의 가공·구성·요약·추천을 보조합니다. 역할을 대체하지 않습니다.' },
        { label: '정보 → 실행', detail: '커뮤니티에서 나온 정보를 큐레이션해 매장 실행 자산으로 만드는 책임을 가집니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 매장 경영자', to: '/guide/for/store-owner' },
    next: { label: '커뮤니티 참여자 →', to: '/guide/for/member' },
  },
};

// ─── /guide/for/member ─────────────────────────────────────────────────
// WO-O4O-KPA-GUIDE-FOR-ROLE-V1: 역할별 Value Guide — 커뮤니티 참여자
// 일반 약사 / 직원 / 강사 등. AI 도움 / 감사 시스템은 미구현이므로 §05 준비 중에 명시.

export const kpaGuideForMemberProps: GuideUsagePageProps = {
  hero: {
    eyebrow: '역할별 이용 가이드',
    title: '커뮤니티 참여자',
    description:
      '정보를 나누는 것을 넘어 실제 현장 활용으로 연결합니다. 약사 / 직원 / 강사 등 약사 네트워크 구성원으로 참여하는 흐름입니다.',
    flowBarTitle: '참여 흐름',
    flowLabels: ['포럼', '강의', '콘텐츠·자료', '설문', '준비 중', 'O4O 철학'],
  },
  sections: [
    {
      step: '01',
      title: '포럼 — 동료 약사와 경험 공유',
      routeLabel: '/forum',
      description:
        '질문·답변·경험 공유로 현장 노하우를 나눕니다. 좋은 게시물은 운영자가 큐레이션해 매장 HUB 자료로 활용될 수 있습니다 (현장 → 매장 환류).',
      items: [
        { label: '포럼 글쓰기', detail: '/forum/write — 카테고리별 게시물 작성' },
        { label: '카테고리별 피드', detail: '/forum/:slug — 주제별 토론' },
        { label: '댓글·좋아요', detail: '/forum/post/:id — 게시물 토론·추천' },
      ],
    },
    {
      step: '02',
      title: '강의 (LMS) — 전문성 강화',
      routeLabel: '/lms',
      description:
        '보수교육·세미나·전문 강의를 수강하고 이수증·자격증을 발급받습니다. 매장 경영자는 직원 교육 자료로도 활용 가능합니다.',
      items: [
        { label: '강의 목록·수강', detail: '/lms — 강의 조회·수강' },
        { label: '내 수강', detail: '/mypage/enrollments — 진도·과제' },
        { label: '이수증·자격증', detail: '/mypage/certificates, /mypage/qualifications' },
      ],
    },
    {
      step: '03',
      title: '콘텐츠 / 자료실 — 운영자 자료 활용',
      routeLabel: '/content · /resources',
      description:
        '운영자가 작성·정리한 콘텐츠와 자료를 조회·다운로드합니다. 매장 경영자라면 이 자료를 그대로 내 매장 자료함으로 가져갈 수 있습니다.',
      items: [
        { label: '콘텐츠 허브', detail: '/content — 운영자 게시 콘텐츠 조회' },
        { label: '자료실', detail: '/resources — 자료 다운로드' },
        { label: '내 자격·크레딧', detail: '/mypage/qualifications, /mypage/credits' },
      ],
    },
    {
      step: '04',
      title: '설문 — 운영자에게 의견 전달',
      routeLabel: '/participation · /surveys',
      description:
        '운영자가 매장·회원에게 배포한 설문에 응답합니다. 응답은 운영자가 운영 데이터로 분석하여 정책·자료에 반영합니다.',
      items: [
        { label: '내 설문 참여', detail: '/participation — 참여형 콘텐츠' },
        { label: '진행 중 설문', detail: '/surveys — 설문 응답' },
      ],
    },
    {
      step: '05',
      title: '준비 중인 커뮤니티 기능',
      routeLabel: '(단계별 활성화 중)',
      description:
        '커뮤니티 참여 가치를 더 잘 표현하는 다음 기능은 단계별로 활성화 중입니다.',
      items: [
        { label: '감사 / 포인트', detail: '준비 중 — 좋은 답변·게시물 기여 인정 (현재 크레딧 schema 만)' },
        { label: '사용자 AI 도움', detail: '준비 중 — 일반 사용자용 콘텐츠 보조 도구' },
        { label: '사용자 콘텐츠 생산', detail: '준비 중 — 현재는 강사만 콘텐츠 생산 가능' },
      ],
    },
    {
      step: '06',
      title: 'O4O 철학 — 정보를 실행 경쟁력으로',
      routeLabel: '(가치 명제)',
      description:
        '좋은 정보는 실제 현장에서 활용될 때 더 큰 가치가 됩니다. O4O 는 정보를 제공하는 플랫폼이 아닙니다. 정보를 실행 경쟁력으로 전환하는 플랫폼입니다.',
      items: [
        { label: '커뮤니티 → 운영자 → 매장', detail: '포럼·강의의 좋은 정보는 운영자 큐레이션을 거쳐 매장 실행 자산이 됩니다.' },
        { label: '소규모 사업자 경쟁력', detail: '내 지식·경험이 다른 약사·매장의 경쟁력으로 확장됩니다.' },
        { label: 'AI 활용', detail: 'AI 는 약사·운영자·매장의 역할을 대체하지 않습니다. 경쟁력 증폭 도구입니다.' },
        { label: '운영자 보완', detail: '커뮤니티의 자발적 정보가 운영자 단독으로 만들기 어려운 가치를 만듭니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 서비스 운영자', to: '/guide/for/operator' },
    next: { label: '홈으로 →', to: '/' },
  },
};
