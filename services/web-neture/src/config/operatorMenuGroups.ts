/**
 * Neture Unified Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-UNIFICATION-V1
 * admin + operator 통합 메뉴. adminOnly 항목은 admin 역할만 표시.
 *
 * 표준 11-그룹 키에 대한 라우트 매핑.
 */

import type { OperatorGroupKey, OperatorMenuItem, UnifiedMenuItem } from '@o4o/ui';
import type { OperatorDomainIAConfig } from '@o4o/operator-ux-core';

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
    // WO-O4O-NETURE-MEMBER-MANAGEMENT-BULK-AND-ROUTE-ALIGNMENT-V1:
    // 회원 관리 표준 경로를 /operator/members 로 통일. /operator/users 는 legacy alias 로 잔존.
    { label: '회원 관리', path: '/operator/members' },
    // WO-O4O-NETURE-OPERATOR-SUPPLIER-APPROVAL-STANDARD-LIST-AND-MEMBER-IA-V1:
    // 공급자 승인은 회원 가입(1단계) 이후의 공급자 활성화(2단계) 업무 → 회원 영역에 배치.
    // route(/operator/suppliers) 유지. Neture 는 USER_MANAGEMENT/MEMBERSHIP_APPROVAL 모두 활성이라
    // 그룹 이동으로 인한 권한 회귀 없음. (라벨: '공급자 활성화' → '공급자 승인')
    { label: '공급자 승인', path: '/operator/suppliers' },
    // WO-O4O-NETURE-OPERATOR-SIDEBAR-DEAD-LINKS-CLEANUP-V1: adminOnly 항목은 /operator/* 라우트가
    // 없으므로 실제 존재하는 /admin/* 로 정정 (회원 완전삭제 와 동일 패턴). 권한자에게만 노출.
    // WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1: 플랫폼 관리 성격 표면화(라벨).
    // WO-O4O-NETURE-ADMIN-OPERATORS-GUIDE-REPLACE-V1: 이 경로는 더 이상 관리 화면이 아니라
    //   중앙 관리자 `/operators` 안내 화면이다. 진입 동선은 유지하고 라벨만 안내 성격으로 정정.
    { label: '운영자 관리 안내', path: '/admin/operators', adminOnly: true },
    // WO-O4O-NETURE-ADMIN-MEMBER-HARD-DELETE-V1: admin 전용 완전삭제 관리
    { label: '회원 완전삭제', path: '/admin/members', adminOnly: true },
    // WO-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-OPERATOR-SCOPE-V1: dead link 해소 + operator 노출
    { label: '문의 메시지', path: '/operator/contact-messages' },
  ],
  approvals: [
    { label: '가입 승인', path: '/operator/applications' },
    { label: '유통참여형 펀딩', path: '/operator/market-trial' },
    { label: '서비스 승인', path: '/admin/service-approvals', adminOnly: true },
  ],
  // WO-NETURE-OPERATOR-PRODUCTS-UNIFIED-LIST-FINAL-V1: Products 영역 단일 통합
  products: [
    { label: '상품 관리', path: '/operator/all-registered-products' },
    // WO-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1 (Phase 5): 모바일·공급자·import 후보 검토
    { label: '상품 후보 검토', path: '/operator/product-candidates' },
    // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: 큐레이션 메뉴 비노출 (운영자 통제 최소화)
    { label: '카테고리 관리', path: '/admin/categories', adminOnly: true },
    { label: '브랜드 관리', path: '/admin/brands', adminOnly: true },
    { label: '상품 데이터 정리', path: '/admin/product-cleanup', adminOnly: true },
    { label: '마스터 관리', path: '/admin/masters', adminOnly: true },
    { label: '카탈로그 일괄등록', path: '/admin/catalog-import', adminOnly: true },
    // category-mapping-rules 는 /operator 라우트가 실제 존재하므로 유지.
    { label: '카테고리 매핑', path: '/operator/category-mapping-rules', adminOnly: true },
  ],
  stores: [
    { label: '매장 관리', path: '/operator/stores' },
  ],
  orders: [
    { label: '주문 관리', path: '/operator/orders' },
    { label: '파트너 현황', path: '/admin/partners', adminOnly: true },
    { label: '정산 관리', path: '/admin/settlements', adminOnly: true },
    { label: '파트너 정산', path: '/admin/partner-settlements', adminOnly: true },
    { label: '커미션 관리', path: '/admin/commissions', adminOnly: true },
  ],
  content: [
    { label: '홈페이지 CMS', path: '/operator/homepage-cms' },
    { label: '안내 문구 관리', path: '/operator/guide-contents' },
    { label: '커뮤니티 광고', path: '/admin/community-admin', adminOnly: true },
  ],
  // WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1: signage 그룹 제거 (Neture signage 미대상)
  forum: [
    { label: '포럼 신청', path: '/operator/community' },
    // WO-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1:
    //   '삭제 요청' → '포럼 삭제' (삭제 요청 + 포럼 직접 삭제 2-탭). 완전 삭제는 admin 전용.
    { label: '포럼 삭제', path: '/operator/forum-delete' },
    { label: '삭제된 포럼', path: '/admin/forum-deleted', adminOnly: true },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: 'AI 카드 리포트', path: '/operator/ai-card-report' },
    { label: 'AI 운영', path: '/operator/ai-operations' },
    { label: 'Asset Quality', path: '/operator/ai/asset-quality' },
    { label: '운영 분석', path: '/operator/analytics' },
    // WO-O4O-NETURE-SUPPLIER-CSV-QUALITY-CONSOLE-RETIREMENT-V1: '공급자 품질'(/operator/supplier-quality) 은퇴 — CSV batch 품질 전용, 데이터 0
    { label: 'AI 관리', path: '/admin/ai-admin', adminOnly: true },
    { label: 'AI 카드 규칙', path: '/admin/ai-card-rules', adminOnly: true },
    { label: 'AI 비즈팩', path: '/admin/ai-business-pack', adminOnly: true },
  ],
  system: [
    // WO-O4O-NETURE-OPERATOR-PRODUCTION-DEFECT-CLOSURE-V1 (A안):
    // /operator/settings/notifications 는 플랫폼 관리자 전용 API 계약(operator-notification.routes.ts)
    // 이라 neture:operator 로는 403. route/guard 는 유지하고 운영자 메뉴에서만 제외한다.
    // WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1: 플랫폼 관리 성격 표면화(라벨).
    { label: '역할 관리 (플랫폼)', path: '/admin/roles', adminOnly: true },
    { label: '이메일 설정', path: '/admin/settings/email', adminOnly: true },
  ],
};

