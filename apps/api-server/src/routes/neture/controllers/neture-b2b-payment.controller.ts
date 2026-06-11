/**
 * Neture B2B Checkout Payment Controller
 *
 * WO-O4O-NETURE-B2B-PAYMENT-FLOW-V1 (P2b)
 *
 * Neture B2B checkout_order(metadata.source='neture_b2b_checkout', paymentStatus='pending')의
 * 결제 흐름. KPA/Glyco/KCos checkout payment controller 와 동일 패턴(PaymentCoreService),
 * sourceService='neture-b2b' 로 분리.
 *
 * - POST /prepare → PaymentCoreService.prepare()  (결제 세션)
 * - POST /confirm → PaymentCoreService.confirm()  → payment.completed(serviceKey='neture-b2b')
 *                   → NetureB2bCheckoutPaymentEventHandler 가 checkout_order 를 paid 로 전이
 * - GET  /order/:orderId → 결제 정보(Toss widget 렌더링용)
 *
 * 범위: payment-first. 공급자 노출/fulfillment bridge 없음(후속 P2c). collectionStatus 미사용.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { PaymentCoreService } from '@o4o/payment-core';
import {
  CheckoutOrder,
  CheckoutOrderStatus,
  CheckoutPaymentStatus,
} from '../../../entities/checkout/CheckoutOrder.entity.js';
import { TypeORMPaymentRepository } from '../../../services/payment/adapters/TypeORMPaymentRepository.js';
import { TossPaymentProviderAdapter } from '../../../services/payment/adapters/TossPaymentProviderAdapter.js';
import { EventHubPaymentPublisher } from '../../../services/payment/adapters/EventHubPaymentPublisher.js';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';

const NETURE_B2B_SOURCE_SERVICE = 'neture-b2b';
const NETURE_B2B_ORDER_SOURCE = 'neture_b2b_checkout';

function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Response {
  return res.status(statusCode).json({ success: false, error: { code, message, details } });
}

function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorResponse(res, 400, 'VALIDATION_ERROR', 'Validation failed', { fields: errors.mapped() });
    return true;
  }
  return false;
}

function generateOrderName(order: CheckoutOrder): string {
  if (!order.items || order.items.length === 0) return 'Neture B2B 주문';
  const itemName = order.items[0]?.productName || 'Neture 상품';
  return order.items.length === 1 ? itemName : `${itemName} 외 ${order.items.length - 1}건`;
}

/** checkout_order 가 Neture B2B 주문(metadata.source)인지 */
function isNetureB2bOrder(order: CheckoutOrder): boolean {
  const md = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
  return (md as Record<string, unknown>).source === NETURE_B2B_ORDER_SOURCE;
}

