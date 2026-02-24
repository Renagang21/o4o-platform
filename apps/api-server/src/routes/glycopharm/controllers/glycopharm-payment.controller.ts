/**
 * GlycoPharm Payment Controller
 *
 * WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
 *
 * Payment Core Scaffold의 첫 번째 소비자.
 * PaymentCoreService를 통해 결제 흐름을 실행.
 *
 * 역할: PaymentCoreService 위임
 * - POST /prepare → PaymentCoreService.prepare()
 * - POST /confirm → PaymentCoreService.confirm()
 * - GET /order/:orderId → 결제 정보 조회 (Toss widget 렌더링용)
 *
 * 참조: cosmetics-payment.controller.ts (직접 Toss 호출 패턴)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { PaymentCoreService } from '@o4o/payment-core';
import { EcommerceOrder, OrderStatus } from '@o4o/ecommerce-core/entities';
import { TypeORMPaymentRepository } from '../../../services/payment/adapters/TypeORMPaymentRepository.js';
import { TossPaymentProviderAdapter } from '../../../services/payment/adapters/TossPaymentProviderAdapter.js';
import { EventHubPaymentPublisher } from '../../../services/payment/adapters/EventHubPaymentPublisher.js';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';

function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Response {
  return res.status(statusCode).json({
    error: { code, message, details },
  });
}

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

/**
 * 주문명 생성 (Toss 결제창 표시용)
 */
function generateOrderName(order: EcommerceOrder): string {
  if (!order.items || order.items.length === 0) {
    return '약국 주문';
  }
  const firstItem = order.items[0] as { productName?: string };
  const itemName = firstItem?.productName || '약국 상품';
  if (order.items.length === 1) {
    return itemName;
  }
  return `${itemName} 외 ${order.items.length - 1}건`;
}

