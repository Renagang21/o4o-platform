/**
 * B2B Payment Controller Factory — 승인축 B2B · Event Offer 공통 결제 진입
 *
 * WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §2-E
 *
 * 매장 → 공급자 B2B 주문(checkout_orders)의 결제 세션 생성/승인을 담당한다.
 * `neture-b2b-payment.controller.ts`(Neture B2B · 회귀 기준 · 미접촉)와 **같은 계약**이며,
 * 서비스별로 다른 것은 route namespace 와 허용 order source 집합뿐이다.
 *
 * 흐름:
 *   POST /prepare → PaymentCoreService.prepare()  (기존 Toss adapter 재사용)
 *   POST /confirm → PaymentCoreService.confirm()  → payment.completed(serviceKey='store-b2b')
 *                   → StoreB2bCheckoutPaymentEventHandler 가 checkout_order 를 paid 로 전이
 *                   → CheckoutFulfillmentBridgeService → neture_order → 공급자 노출
 *   GET  /order/:orderId → 결제 정보(Toss widget 렌더링용)
 *
 * 절대 기준:
 *   - payment-first. UNPAID 주문은 공급자 fulfillment/배송/정산 대상이 아니다.
 *   - 새 PG · 새 payment engine · 새 payment table · 새 상태머신을 만들지 않는다(PaymentCore 재사용).
 *   - **소비자 → 매장 commerce 경로를 복구하지 않는다.** 은퇴된 `/kpa/payments/*` ·
 *     `/cosmetics/payments/*`(410 Gone)는 그대로 두고, 이 컨트롤러는 **B2B 전용 namespace**
 *     (`/kpa/b2b/payments/*` · `/cosmetics/b2b/payments/*`)에만 마운트한다.
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
import { TypeORMPaymentRepository } from '../adapters/TypeORMPaymentRepository.js';
import { TossPaymentProviderAdapter } from '../adapters/TossPaymentProviderAdapter.js';
import { EventHubPaymentPublisher } from '../adapters/EventHubPaymentPublisher.js';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { STORE_B2B_PAYMENT_SERVICE_KEY, STORE_B2B_PAYABLE_ORDER_SOURCES } from './store-b2b-payment.constants.js';

export interface B2bPaymentControllerOptions {
  /** 로그 prefix (예: 'KPA B2B Payment') */
  logLabel: string;
  /**
   * 이 컨트롤러가 결제를 허용하는 checkout_order `metadata.source` 집합.
   * 기본값은 승인축 B2B(`store_b2b_cart`) + Event Offer(`store_cart_checkout`).
   */
  allowedOrderSources?: readonly string[];
  /**
   * 이 컨트롤러가 결제를 허용하는 `metadata.serviceKey` 집합.
   * 지정하면 다른 서비스의 주문을 결제할 수 없다(서비스 경계).
   */
  allowedServiceKeys: readonly string[];
}

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
  if (!order.items || order.items.length === 0) return 'B2B 주문';
  const itemName = order.items[0]?.productName || '상품';
  return order.items.length === 1 ? itemName : `${itemName} 외 ${order.items.length - 1}건`;
}

function orderMetadata(order: CheckoutOrder): Record<string, unknown> {
  return order.metadata && typeof order.metadata === 'object' ? (order.metadata as Record<string, unknown>) : {};
}

