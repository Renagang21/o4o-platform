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
    // WO-O4O-NETURE-ADMIN-MEMBER-HARD-DELETE-V1: admin 전용 완전삭제 관리
    { label: '회원 완전삭제', path: '/operator/members', adminOnly: true },
    { label: '문의 메시지', path: '/operator/contact-messages', adminOnly: true },
  ],
  approvals: [
    { label: '가입 승인', path: '/operator/applications' },
    { label: '유통 참여형 펀딩', path: '/operator/market-trial' },
    { label: '서비스 승인', path: '/operator/service-approvals', adminOnly: true },
    { label: '공급자 승인', path: '/operator/admin-suppliers' },
  ],
  // WO-NETURE-OPERATOR-PRODUCTS-UNIFIED-LIST-FINAL-V1: Products 영역 단일 통합
  products: [
    { label: '상품 관리', path: '/operator/all-registered-products' },
    // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: 큐레이션 메뉴 비노출 (운영자 통제 최소화)
    { label: '카테고리 관리', path: '/operator/categories', adminOnly: true },
    { label: '브랜드 관리', path: '/operator/brands', adminOnly: true },
    { label: '상품 데이터 정리', path: '/operator/product-cleanup', adminOnly: true },
    { label: '마스터 관리', path: '/operator/masters', adminOnly: true },
    { label: '카탈로그 일괄등록', path: '/operator/catalog-import', adminOnly: true },
    { label: '카테고리 매핑', path: '/operator/category-mapping-rules', adminOnly: true },
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
    { label: '안내 문구 관리', path: '/operator/guide-contents' },
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
 * Admin 전용 sidebar 메뉴
 *
 * WO-O4O-NETURE-ADMIN-DASHBOARD-ACTUAL-STRUCTURE-FIX-V1:
 *   기존 getAdminMenu() 는 UNIFIED_MENU 의 모든 항목 (operator 업무 포함) 을 admin sidebar 에
 *   /admin/* prefix 로 노출했다. 결과적으로 /admin 좌측 메뉴가 operator sidebar 의 superset 으로
 *   보였다 ("operator 처럼 보임" 증상의 핵심).
 *
 *   본 함수는 admin 전용 항목 (UNIFIED_MENU 의 adminOnly: true 항목 + 회원 완전삭제) 만 뽑아 보여준다.
 *   가입 승인 / 상품 관리 / 주문 관리 / 사이니지 / 포럼 / AI 리포트 같은 operator 업무는
 *   admin sidebar 에서 제외되며, system group 의 "운영자 업무 →" 링크로 /operator 진입 안내.
 *
 *   /admin/* 라우트 자체는 보존 — 직접 URL 접근 시 admin 전용 페이지가 동작한다.
 *   admin 계정이 operator 영역으로 진입하려면 /operator 로 이동 (AdminRoute 가 operator 업무를
 *   별도 접근 차단하지 않음).
 */
export function getAdminMenu(): Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> {
  return {
    dashboard: [
      { label: '관리자 대시보드', path: '/admin', exact: true },
    ],
    users: [
      // WO-O4O-NETURE-ADMIN-MEMBER-HARD-DELETE-V1: admin 전용 완전삭제 관리
      { label: '회원 완전삭제', path: '/admin/members' },
      { label: '운영자 관리', path: '/admin/operators' },
      { label: '문의 메시지', path: '/admin/contact-messages' },
    ],
    approvals: [
      // admin 전용 승인 화면 (공급사 정식 승인 / 서비스 승인 등 — operator 의 "가입 승인" 과 별도 트랙)
      { label: '공급자 승인', path: '/admin/admin-suppliers' },
      { label: '서비스 승인', path: '/admin/service-approvals' },
    ],
    products: [
      { label: '카테고리 관리', path: '/admin/categories' },
      { label: '브랜드 관리', path: '/admin/brands' },
      { label: '상품 데이터 정리', path: '/admin/product-cleanup' },
      { label: '마스터 관리', path: '/admin/masters' },
      { label: '카탈로그 일괄등록', path: '/admin/catalog-import' },
      { label: '카테고리 매핑', path: '/admin/category-mapping-rules' },
    ],
    orders: [
      { label: '파트너 현황', path: '/admin/partners' },
      { label: '정산 관리', path: '/admin/settlements' },
      { label: '파트너 정산', path: '/admin/partner-settlements' },
      { label: '커미션 관리', path: '/admin/commissions' },
    ],
    content: [
      { label: '커뮤니티 광고', path: '/admin/community-admin' },
    ],
    analytics: [
      { label: 'AI 관리', path: '/admin/ai-admin' },
      { label: 'AI 카드 규칙', path: '/admin/ai-card-rules' },
      { label: 'AI 비즈팩', path: '/admin/ai-business-pack' },
    ],
    system: [
      { label: '역할 관리', path: '/admin/roles' },
      { label: '이메일 설정', path: '/admin/settings/email' },
      // admin 계정이 operator 영역으로 진입하는 단일 게이트 (관리자 sidebar 에는 operator 업무를 직접 두지 않는다)
      { label: '운영자 업무 →', path: '/operator' },
    ],
  };
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
    { label: '유통 참여형 펀딩', path: '/operator/market-trial' },
  ],
  // WO-NETURE-OPERATOR-PRODUCTS-UNIFIED-LIST-FINAL-V1: Products 영역 단일 통합
  products: [
    { label: '상품 관리', path: '/operator/all-registered-products' },
    // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1
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
