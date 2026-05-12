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
// 로그인 상태와 무관하게 항상 노출. About은 마지막에 위치.
// KpaGlobalHeader가 역할 조건 아이템을 삽입 후 이 배열을 조합한다.

export const KPA_BASE_NAV: GlobalHeaderNavItem[] = [
  { label: '커뮤니티', href: '/' },
];

export const KPA_ABOUT_NAV_ITEM: GlobalHeaderNavItem = { label: 'About', href: '/about' };
export const KPA_CONTACT_NAV_ITEM: GlobalHeaderNavItem = { label: 'Contact', href: '/contact' };

// ─── Contextual Nav ──────────────────────────────────────────────────────────
// 역할 조건에 따라 노출 (서비스에서 필터링 후 전달)
// 순서: 약국 운영 허브 → 내 약국 (사용자 요청 2026-05-12)

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
