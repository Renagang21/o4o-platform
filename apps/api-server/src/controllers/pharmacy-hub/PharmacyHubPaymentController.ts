/**
 * Pharmacy-Hub Payment / Cancel Controller (Phase 2 — 약국 구매자 측)
 *
 * WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1
 *
 *   POST /store-owner/payments/prepare                    결제 세션 생성 (그룹 1회 결제)
 *   POST /store-owner/payments/confirm                    결제 승인 → payment.completed
 *   POST /store-owner/orders/:orderId/cancel              결제 전 주문 취소 (단건)
 *   POST /store-owner/payments/:paymentGroupId/cancel     결제 후 전체 취소·환불 (접수 전 한정)
 *
 * ── 결제 구조 ────────────────────────────────────────────────────────────────
 * 한 번의 체크아웃이 만든 공급자별 주문 N건은 `metadata.paymentGroupId` 로 묶인다.
 * PG 의 orderId 슬롯에 **paymentGroupId** 를 넣어 1회 결제하고, 결제 완료 이벤트가
 * 그룹의 주문 전부를 paid 로 전이시킨 뒤 공급자 fulfillment 로 bridge 한다.
 * (Neture B2B `neture-b2b-payment.controller` 와 동일 계약 · sourceService 만 분리)
 *
 * ── 취소·환불 V1 규칙 ────────────────────────────────────────────────────────
 *   결제 전            : 구매자가 주문 단건 취소 가능
 *   결제 후 · 접수 전  : **그룹 전체만** 취소 가능 (PG 결제가 그룹 단위이므로 부분 환불 불가)
 *   접수 후            : 구매자 취소 불가 — 운영자 개입 필요 상태로 응답
 * 부분 환불 · 부분 취소는 V1 범위 밖이다.
 */
import type { Request, Response } from 'express';
import { PaymentCoreService, PaymentStatus } from '@o4o/payment-core';
import { AppDataSource } from '../../database/connection.js';
import { TypeORMPaymentRepository } from '../../services/payment/adapters/TypeORMPaymentRepository.js';
import { TossPaymentProviderAdapter } from '../../services/payment/adapters/TossPaymentProviderAdapter.js';
import { EventHubPaymentPublisher } from '../../services/payment/adapters/EventHubPaymentPublisher.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import {
  PHARMACY_HUB_ORDER_SOURCE,
  PHARMACY_HUB_PAYMENT_SERVICE_KEY,
} from '../../services/pharmacy-hub/pharmacy-hub-payment.constants.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 결제 가능 상태 — createOrder 직후의 주문만 결제한다. */
const PAYABLE_STATUSES = new Set(['created', 'pending_payment']);

interface GroupOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string | number;
  items: Array<{ productName?: string }> | null;
}

function getBuyerId(req: Request): string | null {
  const id = (req as any).user?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function fail(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ success: false, error: message, code, details });
}

function paymentService(): PaymentCoreService {
  return new PaymentCoreService(
    new TypeORMPaymentRepository(AppDataSource),
    new TossPaymentProviderAdapter(),
    new EventHubPaymentPublisher(),
  );
}

/**
 * paymentGroupId 로 **내** Pharmacy-Hub 주문들을 조회한다.
 * buyerId · serviceKey · source 를 항상 함께 걸어 타 서비스/타인 주문이 섞이지 않게 한다.
 */
async function loadGroupOrders(paymentGroupId: string, buyerId: string): Promise<GroupOrderRow[]> {
  return AppDataSource.query(
    `SELECT id::text AS id, "orderNumber", status::text AS status,
            "paymentStatus"::text AS "paymentStatus", "totalAmount", items
       FROM checkout_orders
      WHERE metadata->>'paymentGroupId' = $1
        AND "buyerId" = $2::uuid
        AND metadata->>'serviceKey' = $3
        AND metadata->>'source' = $4
      ORDER BY "createdAt" ASC`,
    [paymentGroupId, buyerId, SERVICE_KEY, PHARMACY_HUB_ORDER_SOURCE],
  );
}

