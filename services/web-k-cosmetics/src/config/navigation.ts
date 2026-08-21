/**
 * K-Cosmetics — Navigation 중앙 설정
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 * 표준: docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md §6
 *
 * 모든 Main Header 메뉴 정의를 이 파일에서 관리한다.
 * Header 내부 하드코딩 금지.
 */

import type { ContextualNavItem, GlobalHeaderNavItem } from '@o4o/ui';
import { kcosmeticsConfig } from '@o4o/operator-ux-core';

// ─── Public Nav ──────────────────────────────────────────────────────────────

// WO-O4O-KCOS-MENU-CANONICAL-ALIGN-V1: 커뮤니티 단일 진입점
export const KCOS_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '커뮤니티', href: '/' },
  // WO-O4O-KCOS-SERVICE-GUIDE-PAGE-V1: 서비스 안내 단일 진입점 (About/Contact 분리 메뉴 대신)
  { label: '서비스 안내', href: '/service-guide' },
];

// ─── Contextual Nav ──────────────────────────────────────────────────────────

// WO-O4O-FRONTEND-MENU-AND-ROUTE-CONTRACT-COMMONIZATION-FULL-CLOSE-V1:
//   필터 구조는 @o4o/ui 의 공통 filterContextualNav 로 승격. 노출 조건 키는 서비스별로 유지.
export type KCosContextualNavItem = ContextualNavItem<'storeManager' | 'operator' | 'admin'>;

// HUB 우선 — 비KPA 서비스는 매장 HUB가 먼저 노출
export const KCOS_CONTEXTUAL_NAV: KCosContextualNavItem[] = [
  { label: kcosmeticsConfig.terminology.storeHubLabel, href: '/store-hub', visibleWhen: 'storeManager' },
  { label: kcosmeticsConfig.terminology.myStoreLabel, href: '/store', visibleWhen: 'storeManager' },
];
