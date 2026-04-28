/**
 * GlycoPharm Guide Copy
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 *
 * GlycoPharm 도메인(당뇨/건강 콘텐츠 + 약국 매장) 기준으로 적응한 카피.
 * KPA와 동일한 7개 페이지 구조를 사용한다.
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

export const glycopharmGuideIntroProps: GuideIntroPageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: 'O4O 개요',
    description: 'O4O 플랫폼의 구조와 GlycoPharm이 그 안에서 어떤 역할을 하는지 정리합니다.',
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
      title: 'GlycoPharm 위치',
      href: '/guide/intro/kpa',
      description:
        'GlycoPharm은 당뇨 관련 커뮤니티와 콘텐츠를 기반으로 플랫폼에 참여하는 서비스입니다. 약국은 매장 역할을 하며, 커뮤니티·콘텐츠·자료실로 당뇨인과 약사를 연결합니다.',
      items: [
        { label: '당뇨 커뮤니티 기반', detail: '커뮤니티·콘텐츠·자료실이 당뇨 정보 공유의 중심 채널입니다.' },
        { label: '당뇨인 · 약사 네트워크', detail: '당뇨인과 약사가 정보와 경험을 공유합니다.' },
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
        { label: '커뮤니티 확장 구조', detail: '커뮤니티와 콘텐츠가 매장 운영 노하우를 네트워크 전체에 확산합니다.' },
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
        { label: '정보 기반 판매', detail: '당뇨 관련 전문 정보가 콘텐츠로 전환되어 매장 신뢰도와 매출을 높입니다.' },
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

export const glycopharmGuideIntroStructureProps: GuideIntroStructurePageProps = {
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
    next: { label: 'GlycoPharm 위치 →', to: '/guide/intro/kpa' },
  },
};

// ─── /guide/intro/kpa (서비스 위치) ─────────────────────────────────────

export const glycopharmGuideIntroKpaProps: GuideIntroKpaPageProps = {
  hero: {
    eyebrow: 'O4O 개요',
    title: 'GlycoPharm 위치',
    description: '당뇨 커뮤니티 · 네트워크 · 매장 연결',
    context: [
      { label: '커뮤니티', value: '당뇨인 중심 — 정보 · 경험 · 콘텐츠 축적' },
      { label: '연결 구조', value: '정보 기반 매장 실행' },
    ],
  },
  community: {
    sectionTitle: '커뮤니티 — 무엇이 쌓이는가',
    cards: [
      { label: '커뮤니티', summary: '질문 · 답변 · 경험 공유' },
      { label: '콘텐츠',   summary: '당뇨 관련 정보 · 학습' },
      { label: '자료실',   summary: '자료 축적 · 활용 기반' },
    ],
  },
  network: {
    sectionTitle: '네트워크 — 왜 다른 커뮤니티와 다른가',
    cards: [
      { label: '당뇨인 · 약사 네트워크', summary: '관심사 · 전문성 기반 연결' },
      { label: '정보 흐름',     summary: '경험 → 공유 → 확산' },
      { label: '신뢰 구조',     summary: '검증 정보 기반 신뢰' },
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
      '관심사 기반 정보 네트워크',
    ],
  },
  bottomNav: {
    prev: { label: '← O4O 기본 구조', to: '/guide/intro/structure' },
    next: { label: '운영 구조 →', to: '/guide/intro/operation' },
  },
};

// ─── /guide/intro/operation ────────────────────────────────────────────

export const glycopharmGuideIntroOperationProps: GuideIntroOperationPageProps = {
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
    prev: { label: '← GlycoPharm 위치', to: '/guide/intro/kpa' },
    next: { label: '핵심 개념 →', to: '/guide/intro/concept' },
  },
};

// ─── /guide/intro/concept ──────────────────────────────────────────────

export const glycopharmGuideIntroConceptProps: GuideIntroConceptPageProps = {
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

export const glycopharmGuideUsageProps: GuideUsagePageProps = {
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
        '플랫폼 B2B 카탈로그에서 취급할 상품을 선택해 내 매장에 추가합니다. 승인 후 소매가를 설정하고 노출을 활성화하면 판매 준비가 완료됩니다.',
      items: [
        {
          label: 'B2B 카탈로그 탐색',
          detail: '공급사별로 공급 가능한 상품을 확인합니다. 매장 허브(/store-hub/b2b)에서 상품 목록을 탐색합니다.',
        },
        {
          label: '내 매장에 추가',
          detail: '상품 옆 + 버튼으로 신청합니다. 승인 전까지는 대기(pending) 상태로 표시됩니다.',
        },
        {
          label: '소매가 설정 및 활성화',
          detail: 'B2C 탭(/store/commerce/products/b2c)에서 소매가를 입력하고 노출 토글을 켭니다.',
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

export const glycopharmGuideFeaturesProps: GuideFeaturesPageProps = {
  hero: {
    eyebrow: '이용 가이드',
    title: '기능별 이용 방법',
    description: 'GlycoPharm 주요 기능을 카테고리별로 정리했습니다. 필요한 기능을 선택해 바로 이동합니다.',
    flowBarTitle: '기능 카테고리',
    flowLabels: ['커뮤니티', '콘텐츠', '자료실', '매장 운영', '사이니지', 'QR · Tablet'],
  },
  groups: [
    {
      step: '01',
      title: '커뮤니티',
      primaryRoute: '/community',
      description: '당뇨인과 약사가 질문·답변·경험을 공유합니다. 카테고리별 게시판에서 정보를 나눕니다.',
      items: [
        { label: '커뮤니티 이용 방법', route: '/guide/features/forum' },
      ],
      linkTo: '/guide/features/forum',
    },
    {
      step: '02',
      title: '콘텐츠',
      primaryRoute: '/content',
      description: '당뇨 관련 안내 자료, 학습 자료, 마케팅 자료. 플랫폼 공통 콘텐츠를 열람합니다.',
      items: [
        { label: '콘텐츠 목록', route: '/content' },
        { label: '콘텐츠 작성', route: '/content/new' },
      ],
      linkTo: '/content',
    },
    {
      step: '03',
      title: '자료실',
      primaryRoute: '/resources',
      description: '파일 자료, 원본 자료, 매장 활용 자료. 다운로드 가능한 형태로 공유됩니다.',
      items: [
        { label: '자료실 이용 방법', route: '/guide/features/resources' },
      ],
      linkTo: '/guide/features/resources',
    },
    {
      step: '04',
      title: '매장 운영',
      primaryRoute: '/store',
      description: '약국 매장의 상품·채널·고객 요청을 통합 관리합니다. 승인된 매장 계정 필요.',
      items: [
        { label: '운영 홈', route: '/store' },
        { label: '상품 구성', route: '/store/commerce/products' },
        { label: 'B2C 가격 설정', route: '/store/commerce/products/b2c' },
        { label: '채널 진열', route: '/store/channels' },
        { label: '고객 요청 관리', route: '/store/requests' },
        { label: '주문 관리', route: '/store/commerce/orders' },
      ],
      linkTo: '/store',
    },
    {
      step: '05',
      title: '디지털 사이니지',
      primaryRoute: '/store/marketing/signage/playlist',
      description: '매장 디스플레이에 재생할 콘텐츠를 플레이리스트로 구성하고 스케줄을 설정합니다.',
      items: [
        { label: '플레이리스트 관리', route: '/store/marketing/signage/playlist' },
        { label: '자료실 (매장)', route: '/store/content' },
        { label: 'POP 자료', route: '/store/marketing/pop' },
      ],
      linkTo: '/store/marketing/signage/playlist',
    },
    {
      step: '06',
      title: 'QR · Tablet',
      primaryRoute: '/store/marketing/qr',
      description: 'QR 코드로 고객을 유입하고 태블릿 키오스크로 상담 요청을 연결합니다.',
      items: [
        { label: 'QR 코드 관리', route: '/store/marketing/qr' },
        { label: '태블릿 키오스크', route: '/tablet/:slug' },
        { label: '마케팅 분석', route: '/store/analytics/marketing' },
      ],
      linkTo: '/store/marketing/qr',
    },
  ],
  bottomNav: {
    prev: { label: '← 서비스 활용 방법', to: '/guide/usage' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/resources ─────────────────────────────────────────

export const glycopharmGuideFeatureResourcesProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '자료실 이용 방법',
    description: '파일 자료, 원본 자료, 매장 활용 자료',
    primaryAction: { label: '자료실로 이동 →', to: '/resources' },
    flowBarTitle: '이용 흐름',
    flowLabels: ['자료실 이동', '자료 찾기', '자료 활용', '자료 등록', 'AI 활용 기준'],
  },
  sections: [
    {
      step: '01',
      title: '자료실 이동',
      routeLabel: '/resources',
      description: '자료실 진입 후 카테고리·태그·검색으로 자료를 탐색합니다.',
      items: [
        { label: '자료실 진입', detail: '/resources 로 이동하면 자료 목록이 표시됩니다.' },
        { label: '자료 목록', detail: '카테고리별, 최신순으로 자료를 확인합니다.' },
        { label: '검색과 태그 탐색', detail: '키워드 검색과 태그 필터로 원하는 자료를 찾습니다.' },
      ],
    },
    {
      step: '02',
      title: '자료 찾기',
      description: '키워드와 태그로 매장 응대에 필요한 자료를 빠르게 확인합니다.',
      items: [
        { label: '키워드 검색', detail: '제목·설명·태그 키워드로 자료를 검색합니다.' },
        { label: '태그 확인', detail: '관련 태그로 동일 주제 자료를 묶어 봅니다.' },
        { label: '자료 상세 확인', detail: '자료를 열어 본문·첨부·등록일을 확인합니다.' },
      ],
    },
    {
      step: '03',
      title: '자료 활용',
      description: '확인한 자료를 매장 응대와 운영에 직접 사용합니다.',
      items: [
        { label: 'PDF / 이미지 / 파일 확인', detail: '본문 미리보기 또는 다운로드로 내용을 확인합니다.' },
        { label: '고객 설명 자료', detail: '상담 시 화면 또는 출력물로 고객에게 직접 제시합니다.' },
        { label: '매장 운영 참고', detail: '진열·재고·POP 자료 작성에 참고합니다.' },
      ],
    },
    {
      step: '04',
      title: '자료 등록',
      description: '매장에서 작성한 자료를 업로드해 회원과 공유합니다.',
      items: [
        { label: '파일 업로드', detail: 'PDF·이미지·문서 파일을 자료실에 업로드합니다.' },
        { label: '제목 입력', detail: '검색에 노출되는 핵심 키워드를 포함한 제목을 작성합니다.' },
        { label: '태그 입력', detail: '관련 태그를 추가해 분류와 검색 노출을 지원합니다.' },
        { label: '등록', detail: '저장하면 자료실 목록에 즉시 반영됩니다.' },
      ],
    },
    {
      step: '05',
      title: 'AI 활용 기준',
      description: 'Raw 자료를 AI로 가공해 매장 응대에 활용합니다. 사용 전 검토는 필수입니다.',
      items: [
        { label: 'Raw 데이터 기반 설명 생성', detail: '원본 자료를 입력해 고객용 설명문을 생성합니다.' },
        { label: '요약', detail: '긴 문서를 핵심 요약으로 변환해 응대 시간에 맞춰 사용합니다.' },
        { label: '상담 문구 작성', detail: '고객 상황에 맞는 상담 응답 초안을 생성합니다.' },
        { label: '검토 후 사용', detail: 'AI 결과는 약사·매장 책임자가 반드시 검토한 뒤 활용합니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};

// ─── /guide/features/forum (GlycoPharm: /community 연결) ───────────────

export const glycopharmGuideFeatureForumProps: GuideFeatureManualPageProps = {
  hero: {
    eyebrow: '기능별 이용 방법',
    title: '커뮤니티 이용 방법',
    description: '질문·답변·경험 공유 기반 커뮤니티 이용',
    primaryAction: { label: '커뮤니티로 이동 →', to: '/community' },
    flowBarTitle: '이용 흐름',
    flowLabels: ['커뮤니티 이동', '글 찾기', '글 작성', '댓글 참여', '활용 기준'],
  },
  sections: [
    {
      step: '01',
      title: '커뮤니티 이동',
      routeLabel: '/community',
      description: '커뮤니티 글 목록으로 진입해 검색과 탐색을 시작합니다.',
      items: [
        { label: '커뮤니티 진입', detail: '/community 로 이동하면 카테고리별 글 목록이 표시됩니다.' },
        { label: '커뮤니티 글 목록', detail: '최신 글, 인기 글, 카테고리별 글을 확인합니다.' },
        { label: '검색과 목록 탐색', detail: '키워드 검색과 카테고리 필터로 원하는 글을 찾습니다.' },
      ],
    },
    {
      step: '02',
      title: '글 찾기',
      description: '키워드와 태그로 관심 주제의 글을 빠르게 찾습니다.',
      items: [
        { label: '키워드 검색', detail: '제목·본문 키워드로 글을 검색합니다.' },
        { label: '태그 확인', detail: '글에 부착된 태그로 관련 주제를 탐색합니다.' },
        { label: '글 상세 보기', detail: '제목 클릭 시 본문·댓글을 한 화면에 확인합니다.' },
      ],
    },
    {
      step: '03',
      title: '글 작성',
      description: '제목, 내용, 태그를 입력해 새 글을 등록합니다.',
      items: [
        { label: '제목 입력', detail: '검색에 노출되는 핵심 키워드를 포함한 제목을 작성합니다.' },
        { label: '내용 작성', detail: '본문에 질문·경험·근거를 정리합니다.' },
        { label: '태그 입력', detail: '관련 태그를 추가해 분류 및 노출 범위를 설정합니다.' },
        { label: '등록', detail: '저장하면 카테고리 글 목록과 검색에 반영됩니다.' },
      ],
    },
    {
      step: '04',
      title: '댓글 참여',
      description: '댓글로 답변하고 다른 회원의 응답을 확인합니다.',
      items: [
        { label: '댓글 작성', detail: '본문 하단에서 답변을 등록합니다.' },
        { label: '답변 확인', detail: '내 글·내 댓글에 달린 답변을 추적합니다.' },
        { label: '경험 공유', detail: '실제 사례·근거 자료를 댓글로 보충합니다.' },
      ],
    },
    {
      step: '05',
      title: '활용 기준',
      description: '커뮤니티 정보를 매장 운영과 고객 응대에 활용합니다.',
      items: [
        { label: '제품 정보 확인', detail: '실제 사용 후기와 약사 의견을 통해 제품 이해도를 높입니다.' },
        { label: '사례 확인', detail: '동일 상황의 사례를 검색해 적용 방향을 정합니다.' },
        { label: '매장 운영 참고', detail: '진열·상담·판매에 적용할 노하우를 모읍니다.' },
        { label: '커뮤니티 정보 축적', detail: '경험과 답변이 매장 운영 자산으로 누적됩니다.' },
      ],
    },
  ],
  bottomNav: {
    prev: { label: '← 기능별 이용 방법', to: '/guide/features' },
    home: { label: '홈으로', to: '/' },
  },
};
