/**
 * operatorDomainIA — Cross-service Operator Sidebar Domain IA metadata
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1
 *
 * KPA-Society / GlycoPharm / K-Cosmetics 의 operator sidebar 가 공유하던 동일한
 * domain IA (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통) 메타데이터를 단일 위치로 이동.
 * 직전까지 3개 서비스 operatorMenuGroups.ts 에 각각 중복 정의되어 있던 6개 export 를
 * 그대로 보존하여 옮긴 것이며, 메뉴 노출 결과를 바꾸지 않는 순수 중복 제거 리팩토링이다.
 *
 * 참고:
 *   - DOMAIN_GROUP_ORDER 의 store_hub 는 5-slot (stores → products → orders → approvals → signage)
 *     로 정규화한다. KPA 는 products / orders 그룹을 UNIFIED_MENU 에 갖지 않으므로 해당 슬롯은
 *     항목 없음으로 skip 되어 노출 결과가 변하지 않는다 (선행 IR 판정).
 */

import type { OperatorGroupKey } from '@o4o/ui';

/** Operator sidebar 도메인 키.
 *  dashboard 의 2축 운영 (커뮤니티 / 매장 HUB) + 운영 공통 으로 IA 정렬.
 */
export type OperatorDomainKey = 'community' | 'store_hub' | 'common';

/** 도메인 헤딩 라벨 + 시각 토큰 */
export const DOMAIN_LABELS: Record<OperatorDomainKey, { label: string; emoji: string }> = {
  community: { label: '커뮤니티 운영', emoji: '💬' },
  store_hub: { label: '매장 HUB 운영', emoji: '🏪' },
  common: { label: '운영 공통', emoji: '⚙️' },
};

/** STANDARD_GROUPS key → 도메인 매핑. */
export const GROUP_TO_DOMAIN: Record<OperatorGroupKey, OperatorDomainKey> = {
  dashboard: 'common',
  users: 'community',
  approvals: 'store_hub',
  products: 'store_hub',
  stores: 'store_hub',
  orders: 'store_hub',
  content: 'community',
  resources: 'community',
  lms: 'community',
  signage: 'store_hub',
  forum: 'community',
  analytics: 'common',
  system: 'common',
};

/** 도메인 별 그룹 표시 순서.
 *  - community: 회원 → 포럼 → 콘텐츠 → LMS → 자료실
 *  - store_hub: 매장 → 상품 → 주문 → 승인 → 사이니지 (5-slot 정규화)
 *  - common: 분석 → 시스템 (대시보드는 TOP_PINNED_GROUPS 에서 별도 처리)
 */
export const DOMAIN_GROUP_ORDER: Record<OperatorDomainKey, OperatorGroupKey[]> = {
  community: ['users', 'forum', 'content', 'lms', 'resources'],
  store_hub: ['stores', 'products', 'orders', 'approvals', 'signage'],
  common: ['analytics', 'system'],
};

/** 도메인 표시 순서 (sidebar top → bottom) */
export const DOMAIN_DISPLAY_ORDER: OperatorDomainKey[] = ['community', 'store_hub', 'common'];

/** sidebar 최상단 고정 항목 — 도메인 헤딩과 무관하게 항상 sidebar 첫 영역에 노출.
 *  대시보드는 모든 도메인의 진입점이므로 sidebar 최상단에 단독 배치.
 */
export const TOP_PINNED_GROUPS: OperatorGroupKey[] = ['dashboard'];

// ─── Domain IA Config (서비스별 주입) — WO-O4O-OPERATOR-UX-CORE-DOMAINIASIDEBAR-IA-CONFIG-PARAM-V1 ───

/**
 * Operator sidebar domain IA config — 위 5개 메타데이터를 한 묶음으로 정의.
 *
 * DomainIASidebar 가 서비스별 domain IA 를 주입받기 위한 타입. 도메인 키는 서비스마다
 * 다를 수 있으므로(KPA 계열 = community/store_hub/common, Neture = 공급·유통/커머스·정산/…)
 * `string` 으로 일반화한다. group key 는 공통 OperatorGroupKey 를 유지한다.
 */
export interface OperatorDomainIAConfig {
  /** 도메인 키 → 헤딩 라벨 + emoji */
  labels: Record<string, { label: string; emoji: string }>;
  /** STANDARD_GROUPS key → 도메인 키 */
  groupToDomain: Record<OperatorGroupKey, string>;
  /** 도메인 키 → 그룹 표시 순서 */
  groupOrder: Record<string, OperatorGroupKey[]>;
  /** 도메인 표시 순서 (sidebar top → bottom) */
  displayOrder: string[];
  /** sidebar 최상단 고정 그룹 */
  topPinnedGroups: OperatorGroupKey[];
}

/**
 * Default domain IA — KPA-Society / GlycoPharm / K-Cosmetics 계열
 * (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통).
 *
 * DomainIASidebar 가 `domainIAConfig` prop 미주입 시 사용한다. 기존 3개 서비스는
 * 이 default 를 그대로 사용하므로 출력이 완전히 동일하다 (무변화 보장).
 */
export const DEFAULT_OPERATOR_DOMAIN_IA: OperatorDomainIAConfig = {
  labels: DOMAIN_LABELS,
  groupToDomain: GROUP_TO_DOMAIN,
  groupOrder: DOMAIN_GROUP_ORDER,
  displayOrder: DOMAIN_DISPLAY_ORDER,
  topPinnedGroups: TOP_PINNED_GROUPS,
};
