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

// ─── Footer Nav ──────────────────────────────────────────────────────────────

/**
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §14
 *
 * 푸터 링크 SSOT. View 는 공통 `CommunitySiteFooter`(@o4o/shared-space-ui) 이고
 * Pharmacy-Hub(PH_FOOTER_SECTIONS) 와 같은 구조를 쓴다.
 *
 * 데드링크 0: 여기 등재하는 href 는 전부 App.tsx 에 실제 route 가 있는 경로다.
 * 법정정보(사업자번호 등)는 하드코딩하지 않는다 — PublicLegalFooterInfo(API) 소관.
 */
export const KPA_FOOTER_SECTIONS: { title: string; links: GlobalHeaderNavItem[] }[] = [
  {
    title: '서비스',
    links: [
      { label: '포럼', href: '/forum' },
      { label: '강의', href: '/lms' },
      { label: '콘텐츠', href: '/content' },
      { label: '디지털사이니지', href: '/signage' },
      { label: '자료실', href: '/resources' },
    ],
  },
  {
    title: '이용 안내',
    links: [
      { label: '서비스 안내', href: '/service-guide' },
      { label: '이용 가이드', href: '/guide/intro' },
      { label: '기능별 이용 방법', href: '/guide/features' },
    ],
  },
  {
    title: '약사회',
    links: [
      { label: '약사회 소개', href: '/about' },
      { label: '협업 문의', href: '/contact' },
    ],
  },
  {
    title: '약관',
    links: [
      // WO-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1: KPA 약관 route 는 /policy 다(/terms 아님).
      { label: '이용약관', href: '/policy' },
      { label: '개인정보처리방침', href: '/privacy' },
    ],
  },
];
