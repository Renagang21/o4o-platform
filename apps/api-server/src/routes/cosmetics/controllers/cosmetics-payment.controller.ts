/**
 * Cosmetics Payment Controller
 *
 * WO-O4O-PAYMENT-EXTENSION-ROLL-OUT-V0.1
 *
 * K-Cosmetics 결제 승인 컨트롤러
 * Neture payment.controller.ts 패턴 그대로 복제
 *
 * 역할: 신호 발신기
 * - PG 승인 후 paymentEventHub.emitCompleted() 호출
 * - 실패 시 paymentEventHub.emitFailed() 호출
 * - 주문 상태 변경은 KCosmeticsPaymentEventHandler 책임
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { EcommerceOrder, OrderStatus } from '@o4o/ecommerce-core';
import { paymentEventHub } from '../../../services/payment/PaymentEventHub.js';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';

/**
 * Error response helper
 */
function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, any>
): Response {
  return res.status(statusCode).json({
    error: { code, message, details },
  });
}

/**
 * Validation error helper
 */
function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorResponse(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      fields: errors.mapped(),
    });
    return true;
  }
  return false;
}

// 토스페이먼츠 API 설정
const TOSS_PAYMENTS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY || 'test_sk_test_key';
const TOSS_PAYMENTS_API_URL = 'https://api.tosspayments.com/v1/payments';

/**
 * Create Cosmetics Payment Controller
 */
