/**
 * Pharmacy-Hub Operator Menu Items + Domain IA
 *
 * WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1
 *
 * KPA-Society / GlycoPharm / K-Cosmetics 와 동일한 계약을 따른다:
 *   UNIFIED_MENU (서비스별 정의) + filterMenuByRole(@o4o/ui) + DomainIASidebar(@o4o/operator-ux-core).
 * 서비스 전용 Sidebar 사본을 만들지 않는다.
 *
 * 노출 범위:
 *   route 없는 메뉴는 노출하지 않는다 (CLAUDE.md §1 Shared Module Change Rule — 데드링크 0).
 *   여기 있는 모든 항목은 App.tsx 에 실 route 와 실 화면이 있고, backend 가 연결돼 있다.
 *
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
 *   커뮤니티(포럼) 운영 5화면 · 회원 관리 · 운영 분석 · 역할 관리를 공통 Core 채택으로 추가.
 *   매장 HUB / 상품 / 주문 / 이벤트 오퍼 / 공급 상품 운영은 Pharmacy-Hub 운영자 축에 두지
 *   않는다 (WO 명시 제외 대상).
 */

import type { OperatorGroupKey, UnifiedMenuItem } from '@o4o/ui';
import type { OperatorDomainIAConfig } from '@o4o/operator-ux-core';

// ─── Unified Menu ─────────────────────────────────────────────