export function createNetureB2bPaymentController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();
  const orderRepository = dataSource.getRepository(CheckoutOrder);

  const repository = new TypeORMPaymentRepository(dataSource);
  const provider = new TossPaymentProviderAdapter();
  const publisher = new EventHubPaymentPublisher();
  const paymentService = new PaymentCoreService(repository, provider, publisher);

  /**
   * paymentGroupId 로 결제 가능한 group orders 조회·검증 (WO-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1).
   * 모두 동일 buyer · neture_b2b_checkout · payable(pending) 이어야 한다.
   */
  async function loadPayableGroup(
    paymentGroupId: string,
    userId: string,
  ): Promise<{ orders?: CheckoutOrder[]; totalAmount?: number; error?: { status: number; code: string; message: string; details?: Record<string, unknown> } }> {
    const orders = await orderRepository
      .createQueryBuilder('o')
      .where("o.metadata->>'paymentGroupId' = :pg", { pg: paymentGroupId })
      .andWhere('o."buyerId" = :userId', { userId })
      .getMany();
    if (orders.length === 0) {
      return { error: { status: 404, code: 'PAYMENT_GROUP_NOT_FOUND', message: 'Payment group not found' } };
    }
    for (const o of orders) {
      if (!isNetureB2bOrder(o)) {
        return { error: { status: 400, code: 'NOT_B2B_CHECKOUT_ORDER', message: 'Group contains non-B2B order' } };
      }
      if (
        o.paymentStatus !== CheckoutPaymentStatus.PENDING ||
        (o.status !== CheckoutOrderStatus.CREATED && o.status !== CheckoutOrderStatus.PENDING_PAYMENT)
      ) {
        return {
          error: {
            status: 400,
            code: 'PAYMENT_GROUP_NOT_PAYABLE',
            message: `Order ${o.id} is not in payable state`,
            details: { currentStatus: o.status, paymentStatus: o.paymentStatus },
          },
        };
      }
    }
    const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    return { orders, totalAmount };
  }

  // POST /prepare — 결제 세션 생성 (단일 orderId XOR 다중공급자 paymentGroupId)
  router.post(
    '/prepare',
    requireAuth,
    [
      body('orderId').optional().isUUID(),
      body('paymentGroupId').optional().isString(),
      body('successUrl').notEmpty().isURL(),
      body('failUrl').notEmpty().isURL(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;
        const userId = (req as AuthRequest).user?.id || (req as AuthRequest).authUser?.id;
        if (!userId) return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');

        const { orderId, paymentGroupId, successUrl, failUrl } = req.body;

        // ── group 결제 경로 (다중 공급자 1회 결제) ──
        if (paymentGroupId) {
          const { orders, totalAmount, error } = await loadPayableGroup(paymentGroupId, userId);
          if (error) return errorResponse(res, error.status, error.code, error.message, error.details);
          const orderName =
            orders!.length === 1
              ? generateOrderName(orders![0])
              : `${generateOrderName(orders![0])} 외 ${orders!.length - 1}건`;

          const payment = await paymentService.prepare({
            orderId: paymentGroupId, // PG/event orderId 슬롯 = paymentGroupId
            orderName,
            amount: totalAmount!,
            currency: 'KRW',
            successUrl,
            failUrl,
            sourceService: NETURE_B2B_SOURCE_SERVICE,
            metadata: {
              paymentGroupId,
              paymentGroupSource: 'multi_supplier_cart',
              checkoutOrderIds: orders!.map((o) => o.id),
              orderCount: orders!.length,
              groupTotalAmount: totalAmount,
            },
          });

          logger.info('[Neture B2B Payment] Group payment prepared', {
            paymentId: payment.id,
            paymentGroupId,
            orderCount: orders!.length,
            amount: totalAmount,
          });

          return res.status(201).json({
            success: true,
            data: {
              paymentId: payment.id,
              transactionId: payment.transactionId,
              paymentGroupId,
              orderCount: orders!.length,
              amount: totalAmount,
              clientKey: (payment.metadata as Record<string, unknown>)?.clientKey,
              isTestMode: (payment.metadata as Record<string, unknown>)?.isTestMode,
            },
          });
        }

        // ── 단일 order 결제 경로 (기존, 무회귀) ──
        if (!orderId) {
          return errorResponse(res, 400, 'MISSING_PAYMENT_TARGET', 'orderId or paymentGroupId required');
        }
        const order = await orderRepository.findOne({ where: { id: orderId, buyerId: userId } });
        if (!order) return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        if (!isNetureB2bOrder(order)) {
          return errorResponse(res, 400, 'NOT_B2B_CHECKOUT_ORDER', 'Not a Neture B2B checkout order');
        }
        if (order.status !== CheckoutOrderStatus.CREATED && order.status !== CheckoutOrderStatus.PENDING_PAYMENT) {
          return errorResponse(res, 400, 'ORDER_NOT_PAYABLE', 'Order is not in payable state', {
            currentStatus: order.status,
          });
        }

        const payment = await paymentService.prepare({
          orderId: order.id,
          orderName: generateOrderName(order),
          amount: Number(order.totalAmount),
          currency: 'KRW',
          successUrl,
          failUrl,
          sourceService: NETURE_B2B_SOURCE_SERVICE,
        });

        logger.info('[Neture B2B Payment] Payment prepared', {
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
        logger.error('[Neture B2B Payment] Prepare error:', error as Error);
        errorResponse(res, 500, 'PAYMENT_PREPARE_ERROR', 'Failed to prepare payment');
      }
    },
  );

  // POST /confirm — 결제 승인 → payment.completed(serviceKey='neture-b2b')
  router.post(
    '/confirm',
    requireAuth,
    [
      body('paymentId').notEmpty().isUUID(),
      body('paymentKey').notEmpty().isString(),
      body('orderId').optional().isUUID(),
      body('paymentGroupId').optional().isString(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;
        const userId = (req as AuthRequest).user?.id || (req as AuthRequest).authUser?.id;
        if (!userId) return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');

        const { paymentId, paymentKey, orderId, paymentGroupId } = req.body;

        // ── group 결제 confirm (PG orderId 슬롯 = paymentGroupId) ──
        if (paymentGroupId) {
          // 소유권 확인: 해당 group 의 주문이 이 buyer 소유여야 함
          const owned = await orderRepository
            .createQueryBuilder('o')
            .where("o.metadata->>'paymentGroupId' = :pg", { pg: paymentGroupId })
            .andWhere('o."buyerId" = :userId', { userId })
            .getCount();
          if (owned === 0) return errorResponse(res, 404, 'PAYMENT_GROUP_NOT_FOUND', 'Payment group not found');

          // PaymentCore.confirm: PG orderId = paymentGroupId, internalOrderId = paymentGroupId
          // → payment.completed(serviceKey='neture-b2b', orderId=paymentGroupId)
          // → NetureB2bCheckoutPaymentEventHandler 가 group orders 재조회·전이·bridge
          const payment = await paymentService.confirm(paymentId, paymentKey, paymentGroupId, paymentGroupId);

          logger.info('[Neture B2B Payment] Group payment confirmed', {
            paymentId: payment.id,
            paymentGroupId,
            status: payment.status,
          });

          return res.json({
            success: true,
            data: {
              paymentId: payment.id,
              paymentGroupId,
              status: payment.status,
              paidAmount: payment.paidAmount,
              paymentMethod: payment.paymentMethod,
              paidAt: payment.paidAt,
            },
          });
        }

        // ── 단일 order confirm (기존, 무회귀) ──
        if (!orderId) {
          return errorResponse(res, 400, 'MISSING_PAYMENT_TARGET', 'orderId or paymentGroupId required');
        }
        const order = await orderRepository.findOne({ where: { id: orderId, buyerId: userId } });
        if (!order) return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        if (!isNetureB2bOrder(order)) {
          return errorResponse(res, 400, 'NOT_B2B_CHECKOUT_ORDER', 'Not a Neture B2B checkout order');
        }

        const payment = await paymentService.confirm(paymentId, paymentKey, order.orderNumber, order.id);

        logger.info('[Neture B2B Payment] Payment confirmed', {
          paymentId: payment.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: payment.status,
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
        const err = error as Error & { code?: string; detail?: string };
        logger.error('[Neture B2B Payment] Confirm error:', err);

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
        if (err.code === '23505' && err.detail?.includes('paymentKey')) {
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

  // GET /order/:orderId — 결제 정보(Toss widget)
  router.get(
    '/order/:orderId',
    requireAuth,
    [param('orderId').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;
        const userId = (req as AuthRequest).user?.id || (req as AuthRequest).authUser?.id;
        if (!userId) return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');

        const order = await orderRepository.findOne({ where: { id: req.params.orderId, buyerId: userId } });
        if (!order) return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        if (!isNetureB2bOrder(order)) {
          return errorResponse(res, 400, 'NOT_B2B_CHECKOUT_ORDER', 'Not a Neture B2B checkout order');
        }
        if (order.status !== CheckoutOrderStatus.CREATED && order.status !== CheckoutOrderStatus.PENDING_PAYMENT) {
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
            currency: 'KRW',
            clientKey: process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key',
          },
        });
      } catch (error: unknown) {
        logger.error('[Neture B2B Payment] Get payment info error:', error as Error);
        errorResponse(res, 500, 'PAYMENT_INFO_ERROR', 'Failed to get payment info');
      }
    },
  );

  return router;
}
