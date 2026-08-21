/**
 * KPA Society — Navigation 중앙 설정
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 * 표준: docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md §6
 *
 * 모든 Main Header 메뉴 정의를 이 파일에서 관리한다.
 * Header 내부 하드코딩 금지.
 */

import type { ContextualNavItem, GlobalHeaderNavItem } from '@o4o/ui';
import { kpaConfig } from '@o4o/operator-ux-core';

// ─── Public Nav ──────────────────────────────────────────────────────────────
// 로그인 상태와 무관하게 항상 노출. About은 마지막에 위치.
// KpaGlobalHeader가 역할 조건 아이템을 삽입 후 이 배열을 조합한다.

export const KPA_BASE_NAV: GlobalHeaderNavItem[] = [
  { label: '커뮤니티', href: '/' },
];

// WO-O4O-KPA-SOCIETY-SERVICE-GUIDE-PAGE-V1: 서비스 안내 단일 진입점 (커뮤니티 중심 공개 안내)
export const KPA_SERVICE_GUIDE_NAV_ITEM: GlobalHeaderNavItem = { label: '서비스 안내', href: '/service-guide' };
export const KPA_ABOUT_NAV_ITEM: GlobalHeaderNavItem = { label: 'About', href: '/about' };
export const KPA_CONTACT_NAV_ITEM: GlobalHeaderNavItem = { label: 'Contact', href: '/contact' };

// ─── Contextual Nav ──────────────────────────────────────────────────────────
// 역할 조건에 따라 노출 (서비스에서 필터링 후 전달)
// KPA: 내 약국 우선 — 매장 경영자에게 내 매장이 먼저 보임

// WO-O4O-FRONTEND-MENU-AND-ROUTE-CONTRACT-COMMONIZATION-FULL-CLOSE-V1:
//   필터 구조는 @o4o/ui 의 공통 filterContextualNav 로 승격. 노출 조건 키는 서비스별로 유지.
export type KpaContextualNavItem = ContextualNavItem<'storeOwner' | 'operator' | 'admin'>;

// WO-O4O-KPA-HEADER-MENU-CANONICAL-ALIGNMENT-V1:
//   두 메뉴 모두 store_owner role 기준으로 통일.
//   기존 '운영 허브'의 activityType=='pharmacy_owner' fallback 제거 — HubGuard/PharmacyGuard/
//   StoreHubPage CTA 가 모두 role 기반(isStoreOwnerDual)이므로 menu 노출도 동일 기준으로 정합.
//   선언만 한 사용자(activityType=pharmacy_owner, role 미부여)에게 메뉴 노출 후 클릭 시
//   guard redirect 되는 UX 함정 제거.
export const KPA_CONTEXTUAL_NAV: KpaContextualNavItem[] = [
  { label: kpaConfig.terminology.myStoreLabel, href: '/store', visibleWhen: 'storeOwner' },
  { label: kpaConfig.terminology.storeHubLabel, href: '/store-hub', visibleWhen: 'storeOwner' },
];
