/**
 * Cosmetics-Store Types
 */

/**
 * 주문 상태
 */
export type OrderStatus =
  | 'pending'      // 주문 대기
  | 'paid'         // 결제 완료
  | 'preparing'    // 상품 준비중
  | 'shipped'      // 배송 시작
  | 'delivered'    // 배송 완료
  | 'completed'    // 주문 완료
  | 'cancelled'    // 주문 취소
  | 'refunded';    // 환불 완료

/**
 * 결제 상태
 */
export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partial_refunded';

/**
 * 장바구니
 */
export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 장바구니 상품
 */
export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
}

/**
 * 주문
 */
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  shippingAddress: ShippingAddress;
  paymentId?: string;
  shipmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 주문 상품
 */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * 배송 주소
 */
export interface ShippingAddress {
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
}

/**
 * 결제
 */
export interface Payment {
  id: string;
  orderId: string;
  method: string;
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: Date;
  createdAt: Date;
}

/**
 * 배송
 */
export interface Shipment {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}
