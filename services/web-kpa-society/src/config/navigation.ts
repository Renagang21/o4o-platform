/**
 * KPA Society — Navigation 중앙 설정
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 * 표준: docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md §6
 *
 * 모든 Main Header 메뉴 정의를 이 파일에서 관리한다.
 * Header 내부 하드코딩 금지.
 */

import type { GlobalHeaderNavItem } from '@o4o/ui';

// ─── Public Nav ──────────────────────────────────────────────────────────────
// 로그인 상태와 무관하게 항상 노출. About은 마지막에 위치.
// KpaGlobalHeader가 역할 조건 아이템을 삽입 후 이 배열을 조합한다.

/**
 * O4O 강의 (Lecture) 독립 서비스 — WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §14·§15
 * KPA 는 LMS runtime surface 를 갖지 않는다. 강의 이동은 public link 로만 한다 (권한·회원 승계 없음).
 */
export const LECTURE_SERVICE_URL = 'https://study.neture.co.kr';

export const KPA_BASE_NAV: GlobalHeaderNavItem[] = [
  { label: '커뮤니티', href: '/' },
  { label: '회원 게시글', href: '/community' },
  { label: '사업 자료', href: '/materials' },
  { label: 'Contact Us', href: '/contact' },
];

// WO-O4O-KPA-SOCIETY-SERVICE-GUIDE-PAGE-V1: 서비스 안내 단일 진입점 (커뮤니티 중심 공개 안내)
export const KPA_SERVICE_GUIDE_NAV_ITEM: GlobalHeaderNavItem = { label: '서비스 안내', href: '/service-guide' };
export const KPA_ABOUT_NAV_ITEM: GlobalHeaderNavItem = { label: 'About', href: '/about' };
export const KPA_CONTACT_NAV_ITEM: GlobalHeaderNavItem = { label: 'Contact', href: '/contact' };

// 내 매장은 회원 초기화면의 업무 바로가기·계정 메뉴에서 제공한다.
// 콘텐츠 메뉴에 매장 실행 업무를 섞지 않는다.

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
/**
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-FINAL-POLISH-V1: 옛 "약사회" 그룹. /about 은 O4O 약국 서비스 소개다
 * (약사회 조직 페이지 아님) — 그룹 · 링크 모두 서비스 브랜드로 표시한다.
 */
export const KPA_FOOTER_SECTIONS: { title: string; links: GlobalHeaderNavItem[] }[] = [
  { title: '약국 협력사업', links: KPA_BASE_NAV },
  { title: '약관', links: [
    { label: '이용약관', href: '/policy' },
    { label: '개인정보처리방침', href: '/privacy' },
  ] },
];
