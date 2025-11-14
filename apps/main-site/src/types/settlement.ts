/**
 * Settlement Types
 * Phase 4-1: Partner/Supplier/Seller 정산 타입 정의
 */

/**
 * 정산 역할 타입 (향후 확장용)
 */
export type SettlementRole = 'partner' | 'seller' | 'supplier';

/**
 * 정산 상태
 */
export type SettlementStatus =
  | 'DRAFT'           // 임시 계산 상태 (선택사항)
  | 'OPEN'            // 정산 생성, 미지급
  | 'PENDING_PAYOUT'  // 지급 진행 중
  | 'PAID'            // 지급 완료
  | 'CANCELLED';      // 취소/무효

/**
 * 공통 Settlement 요약
 */
export interface SettlementSummary {
  id: string;
  role: SettlementRole;

  // 역할별 ID (해당 역할일 때만 사용)
  partner_id?: string;
  seller_id?: string;
  supplier_id?: string;

  // 정산 기간
  period_start: string;  // YYYY-MM-DD
  period_end: string;    // YYYY-MM-DD

  status: SettlementStatus;

  // 금액
  currency: string;                    // "KRW"
  gross_commission_amount: number;     // 정산 대상 커미션 총액 (세전)
  adjustment_amount: number;           // 조정(±), 수수료/보정 등
  net_payout_amount: number;           // 실제 지급될 금액

  // 타임스탬프
  created_at: string;
  updated_at: string;

  // 메모
  memo_internal?: string;  // 내부 메모 (회계/운영)
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
