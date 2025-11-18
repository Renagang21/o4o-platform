/**
 * Admin Settlement Types
 * Phase SETTLE-ADMIN: Admin 정산 관리 대시보드 타입 정의
 * Based on main-site settlement types + PD-5 Settlement entity
 */

/**
 * 정산 역할 타입
 */
export type SettlementPartyType = 'seller' | 'supplier' | 'platform';

/**
 * 정산 상태 (PD-5 + legacy 호환)
 */
export type SettlementStatus =
  | 'pending'         // PD-5: 정산 생성, 미지급
  | 'processing'      // PD-5: 지급 진행 중
  | 'paid'            // PD-5: 지급 완료
  | 'cancelled'       // PD-5: 취소/무효
  | 'OPEN'            // Legacy
  | 'PENDING_PAYOUT'  // Legacy
  | 'PAID'            // Legacy
  | 'CANCELLED'       // Legacy
  | 'DRAFT';          // Legacy

/**
 * Admin Settlement View (목록용)
 */
export interface AdminSettlementView {
  id: string;
  partyType: SettlementPartyType;
  partyId: string;
  partyName?: string;  // 셀러명/공급사명 (optional, API에서 조인 필요)

  // 정산 기간
  periodStart: string | Date;
  periodEnd: string | Date;

  status: SettlementStatus;

  // 금액 (PD-5 + legacy 호환)
  currency: string;
  totalSaleAmount?: number | string;
  totalBaseAmount?: number | string;
  totalCommissionAmount?: number | string;
  totalMarginAmount?: number | string;
  payableAmount: number | string;

  // Legacy 필드
  gross_commission_amount?: number;
  adjustment_amount?: number;
  net_payout_amount?: number;

  // 타임스탬프
  createdAt?: string | Date;
  updatedAt?: string | Date;
  paidAt?: string | Date;
  created_at?: string;
  updated_at?: string;
  paid_at?: string;

  // 메모
  memoInternal?: string;
  memo_internal?: string;
}

/**
 * Settlement Item (정산 아이템)
 */
export interface SettlementItem {
  id?: string;
  settlementId: string;
  orderId: string;
  orderItemId?: string;
  orderNumber?: string;
  orderDate?: string | Date;

  // 상품 정보
  productName: string;
  sku?: string;
  quantity: number;

  // 파티 정보
  sellerId?: string;
  sellerName?: string;
  supplierId?: string;
  supplierName?: string;

  // 금액 (PD-5: camelCase + 스냅샷)
  salePriceSnapshot?: number | string;
  basePriceSnapshot?: number | string;
  commissionAmountSnapshot?: number | string;
  marginAmountSnapshot?: number | string;
  totalSaleAmount?: number | string;
  totalBaseAmount?: number | string;

  // Legacy 필드
  sale_price?: number;
  supply_price?: number;
  commission_amount?: number;
  line_total?: number;
  line_revenue?: number;

  // 커미션 정책 스냅샷 (SETTLE-1)
  commissionType?: 'rate' | 'fixed';
  commissionRate?: number | string;
  commission_type?: 'rate' | 'fixed';
  commission_rate?: number;
}

/**
 * Admin Settlement Detail
 */
export interface AdminSettlementDetail extends AdminSettlementView {
  items?: SettlementItem[];  // PD-5
  lines?: any[];             // Legacy

  // 요약 지표 (PD-5)
  totalOrders?: number;
  totalItems?: number;

  // Legacy 필드
  total_orders?: number;
  total_items?: number;
  total_supply_amount?: number;
  total_revenue?: number;
  total_cost?: number;
  total_margin_amount?: number;
  average_margin_rate?: number;
}

/**
 * Admin Settlement List Query
 */
export interface GetAdminSettlementsQuery {
  page?: number;
  limit?: number;
  partyType?: SettlementPartyType | 'ALL';
  status?: SettlementStatus | 'ALL';
  dateFrom?: string;  // YYYY-MM-DD
  dateTo?: string;    // YYYY-MM-DD
  searchQuery?: string;  // partyName 또는 partyId 검색
}

/**
 * Admin Settlement List Response
 */
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

/**
 * Admin Settlement Detail Response
 */
export interface GetAdminSettlementDetailResponse {
  success: boolean;
  data: AdminSettlementDetail;
}

/**
 * Settlement Summary Stats (Admin 대시보드용)
 */
export interface SettlementSummaryStats {
  totalCount: number;
  totalPayableAmount: number;
  pendingAmount: number;
  processingAmount: number;
  paidAmount: number;

  // PartyType별 분해 (선택)
  byPartyType?: {
    seller: {
      count: number;
      amount: number;
    };
    supplier: {
      count: number;
      amount: number;
    };
    platform: {
      count: number;
      amount: number;
    };
  };
}
