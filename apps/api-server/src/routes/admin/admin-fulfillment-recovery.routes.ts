/**
 * Admin Fulfillment Recovery Routes — paid-but-unbridged 운영 복구 (전 producer 공통)
 *
 * WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §2-F
 *
 *   GET  /api/v1/admin/fulfillment/stuck               결제됐으나 공급자에게 전달되지 않은 주문
 *   POST /api/v1/admin/fulfillment/:orderId/recover    해당 주문 bridge 재시도 (멱등)
 *   POST /api/v1/admin/fulfillment/recover-batch       여러 건 순차 복구 (부분 성공 허용)
 *
 * 왜 필요한가: 결제는 성공했는데 bridge 가 한 번 실패하면
 *   매장=결제완료 / checkout_orders=PAID / neture_orders=없음 / 공급자 화면=주문 없음
 * 상태가 **영구 잔존**한다. 이 경로가 그 상태를 탐지·해소한다.
 *
 * 권한: `requireAdmin`(platform:super_admin 단독) — 저장소 정본 가드를 그대로 쓴다.
 *   서비스 운영자용 진입점은 기존 Pharmacy-Hub 경로가 이미 있고(미접촉), 다른 서비스는
 *   실결제 발생 후 필요성이 확인되면 같은 서비스를 재사용해 얇게 추가하면 된다.
 *
 * 하지 않는 것: 새 queue/framework/DB schema 0 · 결제 상태 변경 0 · 재고 조작 0.
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../common/middleware/auth/authorization.middleware.js';
import { CheckoutFulfillmentRecoveryService } from '../../services/neture/checkout-fulfillment-recovery.service.js';
import logger from '../../utils/logger.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(res: Response, status: number, code: string, message: string, detail?: Record<string, unknown>) {
  return res.status(status).json({ success: false, error: { code, message, detail } });
}

/** RecoveryFailureCode → HTTP status */
const FAILURE_STATUS: Record<string, number> = {
  ORDER_NOT_FOUND: 404,
  ORDER_NOT_PAID: 409,
  UNSUPPORTED_SOURCE: 400,
  OUT_OF_SCOPE: 403,
  RECOVERY_FAILED: 409,
};

export function createAdminFulfillmentRecoveryRoutes(): Router {
  const router = Router();
  router.use(requireAuth);
  router.use(requireAdmin);

  const service = () => new CheckoutFulfillmentRecoveryService(AppDataSource);

  // GET /stuck — paid 인데 공급자에게 전달되지 않은 주문
  router.get('/stuck', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const serviceKey = typeof req.query.serviceKey === 'string' ? req.query.serviceKey : undefined;
      const items = await service().listStuckOrders({
        limit,
        scope: serviceKey ? { serviceKeys: [serviceKey] } : undefined,
      });
      return res.json({ success: true, data: { items, count: items.length } });
    } catch (error) {
      logger.error('[AdminFulfillmentRecovery] listStuck error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'STUCK_LIST_ERROR', '미전달 주문 조회에 실패했습니다.');
    }
  });

  // POST /:orderId/recover — 단건 복구 (멱등)
  router.post('/:orderId/recover', async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId ?? '');
    if (!UUID_RE.test(orderId)) {
      return fail(res, 400, 'INVALID_ORDER_ID', '주문 식별자가 올바르지 않습니다.');
    }
    try {
      const actorId = (req as unknown as { user?: { id?: string } }).user?.id ?? null;
      const outcome = await service().recoverOrder(orderId, { actorId });
      if (outcome.ok === false) {
        return fail(res, FAILURE_STATUS[outcome.code] ?? 409, outcome.code, outcome.message, outcome.detail);
      }
      return res.json({
        success: true,
        data: {
          orderId: outcome.orderId,
          netureOrderId: outcome.netureOrderId,
          alreadyBridged: outcome.alreadyBridged,
        },
      });
    } catch (error) {
      logger.error('[AdminFulfillmentRecovery] recover error', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'RECOVERY_ERROR', '복구 처리 중 오류가 발생했습니다.');
    }
  });

  // POST /recover-batch — 여러 건 (부분 성공 허용)
  router.post('/recover-batch', async (req: Request, res: Response) => {
    const ids = Array.isArray(req.body?.orderIds) ? req.body.orderIds : [];
    if (ids.length === 0) return fail(res, 400, 'ORDER_IDS_REQUIRED', '복구할 주문을 지정해 주세요.');
    if (ids.length > 50) return fail(res, 400, 'TOO_MANY_ORDERS', '한 번에 최대 50건까지 복구할 수 있습니다.');
    const invalid = ids.find((id: unknown) => typeof id !== 'string' || !UUID_RE.test(id));
    if (invalid !== undefined) return fail(res, 400, 'INVALID_ORDER_ID', '주문 식별자가 올바르지 않습니다.');

    try {
      const actorId = (req as unknown as { user?: { id?: string } }).user?.id ?? null;
      const outcomes = await service().recoverMany(ids as string[], { actorId });
      const recovered = outcomes.filter((o) => o.ok).length;
      return res.json({
        success: true,
        data: { total: outcomes.length, recovered, failed: outcomes.length - recovered, results: outcomes },
      });
    } catch (error) {
      logger.error('[AdminFulfillmentRecovery] recoverBatch error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'RECOVERY_ERROR', '복구 처리 중 오류가 발생했습니다.');
    }
  });

  return router;
}

export default createAdminFulfillmentRecoveryRoutes;
