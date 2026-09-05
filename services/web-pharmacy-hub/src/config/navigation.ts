/**
 * Pharmacy-Hub — Navigation 중앙 설정
 *
 * WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1
 * 표준: docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md §6
 *
 * KPA / K-Cosmetics / Neture 와 동일하게 **모든 Header 메뉴 정의를 이 파일에서** 관리한다.
 * Header 컴포넌트 내부 하드코딩 금지.
 *
 * 데드링크 0 원칙:
 *   여기 등재하는 href 는 전부 App.tsx 에 실제 route 가 있는 경로여야 한다.
 *   "후속 WO 예정" 경로는 메뉴에 올리지 않는다.
 */

import type { ContextualNavItem, GlobalHeaderNavItem } from '@o4o/ui';
import { ROLE_LABELS, ROLES } from './service';

// ─── Public Nav ──────────────────────────────────────────────────────────────

/*
 * WO-O4O-GLOBAL-HEADER-UNUSED-CHILDREN-CONTRACT-REMOVAL-V1:
 *   PrimaryNav 는 1단이다. 공통 GlobalHeader 에 submenu 렌더러가 없어
 *   `children` 은 한 번도 렌더된 적이 없고, 계약 자체가 제거됐다.
 *   상단 노출이 필요한 항목은 여기 parent 로 승격한다 (children 부활 금지).
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §13 ·
 * WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §12 의
 * 하위 진입점 요구(포럼 · 검색 · 내 글 · 자료실 · 콘텐츠 등)는 Footer · 허브 카드가 충족한다.
 *   공지·소식은 PH 에서 forum pinned post 가 canonical 이므로 별도 링크를
 *   만들지 않는다 — 같은 의미의 중복 모델을 만들지 않는다(§10).
 *   반면 회원 지식 콘텐츠(`/content`)는 공지와 다른 축이며 실재하므로 Footer 에 등재한다
 *   (WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §2·§6).
 */
/*
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §6·§9·§10:
 *   canonical 커뮤니티 구조를 KPA-Society 와 공유한다 — `/` 자체가 커뮤니티 홈이다.
 *   기존의 `홈(/)` + `커뮤니티(/community)` 2 항목은 같은 성격의 진입점이 둘로 갈린
 *   구조였다. `/community` 는 `/` 로 redirect 되며(기존 링크 보존), 메뉴에서는 제거한다.
 *
 * 조립 순서는 공통 buildCommunityPrimaryNav(@o4o/ui) 가 고정한다:
 *   PH_BASE_NAV → 역할 contextual → PH_TRAILING_NAV
 */
export const PH_BASE_NAV: GlobalHeaderNavItem[] = [
  { label: '커뮤니티', href: '/' },
];

/** 역할 진입점 뒤에 오는 공개 안내 항목 (KPA 의 '서비스 안내' 위치와 동일 축). */
export const PH_TRAILING_NAV: GlobalHeaderNavItem[] = [
  // WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §17:
  //   learner 개인 화면(내 수강 / 내 수료증)은 Footer '서비스' 섹션과
  //   My Page nav(PHARMACY_HUB_ACCOUNT_NAV_ITEMS)가 담당한다 — deep-link only 아님.
  { label: '교육', href: '/education' },
  // WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1
  //   기능 이용 매뉴얼(/guide/*)은 Footer '이용 안내' 섹션과
  //   커뮤니티 홈 help 섹션이 담당한다.
  { label: '이용 안내', href: '/service-guide' },
];

// ─── Contextual Nav ──────────────────────────────────────────────────────────

export type PhContextualNavItem = ContextualNavItem<
  'storeManager' | 'storeOwner' | 'operator'
>;

/**
 * 역할별 업무 진입점.
 *
 * 노출 조건은 각 영역 **가드의 통과 조건과 같은 표**를 쓴다 — 메뉴가 보이는데 막히거나,
 * 권한이 있는데 메뉴가 없는 상태를 만들지 않는다.
 *   - storeManager : StoreOwnerGuard('pharmacy-hub') 통과 조건 (store_owner / operator / admin)
 *   - storeOwner   : satisfiesRole(ROLES.storeOwner) — 매장 본인 데이터 화면 전용.
 *                    운영자도 매장 셸 자체에는 들어가지만 `/pharmacy-hub/store-owner/*` API 는
 *                    본인 매장 레코드 기준이라 403 이다. 메뉴는 실제로 열리는 것만 노출한다.
 *   - operator     : satisfiesRole(ROLES.operator) — admin 포함(ROLE_SCOPE_MAPPING)
 *
 * HUB 우선 — 비KPA 서비스는 매장 HUB 가 먼저 노출된다(K-Cosmetics canonical 정합).
 */
export const PH_CONTEXTUAL_NAV: PhContextualNavItem[] = [
  { label: '매장 허브', href: '/store-hub', visibleWhen: 'storeManager' },
  { label: '내 약국', href: '/store-owner', visibleWhen: 'storeOwner' },
  { label: ROLE_LABELS[ROLES.operator], href: '/operator', visibleWhen: 'operator' },
];

// ─── Footer Nav ──────────────────────────────────────────────────────────────

/**
 * 공개 푸터 링크 — **실제 route 가 있는 경로만**.
 * WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1 에서 /terms · /privacy route 가
 * 생겼으므로 '약관' 섹션을 추가한다. /contact 는 여전히 route 가 없어 넣지 않는다.
 * WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1: /service-guide · /guide 가 등재되어 '이용 안내' 섹션을 추가한다.
 * 법정정보는 하드코딩하지 않고 PublicLegalFooterInfo(API) 가 값이 있을 때만 렌더한다.
 */
export const PH_FOOTER_SECTIONS: { title: string; links: GlobalHeaderNavItem[] }[] = [
  {
    title: '서비스',
    links: [
      { label: '커뮤니티', href: '/' },
      // WO-O4O-PHARMACYHUB-HOME-NEWS-AND-USAGE-GUIDE-REALIGNMENT-V1 §3:
      //   홈 뉴스 카드 외의 상시 진입점. route 는 App.tsx `/news` 로 실재한다.
      { label: '뉴스', href: '/news' },
      { label: '포럼', href: '/forum' },
      // WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §12
      { label: '자료실', href: '/resources' },
      // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6
      { label: '콘텐츠', href: '/content' },
      // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 6 (#24)
      { label: '설문조사', href: '/content/surveys' },
      { label: '교육', href: '/education' },
      // 동일 WO §17 — 학습 이력 진입점
      { label: '내 수강', href: '/account/enrollments' },
      { label: '내 수료증', href: '/account/certificates' },
    ],
  },
  {
    title: '이용 안내',
    links: [
      { label: '서비스 소개', href: '/service-guide' },
      { label: '이용 가이드', href: '/guide/intro' },
      { label: '기능별 이용 방법', href: '/guide/features' },
    ],
  },
  {
    title: '참여하기',
    links: [
      { label: '가입 신청', href: '/join' },
      { label: '가입 상태 확인', href: '/join/status' },
    ],
  },
  {
    title: '약관',
    links: [
      { label: '이용약관', href: '/terms' },
      { label: '개인정보처리방침', href: '/privacy' },
    ],
  },
];
