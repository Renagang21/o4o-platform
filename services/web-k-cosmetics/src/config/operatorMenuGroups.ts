/**
 * K-Cosmetics Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-AUTH-RBAC-CLEANUP-V1: UNIFIED_MENU + filterMenuByRole 도입
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
  users: [{ label: '회원 관리', path: '/operator/users' }],
  approvals: [
    { label: '신청 관리', path: '/operator/applications' },
    // WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1
    { label: '이벤트 오퍼 승인', path: '/operator/event-offers' },
  ],
  products: [{ label: '상품 관리', path: '/operator/products' }],
  stores: [
    { label: '내 매장', path: '/operator/store-cockpit' },
    { label: '매장 관리', path: '/operator/stores' },
  ],
  orders: [{ label: '주문 관리', path: '/operator/orders' }],
  signage: [
    { label: '사이니지 콘텐츠', path: '/operator/signage/content' },
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
  ],
  forum: [
    { label: '커뮤니티 관리', path: '/operator/community' },
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

// ─── Legacy Export (deprecated — use UNIFIED_MENU) ────────────

export const OPERATOR_MENU_ITEMS = UNIFIED_MENU;
