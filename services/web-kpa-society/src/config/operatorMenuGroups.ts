/**
 * KPA Society Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-RBAC-GLOBAL-STANDARD-ROLL-OUT-V1: adminOnly 플래그 추가
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
    { label: '조직 가입 요청', path: '/operator/organization-requests' },
    { label: '약국 서비스 신청', path: '/operator/pharmacy-requests' },
  ],
  approvals: [{ label: '상품 신청 관리', path: '/operator/product-applications' }],
  stores: [
    { label: '매장 관리', path: '/operator/stores' },
    { label: '채널 관리', path: '/operator/store-channels' },
  ],
  content: [
    { label: '공지사항', path: '/operator/news' },
    { label: '자료실', path: '/operator/docs' },
    { label: '콘텐츠 관리', path: '/operator/content' },
  ],
  signage: [
    { label: '콘텐츠 허브', path: '/operator/signage/content' },
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    { label: '카테고리 관리', path: '/operator/signage/categories' },
  ],
  forum: [
    { label: '커뮤니티 관리', path: '/operator/community' },
    { label: '포럼 관리', path: '/operator/forum-management' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
    { label: '게시판', path: '/operator/forum' },
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

// ─── Legacy export (하위호환, deprecated) ───
/** @deprecated Use UNIFIED_MENU + filterMenuByRole instead */
export const OPERATOR_MENU_ITEMS: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  users: [
    { label: '회원 관리', path: '/operator/members' },
    { label: '조직 가입 요청', path: '/operator/organization-requests' },
    { label: '약국 서비스 신청', path: '/operator/pharmacy-requests' },
  ],
  approvals: [{ label: '상품 신청 관리', path: '/operator/product-applications' }],
  stores: [
    { label: '매장 관리', path: '/operator/stores' },
    { label: '채널 관리', path: '/operator/store-channels' },
  ],
  content: [
    { label: '공지사항', path: '/operator/news' },
    { label: '자료실', path: '/operator/docs' },
    { label: '콘텐츠 관리', path: '/operator/content' },
  ],
  signage: [
    { label: '콘텐츠 허브', path: '/operator/signage/content' },
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    { label: '카테고리 관리', path: '/operator/signage/categories' },
  ],
  forum: [
    { label: '커뮤니티 관리', path: '/operator/community' },
    { label: '포럼 관리', path: '/operator/forum-management' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
    { label: '게시판', path: '/operator/forum' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: '운영 분석', path: '/operator/analytics' },
  ],
  system: [],
};