// WO-O4O-OPERATOR-MENU-ROLE-FILTER-COMMONIZATION-G3A-V1: filterMenuByRole / UnifiedMenuItem 은 @o4o/ui (operator-shell) 공통 구현 사용.
//   소비처(LayoutWrapper) 가 @o4o/ui 에서 직접 import 한다 — 위임 재수출을 두지 않는다.
//   서비스별 메뉴 정의(UNIFIED_MENU) 와 isAdmin 산출은 각 서비스에 유지.

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
      // WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1: 플랫폼 관리(운영자 지정) 성격 — 라벨 표면화.
      // WO-O4O-NETURE-ADMIN-OPERATORS-GUIDE-REPLACE-V1: 중앙 관리자 `/operators` 안내 화면.
      { label: '운영자 관리 안내', path: '/admin/operators' },
      { label: '문의 메시지', path: '/admin/contact-messages' },
    ],
    approvals: [
      // WO-O4O-NETURE-SUPPLIER-APPROVAL-CONSOLE-AND-ADMIN-GOVERNANCE-SEPARATION-V1 §5:
      //   승인/거절은 운영자 승인 콘솔(/operator/suppliers)로 이관. admin 은 상태 관리(비활성화/재활성화) governance 전용.
      { label: '공급자 상태 관리', path: '/admin/supplier-governance' },
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
      // WO-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1: 삭제된 포럼(복구/완전삭제/삭제이력)
      { label: '삭제된 포럼', path: '/admin/forum-deleted' },
    ],
    analytics: [
      { label: 'AI 관리', path: '/admin/ai-admin' },
      { label: 'AI 카드 규칙', path: '/admin/ai-card-rules' },
      { label: 'AI 비즈팩', path: '/admin/ai-business-pack' },
    ],
    system: [
      // ── Neture 서비스 관리 (Neture 자체 서비스 설정) ──
      { label: '이메일 설정', path: '/admin/settings/email' },
      // WO-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1
      { label: '법정정보·약관 설정', path: '/admin/settings/legal-terms' },
      // WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1: 문의 수신자·자동 회신 설정 (Admin 전용)
      { label: '문의 설정', path: '/admin/settings/contact' },
      // ── 플랫폼 관리 (여러 서비스/전체 권한에 영향 — WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1) ──
      // 라벨로 표면 분리. 정식 "플랫폼 관리" 그룹/별도 표면은 platform-admin surface 설계 후 분리.
      { label: '역할 관리 (플랫폼)', path: '/admin/roles' },
      // WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1: 약국 대상 서비스 정책 (cross-service)
      { label: '서비스 대상 정책 (플랫폼)', path: '/admin/settings/service-audience' },
      // admin 계정이 operator 영역으로 진입하는 단일 게이트 (관리자 sidebar 에는 operator 업무를 직접 두지 않는다)
      { label: '운영자 업무 →', path: '/operator' },
    ],
  };
}

