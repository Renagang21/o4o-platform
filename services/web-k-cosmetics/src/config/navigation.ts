/**
 * K-Cosmetics — Navigation 중앙 설정
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 * 표준: docs/architecture/ui/global-header-standard-v1.md §6
 *
 * 모든 Main Header 메뉴 정의를 이 파일에서 관리한다.
 * Header 내부 하드코딩 금지.
 */

import type { GlobalHeaderNavItem } from '@o4o/ui';

// ─── Public Nav ──────────────────────────────────────────────────────────────

export const KCOS_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '홈', href: '/' },
  { label: '허브', href: '/store-hub' },
  { label: '커뮤니티', href: '/community' },
];

// ─── Contextual Nav ──────────────────────────────────────────────────────────

export interface KCosContextualNavItem extends GlobalHeaderNavItem {
  visibleWhen: 'storeManager' | 'partner' | 'operator' | 'admin';
}

export const KCOS_CONTEXTUAL_NAV: KCosContextualNavItem[] = [
  { label: '매장 관리', href: '/store', visibleWhen: 'storeManager' },
  { label: '파트너', href: '/partner', visibleWhen: 'partner' },
  // 운영자/관리자 진입은 상단 공용 nav가 아닌 유저 드롭다운으로만 제공
  // WO-O4O-OPERATOR-CONTEXTUAL-NAV-SEPARATION-V1
];

// ─── Filter Helper ───────────────────────────────────────────────────────────

export interface KCosNavVisibility {
  isAdmin: boolean;
  isOperator: boolean;
  isStoreManager: boolean;
  isPartner: boolean;
}

export function filterContextualNav(
  items: KCosContextualNavItem[],
  vis: KCosNavVisibility,
): GlobalHeaderNavItem[] {
  return items
    .map((item) => {
      if (item.visibleWhen === 'operator' && vis.isAdmin) {
        return { label: '관리자 콘솔', href: '/admin', visibleWhen: 'admin' as const };
      }
      return item;
    })
    .filter((item) => {
      const cond = item.visibleWhen;
      if (cond === 'admin') return vis.isAdmin;
      if (cond === 'operator') return vis.isOperator;
      if (cond === 'storeManager') return vis.isStoreManager;
      if (cond === 'partner') return vis.isPartner;
      return false;
    })
    .map(({ label, href }) => ({ label, href }));
}
