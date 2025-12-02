/**
 * Seller Order Types
 * Phase 3-7: 판매자 주문 관리 타입 정의
 */

/**
 * 주문 상태 (판매자 관점)
 */
export type SellerOrderStatus =
  | 'NEW'         // 신규 주문 (확인 전)
  | 'CONFIRMED'   // 판매자가 주문 확인/수락
  | 'IN_PROGRESS' // 처리 중 (예: 공급자에 전달, 준비 중)
  | 'SHIPPED'     // 발송 완료
  | 'COMPLETED'   // 거래 완료
  | 'CANCELLED';  // 취소됨 (판매자/고객/시스템 등 사유)

/**
 * 주문 목록 아이템 (테이블 표시용)
 */
export interface SellerOrderListItem {
  id: string;
  order_number: string;
  created_at: string;
  status: SellerOrderStatus;

  buyer_name: string;        // 고객 이름
  buyer_email?: string;
  buyer_phone?: string;

  total_amount: number;      // 주문 총금액 (판매자 기준)
  currency: string;          // 기본 "KRW"

  channel?: string;          // 주문 채널 (예: "스토어", "Naver", "쿠팡" 등)
  item_summary: string;      // "상품명 외 N개" 형식 요약
}

/**
 * 주문 아이템 (주문 내 개별 상품)
 */
export interface SellerOrderItem {
  id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  supplier_name?: string;      // 어떤 공급자의 상품인지 (선택)
  seller_product_id?: string;
  supplier_product_id?: string;
}

/**
 * 주문 상세 정보
 */
export interface SellerOrderDetail {
  id: string;
  order_number: string;
  created_at: string;
  status: SellerOrderStatus;

  channel?: string;
  memo_from_buyer?: string;
  memo_internal?: string;      // 판매자 내부 메모

  buyer: {
    name: string;
    phone?: string;
    email?: string;
  };

  shipping_address: {
    receiver_name: string;
    postal_code?: string;
    address1: string;
    address2?: string;
    phone?: string;
  };

  items: SellerOrderItem[];

  totals: {
    subtotal: number;
    shipping_fee: number;
    discount?: number;
    total: number;
    currency: string;
  };

  shipping_info?: {
    courier?: string;       // 택배사
    tracking_number?: string;
    shipped_at?: string;
  };
}

/**
 * 주문 목록 조회 쿼리 파라미터
 */
export interface GetSellerOrdersQuery {
  page?: number;            // 기본: 1
  limit?: number;           // 기본: 20
  search?: string;          // 주문번호, 고객명, 상품명 검색
  status?: SellerOrderStatus | 'ALL';
  date_from?: string;       // YYYY-MM-DD
  date_to?: string;         // YYYY-MM-DD
  sort_by?: 'created_at' | 'total_amount';
  sort_order?: 'asc' | 'desc'; // 기본: desc
}

/**
 * 주문 목록 조회 응답
 */
export interface GetSellerOrdersResponse {
  success: boolean;
  data: {
    orders: SellerOrderListItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

/**
 * 주문 상세 조회 응답
 */
export interface GetSellerOrderDetailResponse {
  success: boolean;
  data: SellerOrderDetail;
}

/**
 * 주문 상태 업데이트 요청
 */
export interface UpdateSellerOrderStatusRequest {
  status: SellerOrderStatus;
  shipping_info?: {
    courier?: string;
    tracking_number?: string;
  };
}

/**
 * 주문 상태 업데이트 응답
 */
export interface UpdateSellerOrderStatusResponse {
  success: boolean;
  data: SellerOrderDetail;
  message?: string;
}

/**
 * 내부 메모 업데이트 요청
 */
export interface UpdateSellerOrderMemoRequest {
  memo_internal: string;
}

/**
 * 내부 메모 업데이트 응답
 */
export interface UpdateSellerOrderMemoResponse {
  success: boolean;
  data: SellerOrderDetail;
  message?: string;
}
