/**
 * Neture Unified Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-UNIFICATION-V1
 * admin + operator 통합 메뉴. adminOnly 항목은 admin 역할만 표시.
 *
 * 표준 11-그룹 키에 대한 라우트 매핑.
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
 * - 경로: /operator/* (통합 prefix)
 */
export const UNIFIED_MENU: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>> = {
  dashboard: [
    { label: '대시보드', path: '/operator', exact: true },
    { label: 'Action Queue', path: '/operator/actions' },
  ],
  users: [
    { label: '회원 관리', path: '/operator/users' },
    { label: '운영자 관리', path: '/operator/operators', adminOnly: true },
    { label: '문의 메시지', path: '/operator/contact-messages', adminOnly: true },
  ],
  approvals: [
    { label: '가입 승인', path: '/operator/applications' },
    { label: 'Market Trial', path: '/operator/market-trial' },
    { label: '서비스 승인', path: '/operator/service-approvals', adminOnly: true },
    { label: '공급사 승인', path: '/operator/admin-suppliers', adminOnly: true },
  ],
  products: [
    { label: '공급 현황', path: '/operator/supply' },
    { label: '카테고리 관리', path: '/operator/categories', adminOnly: true },
    { label: '브랜드 관리', path: '/operator/brands', adminOnly: true },
    { label: '상품 데이터 정리', path: '/operator/product-cleanup', adminOnly: true },
    { label: '서비스별 상품 승인', path: '/operator/product-service-approvals' },
    { label: '큐레이션', path: '/operator/curation' },
    { label: '상품 승인', path: '/operator/product-approvals', adminOnly: true },
    { label: '마스터 관리', path: '/operator/masters', adminOnly: true },
    { label: '카탈로그 일괄등록', path: '/operator/catalog-import', adminOnly: true },
  ],
  stores: [
    { label: '매장 관리', path: '/operator/stores' },
  ],
  orders: [
    { label: '주문 관리', path: '/operator/orders' },
    { label: '파트너 현황', path: '/operator/partners', adminOnly: true },
    { label: '정산 관리', path: '/operator/settlements', adminOnly: true },
    { label: '파트너 정산', path: '/operator/partner-settlements', adminOnly: true },
    { label: '커미션 관리', path: '/operator/commissions', adminOnly: true },
  ],
  content: [
    { label: '홈페이지 CMS', path: '/operator/homepage-cms' },
    { label: '커뮤니티 광고', path: '/operator/community-admin', adminOnly: true },
  ],
  signage: [
    { label: '사이니지', path: '/operator/signage/hq-media' },
  ],
  forum: [
    { label: '포럼 신청', path: '/operator/community' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: 'AI 카드 리포트', path: '/operator/ai-card-report' },
    { label: 'AI 운영', path: '/operator/ai-operations' },
    { label: 'Asset Quality', path: '/operator/ai/asset-quality' },
    { label: '운영 분석', path: '/operator/analytics' },
    { label: '공급자 품질', path: '/operator/supplier-quality' },
    { label: 'AI 관리', path: '/operator/ai-admin', adminOnly: true },
    { label: 'AI 카드 규칙', path: '/operator/ai-card-rules', adminOnly: true },
    { label: 'AI 비즈팩', path: '/operator/ai-business-pack', adminOnly: true },
  ],
  system: [
    { label: '알림 설정', path: '/operator/settings/notifications' },
    { label: '역할 관리', path: '/operator/roles', adminOnly: true },
    { label: '이메일 설정', path: '/operator/settings/email', adminOnly: true },
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

/**
 * Admin 전용 메뉴 생성
 * WO-O4O-ROLE-ROUTE-ISOLATION-V1
 * 모든 항목 (adminOnly 포함) + /operator → /admin prefix 치환
 */
export function getAdminMenu(): Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> {
  const result: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {};
  for (const [key, items] of Object.entries(UNIFIED_MENU) as [OperatorGroupKey, UnifiedMenuItem[]][]) {
    result[key] = items.map(({ adminOnly: _, path, ...rest }) => ({
      ...rest,
      path: path.replace(/^\/operator/, '/admin'),
    }));
  }
  return result;
}

// ─── Legacy export (하위호환, deprecated) ───
/** @deprecated Use UNIFIED_MENU + filterMenuByRole instead */
export const OPERATOR_MENU_ITEMS: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {
  dashboard: [
    { label: '대시보드', path: '/operator', exact: true },
    { label: 'Action Queue', path: '/operator/actions' },
  ],
  users: [{ label: '회원 관리', path: '/operator/users' }],
  approvals: [
    { label: '가입 승인', path: '/operator/applications' },
    { label: 'Market Trial', path: '/operator/market-trial' },
  ],
  products: [
    { label: '공급 현황', path: '/operator/supply' },
    { label: '서비스별 상품 승인', path: '/operator/product-service-approvals' },
    { label: '큐레이션', path: '/operator/curation' },
  ],
  stores: [{ label: '매장 관리', path: '/operator/stores' }],
  orders: [{ label: '주문 관리', path: '/operator/orders' }],
  content: [{ label: '홈페이지 CMS', path: '/operator/homepage-cms' }],
  signage: [{ label: '사이니지', path: '/operator/signage/hq-media' }],
  forum: [
    { label: '포럼 신청', path: '/operator/community' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: 'AI 카드 리포트', path: '/operator/ai-card-report' },
    { label: 'AI 운영', path: '/operator/ai-operations' },
    { label: 'Asset Quality', path: '/operator/ai/asset-quality' },
    { label: '운영 분석', path: '/operator/analytics' },
    { label: '공급자 품질', path: '/operator/supplier-quality' },
  ],
  system: [
    { label: '알림 설정', path: '/operator/settings/notifications' },
  ],
};
