/**
 * Settlement Types
 * Phase 4-1: Partner/Supplier/Seller 정산 타입 정의
 */

/**
 * 정산 역할 타입 (향후 확장용)
 */
export type SettlementRole = 'partner' | 'seller' | 'supplier';

/**
 * 정산 상태 (PD-5 Settlement 기준)
 * Phase SETTLE-UI: Aligned with backend SettlementStatus enum
 */
export type SettlementStatus =
  | 'pending'     // 정산 생성, 미지급
  | 'processing'  // 지급 진행 중
  | 'paid'        // 지급 완료
  | 'cancelled';  // 취소/무효

// Legacy status values for backward compatibility
export type LegacySettlementStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PENDING_PAYOUT'
  | 'PAID'
  | 'CANCELLED';

/**
 * 공통 Settlement 요약 (PD-5 Settlement 엔티티 기반)
 * Phase SETTLE-UI: Updated to match backend Settlement entity with camelCase
 */
export interface SettlementSummary {
  id: string;

  // Party information (PD-5 uses partyType/partyId)
  partyType: 'seller' | 'supplier' | 'platform';
  partyId: string;

  // 정산 기간
  periodStart: string;  // ISO timestamp
  periodEnd: string;    // ISO timestamp

  status: SettlementStatus;

  // 금액 (PD-5 Settlement fields - all string for precision)
  totalSaleAmount: string;       // 총 매출
  totalBaseAmount: string;       // 총 공급가
  totalCommissionAmount: string; // 총 커미션
  totalMarginAmount: string;     // 총 마진
  payableAmount: string;         // 실제 지급될 금액

  // 타임스탬프
  createdAt: string;
  updatedAt: string;
  paidAt?: string;

  // 메모
  notes?: string;

  // Metadata
  metadata?: Record<string, any>;

  // Legacy fields for backward compatibility
  role?: SettlementRole;
  partner_id?: string;
  seller_id?: string;
  supplier_id?: string;
  period_start?: string;
  period_end?: string;
  currency?: string;
  gross_commission_amount?: number;
  adjustment_amount?: number;
  net_payout_amount?: number;
  created_at?: string;
  updated_at?: string;
  paid_at?: string;
  memo_internal?: string;
}

/**
 * Partner Settlement 관련 타입
 */

// 정산에 포함된 링크별 요약
export interface PartnerSettlementLineItem {
  link_id: string;
  link_name: string;
  landing_url: string;
  tracking_code?: string;

  clicks: number;
  conversions: number;
  revenue: number;
  commission_rate: number;    // 예: 0.05 (5%)
  commission_amount: number;
}

// Partner Settlement 상세
export interface PartnerSettlementDetail extends SettlementSummary {
  role: 'partner';
  partner_id: string;

  lines: PartnerSettlementLineItem[];

  // 요약 지표
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
}

/**
 * API 요청/응답 타입
 */

// 정산 목록 조회 쿼리
export interface GetPartnerSettlementsQuery {
  page?: number;                         // 기본 1
  limit?: number;                        // 기본 20
  status?: SettlementStatus | 'ALL';    // 상태 필터
  date_from?: string;                    // 정산 기간 시작일 기준 (YYYY-MM-DD)
  date_to?: string;                      // 정산 기간 종료일 기준 (YYYY-MM-DD)
}