export function createB2bPaymentController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  options: B2bPaymentControllerOptions,
): Router {
  const router = Router();
  const orderRepository = dataSource.getRepository(CheckoutOrder);
  const allowedSources = options.allowedOrderSources ?? STORE_B2B_PAYABLE_ORDER_SOURCES;
  const allowedServiceKeys = options.allowedServiceKeys;
  const prefix = `[${options.logLabel}]`;

  const repository = new TypeORMPaymentRepository(dataSource);
  const provider = new TossPaymentProviderAdapter();
  const publisher = new EventHubPaymentPublisher();
  const paymentService = new PaymentCoreService(repository, provider, publisher);

  /** 이 컨트롤러가 결제할 수 있는 주문인가 (source + serviceKey 경계) */
  function isPayableTarget(order: CheckoutOrder): boolean {
    const md = orderMetadata(order);
    const source = typeof md.source === 'string' ? md.source : '';
    const serviceKey = typeof md.serviceKey === 'string' ? md.serviceKey : '';
    return allowedSources.includes(source) && allowedServiceKeys.includes(serviceKey);
  }

  function isPayableState(order: CheckoutOrder): boolean {
    return (
      order.paymentStatus === CheckoutPaymentStatus.PENDING &&
      (order.status === CheckoutOrderStatus.CREATED || order.status === CheckoutOrderStatus.PENDING_PAYMENT)
    );
  }

  /** paymentGroupId 로 결제 가능한 group orders 조회·검증 (다중 공급자 1회 결제) */
  async function loadPayableGroup(
    paymentGroupId: string,
    userId: string,
  ): Promise<{
    orders?: CheckoutOrder[];
    totalAmount?: number;
    error?: { status: number; code: string; message: string; details?: Record<string, unknown> };
  }> {
    const orders = await orderRepository
      .createQueryBuilder('o')
      .where("o.metadata->>'paymentGroupId' = :pg", { pg: paymentGroupId })
      .andWhere('o."buyerId" = :userId', { userId })
      .getMany();
    if (orders.length === 0) {
      return { error: { status: 404, code: 'PAYMENT_GROUP_NOT_FOUND', message: 'Payment group not found' } };
    }
    for (const o of orders) {
      if (!isPayableTarget(o)) {
        return { error: { status: 400, code: 'NOT_B2B_CHECKOUT_ORDER', message: 'Group contains non-B2B order' } };
      }
      if (!isPayableState(o)) {
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
            orderId: paymentGroupId,
            orderName,
            amount: totalAmount!,
            currency: 'KRW',
            successUrl,
            failUrl,
            sourceService: STORE_B2B_PAYMENT_SERVICE_KEY,
            metadata: {
              paymentGroupId,
              paymentGroupSource: 'multi_supplier_cart',
              checkoutOrderIds: orders!.map((o) => o.id),
              orderCount: orders!.length,
              groupTotalAmount: totalAmount,
            },
          });

          logger.info(`${prefix} Group payment prepared`, {
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

        // ── 단일 order 결제 경로 ──
        if (!orderId) {
          return errorResponse(res, 400, 'MISSING_PAYMENT_TARGET', 'orderId or paymentGroupId required');
        }
        const order = await orderRepository.findOne({ where: { id: orderId, buyerId: userId } });
        if (!order) return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        if (!isPayableTarget(order)) {
          return errorResponse(res, 400, 'NOT_B2B_CHECKOUT_ORDER', 'Not a B2B checkout order for this service');
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
          sourceService: STORE_B2B_PAYMENT_SERVICE_KEY,
        });

        logger.info(`${prefix} Payment prepared`, {
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
        logger.error(`${prefix} Prepare error:`, error as Error);
        errorResponse(res, 500, 'PAYMENT_PREPARE_ERROR', 'Failed to prepare payment');
      }
    },
  );

  // POST /confirm — 결제 승인 → payment.completed(serviceKey='store-b2b')
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
          const ownedOrders = await orderRepository
            .createQueryBuilder('o')
            .where("o.metadata->>'paymentGroupId' = :pg", { pg: paymentGroupId })
            .andWhere('o."buyerId" = :userId', { userId })
            .getMany();
          if (ownedOrders.length === 0) {
            return errorResponse(res, 404, 'PAYMENT_GROUP_NOT_FOUND', 'Payment group not found');
          }
          if (!ownedOrders.some((o) => isPayableTarget(o))) {
            return errorResponse(res, 400, 'NOT_B2B_CHECKOUT_ORDER', 'Not a B2B checkout order for this service');
          }

          const payment = await paymentService.confirm(paymentId, paymentKey, paymentGroupId, paymentGroupId);

          logger.info(`${prefix} Group payment confirmed`, {
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

        // ── 단일 order confirm ──
        if (!orderId) {
          return errorResponse(res, 400, 'MISSING_PAYMENT_TARGET', 'orderId or paymentGroupId required');
        }
        const order = await orderRepository.findOne({ where: { id: orderId, buyerId: userId } });
        if (!order) return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        if (!isPayableTarget(order)) {
          return errorResponse(res, 400, 'NOT_B2B_CHECKOUT_ORDER', 'Not a B2B checkout order for this service');
        }

        const payment = await paymentService.confirm(paymentId, paymentKey, order.orderNumber, order.id);

        logger.info(`${prefix} Payment confirmed`, {
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
        logger.error(`${prefix} Confirm error:`, err);

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
        if (!isPayableTarget(order)) {
          return errorResponse(res, 400, 'NOT_B2B_CHECKOUT_ORDER', 'Not a B2B checkout order for this service');
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
        logger.error(`${prefix} Get payment info error:`, error as Error);
        errorResponse(res, 500, 'PAYMENT_INFO_ERROR', 'Failed to get payment info');
      }
    },
  );

  return router;
}