// ─── Legacy export (제거됨) ───
// WO-O4O-NETURE-SUPPLIER-CSV-QUALITY-CONSOLE-RETIREMENT-V1:
//   deprecated `OPERATOR_MENU_ITEMS` (하위호환 배열) 는 web-neture 내 runtime consumer 0 (활성 메뉴 = UNIFIED_MENU
//   via OperatorLayoutWrapper, admin = getAdminMenu). DEAD 상수로 확정되어 은퇴 대상('공급자 품질' 잔존 포함) → 전체 제거.

// ─── Neture Operator Domain IA — WO-O4O-NETURE-OPERATOR-DOMAIN-IA-META-ADD-V1 ───
//
// IR-O4O-NETURE-OPERATOR-DOMAIN-IA-DESIGN-V1 에서 확정한 Neture(Supplier/B2B) 축 4-domain.
// KPA 계열(커뮤니티/매장 HUB/운영 공통)을 재사용하지 않고 Neture 전용 domain IA 를 정의한다.
// 본 메타는 향후 DomainIASidebar + OperatorAreaShell 이행 시 domainIAConfig 로 주입한다.
// 현 시점 Neture 는 아직 OperatorShell(flat) 사용 — 본 추가만으로 화면 노출은 변하지 않는다.

/** Neture operator sidebar 도메인 키 (Supplier/B2B 축). */
export type NetureOperatorDomainKey =
  | 'supply_distribution'
  | 'commerce_settlement'
  | 'community_content'
  | 'common';

/** 도메인 헤딩 라벨 + 시각 토큰 */
export const NETURE_DOMAIN_LABELS: Record<NetureOperatorDomainKey, { label: string; emoji: string }> = {
  supply_distribution: { label: '공급·유통 운영', emoji: '📦' },
  commerce_settlement: { label: '커머스·정산 운영', emoji: '💳' },
  community_content: { label: '커뮤니티·콘텐츠 운영', emoji: '💬' },
  common: { label: '운영 공통', emoji: '⚙️' },
};

/** STANDARD_GROUPS key → Neture 도메인 매핑.
 *  Neture 미사용 group(resources/lms)도 안전 default 지정 — 메뉴 항목이 없으므로 노출 결과에 영향 없음.
 */
export const NETURE_GROUP_TO_DOMAIN: Record<OperatorGroupKey, NetureOperatorDomainKey> = {
  dashboard: 'common', // top-pin 별도 처리 (NETURE_TOP_PINNED_GROUPS)
  approvals: 'supply_distribution',
  products: 'supply_distribution',
  orders: 'commerce_settlement',
  stores: 'commerce_settlement',
  users: 'community_content',
  forum: 'community_content',
  content: 'community_content',
  signage: 'community_content', // WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1: 미사용 — OperatorGroupKey 완전성 위한 안전 default
  resources: 'community_content', // 미사용 — 안전 default
  lms: 'community_content', // 미사용 — 안전 default
  analytics: 'common',
  system: 'common',
};

/** 도메인 별 그룹 표시 순서.
 *  - 공급·유통: 승인(가입/유통펀딩/공급자활성화) → 상품
 *  - 커머스·정산: 주문 → 매장
 *  - 커뮤니티·콘텐츠: 회원 → 포럼 → 콘텐츠
 *  - 운영 공통: 분석/AI → 시스템 (대시보드는 TOP_PINNED 별도)
 */
export const NETURE_DOMAIN_GROUP_ORDER: Record<NetureOperatorDomainKey, OperatorGroupKey[]> = {
  supply_distribution: ['approvals', 'products'],
  commerce_settlement: ['orders', 'stores'],
  // WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1: 'signage' 제거 (Neture signage 미대상)
  community_content: ['users', 'forum', 'content'],
  common: ['analytics', 'system'],
};

/** 도메인 표시 순서 (sidebar top → bottom) */
export const NETURE_DOMAIN_DISPLAY_ORDER: NetureOperatorDomainKey[] = [
  'supply_distribution',
  'commerce_settlement',
  'community_content',
  'common',
];

/** sidebar 최상단 고정 그룹 — 대시보드(+Action Queue)는 도메인 헤딩과 무관하게 최상단. */
export const NETURE_TOP_PINNED_GROUPS: OperatorGroupKey[] = ['dashboard'];

/** Neture 전용 domain IA config — DomainIASidebar/OperatorAreaShell 의 domainIAConfig 로 주입.
 *  @o4o/operator-ux-core 의 OperatorDomainIAConfig 와 타입 호환.
 */
export const NETURE_OPERATOR_DOMAIN_IA: OperatorDomainIAConfig = {
  labels: NETURE_DOMAIN_LABELS,
  groupToDomain: NETURE_GROUP_TO_DOMAIN,
  groupOrder: NETURE_DOMAIN_GROUP_ORDER,
  displayOrder: NETURE_DOMAIN_DISPLAY_ORDER,
  topPinnedGroups: NETURE_TOP_PINNED_GROUPS,
};