export const UNIFIED_MENU: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>> = {
  // WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1:
  //   /operator 가 RoleEntryPage placeholder 에서 실제 대시보드(OperatorDashboardPage)로
  //   교체되어 데드링크가 아니게 되었으므로 KPA/KCos/Neture 와 동일하게 대시보드 항목을 노출한다.
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  // 가입 신청 관리 = service_memberships 승인/반려 (MEMBERSHIP_APPROVAL capability).
  // 실제 권한 경계는 backend pharmacy-hub:operator scope guard 가 강제한다.
  approvals: [{ label: '가입 신청 관리', path: '/operator/memberships' }],
  // 회원 관리 = 승인 완료 이후 사용자 축(목록·상태). 가입 신청 관리(멤버십 축)와 역할이 다르다.
  users: [{ label: '회원 관리', path: '/operator/members' }],
  // 커뮤니티(포럼) 운영 — 공통 /api/v1/forum/operator/* (serviceCode=pharmacy-hub) 채택.
  //   포럼 신청 관리는 포럼이 생성되는 유일한 경로라 콘솔 부재가 실기능 공백이었다.
  forum: [
    { label: '포럼 운영', path: '/operator/forum' },
    { label: '포럼 신청 관리', path: '/operator/forum-requests' },
    { label: '포럼 목록 관리', path: '/operator/forum-categories' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  // WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1:
  //   자료실 관리 = 공통 CMS(`/api/v1/cms/contents`, serviceKey=pharmacy-hub, type=knowledge).
  //   회원 자료실(/resources)은 이미 있었으나 등록 경로가 없어 항상 0건이었다
  //   (REQUIRED_BUT_MISSING). 신규 table/migration/backend route/권한 변경 없음.
  // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4:
  //   공지·뉴스 관리 = 공통 CmsContentManager + 공통 news controller
  //   (`/api/v1/pharmacy-hub/news/*`, 원장 cms_contents · serviceKey=pharmacy-hub).
  //   KPA/GP/KCos 3 서비스가 이미 쓰는 화면의 채택이며 PH 전용 사본은 없다.
  // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#93):
  //   커뮤니티 콘텐츠 관리 = 회원이 작성해 검토 요청한 콘텐츠의 검토·게시 큐.
  //   공지·뉴스(운영자 발신)와 원장은 같고 축(subType)이 다르다 — 별도 항목으로 노출한다.
  content: [
    { label: '공지·뉴스 관리', path: '/operator/content' },
    { label: '커뮤니티 콘텐츠 관리', path: '/operator/community-contents' },
    // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 4 (#97):
    //   설문조사 관리 = 공통 /api/v1/surveys (serviceKey=pharmacy-hub) + 공통
    //   @o4o/operator-core-ui Surveys module. KPA/GP/KCos 도 같은 content 그룹에 둔다.
    //   회원 응답 동선(/content/surveys)이 같은 WO 에서 함께 열려 dead-end 가 아니다.
    { label: '설문조사 관리', path: '/operator/surveys' },
  ],
  resources: [{ label: '자료실 관리', path: '/operator/resources' }],
  // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#95):
  //   강의 관리 = 공통 /api/v1/lms/operator/courses/*. backend allowlist 에
  //   pharmacy-hub role 을 추가만 했고 분기·사본은 없다.
  lms: [
    { label: '강의 관리', path: '/operator/lms' },
    // 동일 WO §4 (#96): 안내 문구 관리 = 공통 guide contents (serviceKey 경계).
    //   다른 4서비스와 같은 lms 그룹에 둔다. GP 의 '강사 승인'은
    //   KPA 전용 backend guard(requireKpaAdmin) 라 PH 에는 둘 수 없다(dead nav 금지).
    { label: '안내 문구 관리', path: '/operator/guide-contents' },
  ],
  // 운영 분석 = 공통 /api/v1/operator/analytics/* (action_logs 기반).
  analytics: [{ label: '운영 분석', path: '/operator/analytics' }],
  // 역할 관리 = role_assignments (RBAC SSOT). 조회는 운영자, 변경은 platform admin 만
  //   (backend scope.isPlatformAdmin 강제) → adminOnly 로 노출.
  system: [{ label: '역할 관리', path: '/operator/roles', adminOnly: true }],
  // WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1:
  //   법정정보·약관 설정은 저장이 admin 권한인 화면이라 다른 4서비스와 동일하게
  //   관리자 영역(/admin/settings/legal-terms)으로 이동했다 → 운영자 메뉴에서 제거.
  //   config/adminMenuGroups.ts 가 해당 항목을 소유한다.
};

// ─── Domain IA ────────────────────────────────────────────────

/**
 * Pharmacy-Hub operator sidebar 도메인 키.
 *
 * KPA 계열 default IA (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통) 는 approvals 를
 * store_hub 로 묶는다. Pharmacy-Hub 의 approvals 는 매장 HUB 업무가 아니라
 * 서비스 가입 승인이므로 도메인 헤딩을 서비스에 맞게 주입한다
 * (Neture 와 동일한 domainIAConfig 주입 방식).
 */
export type PharmacyHubOperatorDomainKey = 'membership' | 'community' | 'common';

export const PHARMACY_HUB_DOMAIN_LABELS: Record<
  PharmacyHubOperatorDomainKey,
  { label: string; emoji: string }
> = {
  membership: { label: '가입·회원 운영', emoji: '👥' },
  community: { label: '커뮤니티 운영', emoji: '💬' },
  common: { label: '운영 공통', emoji: '⚙️' },
};

/** STANDARD_GROUPS 의 13 key 전부를 매핑한다 (부분 매핑 시 그룹이 사라진다).
 *  현재 UNIFIED_MENU 에 없는 그룹은 항목 0 이라 sidebar 에서 skip 된다. */
export const PHARMACY_HUB_GROUP_TO_DOMAIN: Record<OperatorGroupKey, PharmacyHubOperatorDomainKey> = {
  dashboard: 'common',
  users: 'membership',
  approvals: 'membership',
  products: 'common',
  stores: 'common',
  orders: 'common',
  content: 'common',
  resources: 'common',
  lms: 'common',
  signage: 'common',
  forum: 'community',
  analytics: 'common',
  system: 'common',
};

export const PHARMACY_HUB_DOMAIN_GROUP_ORDER: Record<
  PharmacyHubOperatorDomainKey,
  OperatorGroupKey[]
> = {
  membership: ['approvals', 'users'],
  community: ['forum'],
  common: [
    'stores',
    'products',
    'orders',
    'content',
    'resources',
    'lms',
    'signage',
    'analytics',
    'system',
  ],
};

export const PHARMACY_HUB_DOMAIN_DISPLAY_ORDER: PharmacyHubOperatorDomainKey[] = [
  'membership',
  'community',
  'common',
];

/** 대시보드는 도메인 헤딩과 무관하게 최상단 고정 (KPA 계열과 동일 계약).
 *  UNIFIED_MENU.dashboard 가 비어 있으면 렌더되지 않는다. */
export const PHARMACY_HUB_TOP_PINNED_GROUPS: OperatorGroupKey[] = ['dashboard'];

export const PHARMACY_HUB_OPERATOR_DOMAIN_IA: OperatorDomainIAConfig = {
  labels: PHARMACY_HUB_DOMAIN_LABELS,
  groupToDomain: PHARMACY_HUB_GROUP_TO_DOMAIN,
  groupOrder: PHARMACY_HUB_DOMAIN_GROUP_ORDER,
  displayOrder: PHARMACY_HUB_DOMAIN_DISPLAY_ORDER,
  topPinnedGroups: PHARMACY_HUB_TOP_PINNED_GROUPS,
};
