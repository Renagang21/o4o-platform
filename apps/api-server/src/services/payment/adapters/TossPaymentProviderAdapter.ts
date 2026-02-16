/**
 * Toss Payments Provider Adapter
 *
 * WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
 *
 * PaymentProviderAdapter 인터페이스 구현.
 * Toss Payments API를 래핑.
 *
 * 참조: cosmetics-payment.controller.ts의 Toss 호출 패턴
 */

import type {
  PaymentProviderAdapter,
  ProviderConfirmResult,
  ProviderPrepareResult,
  ProviderRefundResult,
} from '@o4o/payment-core';
import axios from 'axios';
import logger from '../../../utils/logger.js';

const TOSS_API_URL = 'https://api.tosspayments.com/v1/payments';

export class TossPaymentProviderAdapter implements PaymentProviderAdapter {
  private readonly secretKey: string;
  private readonly clientKey: string;

  constructor() {
    this.secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || 'test_sk_test_key';
    this.clientKey = process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key';
  }

  /**
   * 결제 준비 — clientKey 반환 (Toss는 서버 세션 생성 불필요)
   */
  async prepare(_params: {
    orderId: string;
    orderName: string;
    amount: number;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }): Promise<ProviderPrepareResult> {
    return {
      clientKey: this.clientKey,
      isTestMode: this.secretKey.startsWith('test_'),
    };
  }

  /**
   * 결제 승인 — Toss Payments /confirm API 호출
   */
  async confirm(
    paymentKey: string,
    orderId: string,
    amount: number,
  ): Promise<ProviderConfirmResult> {
    const authHeader = Buffer.from(`${this.secretKey}:`).toString('base64');

    const response = await axios.post(
      `${TOSS_API_URL}/confirm`,
      {
        paymentKey,
        orderId,
        amount,
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const data = response.data;

    logger.info('[TossPaymentProviderAdapter] Payment confirmed', {
      paymentKey,
      method: data.method,
      approvedAt: data.approvedAt,
    });

    return {
      paymentKey,
      paidAmount: amount,
      paymentMethod: data.method || 'CARD',
      approvedAt: new Date(data.approvedAt),
      card: data.card
        ? {
            company: data.card.company || '',
            number: data.card.number || '',
            installmentMonths: data.card.installmentPlanMonths || 0,
          }
        : undefined,
      receiptUrl: data.receipt?.url,
    };
  }

  /**
   * 환불 — Toss Payments /cancel API 호출
   */
  async refund(
    paymentKey: string,
    reason?: string,
  ): Promise<ProviderRefundResult> {
    const authHeader = Buffer.from(`${this.secretKey}:`).toString('base64');

    const response = await axios.post(
      `${TOSS_API_URL}/${paymentKey}/cancel`,
      {
        cancelReason: reason || '고객 요청',
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      },
    );

    logger.info('[TossPaymentProviderAdapter] Payment refunded', {
      paymentKey,
      cancelAmount: response.data.cancelAmount,
    });

    return {
      refundAmount: response.data.cancelAmount || response.data.totalAmount,
      refundedAt: new Date(),
    };
  }
}
