import type { SupplierApprovalCounts } from './product.types';

/**
 * WO-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1
 *
 * 조회 실패를 []·0·null·빈 pagination 으로 삼키면 화면에서 "정상 0건" 과 구분되지 않는다.
 * 실패는 영역별 고정 코드로 throw 하고, 서버 원문은 console 로만 남긴다.
 * (선행: SUPPLIER_PRODUCTS_LOAD_FAILED / SUPPLIER_COMMISSION_LOAD_FAILED 와 동일 패턴)
 */
export const SUPPLIER_ORDERS_LOAD_FAILED = 'SUPPLIER_ORDERS_LOAD_FAILED';

export const SUPPLIER_INVENTORY_LOAD_FAILED = 'SUPPLIER_INVENTORY_LOAD_FAILED';

export const SUPPLIER_SETTLEMENTS_LOAD_FAILED = 'SUPPLIER_SETTLEMENTS_LOAD_FAILED';

/** WO-O4O-NETURE-SUPPLIER-APPROVAL-COUNTS-LOAD-ERROR-CONTRACT-V1 */
export const SUPPLIER_APPROVAL_COUNTS_LOAD_FAILED = 'SUPPLIER_APPROVAL_COUNTS_LOAD_FAILED';

/** WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1 */
export const SUPPLIER_RECRUITMENTS_LOAD_FAILED = 'SUPPLIER_RECRUITMENTS_LOAD_FAILED';

/** WO-O4O-NETURE-SUPPLIER-PROFILE-AUX-LOAD-ERROR-CONTRACT-V1 */
export const SUPPLIER_ONBOARDING_LOAD_FAILED = 'SUPPLIER_ONBOARDING_LOAD_FAILED';

export const SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED =
  'SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED';

/** WO-O4O-NETURE-SUPPLIER-LIBRARY-LOAD-ERROR-CONTRACT-V1 */
export const SUPPLIER_LIBRARY_ITEMS_LOAD_FAILED = 'SUPPLIER_LIBRARY_ITEMS_LOAD_FAILED';

/** WO-O4O-NETURE-SUPPLIER-LIBRARY-EDIT-ITEM-LOOKUP-PAGINATION-V1 */
export const SUPPLIER_LIBRARY_ITEM_LOAD_FAILED = 'SUPPLIER_LIBRARY_ITEM_LOAD_FAILED';

export const SUPPLIER_LIBRARY_ITEM_NOT_FOUND = 'SUPPLIER_LIBRARY_ITEM_NOT_FOUND';

/** WO-O4O-NETURE-SUPPLIER-SPOT-POLICY-LOAD-ERROR-CONTRACT-V1 */
export const SUPPLIER_SPOT_POLICIES_LOAD_FAILED = 'SUPPLIER_SPOT_POLICIES_LOAD_FAILED';

export const SUPPLIER_SPOT_POLICIES_FORBIDDEN = 'SUPPLIER_SPOT_POLICIES_FORBIDDEN';

/** WO-O4O-NETURE-SUPPLIER-SHIPMENT-LOAD-ERROR-CONTRACT-V1 */
export const SUPPLIER_SHIPMENT_LOAD_FAILED = 'SUPPLIER_SHIPMENT_LOAD_FAILED';

export const SUPPLIER_SHIPMENT_ORDER_NOT_FOUND = 'SUPPLIER_SHIPMENT_ORDER_NOT_FOUND';

/** WO-O4O-NETURE-SUPPLIER-ORDER-CONDITION-LOAD-ERROR-CONTRACT-V1 */
export const SUPPLIER_ORDER_CONDITION_LOAD_FAILED = 'SUPPLIER_ORDER_CONDITION_LOAD_FAILED';

export const SUPPLIER_ORDER_CONDITION_NOT_FOUND = 'SUPPLIER_ORDER_CONDITION_NOT_FOUND';

/** WO-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1 (묶음 4) */
export const SUPPLIER_PROFILE_LOAD_FAILED = 'SUPPLIER_PROFILE_LOAD_FAILED';

export const SUPPLIER_PROFILE_COMPLETENESS_LOAD_FAILED =
  'SUPPLIER_PROFILE_COMPLETENESS_LOAD_FAILED';

export const SUPPLIER_RECRUITMENT_NOT_FOUND = 'SUPPLIER_RECRUITMENT_NOT_FOUND';

export const SUPPLIER_RECRUITMENT_APPLICATIONS_LOAD_FAILED =
  'SUPPLIER_RECRUITMENT_APPLICATIONS_LOAD_FAILED';

// ==================== Supplier API ====================

/**
 * 상품 목록 조회 실패 sentinel.
 * WO-O4O-NETURE-SUPPLIER-PRODUCTS-LOAD-ERROR-CONTRACT-V1:
 * 조회 실패를 빈 배열·빈 pagination 으로 변환하면 화면에서 "정상 0건" 과 구분되지 않으므로 throw 한다.
 * 서버 원문 대신 고정 코드만 전파하고, 원인은 console 로만 남긴다.
 */
export const SUPPLIER_PRODUCTS_LOAD_FAILED = 'SUPPLIER_PRODUCTS_LOAD_FAILED';

// WO-NETURE-SUPPLIER-PRODUCT-SAVE-ERROR-RESOLUTION-V1: 실제 에러 메시지 추출
export function extractApiError(error: any): string {
  const data = error?.response?.data;
  if (data) {
    // { success: false, error: "CODE" }
    if (typeof data.error === 'string') return data.error;
    // { success: false, error: { code, message } }
    if (typeof data.error === 'object' && data.error !== null) {
      return data.error.message || data.error.code || 'UNKNOWN_ERROR';
    }
    if (typeof data.message === 'string') return data.message;
  }
  if (error?.code === 'ECONNABORTED') return 'REQUEST_TIMEOUT';
  if (error?.response?.status) return `HTTP_${error.response.status}`;
  console.error('[Supplier API] Network error:', error?.message || error);
  return 'NETWORK_ERROR';
}

/** 정상 0 은 유효값이다. 필수 카운트가 모두 숫자일 때만 성공으로 인정한다. */
export function isValidApprovalCounts(value: unknown): value is SupplierApprovalCounts {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.total === 'number' &&
    typeof v.unrequested === 'number' &&
    typeof v.pending === 'number' &&
    typeof v.approved === 'number' &&
    typeof v.rejected === 'number'
  );
}

/**
 * 상세 조회용 — backend 가 미존재를 404 로 명시 반환한다.
 *   주문   ORDER_NOT_FOUND (supplier-order.controller)
 *   재고   NOT_FOUND       (inventory.controller)
 *   정산   NOT_FOUND       (supplier-settlement.controller)
 * 404 만 null(미존재)로 유지하고 그 외 오류는 throw 해서 "없음" 과 "실패" 를 분리한다.
 */
export function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404;
}
