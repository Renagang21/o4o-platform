/**
 * Payment Core - Request/Response Type Definitions
 *
 * WO-O4O-PAYMENT-CORE-SCAFFOLD-V1
 *
 * 결제 요청/응답 DTO 정의
 *
 * ❌ ecommerce-core import 금지
 * ❌ Order 엔티티 참조 금지
 */

import type { PaymentStatus } from './PaymentStatus.js';

// =============================================================================
// Request DTOs
// =============================================================================

/**
 * 결제 준비 요청
 */
export interface PreparePaymentRequest {
  /** 주문 참조 ID (문자열) */
  orderId: string;
  /** 주문명 (결제창 표시용) */
  orderName: string;
  /** 결제 금액 */
  amount: number;
  /** 통화 (기본: KRW) */
  currency?: string;
  /** 성공 리다이렉트 URL */
  successUrl: string;
  /** 실패 리다이렉트 URL */
  failUrl: string;
  /** 고객 이메일 (선택) */
  customerEmail?: string;
  /** 고객 이름 (선택) */
  customerName?: string;
  /** 서비스 키 (결제를 요청한 서비스 식별) */
  sourceService: string;
  /** 추가 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 결제 확인 요청
 */
export interface ConfirmPaymentRequest {
  /** PG에서 발급한 결제 키 */
  paymentKey: string;
  /** 주문 참조 ID (검증용) */
  orderId: string;
  /** 결제 금액 (검증용) */
  amount: number;
}

/**
 * PG 콜백 요청
 */
export interface PGCallbackRequest {
  /** PG 결제 키 */
  paymentKey: string;
  /** 주문 참조 ID */
  orderId: string;
  /** 결제 금액 */
  amount: number;
  /** 결제 상태 */
  status?: string;
}

// =============================================================================
// Response DTOs
// =============================================================================

/**
 * 결제 준비 응답
 */
export interface PreparePaymentResponse {
  /** 내부 결제 ID */
  paymentId: string;
  /** 트랜잭션 ID */
  transactionId: string;
  /** 주문 참조 ID */
  orderId: string;
  /** 결제 금액 */
  amount: number;
  /** PG 클라이언트 키 */
  clientKey: string;
  /** 성공 URL */
  successUrl: string;
  /** 실패 URL */
  failUrl: string;
  /** 테스트 모드 여부 */
  isTestMode: boolean;
}

/**
 * 결제 확인 응답
 */
export interface ConfirmPaymentResponse {
  /** 내부 결제 ID */
  paymentId: string;
  /** 트랜잭션 ID */
  transactionId: string;
  /** 주문 참조 ID */
  orderId: string;
  /** 결제 상태 */
  status: PaymentStatus;
  /** 결제 금액 */
  paidAmount: number;
  /** 결제 수단 */
  method: string;
  /** 승인 일시 */
  approvedAt: string;
  /** 카드 정보 (카드 결제 시) */
  card?: {
    company: string;
    number: string;
    installmentMonths: number;
  };
  /** 영수증 URL */
  receiptUrl?: string;
}

/**
 * 결제 상태 조회 응답
 */
export interface PaymentStatusResponse {
  /** 내부 결제 ID */
  paymentId: string;
  /** 트랜잭션 ID */
  transactionId: string;
  /** 주문 참조 ID */
  orderId: string;
  /** 결제 상태 */
  status: PaymentStatus;
  /** 요청 금액 */
  requestedAmount: number;
  /** 결제 금액 */
  paidAmount: number;
  /** 통화 */
  currency: string;
  /** 결제 수단 */
  paymentMethod?: string;
  /** PG 제공자 */
  pgProvider?: string;
  /** 요청 일시 */
  requestedAt?: Date;
  /** 결제 일시 */
  paidAt?: Date;
  /** 실패 일시 */
  failedAt?: Date;
  /** 실패 사유 */
  failureReason?: string;
}

/**
 * 헬스체크 응답
 */
export interface PaymentHealthResponse {
  /** 서비스 상태 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** PG 연결 상태 */
  pg: {
    provider: string;
    isConfigured: boolean;
    isTestMode: boolean;
  };
  /** 타임스탬프 */
  timestamp: string;
}

// =============================================================================
// API Response Wrapper
// =============================================================================

/**
 * 표준 API 응답
 */
export interface PaymentApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
