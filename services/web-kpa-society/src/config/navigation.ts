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

// ─── Public Nav ──────────────────────────────────────────────────────────────
// 모든 사용자에게 노출

export const KPA_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '홈', href: '/' },
  { label: '포럼', href: '/forum' },
  { label: '강의 / 마케팅 콘텐츠', href: '/lms' },
  { label: '약사 뉴스', href: 'https://www.kpanews.co.kr' },
];

// ─── Contextual Nav ──────────────────────────────────────────────────────────
// 역할 조건에 따라 노출 (서비스에서 필터링 후 전달)

export interface KpaContextualNavItem extends GlobalHeaderNavItem {
  /** 노출 조건 키 */
  visibleWhen: 'pharmacyRelated' | 'storeOwner' | 'operator' | 'admin';
}

export const KPA_CONTEXTUAL_NAV: KpaContextualNavItem[] = [
  { label: '약국 HUB', href: '/hub', visibleWhen: 'pharmacyRelated' },
  { label: '내 약국', href: '/store', visibleWhen: 'storeOwner' },
  { label: '운영 대시보드', href: '/operator', visibleWhen: 'operator' },
  // admin은 "운영 대시보드"를 "관리자 콘솔"로 대체 (filterContextualNav에서 처리)
];

// ─── Filter Helper ───────────────────────────────────────────────────────────

export interface KpaNavVisibility {
  isAdmin: boolean;
  isOperator: boolean;
  isStoreOwner: boolean;
  isPharmacyRelated: boolean;
}

/**
 * 역할 조건에 따라 contextualNav를 필터링한다.
 * admin인 경우 "운영 대시보드"를 "관리자 콘솔" + /admin으로 교체.
 */
export function filterContextualNav(
  items: KpaContextualNavItem[],
  vis: KpaNavVisibility,
): GlobalHeaderNavItem[] {
  return items
    .map((item) => {
      // admin이면 operator 메뉴를 admin 메뉴로 교체
      if (item.visibleWhen === 'operator' && vis.isAdmin) {
        return { label: '관리자 콘솔', href: '/admin', visibleWhen: 'admin' as const };
      }
      return item;
    })
    .filter((item) => {
      const cond = item.visibleWhen;
      if (cond === 'admin') return vis.isAdmin;
      if (cond === 'operator') return vis.isOperator;
      if (cond === 'storeOwner') return vis.isStoreOwner;
      if (cond === 'pharmacyRelated') return vis.isPharmacyRelated;
      return false;
    })
    .map(({ label, href }) => ({ label, href })); // strip visibleWhen
}
