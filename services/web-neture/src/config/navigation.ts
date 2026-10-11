/**
 * Neture — Navigation 중앙 설정
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 * 표준: docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md §6
 *
 * 모든 Main Header 메뉴 정의를 이 파일에서 관리한다.
 * Header 내부 하드코딩 금지.
 */

import type { ContextualNavItem, GlobalHeaderNavItem } from '@o4o/ui';
import type { HostProfile } from '../lib/hostProfile';

// ─── Public Nav ──────────────────────────────────────────────────────────────
// 모든 사용자에게 노출

// WO-O4O-NETURE-HEADER-AND-GUIDE-CONSOLIDATION-V1
// 상단 메뉴 3개로 단순화.
// Supplier / 유통참여형 펀딩 / O4O 소개는 /guide(이용 안내) 허브 안에서 진입.
// WO-O4O-COMMON-HOME-PHASE1-V1:
//   `/` 가 O4O 공통 Home 으로 바뀌면서 기존 Neture 커뮤니티 홈은 `/community` 로 이동했다.
//   route 있는 실기능을 nav 에서 숨기지 않는다(CLAUDE.md Shared Module Change Rule) → 항목 추가.
export const NETURE_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '전체 서비스', href: '/' },
  { label: 'Contact Us', href: '/contact' },
];

export function getServicePublicNav(profile: HostProfile): GlobalHeaderNavItem[] {
  if (profile === 'community') return [
    { label: '커뮤니티 · 단체활동', href: '/' },
    { label: '개설 신청 · 운영', href: '/mypage/communities' },
  ];
  if (profile === 'funding') return [
    { label: '유통참여형 펀딩', href: '/market-trial' },
    { label: '내 펀딩·개설 신청', href: '/market-trial/manage' },
    { label: 'Contact Us', href: '/contact' },
  ];
  if (profile === 'supplier') return [
    { label: '신청 · 이용 상태', href: '/' },
    { label: '공급자 업무', href: '/supplier/dashboard' },
    { label: 'Contact Us', href: '/contact' },
  ];
  return NETURE_PUBLIC_NAV;
}

// ─── Contextual Nav ──────────────────────────────────────���───────────────────
// 역할 조건에 따라 노출

// WO-O4O-FRONTEND-MENU-AND-ROUTE-CONTRACT-COMMONIZATION-FULL-CLOSE-V1:
//   필터 구조는 @o4o/ui 의 공통 filterContextualNav 로 승격. 노출 조건 키는 서비스별로 유지.
export type NetureContextualNavItem = ContextualNavItem<'supplier' | 'operator' | 'admin'>;

// WO-O4O-NETURE-CONTEXTUAL-NAV-SUPPLIER-PARTNER-INTEGRATION-V1
// supplier 역할 사용자가 상단 nav 에서 자신의 워크스페이스(대시보드)로 바로 진입.
// WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1: 파트너 대시보드 항목 은퇴.
// WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1: operator/admin 전체 노출(showAll)은 쓰지 않는다 —
//   공급자 대시보드는 SupplierRoute 가 공급자 역할만 통과시키므로 진입 가능한 사람에게만 보인다.
export const NETURE_CONTEXTUAL_NAV: NetureContextualNavItem[] = [
  { label: '공급자 대시보드', href: '/supplier/dashboard', visibleWhen: 'supplier' },
];
