/**
 * KPA Society — Navigation 중앙 설정
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 * 표준: docs/architecture/ui/global-header-standard-v1.md §6
 *
 * 모든 Main Header 메뉴 정의를 이 파일에서 관리한다.
 * Header 내부 하드코딩 금지.
 */

import type { GlobalHeaderNavItem } from '@o4o/ui';
import { kpaConfig } from '@o4o/operator-ux-core';

// ─── Public Nav ──────────────────────────────────────────────────────────────
// 모든 사용자에게 노출

export const KPA_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '홈', href: '/' },
  { label: '포럼', href: '/forum' },
  { label: '강의', href: '/lms' },
];

// ─── Contextual Nav ──────────────────────────────────────────────────────────
// 역할 조건에 따라 노출 (서비스에서 필터링 후 전달)

export interface KpaContextualNavItem extends GlobalHeaderNavItem {
  /** 노출 조건 키 */
  visibleWhen: 'pharmacyRelated' | 'storeOwner' | 'operator' | 'admin';
}

export const KPA_CONTEXTUAL_NAV: KpaContextualNavItem[] = [
  { label: kpaConfig.terminology.storeHubLabel, href: '/store-hub', visibleWhen: 'pharmacyRelated' },
  { label: kpaConfig.terminology.myStoreLabel, href: '/store', visibleWhen: 'storeOwner' },
];

// ─── Filter Helper ───────────────────────────────────────────────────────────

export interface KpaNavVisibility {
  isStoreOwner: boolean;
  isPharmacyRelated: boolean;
}

// WO-O4O-KPA-MY-PHARMACY-HEADER-ROUTE-FIX-V1
// visibleWhen 조건은 operator/admin에게도 동일하게 적용한다.
// "내 약국"은 storeOwner 자격이 있을 때만 노출된다.
export function filterContextualNav(
  items: KpaContextualNavItem[],
  vis: KpaNavVisibility,
): GlobalHeaderNavItem[] {
  return items
    .filter((item) => {
      const cond = item.visibleWhen;
      if (cond === 'storeOwner') return vis.isStoreOwner;
      if (cond === 'pharmacyRelated') return vis.isPharmacyRelated;
      return false;
    })
    .map(({ label, href }) => ({ label, href }));
}
