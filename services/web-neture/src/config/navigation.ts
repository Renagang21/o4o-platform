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

// WO-O4O-NETURE-HEADER-AND-GUIDE-CONSOLIDATION-V1
// 상단 메뉴 3개로 단순화.
// Supplier / Partner / 유통 참여형 펀딩 / O4O 소개는 /guide(이용 안내) 허브 안에서 진입.
export const NETURE_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: 'Home', href: '/' },
  { label: '이용 안내', href: '/guide' },
  { label: 'Contact Us', href: '/contact' },
];

// ─── Contextual Nav ──────────────────────────────────────���───────────────────
// 역할 조건에 따라 노출

export interface NetureContextualNavItem extends GlobalHeaderNavItem {
  visibleWhen: 'supplier' | 'partner' | 'operator' | 'admin';
}

// WO-O4O-NETURE-CONTEXTUAL-NAV-SUPPLIER-PARTNER-INTEGRATION-V1
// supplier/partner 역할 사용자가 상단 nav 에서 자신의 워크스페이스(대시보드)로 바로 진입.
// Neture 는 공급자·파트너 조직 중심 — store owner / 매장 허브 구조를 적용하지 않는다.
// operator/admin 은 filterContextualNav 정책상 두 항목 모두 노출(전체 진입 허용).
export const NETURE_CONTEXTUAL_NAV: NetureContextualNavItem[] = [
  { label: '공급자 대시보드', href: '/supplier/dashboard', visibleWhen: 'supplier' },
  { label: '파트너 대시보드', href: '/partner/dashboard', visibleWhen: 'partner' },
];

// ─── Filter Helper ───────────────────────────────────────────────────────────

export interface NetureNavVisibility {
  isAdminOrOperator: boolean;
  isSupplier: boolean;
  isPartner: boolean;
}

// WO-O4O-COMMON-MENU-VISIBILITY-POLICY-IMPL-V1
// operator/admin은 모든 contextual nav를 본다.
export function filterContextualNav(
  items: NetureContextualNavItem[],
  vis: NetureNavVisibility,
): GlobalHeaderNavItem[] {
  if (vis.isAdminOrOperator) {
    return items.map(({ label, href }) => ({ label, href }));
  }
  return items
    .filter((item) => {
      const cond = item.visibleWhen;
      if (cond === 'supplier') return vis.isSupplier;
      if (cond === 'partner') return vis.isPartner;
      return false;
    })
    .map(({ label, href }) => ({ label, href }));
}
