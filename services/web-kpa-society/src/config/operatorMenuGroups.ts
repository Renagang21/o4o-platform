/**
 * KPA Society Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-RBAC-GLOBAL-STANDARD-ROLL-OUT-V1: adminOnly 플래그 추가
 * WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-IA-RESTRUCTURE-V1:
 *   KPA-only domain 매핑 추가 (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통).
 *   STANDARD_GROUPS 자체는 보존 — KPA 전용 KpaOperatorSidebar 가 domain 헤딩 + 그룹 정렬에 사용.
 *
 * 표준 11-그룹 키에 대한 라우트 매핑.
 * adminOnly 항목은 admin 역할만 표시.
 */

import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';

/** 통합 메뉴 항목 — adminOnly 플래그 포함 */
interface UnifiedMenuItem {
  label: string;
  path: string;
  exact?: boolean;
  /** true = admin 역할에게만 표시 */
  adminOnly?: boolean;
}

/**
 * 통합 메뉴 구성
 * - 기존 operator 메뉴 + admin-only 항목 병합
 */
export const UNIFIED_MENU: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  users: [
    { label: '회원 관리', path: '/operator/members' },
    // WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1: 약국 서비스 신청 메뉴 제거 (라우트/API/DB 유지)
  ],
  approvals: [
    // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1: 자격 신청 관리 → lms 그룹으로 이동
    { label: '상품 신청 관리', path: '/operator/product-applications' },
    // WO-O4O-EVENT-OFFER-OPERATOR-APPROVAL-KPA-V1: 이벤트 오퍼 승인 관리
    { label: '이벤트 오퍼 승인', path: '/operator/event-offers' },
    // WO-O4O-KPA-OPERATOR-COLLABORATION-INBOX-V1
    { label: '협업 문의', path: '/operator/collaboration-requests' },
  ],
  // WO-O4O-OPERATOR-DASHBOARD-COMMUNITY-STORE-HUB-SPLIT-V1: stores 메뉴 복원 (매장 HUB 운영 축)
  // WO-O4O-OPERATOR-BLOG-WRITE-PAGE-KPA-V1: 매장 HUB 블로그 (운영자 게시 → 매장 가져가기)
  // WO-O4O-KPA-OPERATOR-POP-WRITE-PAGE-V1: 매장 HUB POP (운영자 게시 → 매장 가져가기)
  //   Store Menu Canonical Tree V1 의 'POP' 항목 운영자 게시 측 진입점. 라벨은 sidebar 일관성을
  //   위해 'HUB' prefix 유지 (블로그와 같은 prefix) — canonical 항목명 'POP' 자체는 보존.
  // WO-O4O-KPA-OPERATOR-QR-WRITE-PAGE-V1: 매장 HUB QR-code (운영자 템플릿 → 매장 가져가기)
  //   운영자는 QR "템플릿" 작성. 실제 QR slug 는 매장 가져가기 시 발급 (Phase 3-B 의
  //   store_qr_codes INSERT). canonical 항목명 'QR-code' 유지.
  stores: [
    { label: '매장 관리', path: '/operator/stores' },
    { label: '채널 관리', path: '/operator/store-channels' },
    { label: '매장 HUB 블로그', path: '/operator/blog' },
    { label: '매장 HUB POP', path: '/operator/pop' },
    { label: '매장 HUB QR-code', path: '/operator/qr' },
  ],
  // WO-KPA-OPERATOR-CONTENT-NOTICE-NEWS-MENU-NORMALIZATION-V1: "공지사항" + "콘텐츠 관리" → "공지사항/뉴스" 통합
  // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1: 자료실 관리 → resources 그룹으로, 강의 관리 → lms 그룹으로 이동
  content: [
    { label: '공지사항/뉴스', path: '/operator/content' },
    { label: 'Home 편집', path: '/operator/community' },
    { label: '콘텐츠 허브', path: '/operator/docs' },
  ],
  // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1: 자료실 독립 최상위 그룹
  resources: [
    { label: '자료실 관리', path: '/operator/resources' },
  ],
  // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1: 강의 독립 그룹 (강의 관리 + 강사 승인)
  // WO-O4O-GUIDE-CONTENT-EDITOR-UI-V1: 안내 문구 관리 추가 (LMS 레슨 작성 화면)
  lms: [
    { label: '강의 관리', path: '/operator/lms' },
    { label: '강사 승인', path: '/operator/qualification-requests' },
    { label: '안내 문구 관리', path: '/operator/guide-contents' },
  ],
  signage: [

    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    { label: '강제 콘텐츠', path: '/operator/signage/forced-content' },
  ],
  // WO-KPA-OPERATOR-FORUM-MENU-ORDER-V1: 포럼 운영(허브)을 최상단으로 이동
  forum: [
    { label: '포럼 운영', path: '/operator/forum' },
    { label: '포럼 관리', path: '/operator/forum-management' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: '운영 분석', path: '/operator/analytics' },
  ],
  system: [
    { label: '법률 관리', path: '/operator/legal', adminOnly: true },
    { label: '감사 로그', path: '/operator/audit-logs', adminOnly: true },
    { label: '역할 관리', path: '/operator/roles', adminOnly: true },
  ],
};

