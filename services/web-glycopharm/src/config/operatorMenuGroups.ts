/**
 * GlycoPharm Operator Menu Items
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
  users: [{ label: '회원 관리', path: '/operator/users' }],
  approvals: [
    { label: '신청 관리', path: '/operator/applications' },
    { label: '매장 승인', path: '/operator/store-approvals' },
    { label: 'Market Trial', path: '/operator/market-trial' },
  ],
  products: [{ label: '상품 관리', path: '/operator/products' }],
  stores: [
    { label: '약국 관리', path: '/operator/pharmacies' },
    { label: '매장 관리', path: '/operator/stores' },
  ],
  orders: [{ label: '주문 관리', path: '/operator/orders' }],
  content: [
    { label: '가이드라인 관리', path: '/operator/guidelines' },
  ],
  signage: [
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    { label: '콘텐츠 허브', path: '/operator/signage/content' },
    { label: '콘텐츠 라이브러리', path: '/operator/signage/library' },
  ],
  forum: [
    { label: '포럼 관리', path: '/operator/forum-management' },
    { label: '포럼 신청', path: '/operator/forum-requests' },
    { label: '커뮤니티 관리', path: '/operator/community' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: 'AI 사용량', path: '/operator/ai-usage' },
    { label: 'AI 정산', path: '/operator/ai-billing' },
    { label: '운영 분석', path: '/operator/analytics' },
  ],
  system: [
    { label: '정산 관리', path: '/operator/settlements', adminOnly: true },
    { label: '청구 리포트', path: '/operator/reports', adminOnly: true },
    { label: '청구 미리보기', path: '/operator/billing-preview', adminOnly: true },
    { label: '인보이스', path: '/operator/invoices', adminOnly: true },
    { label: '케어 현황', path: '/operator/care' },
    { label: '케어 알림', path: '/operator/care/alerts' },
    { label: '서비스 설정', path: '/operator/settings' },
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
  users: [{ label: '회원 관리', path: '/operator/users' }],
  approvals: [
    { label: '신청 관리', path: '/operator/applications' },
    { label: '매장 승인', path: '/operator/store-approvals' },
    { label: 'Market Trial', path: '/operator/market-trial' },
  ],
  products: [{ label: '상품 관리', path: '/operator/products' }],
  stores: [
    { label: '약국 관리', path: '/operator/pharmacies' },
    { label: '매장 관리', path: '/operator/stores' },
  ],
  orders: [{ label: '주문 관리', path: '/operator/orders' }],
  content: [
    { label: '가이드라인 관리', path: '/operator/guidelines' },
  ],
  signage: [
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    { label: '콘텐츠 허브', path: '/operator/signage/content' },
    { label: '콘텐츠 라이브러리', path: '/operator/signage/library' },
  ],
  forum: [
    { label: '포럼 관리', path: '/operator/forum-management' },
    { label: '포럼 신청', path: '/operator/forum-requests' },
    { label: '커뮤니티 관리', path: '/operator/community' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: 'AI 사용량', path: '/operator/ai-usage' },
    { label: 'AI 정산', path: '/operator/ai-billing' },
    { label: '운영 분석', path: '/operator/analytics' },
  ],
  system: [
    { label: '케어 현황', path: '/operator/care' },
    { label: '케어 알림', path: '/operator/care/alerts' },
    { label: '서비스 설정', path: '/operator/settings' },
  ],
};
