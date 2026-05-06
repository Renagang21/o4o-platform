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
import { kcosmeticsConfig } from '@o4o/operator-ux-core';

// ─── Public Nav ──────────────────────────────────────────────────────────────

export const KCOS_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '홈', href: '/' },
  { label: '포럼', href: '/forum' },
  { label: '강의', href: '/lms' },
];

// ─── Contextual Nav ──────────────────────────────────────────────────────────

export interface KCosContextualNavItem extends GlobalHeaderNavItem {
  visibleWhen: 'storeManager' | 'partner' | 'operator' | 'admin';
}

export const KCOS_CONTEXTUAL_NAV: KCosContextualNavItem[] = [
  { label: kcosmeticsConfig.terminology.storeHubLabel, href: '/store-hub', visibleWhen: 'storeManager' },
  { label: kcosmeticsConfig.terminology.myStoreLabel, href: '/store', visibleWhen: 'storeManager' },
  { label: '파트너', href: '/partner', visibleWhen: 'partner' },
];

// ─── Filter Helper ───────────────────────────────────────────────────────────

export interface KCosNavVisibility {
  isAdminOrOperator: boolean;
  isStoreManager: boolean;
  isPartner: boolean;
}

// WO-O4O-COMMON-MENU-VISIBILITY-POLICY-IMPL-V1
// operator/admin은 모든 contextual nav를 본다.
export function filterContextualNav(
  items: KCosContextualNavItem[],
  vis: KCosNavVisibility,
): GlobalHeaderNavItem[] {
  if (vis.isAdminOrOperator) {
    return items.map(({ label, href }) => ({ label, href }));
  }
  return items
    .filter((item) => {
      const cond = item.visibleWhen;
      if (cond === 'storeManager') return vis.isStoreManager;
      if (cond === 'partner') return vis.isPartner;
      return false;
    })
    .map(({ label, href }) => ({ label, href }));
}