export function createGlycopharmPaymentController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();
  const orderRepository = dataSource.getRepository(EcommerceOrder);

  // Adapter 인스턴스 생성 + PaymentCoreService 조립
  const repository = new TypeORMPaymentRepository(dataSource);
  const provider = new TossPaymentProviderAdapter();
  const publisher = new EventHubPaymentPublisher();
  const paymentService = new PaymentCoreService(repository, provider, publisher);

  /**
   * POST /payments/prepare
   * 결제 세션 생성 (order → payment record)
   */
  router.post(
    '/prepare',
    requireAuth,
    [
      body('orderId').notEmpty().isUUID(),
      body('successUrl').notEmpty().isURL(),
      body('failUrl').notEmpty().isURL(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;
        if (!userId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
        }

        const { orderId, successUrl, failUrl } = req.body;

        // 주문 조회 및 소유권 확인
        const order = await orderRepository.findOne({
          where: { id: orderId, buyerId: userId },
          relations: ['items'],
        });

        if (!order) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        // 결제 가능 상태 확인
        if (order.status !== OrderStatus.CREATED && order.status !== OrderStatus.PENDING_PAYMENT) {
          return errorResponse(res, 400, 'ORDER_NOT_PAYABLE', 'Order is not in payable state', {
            currentStatus: order.status,
          });
        }

        // PaymentCoreService.prepare() 호출
        const payment = await paymentService.prepare({
          orderId: order.id,
          orderName: generateOrderName(order),
          amount: Number(order.totalAmount),
          currency: order.currency,
          successUrl,
          failUrl,
          sourceService: 'glycopharm',
        });

        logger.info('[GlycoPharm Payment] Payment prepared', {
          paymentId: payment.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: Number(order.totalAmount),
        });

        res.status(201).json({
          success: true,
          data: {
            paymentId: payment.id,
            transactionId: payment.transactionId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            amount: Number(order.totalAmount),
            clientKey: (payment.metadata as Record<string, unknown>)?.clientKey,
            isTestMode: (payment.metadata as Record<string, unknown>)?.isTestMode,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[GlycoPharm Payment] Prepare error:', err);
        errorResponse(res, 500, 'PAYMENT_PREPARE_ERROR', 'Failed to prepare payment');
      }
    },
  );

  /**
   * POST /payments/confirm
   * 결제 승인 (Toss 결제 완료 후 프론트에서 호출)
   */
  router.post(
    '/confirm',
    requireAuth,
    [
      body('paymentId').notEmpty().isUUID(),
      body('paymentKey').notEmpty().isString(),
      body('orderId').notEmpty().isUUID(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;
        if (!userId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
        }

        const { paymentId, paymentKey, orderId } = req.body;

        // 주문 소유권 확인
        const order = await orderRepository.findOne({
          where: { id: orderId, buyerId: userId },
        });

        if (!order) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        // PaymentCoreService.confirm() 호출
        // 금액 검증은 PaymentCore 내부에서 수행 (payment.amount 사용)
        // CREATED → CONFIRMING → PAID (+ Toss API + event emission)
        const payment = await paymentService.confirm(
          paymentId,
          paymentKey,
          order.orderNumber,
          order.id,
        );

        logger.info('[GlycoPharm Payment] Payment confirmed', {
          paymentId: payment.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: payment.status,
          paidAmount: payment.paidAmount,
        });

        res.json({
          success: true,
          data: {
            paymentId: payment.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: payment.status,
            paidAmount: payment.paidAmount,
            paymentMethod: payment.paymentMethod,
            paidAt: payment.paidAt,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[GlycoPharm Payment] Confirm error:', err);

        if (err.message === 'PAYMENT_NOT_FOUND') {
          return errorResponse(res, 404, 'PAYMENT_NOT_FOUND', 'Payment record not found');
        }
        if (err.message?.startsWith('INVALID_PAYMENT_TRANSITION')) {
          return errorResponse(res, 409, 'INVALID_PAYMENT_TRANSITION', err.message);
        }
        if (err.message === 'PAYMENT_ALREADY_PROCESSING') {
          return errorResponse(res, 409, 'PAYMENT_ALREADY_PROCESSING', 'Payment is already being processed');
        }
        if (err.message === 'PAYMENT_AMOUNT_MISSING') {
          return errorResponse(res, 400, 'PAYMENT_AMOUNT_MISSING', 'Payment amount not set during prepare');
        }

        // P0-2: paymentKey UNIQUE violation → idempotent 처리
        const pgError = err as any;
        if (pgError.code === '23505' && pgError.detail?.includes('paymentKey')) {
          const existing = await paymentService.getStatus(req.body.paymentId);
          if (existing && existing.status === 'PAID') {
            return res.json({
              success: true,
              data: {
                paymentId: existing.id,
                orderId: existing.orderId,
                status: existing.status,
                paidAmount: existing.paidAmount,
                paymentMethod: existing.paymentMethod,
                paidAt: existing.paidAt,
              },
            });
          }
          return errorResponse(res, 409, 'DUPLICATE_PAYMENT', 'Payment with this key already exists');
        }

        errorResponse(res, 400, 'PAYMENT_CONFIRM_ERROR', 'Payment confirmation failed', {
          message: err.message,
        });
      }
    },
  );

  /**
   * GET /payments/order/:orderId
   * 결제 정보 조회 (Toss widget 렌더링용)
   */
  router.get(
    '/order/:orderId',
    requireAuth,
    [param('orderId').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;
        if (!userId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
        }

        const order = await orderRepository.findOne({
          where: { id: req.params.orderId, buyerId: userId },
          relations: ['items'],
        });

        if (!order) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        if (order.status !== OrderStatus.CREATED && order.status !== OrderStatus.PENDING_PAYMENT) {
          return errorResponse(res, 400, 'ORDER_NOT_PAYABLE', 'Order is not payable', {
            currentStatus: order.status,
          });
        }

        res.json({
          success: true,
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderName: generateOrderName(order),
            amount: Number(order.totalAmount),
            currency: order.currency,
            clientKey: process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key',
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[GlycoPharm Payment] Get payment info error:', err);
        errorResponse(res, 500, 'PAYMENT_INFO_ERROR', 'Failed to get payment info');
      }
    },
  );

  return router;
}
