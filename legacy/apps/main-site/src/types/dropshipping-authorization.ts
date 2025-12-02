/**
 * Dropshipping Authorization Types
 * Phase 3-6: Supplier-Seller Product Authorization
 * 공급자 승인 기반 드랍쉬핑 권한 관리
 */

/**
 * Authorization Status
 * 승인 상태
 */
export type AuthorizationStatus =
  | 'none'        // 아직 신청 안 함
  | 'pending'     // 신청 했지만 승인 대기
  | 'approved'    // 승인됨
  | 'rejected'    // 거절됨
  | 'revoked';    // 승인 취소됨

/**
 * Product Authorization Summary
 * 제품 승인 요약 정보
 */
export interface ProductAuthorizationSummary {
  id: string;
  supplier_product_id: string;
  supplier_product_name?: string;
  seller_id: string;
  seller_name?: string;
  seller_email?: string;
  status: AuthorizationStatus;
  message?: string;           // 판매자 신청 메시지
  rejection_reason?: string;  // 거절 사유
  created_at: string;
  updated_at: string;
}

/**
 * Seller Product Authorization Status
 * 판매자가 보는 각 공급상품별 승인 상태
 */
export interface SellerProductAuthorizationStatus {
  supplier_product_id: string;
  status: AuthorizationStatus;
  rejection_reason?: string;
  authorization_id?: string;
}

/**
 * Create Authorization Request
 * 판매 신청 생성 요청
 */
export interface CreateAuthorizationRequest {
  supplier_product_id: string;
  message?: string;
}

/**
 * Create Authorization Response
 */
export interface CreateAuthorizationResponse {
  success: boolean;
  data: ProductAuthorizationSummary;
  message?: string;
}

/**
 * Get Authorizations Query
 */
export interface GetAuthorizationsQuery {
  status?: AuthorizationStatus;
  supplier_product_id?: string;
  seller_id?: string;
  page?: number;
  limit?: number;
}

/**
 * Get Authorizations Response
 */
export interface GetAuthorizationsResponse {
  success: boolean;
  data: {
    authorizations: ProductAuthorizationSummary[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

/**
 * Approve Authorization Response
 */
export interface ApproveAuthorizationResponse {
  success: boolean;
  data: ProductAuthorizationSummary;
  message?: string;
}

/**
 * Reject Authorization Request
 */
export interface RejectAuthorizationRequest {
  reason: string;
}

/**
 * Reject Authorization Response
 */
export interface RejectAuthorizationResponse {
  success: boolean;
  data: ProductAuthorizationSummary;
  message?: string;
}

/**
 * Revoke Authorization Response
 */
export interface RevokeAuthorizationResponse {
  success: boolean;
  data: ProductAuthorizationSummary;
  message?: string;
}
