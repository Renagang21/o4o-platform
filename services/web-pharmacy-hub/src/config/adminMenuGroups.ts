/**
 * Pharmacy-Hub Admin Menu Items + Domain IA
 *
 * WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1
 *
 * 관리자 영역(/admin)은 운영자 영역(/operator)과 **독립된 업무 축**이다.
 * 셸은 공통 OperatorAreaShell(@o4o/operator-ux-core)을 그대로 재사용하고
 * 메뉴·도메인 헤딩만 관리자 축으로 주입한다 — 전용 대형 관리자 사본을 만들지 않는다.
 *
 * 노출 범위: route 가 실재하는 화면만 넣는다 (CLAUDE.md §1 — 데드링크 0).
 *   현재 Pharmacy-Hub 에서 backend 가 admin 권한을 요구하는 화면은
 *   법정정보·약관 설정(service-legal 저장 계열) 하나뿐이다.
 *   회원·문의 등 다른 서비스의 admin 화면은 backend 화이트리스트에
 *   pharmacy-hub 가 없어(=API 404/403) 링크만 만들지 않는다.
 */

import type { OperatorGroupKey, UnifiedMenuItem } from '@o4o/ui';
import type { OperatorDomainIAConfig } from '@o4o/operator-ux-core';
import { OperatorCapability } from '@o4o/types';

// ─── Unified Menu ─────────────────────────────────────────────

export const ADMIN_UNIFIED_MENU: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/admin', exact: true }],
  system: [{ label: '법정정보·약관 설정', path: '/admin/settings/legal-terms' }],
};

/** system 그룹(법정정보·약관 설정) 노출용. */
export const ADMIN_ENABLED_CAPABILITIES: OperatorCapability[] = [OperatorCapability.SETTINGS];

// ─── Domain IA ────────────────────────────────────────────────

export type PharmacyHubAdminDomainKey = 'governance';

export const PHARMACY_HUB_ADMIN_DOMAIN_LABELS: Record<
  PharmacyHubAdminDomainKey,
  { label: string; emoji: string }
> = {
  governance: { label: '구조·정책', emoji: '🛡️' },
};

/** STANDARD_GROUPS 의 13 key 전부를 매핑한다 (부분 매핑 시 그룹이 사라진다). */
export const PHARMACY_HUB_ADMIN_GROUP_TO_DOMAIN: Record<OperatorGroupKey, PharmacyHubAdminDomainKey> = {
  dashboard: 'governance',
  users: 'governance',
  approvals: 'governance',
  products: 'governance',
  stores: 'governance',
  orders: 'governance',
  content: 'governance',
  resources: 'governance',
  lms: 'governance',
  signage: 'governance',
  forum: 'governance',
  analytics: 'governance',
  system: 'governance',
};

export const PHARMACY_HUB_ADMIN_DOMAIN_GROUP_ORDER: Record<
  PharmacyHubAdminDomainKey,
  OperatorGroupKey[]
> = {
  governance: ['system', 'users', 'analytics'],
};

export const PHARMACY_HUB_ADMIN_DOMAIN_DISPLAY_ORDER: PharmacyHubAdminDomainKey[] = ['governance'];

export const PHARMACY_HUB_ADMIN_TOP_PINNED_GROUPS: OperatorGroupKey[] = ['dashboard'];

export const PHARMACY_HUB_ADMIN_DOMAIN_IA: OperatorDomainIAConfig = {
  labels: PHARMACY_HUB_ADMIN_DOMAIN_LABELS,
  groupToDomain: PHARMACY_HUB_ADMIN_GROUP_TO_DOMAIN,
  groupOrder: PHARMACY_HUB_ADMIN_DOMAIN_GROUP_ORDER,
  displayOrder: PHARMACY_HUB_ADMIN_DOMAIN_DISPLAY_ORDER,
  topPinnedGroups: PHARMACY_HUB_ADMIN_TOP_PINNED_GROUPS,
};
