/**
 * Pharmacy-Hub Operator Fulfillment Recovery Controller (Phase 2 — 운영자 측)
 *
 * WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1
 *
 *   GET  /operator/fulfillment/stuck              결제됐지만 공급자에게 전달되지 않은 주문
 *   POST /operator/fulfillment/:orderId/recover   해당 주문 bridge 재시도 (멱등)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 결제 완료 후 fulfillment bridge 는 **best-effort** 다. bridge 가 실패해도 결제는 유효하고
 * 주문은 paid 로 남는다. 이때 구매자는 결제했는데 공급자에게는 보이지 않는 상태가 된다.
 * 이 경로는 그 상태를 **찾아내고 다시 시도**하는 유일한 공식 수단이다.
 *
 * ── 안전 계약 ────────────────────────────────────────────────────────────────
 *   · 운영자(pharmacy-hub:operator) 전용
 *   · **멱등** — 이미 bridge 된 주문은 재생성하지 않고 기존 netureOrderId 를 돌려준다
 *     (bridge 자체가 `metadata.checkoutOrderId` 로 중복을 막는다)
 *   · 결제 상태를 바꾸지 않는다 — paid 가 아닌 주문은 복구 대상이 아니며 거부한다
 *   · 금액·품목을 수정하지 않는다 — 원장 그대로 bridge 만 재시도한다
 *   · 모든 시도를 감사 로그로 남긴다 (누가·언제·무엇을)
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { CheckoutFulfillmentBridgeService } from '../../services/neture/checkout-fulfillment-bridge.service.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { PHARMACY_HUB_ORDER_SOURCE } from '../../services/pharmacy-hub/pharmacy-hub-payment.constants.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 100;

function fail(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ success: false, error: message, code, details });
}

export class PharmacyHubOperatorFulfillmentController {
  /**
   * GET /operator/fulfillment/stuck
   * 결제 완료(paid)인데 대응하는 neture_order 가 없는 Pharmacy-Hub 주문.
   */
  static async listStuck(req: Request, res: Response): Promise<any> {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), MAX_LIMIT);

    try {
      const items = await AppDataSource.query(
        `SELECT co.id::text AS "orderId", co."orderNumber", co."supplierId",
                co."totalAmount", co."paidAt", co."createdAt",
                co.metadata->>'paymentGroupId' AS "paymentGroupId"
           FROM checkout_orders co
          WHERE co.metadata->>'serviceKey' = $1
            AND co.metadata->>'source' = $2
            AND co."paymentStatus" = 'paid'
            AND co.status = 'paid'
            AND NOT EXISTS (
              SELECT 1 FROM neture_orders no2
               WHERE no2.metadata->>'checkoutOrderId' = co.id::text
            )
          ORDER BY co."paidAt" ASC
          LIMIT ${limit}`,
        [SERVICE_KEY, PHARMACY_HUB_ORDER_SOURCE],
      );

      return res.json({ success: true, data: { items, count: items.length } });
    } catch (error) {
      logger.error('[PharmacyHubOperatorFulfillment] listStuck error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'STUCK_LIST_ERROR', '미전달 주문 조회에 실패했습니다.');
    }
  }

  /** POST /operator/fulfillment/:orderId/recover — bridge 재시도 (멱등) */
  static async recover(req: Request, res: Response): Promise<any> {
    const operatorId = (req as any).user?.id ?? null;
    const orderId = String(req.params.orderId ?? '');
    if (!UUID_RE.test(orderId)) {
      return fail(res, 400, 'INVALID_ORDER_ID', '주문 식별자가 올바르지 않습니다.');
    }

    try {
      // 서비스 경계 확인 — 다른 서비스 주문을 이 경로로 복구할 수 없다.
      const [order] = await AppDataSource.query(
        `SELECT id::text AS id, status::text AS status, "paymentStatus"::text AS "paymentStatus"
           FROM checkout_orders
          WHERE id = $1::uuid
            AND metadata->>'serviceKey' = $2
            AND metadata->>'source' = $3`,
        [orderId, SERVICE_KEY, PHARMACY_HUB_ORDER_SOURCE],
      );
      if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', '주문을 찾을 수 없습니다.');

      // 결제 상태는 절대 바꾸지 않는다 — paid 가 아니면 복구 대상이 아니다.
      if (order.paymentStatus !== 'paid' || order.status !== 'paid') {
        return fail(res, 409, 'ORDER_NOT_PAID', '결제 완료된 주문만 복구할 수 있습니다.', {
          status: order.status,
          paymentStatus: order.paymentStatus,
        });
      }

      const bridge = new CheckoutFulfillmentBridgeService(AppDataSource);
      const result = await bridge.bridgeCheckoutOrderToNetureFulfillment({
        checkoutOrderId: orderId,
      });

      // 감사 로그 — 운영자 개입은 항상 추적 가능해야 한다.
      logger.warn('[PharmacyHubOperatorFulfillment] recovery attempted', {
        orderId,
        operatorId,
        bridged: result.bridged,
        netureOrderId: result.netureOrderId ?? null,
        skippedReason: result.skippedReason ?? null,
      });

      if (!result.bridged && !result.netureOrderId) {
        return fail(res, 409, 'RECOVERY_FAILED', '공급자 전달에 실패했습니다.', {
          reason: result.skippedReason,
        });
      }

      return res.json({
        success: true,
        data: {
          orderId,
          netureOrderId: result.netureOrderId,
          // 이미 전달돼 있었다면 새로 만들지 않았음을 명시한다(멱등)
          alreadyBridged: !result.bridged,
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubOperatorFulfillment] recover error', {
        orderId,
        operatorId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'RECOVERY_ERROR', '공급자 전달 복구에 실패했습니다.');
    }
  }
}
