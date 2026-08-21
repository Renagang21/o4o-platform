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
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §13:
 *   PH 커뮤니티 navigation 최소 구성 = 커뮤니티 홈 / 포럼 / 검색 / 교육 / 내 글.
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §12:
 *   자료실(/resources)이 공통 ResourcesHubTemplate 로 실제 구현되어 링크를 추가한다.
 *   Content(공지·소식)는 PH 에서 forum pinned post 가 canonical 이므로 별도 링크를
 *   만들지 않는다 — 같은 의미의 중복 모델을 만들지 않는다(§10).
 */
export const PH_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '홈', href: '/' },
  {
    label: '커뮤니티',
    href: '/community',
    children: [
      { label: '커뮤니티 홈', href: '/community' },
      { label: '포럼', href: '/forum' },
      { label: '검색', href: '/community/search' },
      { label: '내 글', href: '/forum/my-posts' },
      // WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §14
      // 아래 두 route 는 App.tsx 에 실제로 등재돼 있다 (데드링크 0 원칙 유지).
      { label: '내 포럼', href: '/forum/my-dashboard' },
      { label: '포럼 개설 신청', href: '/forum/request' },
      // WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §12
      { label: '콘텐츠', href: '/content' },
      { label: '자료실', href: '/resources' },
    ],
  },
  // WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §17:
  //   교육 허브 + learner 개인 화면(내 수강 / 내 수료증)을 상단에서 바로 잡는다.
  //   deep-link only 상태를 남기지 않는다. 세 route 모두 App.tsx 에 등재돼 있다.
  {
    label: '교육',
    href: '/education',
    children: [
      { label: '교육 허브', href: '/education' },
      { label: '내 수강', href: '/account/enrollments' },
      { label: '내 수료증', href: '/account/certificates' },
    ],
  },
  // WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1
  // 공개 서비스 소개(/service-guide) 와 기능 이용 매뉴얼(/guide/*) 진입점.
  // 두 route 모두 App.tsx 에 실제로 등재돼 있다 (데드링크 0 원칙).
  {
    label: '이용 안내',
    href: '/service-guide',
    children: [
      { label: '서비스 소개', href: '/service-guide' },
      { label: '이용 가이드', href: '/guide/intro' },
      { label: '기능별 이용 방법', href: '/guide/features' },
    ],
  },
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
