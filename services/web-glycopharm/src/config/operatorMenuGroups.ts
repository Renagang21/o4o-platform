/**
 * GlycoPharm Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-RBAC-GLOBAL-STANDARD-ROLL-OUT-V1: adminOnly 플래그 추가
 * WO-O4O-GLYCOPHARM-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
 *   KPA-Society 의 도메인 IA (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통) 기준으로
 *   UNIFIED_MENU 그룹 재배치 + KPA 와 동일한 Domain IA 메타데이터 추가.
 *   - content 그룹의 LMS 항목(강의/강사 승인/안내 문구) → 신규 lms 그룹
 *   - content 그룹의 약국 HUB 블로그/POP/QR → stores 그룹
 *   - GlycoPharm 고유 그룹 products / orders 는 store_hub 도메인에 포함
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
  users: [{ label: '회원 관리', path: '/operator/members' }],
  approvals: [
    { label: '매장 승인', path: '/operator/store-approvals' },
    { label: '약사 회원 관리', path: '/operator/members' },
    // WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1
    { label: '이벤트 오퍼 승인', path: '/operator/event-offers' },
    /* WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-CLEANUP-V1:
       Market Trial operator 콘솔은 미구현 → 메뉴/라우트에서 제거. 후속 별도 WO 예정. */
  ],
  products: [{ label: '상품 관리', path: '/operator/products' }],
  // WO-O4O-GLYCOPHARM-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
  //   약국 HUB 블로그/POP/QR 을 stores 그룹으로 이동 (KPA-aligned).
  //   Store Menu Canonical Tree V1 의 매장 HUB 운영 축에 정합.
  stores: [
    { label: '약국 관리', path: '/operator/pharmacies' },
    { label: '매장 관리', path: '/operator/stores' },
    // WO-O4O-GLYCOPHARM-OPERATOR-STORE-CHANNELS-V1
    { label: '채널 관리', path: '/operator/store-channels' },
    // WO-O4O-GLYCOPHARM-OPERATOR-STORE-HUB-WRITE-CAPABILITY-V1 (위치 재배치)
    { label: '약국 HUB 블로그', path: '/operator/blog' },
    { label: '약국 HUB POP', path: '/operator/pop' },
    { label: '약국 HUB QR', path: '/operator/qr' },
  ],
  orders: [{ label: '주문 관리', path: '/operator/orders' }],
  // WO-O4O-GLYCOPHARM-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
  //   LMS / HUB 항목 분리 후 community 도메인 콘텐츠 축만 잔존.
  content: [
    { label: '가이드라인 관리', path: '/operator/guidelines' },
    { label: '공지/뉴스 관리', path: '/operator/content-management' },
    // WO-O4O-GLYCOPHARM-OPERATOR-SURVEYS-V1
    { label: '설문조사 관리', path: '/operator/surveys' },
  ],
  // WO-O4O-GLYCOPHARM-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
  //   content 그룹에서 LMS 항목 분리 — KPA 와 동일한 별도 lms 그룹.
  lms: [
    { label: '강의 관리', path: '/operator/lms' },
    // WO-O4O-GLYCOPHARM-OPERATOR-LMS-QUALIFICATION-WORKFLOW-V1
    { label: '강사 승인', path: '/operator/qualification-requests' },
    { label: '안내 문구 관리', path: '/operator/guide-contents' },
  ],
  signage: [
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    { label: '콘텐츠 허브', path: '/operator/signage/content' },
    { label: '콘텐츠 라이브러리', path: '/operator/signage/library' },
    { label: '강제 콘텐츠', path: '/operator/signage/forced-content' },
  ],
  forum: [
    // WO-O4O-GLYCOPHARM-FORUM-MANAGEMENT-ORPHAN-REMOVAL-V1: mock-only '포럼 관리'(forum-management) 제거 — canonical 신청/삭제요청/분석만 유지
    { label: '포럼 신청', path: '/operator/forum-requests' },
    { label: '포럼 삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '커뮤니티 관리', path: '/operator/community' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: 'AI 사용량', path: '/operator/ai-usage' },
    { label: 'AI 정산', path: '/operator/ai-billing' },
    { label: '운영 분석', path: '/operator/analytics' },
  ],
  // care group removed — WO-O4O-GLYCOPHARM-CARE-REMOVAL-V1
  // WO-O4O-GLYCOPHARM-OPERATOR-ADMIN-CONSOLE-KPA-ALIGNMENT-V1: resources 추가
  resources: [{ label: '자료실 관리', path: '/operator/resources' }],
  // WO-GLYCOPHARM-OPERATOR-MENU-ADMIN-GUARD-V1: system = admin 전용
  system: [
    { label: '서비스 설정', path: '/operator/settings', adminOnly: true },
    { label: '회원 관리 (Admin)', path: '/admin/members', adminOnly: true },
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

// ─── Domain IA mapping ───
// WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1:
//   Domain IA 메타데이터 (OperatorDomainKey / DOMAIN_LABELS / GROUP_TO_DOMAIN /
//   DOMAIN_GROUP_ORDER / DOMAIN_DISPLAY_ORDER / TOP_PINNED_GROUPS) 는 3개 서비스 공통
//   @o4o/operator-ux-core 의 sidebar/operatorDomainIA 로 이동. (중복 제거 — 노출 결과 불변)

// ─── Legacy export (하위호환, deprecated) ───
/** @deprecated Use UNIFIED_MENU + filterMenuByRole instead */
export const OPERATOR_MENU_ITEMS: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  users: [{ label: '회원 관리', path: '/operator/members' }],
  approvals: [
    { label: '매장 승인', path: '/operator/store-approvals' },
    { label: '약사 회원 관리', path: '/operator/members' },
    { label: '이벤트 오퍼 승인', path: '/operator/event-offers' },
  ],
  products: [{ label: '상품 관리', path: '/operator/products' }],
  stores: [
    { label: '약국 관리', path: '/operator/pharmacies' },
    { label: '매장 관리', path: '/operator/stores' },
    { label: '채널 관리', path: '/operator/store-channels' },
    { label: '약국 HUB 블로그', path: '/operator/blog' },
    { label: '약국 HUB POP', path: '/operator/pop' },
    { label: '약국 HUB QR', path: '/operator/qr' },
  ],
  orders: [{ label: '주문 관리', path: '/operator/orders' }],
  content: [
    { label: '가이드라인 관리', path: '/operator/guidelines' },
    { label: '공지/뉴스 관리', path: '/operator/content-management' },
    { label: '설문조사 관리', path: '/operator/surveys' },
  ],
  lms: [
    { label: '강의 관리', path: '/operator/lms' },
    { label: '강사 승인', path: '/operator/qualification-requests' },
    { label: '안내 문구 관리', path: '/operator/guide-contents' },
  ],
  signage: [
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    { label: '콘텐츠 허브', path: '/operator/signage/content' },
    { label: '콘텐츠 라이브러리', path: '/operator/signage/library' },
    { label: '강제 콘텐츠', path: '/operator/signage/forced-content' },
  ],
  forum: [
    // WO-O4O-GLYCOPHARM-FORUM-MANAGEMENT-ORPHAN-REMOVAL-V1: mock-only '포럼 관리'(forum-management) 제거 — canonical 신청/삭제요청/분석만 유지
    { label: '포럼 신청', path: '/operator/forum-requests' },
    { label: '포럼 삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '커뮤니티 관리', path: '/operator/community' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: 'AI 사용량', path: '/operator/ai-usage' },
    { label: 'AI 정산', path: '/operator/ai-billing' },
    { label: '운영 분석', path: '/operator/analytics' },
  ],
  resources: [{ label: '자료실 관리', path: '/operator/resources' }],
  system: [
    { label: '서비스 설정', path: '/operator/settings' },
  ],
};
