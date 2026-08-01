/**
 * Pharmacy-Hub Store Owner Order Controller (Phase 1 — 약국 측만)
 *
 * WO-PHARMACY-HUB-B2B-CART-AND-BUYER-ORDER-V1
 *
 *   POST /api/v1/pharmacy-hub/store-owner/orders           장바구니 → 공급자별 주문 생성
 *   GET  /api/v1/pharmacy-hub/store-owner/orders           내 주문 목록
 *   GET  /api/v1/pharmacy-hub/store-owner/orders/:orderId  내 주문 상세
 *
 * 서비스 경계: `checkout_orders.metadata->>'serviceKey' = 'pharmacy-hub'` + `buyerId = 인증 사용자`.
 * 두 조건을 **항상 함께** 걸어 다른 서비스 주문이 섞이지 않게 한다.
 *
 * ⚠️ Phase 1 범위 — 공급자에게 주문을 노출하지 않는다.
 *   공급자 주문 목록·상태 변경·shipment·fulfillment bridge 는 결제·수금 정책 확정 후 Phase 2.
 *   따라서 이 응답의 상태는 **주문 원장의 값 그대로**이며, 공급자 접수 완료를 뜻하지 않는다.
 *   프론트가 오해할 수 없도록 `supplierNotified: false` 와 안내 문구를 함께 내려준다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import {
  PharmacyHubCartCheckoutService,
  PharmacyHubCheckoutError,
} from '../../services/cart/pharmacy-hub-cart-checkout.service.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 100;

/** Phase 1 안내 — 공급자에게 아직 전달되지 않았음을 응답에 명시한다. */
const PHASE1_NOTICE = '주문이 접수되었습니다. 공급자 전달·처리는 준비 중입니다.';

function getBuyerId(req: Request): string | null {
  const id = (req as any).user?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export class PharmacyHubOrderController {
  /** POST /orders — 장바구니에서 공급자별 주문 생성 */
  static async create(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.filter((x: unknown): x is string => typeof x === 'string')
      : undefined;
    const note = typeof body.note === 'string' ? body.note.slice(0, 500) : undefined;

    try {
      const service = new PharmacyHubCartCheckoutService(AppDataSource);
      const result = await service.confirm({ buyerId }, { itemIds, note });

      return res.status(result.orders.length > 0 ? 201 : 200).json({
        success: true,
        data: {
          orders: result.orders,
          failedItems: result.failedItems,
          supplierNotified: false,
          notice: PHASE1_NOTICE,
        },
      });
    } catch (error) {
      if (error instanceof PharmacyHubCheckoutError) {
        return res.status(error.status).json({ success: false, error: error.message, code: error.code });
      }
      logger.error('[PharmacyHubOrder] create error', {
        buyerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '주문 생성에 실패했습니다.' });
    }
  }

  /** GET /orders — 내 주문 목록 (자기 주문만) */
  static async list(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_LIMIT);

    try {
      const [countRow] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS total
           FROM checkout_orders
          WHERE buyer_id = $1::uuid
            AND metadata->>'serviceKey' = $2`,
        [buyerId, SERVICE_KEY],
      );
      const total = countRow?.total ?? 0;

      const items = await AppDataSource.query(
        `SELECT id::text                    AS "orderId",
                order_number                AS "orderNumber",
                supplier_id                 AS "supplierId",
                status,
                total_amount                AS "totalAmount",
                subtotal,
                shipping_fee                AS "shippingFee",
                jsonb_array_length(items)   AS "itemCount",
                created_at                  AS "createdAt"
           FROM checkout_orders
          WHERE buyer_id = $1::uuid
            AND metadata->>'serviceKey' = $2
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        [buyerId, SERVICE_KEY],
      );

      return res.json({
        success: true,
        data: {
          items,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
          supplierNotified: false,
          notice: PHASE1_NOTICE,
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubOrder] list error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '주문 목록 조회에 실패했습니다.' });
    }
  }

  /** GET /orders/:orderId — 내 주문 상세 (자기 주문만) */
  static async detail(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const orderId = String(req.params.orderId ?? '');
    if (!UUID_RE.test(orderId)) {
      return res.status(400).json({ success: false, error: '주문 식별자가 올바르지 않습니다.', code: 'INVALID_ORDER_ID' });
    }

    try {
      const [row] = await AppDataSource.query(
        `SELECT co.id::text                 AS "orderId",
                co.order_number             AS "orderNumber",
                co.supplier_id              AS "supplierId",
                COALESCE(org.name, '공급자') AS "supplierName",
                co.status,
                co.subtotal,
                co.shipping_fee             AS "shippingFee",
                co.total_amount             AS "totalAmount",
                co.items,
                co.metadata->>'note'        AS "note",
                co.created_at               AS "createdAt"
           FROM checkout_orders co
           LEFT JOIN neture_suppliers ns ON ns.id::text = co.supplier_id
           LEFT JOIN organizations org    ON org.id = ns.organization_id
          WHERE co.id = $1::uuid
            AND co.buyer_id = $2::uuid
            AND co.metadata->>'serviceKey' = $3`,
        [orderId, buyerId, SERVICE_KEY],
      );

      if (!row) {
        // 타인 주문·타 서비스 주문과 부존재를 구분하지 않는다
        return res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.', code: 'ORDER_NOT_FOUND' });
      }

      return res.json({
        success: true,
        data: { ...row, supplierNotified: false, notice: PHASE1_NOTICE },
      });
    } catch (error) {
      logger.error('[PharmacyHubOrder] detail error', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '주문 조회에 실패했습니다.' });
    }
  }
}
