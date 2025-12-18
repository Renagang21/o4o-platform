/**
 * Checkout API
 *
 * Phase N-1: 실거래 MVP
 *
 * Toss Payments 연동 결제 API
 */

import { authClient } from '@o4o/auth-client';

/**
 * 주문 아이템
 */
export interface CheckoutItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

/**
 * 배송 주소
 */
export interface ShippingAddress {
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
}

/**
 * 결제 준비 요청
 */
export interface InitiateCheckoutRequest {
  items: CheckoutItem[];
  shippingAddress: ShippingAddress;
  partnerId?: string;
  successUrl?: string;
  failUrl?: string;
}

/**
 * 결제 준비 응답
 */
export interface InitiateCheckoutResponse {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  payment: {
    paymentKey: string;
    orderId: string;
    orderName: string;
    amount: number;
    clientKey: string;
    successUrl: string;
    failUrl: string;
    isTestMode: boolean;
  };
}

/**
 * 결제 승인 요청
 */
export interface ConfirmPaymentRequest {
  paymentKey: string;
  orderId: string; // orderNumber
  amount: number;
}

/**
 * 결제 승인 응답
 */
export interface ConfirmPaymentResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAt: string;
  partnerId?: string;
}

/**
 * 주문 정보
 */
export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  supplierId: string;
  partnerId?: string;
  items: CheckoutItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  shippingAddress?: ShippingAddress;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
}

/**
 * 결제 준비 (주문 생성)
 */
export async function initiateCheckout(
  data: InitiateCheckoutRequest
): Promise<InitiateCheckoutResponse> {
  const response = await authClient.api.post<{
    success: boolean;
    data: InitiateCheckoutResponse;
    message?: string;
  }>('/api/checkout/initiate', data);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Checkout initiation failed');
  }

  return response.data.data;
}

/**
 * 결제 승인
 */
export async function confirmPayment(
  data: ConfirmPaymentRequest
): Promise<ConfirmPaymentResponse> {
  const response = await authClient.api.post<{
    success: boolean;
    data: ConfirmPaymentResponse;
    message?: string;
  }>('/api/checkout/confirm', data);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Payment confirmation failed');
  }

  return response.data.data;
}

/**
 * 주문 조회
 */
export async function getOrder(orderId: string): Promise<Order> {
  const response = await authClient.api.get<{
    success: boolean;
    data: Order;
    message?: string;
  }>(`/api/orders/${orderId}`);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to get order');
  }

  return response.data.data;
}

/**
 * 내 주문 목록 조회
 */
export async function getOrders(): Promise<Order[]> {
  const response = await authClient.api.get<{
    success: boolean;
    data: Order[];
    message?: string;
  }>('/api/orders');

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to get orders');
  }

  return response.data.data;
}

/**
 * Toss Payments SDK 로드
 */
export function loadTossPaymentsSDK(): Promise<any> {
  return new Promise((resolve, reject) => {
    // 이미 로드된 경우
    if ((window as any).TossPayments) {
      resolve((window as any).TossPayments);
      return;
    }

    // 이미 스크립트 태그가 있는 경우
    const existingScript = document.querySelector(
      'script[src*="tosspayments"]'
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        resolve((window as any).TossPayments);
      });
      return;
    }

    // 새로 로드
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.async = true;

    script.onload = () => {
      resolve((window as any).TossPayments);
    };

    script.onerror = () => {
      reject(new Error('Failed to load Toss Payments SDK'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Toss 결제창 열기
 */
export async function openTossPayment(params: {
  clientKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerName?: string;
  customerEmail?: string;
}): Promise<void> {
  const TossPayments = await loadTossPaymentsSDK();
  const tossPayments = TossPayments(params.clientKey);

  await tossPayments.requestPayment('카드', {
    amount: params.amount,
    orderId: params.orderId,
    orderName: params.orderName,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
  });
}
