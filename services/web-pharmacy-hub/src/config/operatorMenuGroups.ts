/**
 * Pharmacy-Hub Operator Menu Items + Domain IA
 *
 * WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1
 *
 * KPA-Society / GlycoPharm / K-Cosmetics 와 동일한 계약을 따른다:
 *   UNIFIED_MENU (서비스별 정의) + filterMenuByRole(@o4o/ui) + DomainIASidebar(@o4o/operator-ux-core).
 * 서비스 전용 Sidebar 사본을 만들지 않는다.
 *
 * 노출 범위 (본 WO):
 *   현재 Pharmacy-Hub 운영자에게 실재하는 화면은 가입 신청 관리 뿐이다.
 *   route 없는 메뉴는 노출하지 않는다 (CLAUDE.md §1 Shared Module Change Rule — 데드링크 0).
 *   신규 운영자 메뉴 추가는 본 WO 범위 밖이며, 화면이 생길 때 해당 WO 에서 추가한다.
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
  // WO-O4O-PHARMACY-HUB-SERVICE-LEGAL-SETTINGS-ADOPTION-V1:
  //   법정정보 설정 = 공통 service-legal 화면(/operator/settings/legal).
  //   backend 조회 권한이 pharmacy-hub:operator 이상이므로 adminOnly 로 숨기지 않는다
  //   (저장은 admin 만 가능하며 backend 가 403 으로 강제한다 — 프론트에서 이중 판정하지 않는다).
  system: [{ label: '법정정보 설정', path: '/operator/settings/legal' }],
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
export type PharmacyHubOperatorDomainKey = 'membership' | 'common';

export const PHARMACY_HUB_DOMAIN_LABELS: Record<
  PharmacyHubOperatorDomainKey,
  { label: string; emoji: string }
> = {
  membership: { label: '가입·회원 운영', emoji: '👥' },
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
  forum: 'common',
  analytics: 'common',
  system: 'common',
};

export const PHARMACY_HUB_DOMAIN_GROUP_ORDER: Record<
  PharmacyHubOperatorDomainKey,
  OperatorGroupKey[]
> = {
  membership: ['approvals', 'users'],
  common: [
    'stores',
    'products',
    'orders',
    'content',
    'resources',
    'lms',
    'signage',
    'forum',
    'analytics',
    'system',
  ],
};

export const PHARMACY_HUB_DOMAIN_DISPLAY_ORDER: PharmacyHubOperatorDomainKey[] = [
  'membership',
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
