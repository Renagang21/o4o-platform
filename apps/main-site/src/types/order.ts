// 주문 상태
export type OrderStatus = 
  | 'pending'        // 주문 대기
  | 'confirmed'      // 주문 확인
  | 'processing'     // 처리 중
  | 'shipped'        // 배송 시작
  | 'delivered'      // 배송 완료
  | 'cancelled'      // 주문 취소
  | 'returned';      // 반품

// 결제 상태
export type PaymentStatus = 
  | 'pending'        // 결제 대기
  | 'completed'      // 결제 완료
  | 'failed'         // 결제 실패
  | 'refunded';      // 환불 완료

// 결제 방법
export type PaymentMethod = 
  | 'card'           // 신용카드
  | 'transfer'       // 계좌이체
  | 'virtual_account'// 가상계좌
  | 'kakao_pay'      // 카카오페이
  | 'naver_pay';     // 네이버페이

// 주소 정보
export interface Address {
  recipientName: string;
  phone: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  deliveryRequest?: string;
}

// 주문 아이템
export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  productBrand?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplierId: string;
  supplierName: string;
  options?: { [key: string]: string };
}

// 장바구니 아이템
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  productBrand?: string;
  unitPrice: number;
  quantity: number;
  supplierId: string;
  supplierName: string;
  maxOrderQuantity?: number;
  stockQuantity: number;
  addedAt: string;
}

// 주문
export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerType: 'customer' | 'retailer';
  buyerName: string;
  buyerGrade?: 'gold' | 'premium' | 'vip';
  items: OrderItem[];
  
  // 가격 정보
  subtotalAmount: number;    // 소계
  discountAmount: number;    // 할인 금액
  shippingAmount: number;    // 배송비
  taxAmount: number;         // 세금
  totalAmount: number;       // 총 금액
  
  // 주문 상태
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  
  // 배송 정보
  shippingAddress: Address;
  trackingNumber?: string;
  
  // 날짜 정보
  orderDate: string;
  paymentDate?: string;
  shippingDate?: string;
  deliveryDate?: string;
  
  // 기타
  notes?: string;
  cancellationReason?: string;
  refundAmount?: number;
}

// 주문 생성 요청
export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// 주문 요약 정보
export interface OrderSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

// 주문 필터
export interface OrderFilters {
  status: OrderStatus | '';
  paymentStatus: PaymentStatus | '';
  dateFrom: string;
  dateTo: string;
  supplierId: string;
  minAmount: number;
  maxAmount: number;
}