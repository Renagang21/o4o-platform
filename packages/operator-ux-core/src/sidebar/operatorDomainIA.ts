/**
 * Operator Domain IA Metadata
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1
 *
 * KPA-Society / GlycoPharm / K-Cosmetics 의 도메인 IA (커뮤니티 운영 / 매장 HUB 운영
 * / 운영 공통) 메타데이터 공통 소스. 3 서비스의 동일 export 6 종을 본 모듈로 추출.
 *
 * Precedent: KpaOperatorSidebar 가 처음 도입한 도메인 IA 구조
 *   (WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-IA-RESTRUCTURE-V1).
 *
 * 정규화 결정:
 *   DOMAIN_GROUP_ORDER.store_hub 는 5-슬롯 (stores / products / orders /
 *   approvals / signage) 으로 통일. KPA 는 products / orders 그룹을 UNIFIED_MENU
 *   에 정의하지 않으므로 5-슬롯 배열 내에서 자연 reject — 메뉴 노출 결과 무변경
 *   (IR-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMONIZATION-AUDIT-V1 §6.2 참조).
 */

import type { OperatorGroupKey } from '@o4o/ui';

/** Operator sidebar 도메인 키. 2축 운영 (커뮤니티 / 매장 HUB) + 운영 공통. */
export type OperatorDomainKey = 'community' | 'store_hub' | 'common';

/** 도메인 헤딩 라벨 + 시각 토큰 (이모지). */
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
  care: 'common',
  system: 'common',
};

/** 도메인 별 그룹 표시 순서.
 *  - community: 회원 → 포럼 → 콘텐츠 → LMS → 자료실
 *  - store_hub: 매장 → 상품 → 주문 → 승인 → 사이니지 (5-슬롯 정규화)
 *  - common: 분석 → 시스템 (대시보드는 TOP_PINNED_GROUPS 별도)
 */
export const DOMAIN_GROUP_ORDER: Record<OperatorDomainKey, OperatorGroupKey[]> = {
  community: ['users', 'forum', 'content', 'lms', 'resources'],
  store_hub: ['stores', 'products', 'orders', 'approvals', 'signage'],
  common: ['analytics', 'system'],
};

/** 도메인 표시 순서 (sidebar top → bottom). */
export const DOMAIN_DISPLAY_ORDER: OperatorDomainKey[] = ['community', 'store_hub', 'common'];

/** sidebar 최상단 고정 항목 — 도메인 헤딩과 무관하게 항상 sidebar 첫 영역에 노출.
 *  대시보드는 모든 도메인의 진입점이므로 sidebar 최상단에 단독 배치.
 */
export const TOP_PINNED_GROUPS: OperatorGroupKey[] = ['dashboard'];