export function createCosmeticsPaymentController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();
  const orderRepository = dataSource.getRepository(EcommerceOrder);

  /**
   * POST /cosmetics/payments/confirm
   * 결제 승인 (토스페이먼츠 결제 승인 후 호출)
   *
   * 컨트롤러 = 신호 발신기
   * - PG 승인 결과를 EventHub에 전달
   * - 주문 상태 변경은 KCosmeticsPaymentEventHandler가 수행
   */
  router.post(
    '/confirm',
    requireAuth,
    [
      body('payment_key').notEmpty().isString(),
      body('order_id').notEmpty().isUUID(),
      body('amount').isInt({ min: 1 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        if (!userId) {
          return errorResponse(res, 401, 'COSMETICS_401', 'Authentication required');
        }

        const { payment_key, order_id, amount } = req.body;

        // 1. 주문 조회 및 소유권 확인
        const order = await orderRepository.findOne({
          where: { id: order_id, buyerId: userId },
        });

        if (!order) {
          return errorResponse(res, 404, 'COSMETICS_404', 'Order not found');
        }

        // 2. 금액 검증
        if (order.totalAmount !== amount) {
          return errorResponse(res, 400, 'COSMETICS_400', 'Amount mismatch', {
            expected: order.totalAmount,
            received: amount,
          });
        }

        // 3. 이미 결제된 주문인지 확인
        if (order.status !== OrderStatus.CREATED && order.status !== OrderStatus.PENDING_PAYMENT) {
          return errorResponse(res, 400, 'COSMETICS_400', 'Order is not in payable state', {
            current_status: order.status,
          });
        }

        // 4. 토스페이먼츠 결제 승인 API 호출
        try {
          const authHeader = Buffer.from(`${TOSS_PAYMENTS_SECRET_KEY}:`).toString('base64');

          const tossResponse = await axios.post(
            `${TOSS_PAYMENTS_API_URL}/confirm`,
            {
              paymentKey: payment_key,
              orderId: order.orderNumber,
              amount: amount,
            },
            {
              headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/json',
              },
            }
          );

          // 5. payment.completed 이벤트 발행 (WO-O4O-PAYMENT-EXTENSION-ROLL-OUT-V0.1)
          //    주문 상태 변경은 KCosmeticsPaymentEventHandler 책임
          paymentEventHub.emitCompleted({
            paymentId: payment_key,
            transactionId: `COSMETICS-${order.orderNumber}`,
            orderId: order_id,
            paymentKey: payment_key,
            paidAmount: amount,
            paymentMethod: tossResponse.data.method || 'CARD',
            approvedAt: tossResponse.data.approvedAt,
            serviceKey: 'cosmetics',
            card: tossResponse.data.card ? {
              company: tossResponse.data.card.company || '',
              number: tossResponse.data.card.number || '',
              installmentMonths: tossResponse.data.card.installmentPlanMonths || 0,
            } : undefined,
            receiptUrl: tossResponse.data.receipt?.url,
            metadata: {
              orderNumber: order.orderNumber,
              tossPaymentKey: payment_key,
            },
          });

          logger.info('[Cosmetics Payment] payment.completed emitted', {
            orderId: order_id,
            orderNumber: order.orderNumber,
            amount,
          });

          res.json({
            data: {
              orderId: order_id,
              orderNumber: order.orderNumber,
              payment: {
                payment_key,
                method: tossResponse.data.method,
                approved_at: tossResponse.data.approvedAt,
                receipt_url: tossResponse.data.receipt?.url,
              },
            },
          });
        } catch (tossError: any) {
          logger.error('[Cosmetics Payment] Toss Payments error:', tossError.response?.data || tossError.message);

          const tossErrorData = tossError.response?.data;

          // payment.failed 이벤트 발행 (WO-O4O-PAYMENT-EXTENSION-ROLL-OUT-V0.1)
          paymentEventHub.emitFailed({
            paymentId: payment_key,
            transactionId: `COSMETICS-${order.orderNumber}`,
            orderId: order_id,
            errorCode: tossErrorData?.code || 'TOSS_ERROR',
            errorMessage: tossErrorData?.message || tossError.message || 'Payment failed',
            serviceKey: 'cosmetics',
            metadata: {
              orderNumber: order.orderNumber,
              tossResponse: tossErrorData,
            },
          });

          logger.info('[Cosmetics Payment] payment.failed emitted', {
            orderId: order_id,
            orderNumber: order.orderNumber,
            errorCode: tossErrorData?.code,
          });

          return errorResponse(res, 400, 'PAYMENT_FAILED', 'Payment confirmation failed', {
            toss_code: tossErrorData?.code,
            toss_message: tossErrorData?.message,
          });
        }
      } catch (error: any) {
        logger.error('[Cosmetics Payment] Confirm error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /cosmetics/payments/order/:orderId
   * 결제 정보 조회 (결제 페이지 렌더링용)
   */
  router.get(
    '/order/:orderId',
    requireAuth,
    [param('orderId').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        if (!userId) {
          return errorResponse(res, 401, 'COSMETICS_401', 'Authentication required');
        }

        const order = await orderRepository.findOne({
          where: { id: req.params.orderId, buyerId: userId },
          relations: ['items'],
        });

        if (!order) {
          return errorResponse(res, 404, 'COSMETICS_404', 'Order not found');
        }

        // 결제 가능한 상태인지 확인
        if (order.status !== OrderStatus.CREATED && order.status !== OrderStatus.PENDING_PAYMENT) {
          return errorResponse(res, 400, 'COSMETICS_400', 'Order is not payable', {
            current_status: order.status,
          });
        }

        // 토스페이먼츠 결제 위젯용 정보 반환
        res.json({
          data: {
            order_id: order.id,
            order_number: order.orderNumber,
            order_name: generateOrderName(order),
            amount: order.totalAmount,
            customer_name: order.buyerId,
            // 토스페이먼츠 클라이언트 키 (공개 키)
            client_key: process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key',
          },
        });
      } catch (error: any) {
        logger.error('[Cosmetics Payment] Get payment info error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  return router;
}

/**
 * 주문명 생성 (토스페이먼츠 표시용)
 */
function generateOrderName(order: EcommerceOrder): string {
  if (!order.items || order.items.length === 0) {
    return '화장품 주문';
  }

  const firstItem = order.items[0] as { productName?: string };
  const itemName = firstItem?.productName || '화장품';
  if (order.items.length === 1) {
    return itemName;
  }

  return `${itemName} 외 ${order.items.length - 1}건`;
}
