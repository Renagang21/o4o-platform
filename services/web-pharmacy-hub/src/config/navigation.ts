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

/**
 * 비로그인 포함 전체 노출.
 * `/forum` 은 MembershipGate 뒤에 있지만 게이트가 "가입 신청" 안내를 렌더하므로
 * 미가입자에게도 의미 있는 진입점이다(데드링크 아님).
 */
/*
 * WO-O4O-GLOBAL-HEADER-UNUSED-CHILDREN-CONTRACT-REMOVAL-V1:
 *   PrimaryNav 는 1단이다. 공통 GlobalHeader 에 submenu 렌더러가 없어
 *   `children` 은 한 번도 렌더된 적이 없고, 계약 자체가 제거됐다.
 *   상단 노출이 필요한 항목은 여기 parent 로 승격한다 (children 부활 금지).
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §13 ·
 * WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §12 의
 * 하위 진입점 요구(포럼 · 검색 · 내 글 · 자료실 등)는 Footer · 허브 카드가 충족한다.
 *   **공지·소식**은 PH 에서 forum pinned post 가 canonical 이므로 별도 링크를
 *   만들지 않는다 — 같은 의미의 중복 모델을 만들지 않는다(§10).
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1:
 *   `/content`(회원 콘텐츠 열람, `cms_contents type='content'`)는 위 '공지·소식'과 **다른 축**이다
 *   — 운영자가 발행한 읽을거리이며 공지 소스가 아니다. 실제 route 가 있으므로
 *   Footer '서비스' 에 진입점을 둔다(PrimaryNav 는 1단이라 여기 올리지 않는다).
 */
export const PH_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '홈', href: '/' },
  // 커뮤니티 하위(포럼 · 검색 · 내 글 · 내 포럼 · 포럼 개설 신청 · 콘텐츠 · 자료실)는
  // CommunityHomePage 카드 · ForumHubPage infoLinks · Footer '서비스' 가 담당한다.
  { label: '커뮤니티', href: '/community' },
  // WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §17:
  //   learner 개인 화면(내 수강 / 내 수료증)은 Footer '서비스' 섹션과
  //   My Page nav(PHARMACY_HUB_ACCOUNT_NAV_ITEMS)가 담당한다 — deep-link only 아님.
  { label: '교육', href: '/education' },
  // WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1
  //   기능 이용 매뉴얼(/guide/*)은 Footer '이용 안내' 섹션과
  //   CommunityHomePage help 섹션이 담당한다.
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
      { label: '홈', href: '/' },
      { label: '커뮤니티', href: '/community' },
      { label: '포럼', href: '/forum' },
      // WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §12
      { label: '콘텐츠', href: '/content' },
      { label: '자료실', href: '/resources' },
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