function groupOrderName(orders: GroupOrderRow[]): string {
  const first = orders[0]?.items?.[0]?.productName || '파머시 허브 상품';
  const extra = orders.reduce((n, o) => n + (o.items?.length ?? 0), 0) - 1;
  return extra > 0 ? `${first} 외 ${extra}건` : first;
}

export class PharmacyHubPaymentController {
  /** POST /payments/prepare — 그룹 1회 결제 세션 생성 */
  static async prepare(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return fail(res, 401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    const body = (req.body ?? {}) as Record<string, unknown>;
    const paymentGroupId = typeof body.paymentGroupId === 'string' ? body.paymentGroupId : '';
    const successUrl = typeof body.successUrl === 'string' ? body.successUrl : '';
    const failUrl = typeof body.failUrl === 'string' ? body.failUrl : '';

    if (!UUID_RE.test(paymentGroupId)) {
      return fail(res, 400, 'INVALID_PAYMENT_GROUP', '결제 그룹 식별자가 올바르지 않습니다.');
    }
    if (!successUrl || !failUrl) {
      return fail(res, 400, 'MISSING_REDIRECT_URL', '결제 완료·실패 주소가 필요합니다.');
    }

    try {
      const orders = await loadGroupOrders(paymentGroupId, buyerId);
      if (orders.length === 0) {
        return fail(res, 404, 'PAYMENT_GROUP_NOT_FOUND', '결제할 주문을 찾을 수 없습니다.');
      }

      // 그룹 전체가 결제 가능해야 한다 — 일부만 결제된 그룹은 만들지 않는다.
      for (const o of orders) {
        if (o.paymentStatus !== 'pending' || !PAYABLE_STATUSES.has(o.status)) {
          return fail(res, 400, 'PAYMENT_GROUP_NOT_PAYABLE', '이미 처리된 주문이 포함되어 있습니다.', {
            orderId: o.id,
            status: o.status,
            paymentStatus: o.paymentStatus,
          });
        }
      }

      // 결제 금액 = 주문 원장의 totalAmount 합계 (배송비 snapshot 포함).
      // 클라이언트가 보낸 금액은 어떤 경우에도 신뢰하지 않는다.
      const amount = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      if (!(amount > 0)) {
        return fail(res, 400, 'INVALID_PAYMENT_AMOUNT', '결제 금액이 올바르지 않습니다.');
      }

      const payment = await paymentService().prepare({
        orderId: paymentGroupId, // PG/event orderId 슬롯 = paymentGroupId
        orderName: groupOrderName(orders),
        amount,
        currency: 'KRW',
        successUrl,
        failUrl,
        sourceService: PHARMACY_HUB_PAYMENT_SERVICE_KEY,
        metadata: {
          paymentGroupId,
          paymentGroupSource: 'pharmacy_hub_multi_supplier_cart',
          serviceKey: SERVICE_KEY,
          checkoutOrderIds: orders.map((o) => o.id),
          orderCount: orders.length,
          groupTotalAmount: amount,
        },
      });

      logger.info('[PharmacyHubPayment] prepared', {
        paymentId: payment.id,
        paymentGroupId,
        orderCount: orders.length,
        amount,
      });

      const pmd = (payment.metadata ?? {}) as Record<string, unknown>;
      return res.status(201).json({
        success: true,
        data: {
          paymentId: payment.id,
          transactionId: payment.transactionId,
          paymentGroupId,
          orderCount: orders.length,
          amount,
          clientKey: pmd.clientKey,
          isTestMode: pmd.isTestMode,
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubPayment] prepare error', {
        paymentGroupId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'PAYMENT_PREPARE_ERROR', '결제 준비에 실패했습니다.');
    }
  }

  /** POST /payments/confirm — 결제 승인 → payment.completed(serviceKey='pharmacy-hub') */
  static async confirm(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return fail(res, 401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    const body = (req.body ?? {}) as Record<string, unknown>;
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId : '';
    const paymentKey = typeof body.paymentKey === 'string' ? body.paymentKey : '';
    const paymentGroupId = typeof body.paymentGroupId === 'string' ? body.paymentGroupId : '';

    if (!UUID_RE.test(paymentId) || !UUID_RE.test(paymentGroupId) || !paymentKey) {
      return fail(res, 400, 'INVALID_CONFIRM_INPUT', '결제 승인 정보가 올바르지 않습니다.');
    }

    try {
      // 소유권 확인 — 내 Pharmacy-Hub 주문 그룹이어야 승인할 수 있다.
      const orders = await loadGroupOrders(paymentGroupId, buyerId);
      if (orders.length === 0) {
        return fail(res, 404, 'PAYMENT_GROUP_NOT_FOUND', '결제할 주문을 찾을 수 없습니다.');
      }

      // PG orderId = internalOrderId = paymentGroupId
      //   → payment.completed(serviceKey='pharmacy-hub', orderId=paymentGroupId)
      //   → PharmacyHubPaymentEventHandler 가 그룹 주문 전이 + fulfillment bridge
      const payment = await paymentService().confirm(
        paymentId,
        paymentKey,
        paymentGroupId,
        paymentGroupId,
      );

      logger.info('[PharmacyHubPayment] confirmed', {
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
    } catch (error) {
      logger.error('[PharmacyHubPayment] confirm error', {
        paymentGroupId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'PAYMENT_CONFIRM_ERROR', '결제 승인에 실패했습니다.');
    }
  }

  /**
   * POST /orders/:orderId/cancel — 결제 전 주문 취소 (단건)
   *
   * 결제된 주문은 여기서 취소하지 않는다(그룹 환불 경로로 유도).
   */
  static async cancelBeforePayment(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return fail(res, 401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    const orderId = String(req.params.orderId ?? '');
    if (!UUID_RE.test(orderId)) {
      return fail(res, 400, 'INVALID_ORDER_ID', '주문 식별자가 올바르지 않습니다.');
    }
    const reason =
      typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 200) : '구매자 취소';

    try {
      const [order] = await AppDataSource.query(
        `SELECT id::text AS id, status::text AS status, "paymentStatus"::text AS "paymentStatus",
                metadata->>'paymentGroupId' AS "paymentGroupId"
           FROM checkout_orders
          WHERE id = $1::uuid AND "buyerId" = $2::uuid
            AND metadata->>'serviceKey' = $3 AND metadata->>'source' = $4`,
        [orderId, buyerId, SERVICE_KEY, PHARMACY_HUB_ORDER_SOURCE],
      );
      if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', '주문을 찾을 수 없습니다.');

      if (order.status === 'cancelled') {
        return res.json({ success: true, data: { orderId, status: 'cancelled', alreadyCancelled: true } });
      }
      if (order.paymentStatus === 'paid' || order.status === 'paid') {
        return fail(
          res,
          409,
          'ALREADY_PAID',
          '결제된 주문입니다. 결제 취소는 주문 묶음 전체로만 가능합니다.',
          { paymentGroupId: order.paymentGroupId },
        );
      }
      if (!PAYABLE_STATUSES.has(order.status)) {
        return fail(res, 409, 'ORDER_NOT_CANCELLABLE', '취소할 수 없는 주문 상태입니다.', {
          status: order.status,
        });
      }

      await AppDataSource.query(
        `UPDATE checkout_orders
            SET status = 'cancelled',
                metadata = metadata || jsonb_build_object('cancelReason', $2::text, 'cancelledBy', 'buyer'),
                "updatedAt" = NOW()
          WHERE id = $1::uuid`,
        [orderId, reason],
      );

      logger.info('[PharmacyHubPayment] pre-payment order cancelled', { orderId, buyerId });
      return res.json({ success: true, data: { orderId, status: 'cancelled' } });
    } catch (error) {
      logger.error('[PharmacyHubPayment] cancelBeforePayment error', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'ORDER_CANCEL_ERROR', '주문 취소에 실패했습니다.');
    }
  }

  /**
   * POST /payments/:paymentGroupId/cancel — 결제 후 전체 취소·환불
   *
   * V1 계약:
   *   · 그룹 전체만 취소한다 (PG 결제가 그룹 단위 1건이므로 부분 환불 불가)
   *   · **어느 공급자도 접수하지 않은 상태**에서만 가능
   *   · 하나라도 접수(preparing 이상)되었으면 운영자 개입 필요로 응답한다
   */
  static async cancelAfterPayment(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return fail(res, 401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    const paymentGroupId = String(req.params.paymentGroupId ?? '');
    if (!UUID_RE.test(paymentGroupId)) {
      return fail(res, 400, 'INVALID_PAYMENT_GROUP', '결제 그룹 식별자가 올바르지 않습니다.');
    }
    const reason =
      typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 200) : '구매자 취소';

    try {
      const orders = await loadGroupOrders(paymentGroupId, buyerId);
      if (orders.length === 0) {
        return fail(res, 404, 'PAYMENT_GROUP_NOT_FOUND', '주문을 찾을 수 없습니다.');
      }

      const orderIds = orders.map((o) => o.id);

      // 공급자 접수 여부 — bridge 된 neture_orders 가 paid 를 벗어났으면 접수된 것이다.
      const accepted = await AppDataSource.query(
        `SELECT id::text AS id, status, metadata->>'checkoutOrderId' AS "checkoutOrderId"
           FROM neture_orders
          WHERE metadata->>'checkoutOrderId' = ANY($1::text[])
            AND status NOT IN ('paid', 'cancelled', 'refunded')`,
        [orderIds],
      );
      if (accepted.length > 0) {
        return fail(
          res,
          409,
          'SUPPLIER_ALREADY_ACCEPTED',
          '공급자가 이미 처리를 시작해 자동 취소할 수 없습니다. 운영자 확인이 필요합니다.',
          { requiresOperator: true, acceptedOrders: accepted.map((a: any) => a.checkoutOrderId) },
        );
      }

      // 이미 취소 처리된 그룹이면 멱등 응답
      if (orders.every((o) => o.status === 'cancelled')) {
        return res.json({
          success: true,
          data: { paymentGroupId, cancelledOrders: orderIds, refunded: false, alreadyCancelled: true },
        });
      }

      // PG 환불 — 그룹 결제 1건 전체 환불. 실패 시 원장을 바꾸지 않는다.
      let refunded = false;
      const payment = await paymentService().findByOrderId(paymentGroupId);
      if (payment && payment.status === PaymentStatus.PAID) {
        await paymentService().refund(payment.id, reason);
        refunded = true;
      }

      await AppDataSource.transaction(async (manager) => {
        await manager.query(
          `UPDATE checkout_orders
              SET status = 'cancelled',
                  -- 캐스트를 쓰지 않는다: CASE 분기가 컬럼(enum)과 통일되어 타입이 추론된다.
                  --   enum 물리 타입명을 코드에 박으면 rename 시 런타임에서만 깨진다.
                  "paymentStatus" = CASE WHEN "paymentStatus" = 'paid' THEN 'refunded' ELSE "paymentStatus" END,
                  metadata = metadata || jsonb_build_object('cancelReason', $2::text, 'cancelledBy', 'buyer'),
                  "updatedAt" = NOW()
            WHERE id = ANY($1::uuid[])`,
          [orderIds, reason],
        );
        await manager.query(
          `UPDATE neture_orders
              SET status = 'cancelled', updated_at = NOW(),
                  metadata = metadata || jsonb_build_object('cancelReason', $2::text, 'cancelledBy', 'buyer')
            WHERE metadata->>'checkoutOrderId' = ANY($1::text[])
              AND status = 'paid'`,
          [orderIds, reason],
        );
      });

      logger.info('[PharmacyHubPayment] group cancelled', {
        paymentGroupId,
        orderCount: orderIds.length,
        refunded,
      });

      return res.json({
        success: true,
        data: { paymentGroupId, cancelledOrders: orderIds, refunded },
      });
    } catch (error) {
      logger.error('[PharmacyHubPayment] cancelAfterPayment error', {
        paymentGroupId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'PAYMENT_CANCEL_ERROR', '결제 취소에 실패했습니다.');
    }
  }
}
