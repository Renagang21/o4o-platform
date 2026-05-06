/**
 * GlycoPharm — Navigation 중앙 설정
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 * 표준: docs/architecture/ui/global-header-standard-v1.md §6
 *
 * 모든 Main Header 메뉴 정의를 이 파일에서 관리한다.
 * Header 내부 하드코딩 금지.
 */

import type { GlobalHeaderNavItem } from '@o4o/ui';
import { glycopharmConfig } from '@o4o/operator-ux-core';

// ─── Public Nav ──────────────────────────────────────────────────────────────
// 모든 사용자에게 노출

export const GLYCO_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '홈', href: '/' },
  { label: '포럼', href: '/forum' },
  { label: '강의', href: '/lms' },
];

// ─── Contextual Nav ──────────────────────────────────────────────────────────
// 역할 조건에 따라 노출 (서비스에서 필터링 후 전달)

export interface GlycoContextualNavItem extends GlobalHeaderNavItem {
  /** 노출 조건 키 */
  visibleWhen: 'pharmacyRelated' | 'storeOwner' | 'operator' | 'admin';
}

export const GLYCO_CONTEXTUAL_NAV: GlycoContextualNavItem[] = [
  { label: glycopharmConfig.terminology.storeHubLabel, href: '/store-hub', visibleWhen: 'pharmacyRelated' },
  { label: glycopharmConfig.terminology.myStoreLabel, href: '/store', visibleWhen: 'storeOwner' },
];

// ─── Filter Helper ───────────────────────────────────────────────────────────

export interface GlycoNavVisibility {
  isAdminOrOperator: boolean;
  isStoreOwner: boolean;
  isPharmacyRelated: boolean;
}

// WO-O4O-COMMON-MENU-VISIBILITY-POLICY-IMPL-V1
// operator/admin은 모든 contextual nav를 본다.
export function filterContextualNav(
  items: GlycoContextualNavItem[],
  vis: GlycoNavVisibility,
): GlobalHeaderNavItem[] {
  if (vis.isAdminOrOperator) {
    return items.map(({ label, href }) => ({ label, href }));
  }
  return items
    .filter((item) => {
      const cond = item.visibleWhen;
      if (cond === 'storeOwner') return vis.isStoreOwner;
      if (cond === 'pharmacyRelated') return vis.isPharmacyRelated;
      return false;
    })
    .map(({ label, href }) => ({ label, href }));
}
