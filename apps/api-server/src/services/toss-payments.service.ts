/**
 * Toss Payments Service
 *
 * Phase N-1: 실거래 MVP
 *
 * Toss Payments API 연동 서비스
 * - 결제 준비 (Payment Key 발급)
 * - 결제 승인 (결제 확정)
 * - 결제 취소 (환불)
 */

import { tossConfig, getTossAuthHeader } from '../config/payment.config.js';
import logger from '../utils/logger.js';

/**
 * Toss 결제 준비 응답
 */
export interface TossPaymentPrepareResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  // Toss SDK에서 사용할 정보
  clientKey: string;
  successUrl: string;
  failUrl: string;
}

/**
 * Toss 결제 승인 요청
 */
export interface TossPaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

/**
 * Toss 결제 승인 응답 (간략화)
 */
export interface TossPaymentConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  method: string;
  totalAmount: number;
  approvedAt: string;
  card?: {
    company: string;
    number: string;
    installmentPlanMonths: number;
  };
  receipt?: {
    url: string;
  };
  // 원본 응답 전체
  rawResponse: any;
}

/**
 * Toss 결제 취소 요청
 */
export interface TossCancelRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number; // 부분 환불 시
}

/**
 * Toss 결제 취소 응답
 */
export interface TossCancelResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  cancels: {
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
  }[];
}

class TossPaymentsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = tossConfig.baseUrl;
  }

  /**
   * API 요청 헬퍼
   */
  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: getTossAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Toss API Error:', {
        status: response.status,
        error: data,
      });
      throw new Error(data.message || 'Toss API request failed');
    }

    return data;
  }

  /**
   * 결제 준비 정보 생성
   *
   * Toss SDK (프론트엔드)에서 사용할 정보를 반환합니다.
   * 실제 paymentKey는 SDK가 결제창을 열 때 생성됩니다.
   */
  preparePayment(params: {
    orderId: string;
    orderName: string;
    amount: number;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }): TossPaymentPrepareResponse {
    // Phase N-1: 클라이언트 키가 없으면 테스트 키 사용
    const clientKey = tossConfig.clientKey || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

    return {
      paymentKey: '', // SDK가 생성
      orderId: params.orderId,
      orderName: params.orderName,
      amount: params.amount,
      clientKey,
      successUrl: params.successUrl,
      failUrl: params.failUrl,
    };
  }

  /**
   * 결제 승인
   *
   * 고객이 결제를 완료한 후, 서버에서 최종 승인을 요청합니다.
   */
  async confirmPayment(
    params: TossPaymentConfirmRequest
  ): Promise<TossPaymentConfirmResponse> {
    logger.info('Toss Payment Confirm:', {
      orderId: params.orderId,
      amount: params.amount,
    });

    const response = await this.request<any>('POST', '/payments/confirm', {
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: params.amount,
    });

    return {
      paymentKey: response.paymentKey,
      orderId: response.orderId,
      status: response.status,
      method: response.method,
      totalAmount: response.totalAmount,
      approvedAt: response.approvedAt,
      card: response.card
        ? {
            company: response.card.company,
            number: response.card.number,
            installmentPlanMonths: response.card.installmentPlanMonths,
          }
        : undefined,
      receipt: response.receipt,
      rawResponse: response,
    };
  }

  /**
   * 결제 취소 (환불)
   */
  async cancelPayment(params: TossCancelRequest): Promise<TossCancelResponse> {
    logger.info('Toss Payment Cancel:', {
      paymentKey: params.paymentKey,
      reason: params.cancelReason,
    });

    const response = await this.request<any>(
      'POST',
      `/payments/${params.paymentKey}/cancel`,
      {
        cancelReason: params.cancelReason,
        cancelAmount: params.cancelAmount,
      }
    );

    return {
      paymentKey: response.paymentKey,
      orderId: response.orderId,
      status: response.status,
      cancels: response.cancels || [],
    };
  }

  /**
   * 결제 조회
   */
  async getPayment(paymentKey: string): Promise<any> {
    return await this.request<any>('GET', `/payments/${paymentKey}`);
  }

  /**
   * 설정 상태 확인
   */
  isConfigured(): boolean {
    return !!tossConfig.secretKey;
  }

  /**
   * 테스트 모드 여부
   */
  isTestMode(): boolean {
    return tossConfig.isTestMode;
  }
}

export const tossPaymentsService = new TossPaymentsService();
