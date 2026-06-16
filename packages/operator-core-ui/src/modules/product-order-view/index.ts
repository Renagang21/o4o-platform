/**
 * @o4o/operator-core-ui — Product/Order View module
 *
 * WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1
 *
 * Operator 서비스 전역 view-only "상품 현황 / 주문 현황" 공통 화면.
 */

export { OperatorProductStatusPage } from './OperatorProductStatusPage';
export { OperatorOrderStatusPage } from './OperatorOrderStatusPage';
export type {
  OperatorViewAccent,
  ProductStatusRow,
  ProductStatusStats,
  ProductStatusPagination,
  ProductStatusFetchParams,
  ProductStatusListResult,
  ProductStatusFetcher,
  OperatorProductStatusConfig,
  OperatorProductStatusPageProps,
  OrderStatusRow,
  OrderStatusStats,
  OrderStatusFetchParams,
  OrderStatusListResult,
  OrderStatusFetcher,
  OperatorOrderStatusConfig,
  OperatorOrderStatusPageProps,
} from './types';