/**
 * 역할 기반 메뉴 필터
 * adminOnly 항목을 admin이 아닌 사용자에게 숨기고,
 * OperatorMenuItem 타입으로 변환 (adminOnly 필드 제거)
 */
export function filterMenuByRole(
  menu: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>>,
  isAdmin: boolean,
): Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> {
  const filtered: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {};
  for (const [key, items] of Object.entries(menu) as [OperatorGroupKey, UnifiedMenuItem[]][]) {
    const visible = items
      .filter(item => !item.adminOnly || isAdmin)
      .map(({ adminOnly: _, ...rest }) => rest);
    if (visible.length > 0) filtered[key] = visible;
  }
  return filtered;
}

// ─── Domain IA mapping — WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-IA-RESTRUCTURE-V1 ───

/** KPA operator sidebar 도메인 키.
 *  dashboard 의 2축 운영 (커뮤니티 / 매장 HUB) + 운영 공통 으로 IA 정렬.
 */
export type OperatorDomainKey = 'community' | 'store_hub' | 'common';

/** 도메인 헤딩 라벨 + 시각 토큰 */
export const DOMAIN_LABELS: Record<OperatorDomainKey, { label: string; emoji: string }> = {
  community: { label: '커뮤니티 운영', emoji: '💬' },
  store_hub: { label: '매장 HUB 운영', emoji: '🏪' },
  common: { label: '운영 공통', emoji: '⚙️' },
};

/** STANDARD_GROUPS key → 도메인 매핑.
 *  KPA 미사용 그룹(products/orders/care)도 안전한 default 도메인 지정.
 */
export const GROUP_TO_DOMAIN: Record<OperatorGroupKey, OperatorDomainKey> = {
  dashboard: 'common',
  users: 'community',
  approvals: 'store_hub',
  products: 'store_hub',
  stores: 'store_hub',
  orders: 'store_hub',
  content: 'community',
  resources: 'community',
  lms: 'community',
  signage: 'store_hub',
  forum: 'community',
  analytics: 'common',
  care: 'common',
  system: 'common',
};

/** 도메인 별 그룹 표시 순서.
 *  WO 명시 sidebar 순서를 그룹 키 시퀀스로 변환.
 *  - community: 회원 → 포럼 → 콘텐츠 → LMS → 자료실
 *  - store_hub: 매장 → 상품/이벤트/협업(approvals) → 사이니지
 *  - common: 분석 → 시스템 (대시보드는 TOP_PINNED_GROUPS 에서 별도 처리)
 */
export const DOMAIN_GROUP_ORDER: Record<OperatorDomainKey, OperatorGroupKey[]> = {
  community: ['users', 'forum', 'content', 'lms', 'resources'],
  store_hub: ['stores', 'approvals', 'signage'],
  common: ['analytics', 'system'],
};

/** 도메인 표시 순서 (sidebar top → bottom) */
export const DOMAIN_DISPLAY_ORDER: OperatorDomainKey[] = ['community', 'store_hub', 'common'];

/** sidebar 최상단 고정 항목 — 도메인 헤딩과 무관하게 항상 sidebar 첫 영역에 노출.
 *  대시보드는 모든 도메인의 진입점이므로 sidebar 최상단에 단독 배치.
 */
export const TOP_PINNED_GROUPS: OperatorGroupKey[] = ['dashboard'];

// ─── Legacy export (하위호환, deprecated) ───
/** @deprecated Use UNIFIED_MENU + filterMenuByRole instead */
export const OPERATOR_MENU_ITEMS: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  users: [
    { label: '회원 관리', path: '/operator/members' },
    // WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1: 약국 서비스 신청 메뉴 제거 (라우트/API/DB 유지)
  ],
  approvals: [
    // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1: 자격 신청 관리 → lms 그룹으로 이동
    { label: '상품 신청 관리', path: '/operator/product-applications' },
    // WO-O4O-EVENT-OFFER-OPERATOR-APPROVAL-KPA-V1
    { label: '이벤트 오퍼 승인', path: '/operator/event-offers' },
    // WO-O4O-KPA-OPERATOR-COLLABORATION-INBOX-V1
    { label: '협업 문의', path: '/operator/collaboration-requests' },
  ],
  // WO-KPA-OPERATOR-STORES-MENU-HIDE-V1: stores 메뉴 노출 제거
  // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1: 자료실/강의 독립 그룹 분리
  content: [
    { label: '공지사항/뉴스', path: '/operator/content' },
    { label: 'Home 편집', path: '/operator/community' },
    { label: '콘텐츠 허브', path: '/operator/docs' },
  ],
  resources: [
    { label: '자료실 관리', path: '/operator/resources' },
  ],
  lms: [
    { label: '강의 관리', path: '/operator/lms' },
    { label: '강사 승인', path: '/operator/qualification-requests' },
  ],
  signage: [

    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    { label: '강제 콘텐츠', path: '/operator/signage/forced-content' },
  ],
  // WO-KPA-OPERATOR-FORUM-MENU-ORDER-V1: 포럼 운영(허브)을 최상단으로 이동
  forum: [
    { label: '포럼 운영', path: '/operator/forum' },
    { label: '포럼 관리', path: '/operator/forum-management' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: '운영 분석', path: '/operator/analytics' },
  ],
  system: [],
};
