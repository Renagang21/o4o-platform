/**
 * Storefront Types
 * Phase 5-1: Customer-facing Storefront
 */

/**
 * 고객용 상품 정보
 */
export interface StorefrontProduct {
  id: string;
  seller_id: string;
  seller_name: string;

  // 기본 정보
  name: string;
  description: string;
  category?: string;

  // 가격
  price: number;
  original_price?: number;  // 할인 전 가격
  currency: string;

  // 재고
  stock_quantity: number;
  is_available: boolean;

  // 이미지
  main_image?: string;
  images?: string[];

  // 배송
  shipping_fee?: number;
  estimated_delivery_days?: number;

  // 메타
  created_at: string;
  updated_at: string;
}

/**
 * 장바구니 아이템
 */
export interface CartItem {
  product_id: string;
  product_name: string;
  seller_id: string;
  seller_name: string;
  price: number;
  currency: string;
  quantity: number;
  main_image?: string;

  // 재고 체크용
  available_stock: number;
}

/**
 * 장바구니 상태
 */
export interface Cart {
  items: CartItem[];
  total_items: number;
  total_amount: number;
  currency: string;
}

/**
 * 고객 정보 (주문 시 입력)
 */
export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;

  // 배송 주소
  shipping_address: {
    postcode: string;
    address: string;
    address_detail?: string;
  };

  // 요청사항
  order_note?: string;
}

/**
 * 주문 아이템
 */
export interface OrderItem {
  product_id: string;
  product_name: string;
  seller_id: string;
  seller_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  main_image?: string;
}

/**
 * 주문 상태
 */
export type OrderStatus =
  | 'PENDING'         // 주문 대기
  | 'CONFIRMED'       // 주문 확정
  | 'PROCESSING'      // 처리 중
  | 'SHIPPED'         // 배송 중
  | 'DELIVERED'       // 배송 완료
  | 'CANCELLED';      // 취소됨

/**
 * 주문 정보
 */
export interface Order {
  id: string;
  order_number: string;

  // 고객 정보
  customer: CustomerInfo;

  // 주문 아이템
  items: OrderItem[];

  // 금액
  currency: string;
  subtotal: number;           // 상품 합계
  shipping_fee: number;       // 배송비
  total_amount: number;       // 총 합계

  // 상태
  status: OrderStatus;

  // 타임스탬프
  created_at: string;
  updated_at: string;

  // 메타
  payment_method?: string;    // 결제 수단 (mock)
  payment_status?: string;    // 결제 상태 (mock)
}

/**
 * API 요청/응답 타입
 */

// 상품 목록 조회 쿼리
export interface GetProductsQuery {
  page?: number;
  limit?: number;
  seller_id?: string;         // 판매자 필터
  category?: string;          // 카테고리 필터
  search?: string;            // 검색어
  min_price?: number;
  max_price?: number;
}

// 상품 목록 조회 응답
export interface GetProductsResponse {
  success: boolean;
  data: {
    products: StorefrontProduct[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

// 상품 상세 조회 응답
export interface GetProductDetailResponse {
  success: boolean;
  data: StorefrontProduct;
}

// 주문 생성 요청
export interface CreateOrderRequest {
  customer: CustomerInfo;
  items: {
    product_id: string;
    quantity: number;
  }[];
  payment_method?: string;
}

// 주문 생성 응답
export interface CreateOrderResponse {
  success: boolean;
  data: Order;
  message?: string;
}

// 주문 조회 응답
export interface GetOrderResponse {
  success: boolean;
  data: Order;
}
