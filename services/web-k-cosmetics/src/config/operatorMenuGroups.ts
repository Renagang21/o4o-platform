/**
 * K-Cosmetics Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-AUTH-RBAC-CLEANUP-V1: UNIFIED_MENU + filterMenuByRole 도입
 * WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
 *   KPA-Society / GlycoPharm 와 동일한 도메인 IA (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통)
 *   로 UNIFIED_MENU 재배치 + Domain IA 메타데이터 추가.
 *   - content 의 안내 문구 관리 → lms 그룹 (KPA 정합)
 *   - content 의 자료실 관리 → 신규 resources 그룹 (KPA 정합)
 *
 * 표준 11-그룹 키에 대한 라우트 매핑.
 */

import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';

// ─── Unified Menu Item (adminOnly 지원) ───────────────────────

export interface UnifiedMenuItem extends OperatorMenuItem {
  adminOnly?: boolean;
}

export const UNIFIED_MENU: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  // WO-O4O-K-COSMETICS-OPERATOR-ROUTE-CANONICALIZATION-V1: /operator/members (KPA/GlycoPharm canonical)
  users: [{ label: '회원 관리', path: '/operator/members' }],
  approvals: [
    { label: '신청 관리', path: '/operator/applications' },
    // WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1
    { label: '이벤트 오퍼 승인', path: '/operator/event-offers' },
  ],
  products: [{ label: '상품 관리', path: '/operator/products' }],
  stores: [
    { label: '내 매장', path: '/operator/store-cockpit' },
    { label: '매장 관리', path: '/operator/stores' },
    // WO-O4O-KCOSMETICS-OPERATOR-STORE-CHANNELS-V1
    { label: '채널 관리', path: '/operator/store-channels' },
    // WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
    { label: '매장 HUB 블로그', path: '/operator/blog' },
    { label: '매장 HUB POP', path: '/operator/pop' },
    { label: '매장 HUB QR', path: '/operator/qr' },
  ],
  orders: [{ label: '주문 관리', path: '/operator/orders' }],
  // WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
  //   content 그룹에서 안내 문구 관리 → lms, 자료실 관리 → resources 로 분리.
  content: [
    // WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1
    { label: '공지/뉴스 관리', path: '/operator/content-management' },
    // WO-O4O-KCOSMETICS-OPERATOR-SURVEYS-V1
    { label: '설문조사 관리', path: '/operator/surveys' },
  ],
  // WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1: 자료실 독립 그룹 (KPA 정합)
  resources: [
    // WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1
    { label: '자료실 관리', path: '/operator/resources' },
  ],
  // WO-KCOS-OPERATOR-LMS-BOOTSTRAP-V1
  // WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1: 안내 문구 관리 추가 (KPA lms 그룹 정합)
  lms: [
    { label: '강의 관리', path: '/operator/lms' },
    // WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1
    { label: '안내 문구 관리', path: '/operator/guide-contents' },
  ],
  signage: [
    { label: '사이니지 콘텐츠', path: '/operator/signage/content' },
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
  ],
  forum: [
    // WO-O4O-KCOSMETICS-OPERATOR-STORE-CHANNELS-V1: /operator/community dead link 제거 (route 없음)
    { label: '포럼 신청', path: '/operator/forum-requests' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [{ label: 'AI 리포트', path: '/operator/ai-report' }],
};

// ─── Role-based Filter ────────────────────────────────────────

export function filterMenuByRole(
  menu: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>>,
  isAdmin: boolean,
): Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> {
  const result: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {};
  for (const [key, items] of Object.entries(menu)) {
    const filtered = (items as UnifiedMenuItem[]).filter(i => !i.adminOnly || isAdmin);
    if (filtered.length > 0) {
      result[key as OperatorGroupKey] = filtered;
    }
  }
  return result;
}

// ─── Domain IA mapping — WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1 ───
//
// KPA-Society / GlycoPharm 와 동일한 메타데이터 구조.
// K-Cosmetics 고유 그룹 products / orders 는 store_hub 도메인에 포함.

/** K-Cosmetics operator sidebar 도메인 키.
 *  KPA 와 동일한 2축 운영 (커뮤니티 / 매장 HUB) + 운영 공통 IA.
 */
export type OperatorDomainKey = 'community' | 'store_hub' | 'common';

/** 도메인 헤딩 라벨 + 시각 토큰 (KPA / GlycoPharm 와 동일) */
export const DOMAIN_LABELS: Record<OperatorDomainKey, { label: string; emoji: string }> = {
  community: { label: '커뮤니티 운영', emoji: '💬' },
  store_hub: { label: '매장 HUB 운영', emoji: '🏪' },
  common: { label: '운영 공통', emoji: '⚙️' },
};

/** STANDARD_GROUPS key → 도메인 매핑.
 *  KPA / GlycoPharm 의 매핑을 그대로 따른다.
 */
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
  // WO-O4O-OPERATOR-SHARED-CARE-TYPE-CONTRACT-REMOVAL-V1 (W5c-v2):
  //   care orphan mapping 제거 — OperatorGroupKey 에서 'care' 제거와 동반 정리.
  system: 'common',
};

/** 도메인 별 그룹 표시 순서.
 *  - community: 회원 → 포럼 → 콘텐츠 → LMS → 자료실 (KPA / GlycoPharm 동일)
 *  - store_hub: 매장 → 상품 → 주문 → 승인 → 사이니지 (GlycoPharm 와 동일)
 *  - common: 분석 → 시스템 (대시보드는 TOP_PINNED_GROUPS 별도)
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

// ─── Legacy Export (deprecated — use UNIFIED_MENU) ────────────

export const OPERATOR_MENU_ITEMS = UNIFIED_MENU;