// 정산 목록 조회 응답
export interface GetPartnerSettlementsResponse {
  success: boolean;
  data: {
    settlements: SettlementSummary[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

// 정산 상세 조회 응답
export interface GetPartnerSettlementDetailResponse {
  success: boolean;
  data: PartnerSettlementDetail;
}

// 정산 생성 요청
export interface CreatePartnerSettlementRequest {
  period_start: string;                  // YYYY-MM-DD
  period_end: string;                    // YYYY-MM-DD
  auto_calculate_from_analytics?: boolean;  // 기본 true
  memo_internal?: string;
}

// 정산 생성 응답
export interface CreatePartnerSettlementResponse {
  success: boolean;
  data: PartnerSettlementDetail;
  message?: string;
}

// 정산 상태 변경 요청
export interface UpdatePartnerSettlementStatusRequest {
  status: SettlementStatus;
  memo_internal?: string;
}

// 정산 상태 변경 응답
export interface UpdatePartnerSettlementStatusResponse {
  success: boolean;
  data: PartnerSettlementDetail;
  message?: string;
}

// 정산 메모 업데이트 요청
export interface UpdatePartnerSettlementMemoRequest {
  memo_internal: string;
}

// 정산 메모 업데이트 응답
export interface UpdatePartnerSettlementMemoResponse {
  success: boolean;
  data: PartnerSettlementDetail;
  message?: string;
}

/**
 * Supplier Settlement 관련 타입
 */

// 공급자 정산 라인 아이템
export interface SupplierSettlementLineItem {
  order_id: string;
  order_number: string;
  order_date: string;         // YYYY-MM-DD

  seller_id: string;
  seller_name: string;

  product_id: string;
  product_name: string;
  sku?: string;

  quantity: number;
  supply_price: number;       // 공급가(단가)
  line_total: number;         // 공급가 × 수량

  // 선택 필드
  shipping_fee?: number;      // 공급자가 부담하는 배송비
}

// 공급자 정산 상세
export interface SupplierSettlementDetail extends SettlementSummary {
  role: 'supplier';
  supplier_id: string;

  lines: SupplierSettlementLineItem[];

  // 요약 지표
  total_supply_amount: number;  // Σ line_total
  total_orders: number;         // 포함된 주문 수
  total_items: number;          // 포함된 전체 수량
}

// 공급자 정산 목록 조회 쿼리
export interface GetSupplierSettlementsQuery {
  page?: number;
  limit?: number;
  status?: SettlementStatus | 'ALL';
  date_from?: string;
  date_to?: string;
}

// 공급자 정산 목록 조회 응답
export interface GetSupplierSettlementsResponse {
  success: boolean;
  data: {
    settlements: SettlementSummary[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

// 공급자 정산 상세 조회 응답
export interface GetSupplierSettlementDetailResponse {
  success: boolean;
  data: SupplierSettlementDetail;
}

// 공급자 정산 생성 요청
export type CreateSupplierSettlementRequest = CreatePartnerSettlementRequest;

// 공급자 정산 생성 응답
export interface CreateSupplierSettlementResponse {
  success: boolean;
  data: SupplierSettlementDetail;
  message?: string;
}

// 공급자 정산 상태 변경 요청
export type UpdateSupplierSettlementStatusRequest = UpdatePartnerSettlementStatusRequest;

// 공급자 정산 상태 변경 응답
export interface UpdateSupplierSettlementStatusResponse {
  success: boolean;
  data: SupplierSettlementDetail;
  message?: string;
}

// 공급자 정산 메모 업데이트 요청
export type UpdateSupplierSettlementMemoRequest = UpdatePartnerSettlementMemoRequest;

// 공급자 정산 메모 업데이트 응답
export interface UpdateSupplierSettlementMemoResponse {
  success: boolean;
  data: SupplierSettlementDetail;
  message?: string;
}

/**
 * Seller Settlement 관련 타입
 * Phase SETTLE-UI: Updated to match PD-5 Settlement + SETTLE-1 Commission Integration
 */

// 판매자 정산 아이템 (SettlementItem 기반 - camelCase)
export interface SellerSettlementItem {
  id: string;
  settlementId: string;

  // Order information
  orderId: string;
  orderItemId: string;
  productName: string;
  quantity: number;

  // Price snapshots (per unit)
  salePriceSnapshot: string;    // 판매가 (per unit)
  basePriceSnapshot?: string;   // 공급가 (per unit)
  commissionAmountSnapshot?: string; // 커미션 total
  marginAmountSnapshot?: string;     // 마진 total

  // Phase SETTLE-1: Commission Policy Integration (PD-2)
  commissionType?: 'rate' | 'fixed';  // Commission calculation method
  commissionRate?: string;            // Commission rate (0-1, e.g., "0.20" = 20%)

  // Calculated totals
  totalSaleAmount: string;      // salePriceSnapshot × quantity
  totalBaseAmount?: string;     // basePriceSnapshot × quantity

  // Party IDs
  sellerId?: string;
  supplierId?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

// 판매자 정산 상세 (PD-5 Settlement 기반)
export interface SellerSettlementDetail extends SettlementSummary {
  // Settlement items (Phase SETTLE-1 structure)
  items?: SellerSettlementItem[];

  // Legacy compatibility (for old Phase 4-1 structure)
  role?: 'seller';
  seller_id?: string;
  lines?: SellerSettlementLineItem[];
  total_revenue?: number;
  total_cost?: number;
  total_margin_amount?: number;
  average_margin_rate?: number;
  total_orders?: number;
  total_items?: number;
}

// Legacy type for backward compatibility
export interface SellerSettlementLineItem {
  order_id: string;
  order_number: string;
  order_date: string;

  customer_name: string;
  customer_email?: string;

  product_id: string;
  product_name: string;
  sku?: string;

  quantity: number;

  sale_price: number;
  supply_price?: number;
  line_revenue: number;
  line_cost?: number;
  line_margin_amount?: number;
  line_margin_rate?: number;
}

// 판매자 정산 목록 조회 쿼리
export interface GetSellerSettlementsQuery {
  page?: number;
  limit?: number;
  status?: SettlementStatus | 'ALL';
  date_from?: string;
  date_to?: string;
}

// 판매자 정산 목록 조회 응답
export interface GetSellerSettlementsResponse {
  success: boolean;
  data: {
    settlements: SettlementSummary[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

// 판매자 정산 상세 조회 응답
export interface GetSellerSettlementDetailResponse {
  success: boolean;
  data: SellerSettlementDetail;
}

// 판매자 정산 생성 요청
export type CreateSellerSettlementRequest = CreatePartnerSettlementRequest;

// 판매자 정산 생성 응답
export interface CreateSellerSettlementResponse {
  success: boolean;
  data: SellerSettlementDetail;
  message?: string;
}

// 판매자 정산 상태 변경 요청
export type UpdateSellerSettlementStatusRequest = UpdatePartnerSettlementStatusRequest;

// 판매자 정산 상태 변경 응답
export interface UpdateSellerSettlementStatusResponse {
  success: boolean;
  data: SellerSettlementDetail;
  message?: string;
}

// 판매자 정산 메모 업데이트 요청
export type UpdateSellerSettlementMemoRequest = UpdatePartnerSettlementMemoRequest;

// 판매자 정산 메모 업데이트 응답
export interface UpdateSellerSettlementMemoResponse {
  success: boolean;
  data: SellerSettlementDetail;
  message?: string;
}

/**
 * Admin Settlement 관련 타입
 * Phase 4-2: Admin Settlement Management
 */

// 지급 방법
export type PayoutMethod = 'BANK_TRANSFER' | 'POINT' | 'OTHER';

// Admin 전용 정산 뷰 (통합)
export interface AdminSettlementView {
  id: string;
  role: SettlementRole;

  // 역할별 대상 정보
  target_id: string;        // partner_id | supplier_id | seller_id
  target_name: string;      // 표시명

  // 정산 기간
  period_start: string;
  period_end: string;

  status: SettlementStatus;

  // 금액
  currency: string;
  gross_commission_amount: number;
  adjustment_amount: number;
  net_payout_amount: number;

  // 타임스탬프
  created_at: string;
  updated_at: string;

  // 메모
  memo_internal?: string;

  // Admin 전용 필드
  payout_date?: string;           // 실제 지급일 (YYYY-MM-DD)
  payout_method?: PayoutMethod;   // 지급 수단
  payout_note?: string;           // 지급 관련 메모
}

// Admin용 정산 상세 (역할별 세부 정보 포함)
export type AdminSettlementDetail =
  | (PartnerSettlementDetail & { payout_date?: string; payout_method?: PayoutMethod; payout_note?: string })
  | (SupplierSettlementDetail & { payout_date?: string; payout_method?: PayoutMethod; payout_note?: string })
  | (SellerSettlementDetail & { payout_date?: string; payout_method?: PayoutMethod; payout_note?: string });

// Admin 정산 목록 조회 쿼리
export interface GetAdminSettlementsQuery {
  page?: number;
  limit?: number;
  role?: SettlementRole | 'ALL';      // 역할 필터
  status?: SettlementStatus | 'ALL';  // 상태 필터
  date_from?: string;
  date_to?: string;
}

// Admin 정산 목록 조회 응답
export interface GetAdminSettlementsResponse {
  success: boolean;
  data: {
    settlements: AdminSettlementView[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

// Admin 정산 상세 조회 응답
export interface GetAdminSettlementDetailResponse {
  success: boolean;
  data: AdminSettlementDetail;
}

// Admin 정산 생성 요청
export interface CreateAdminSettlementRequest {
  role: SettlementRole;
  period_start: string;
  period_end: string;
  auto_calculate_from_analytics?: boolean;
  memo_internal?: string;
}

// Admin 정산 생성 응답
export interface CreateAdminSettlementResponse {
  success: boolean;
  data: AdminSettlementDetail;
  message?: string;
}

// Admin 정산 상태 변경 요청
export interface UpdateAdminSettlementStatusRequest {
  status: SettlementStatus;
  memo_internal?: string;
}

// Admin 정산 상태 변경 응답
export interface UpdateAdminSettlementStatusResponse {
  success: boolean;
  data: AdminSettlementDetail;
  message?: string;
}

// Admin 정산 지급 정보 업데이트 요청
export interface UpdateAdminSettlementPayoutRequest {
  payout_date?: string;
  payout_method?: PayoutMethod;
  payout_note?: string;
}

// Admin 정산 지급 정보 업데이트 응답
export interface UpdateAdminSettlementPayoutResponse {
  success: boolean;
  data: AdminSettlementDetail;
  message?: string;
}

// Admin 정산 메모 업데이트 요청
export interface UpdateAdminSettlementMemoRequest {
  memo_internal: string;
}

// Admin 정산 메모 업데이트 응답
export interface UpdateAdminSettlementMemoResponse {
  success: boolean;
  data: AdminSettlementDetail;
  message?: string;
}
