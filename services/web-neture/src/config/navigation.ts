/**
 * Neture — Navigation 중앙 설정
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 * 표준: docs/architecture/ui/global-header-standard-v1.md §6
 *
 * 모든 Main Header 메뉴 정의를 이 파일에서 관리한다.
 * Header 내부 하드코딩 금지.
 */

import type { GlobalHeaderNavItem } from '@o4o/ui';

// ─── Public Nav ──────────────────────────────────────────────────────────────
// 모든 사용자에게 노출

export const NETURE_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Market Trial', href: '/market-trial' },
  { label: 'Community', href: '/community' },
  { label: 'Supplier', href: '/supplier' },
  { label: 'Partner', href: '/partner' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'About', href: '/about' },
];

// ─── Contextual Nav ──────────────────────────────────────���───────────────────
// 역할 조건에 따라 노출

export interface NetureContextualNavItem extends GlobalHeaderNavItem {
  visibleWhen: 'supplier' | 'partner' | 'operator' | 'admin';
}

export const NETURE_CONTEXTUAL_NAV: NetureContextualNavItem[] = [
  { label: '운영 대시보드', href: '/operator', visibleWhen: 'operator' },
];

// ─── Filter Helper ───────────────────────────────────────────────────────────

export interface NetureNavVisibility {
  isAdmin: boolean;
  isOperator: boolean;
  isSupplier: boolean;
  isPartner: boolean;
}

export function filterContextualNav(
  items: NetureContextualNavItem[],
  vis: NetureNavVisibility,
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
      if (cond === 'supplier') return vis.isSupplier;
      if (cond === 'partner') return vis.isPartner;
      return false;
    })
    .map(({ label, href }) => ({ label, href }));
}
