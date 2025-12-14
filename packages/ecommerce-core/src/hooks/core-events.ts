/**
 * E-commerce Core Events
 *
 * Core에서 방출하는 이벤트 정의
 * 다른 앱(Dropshipping Core, Retail Core 등)이 이 이벤트를 구독합니다.
 */

export enum EcommerceCoreEvent {
  // Order 이벤트
  ORDER_CREATED = 'order.created',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_COMPLETED = 'order.completed',

  // Payment 이벤트
  PAYMENT_PENDING = 'payment.pending',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
}

/**
 * 이벤트 페이로드 타입 정의
 */

export interface OrderCreatedPayload {
  orderId: string;
  orderNumber: string;
  orderType: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface OrderConfirmedPayload {
  orderId: string;
  orderNumber: string;
  orderType: string;
  confirmedAt: Date;
}

export interface OrderCancelledPayload {
  orderId: string;
  orderNumber: string;
  orderType: string;
  reason?: string;
  cancelledAt: Date;
}

export interface OrderCompletedPayload {
  orderId: string;
  orderNumber: string;
  orderType: string;
  completedAt: Date;
}

export interface PaymentPendingPayload {
  paymentId: string;
  transactionId: string;
  orderId: string;
  requestedAmount: number;
}

export interface PaymentCompletedPayload {
  paymentId: string;
  transactionId: string;
  orderId: string;
  paidAmount: number;
  paidAt: Date;
}

export interface PaymentFailedPayload {
  paymentId: string;
  transactionId: string;
  orderId: string;
  reason: string;
  failedAt: Date;
}

export interface PaymentRefundedPayload {
  paymentId: string;
  transactionId: string;
  orderId: string;
  refundAmount: number;
  isPartialRefund: boolean;
  refundedAt: Date;
}
