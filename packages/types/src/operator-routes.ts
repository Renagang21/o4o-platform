/**
 * OPERATOR_ROUTES — Universal Operator Route Constants
 *
 * WO-O4O-OPERATOR-ROUTE-REFINEMENT-V1
 *
 * 5개 서비스에서 공통으로 사용하는 Operator 경로 상수.
 * Domain-specific 경로는 포함하지 않음 — 서비스별 config에서 직접 정의.
 */

export const OPERATOR_ROUTES = {
  /** Dashboard (index) */
  DASHBOARD: '/operator',
  /** 회원 관리 */
  USERS: '/operator/users',
  /** 신청/승인 관리 */
  APPLICATIONS: '/operator/applications',
  /** 상품 관리 */
  PRODUCTS: '/operator/products',
  /** 매장 관리 */
  STORES: '/operator/stores',
  /** 주문 관리 */
  ORDERS: '/operator/orders',
  /** 커뮤니티/포럼 관리 */
  COMMUNITY: '/operator/community',
  /** AI 리포트 */
  AI_REPORT: '/operator/ai-report',
  /** 역할 관리 */
  ROLES: '/operator/roles',
  /** Signage base */
  SIGNAGE: '/operator/signage',
} as const;

export type OperatorRouteKey = keyof typeof OPERATOR_ROUTES;
