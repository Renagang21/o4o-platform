/**
 * TossPaymentsService
 *
 * H4-2: Toss Payments 연동 서비스 (ecommerce-core 이관)
 *
 * Toss Payments API 연동 서비스
 * - 결제 준비 (Payment Key 발급)
 * - 결제 승인 (결제 확정)
 * - 결제 취소 (환불)
 *
 * 기존 api-server/services/toss-payments.service.ts에서 이관
 * Checkout 도메인 의존성 없이 독립적으로 동작
 */

import { Injectable } from '@nestjs/common';

/**
 * Toss Payments 설정
 */
export interface TossPaymentsConfig {
  secretKey: string;
  clientKey?: string;
  baseUrl: string;
  isTestMode: boolean;
}

/**
 * Toss 결제 준비 응답
 */
export interface TossPaymentPrepareResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  amount: number;
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
 * Toss 결제 승인 응답
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
  rawResponse: any;
}

/**
 * Toss 결제 취소 요청
 */
export interface TossCancelRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;
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

/**
 * 결제 준비 파라미터
 */
export interface PreparePaymentParams {
  orderId: string;
  orderName: string;
  amount: number;
  successUrl: string;
  failUrl: string;
  customerEmail?: string;
  customerName?: string;
}

@Injectable()
export class TossPaymentsService {
  private config: TossPaymentsConfig;

  constructor(config?: Partial<TossPaymentsConfig>) {
    // 환경변수에서 설정 로드 (기본값)
    this.config = {
      secretKey: config?.secretKey || process.env.TOSS_SECRET_KEY || '',
      clientKey: config?.clientKey || process.env.TOSS_CLIENT_KEY,
      baseUrl: config?.baseUrl || process.env.TOSS_API_BASE_URL || 'https://api.tosspayments.com/v1',
      isTestMode: config?.isTestMode ?? (process.env.TOSS_SECRET_KEY?.startsWith('test_') ?? true),
    };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<TossPaymentsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Authorization 헤더 생성
   */
  private getAuthHeader(): string {
    const encoded = Buffer.from(`${this.config.secretKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * API 요청 헬퍼
   */
  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'Toss API request failed');
      (error as any).code = data.code;
      (error as any).status = response.status;
      throw error;
    }

    return data;
  }

  /**
   * 결제 준비 정보 생성
   *
   * Toss SDK (프론트엔드)에서 사용할 정보를 반환합니다.
   * 실제 paymentKey는 SDK가 결제창을 열 때 생성됩니다.
   */
  preparePayment(params: PreparePaymentParams): TossPaymentPrepareResponse {
    const clientKey = this.config.clientKey || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

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
   * 주문 ID로 결제 조회
   */
  async getPaymentByOrderId(orderId: string): Promise<any> {
    return await this.request<any>('GET', `/payments/orders/${orderId}`);
  }

  /**
   * 설정 상태 확인
   */
  isConfigured(): boolean {
    return !!this.config.secretKey;
  }

  /**
   * 테스트 모드 여부
   */
  isTestMode(): boolean {
    return this.config.isTestMode;
  }

  /**
   * 현재 설정 조회 (secretKey 마스킹)
   */
  getConfigStatus(): {
    isConfigured: boolean;
    isTestMode: boolean;
    baseUrl: string;
    hasClientKey: boolean;
  } {
    return {
      isConfigured: this.isConfigured(),
      isTestMode: this.isTestMode(),
      baseUrl: this.config.baseUrl,
      hasClientKey: !!this.config.clientKey,
    };
  }
}
