/**
 * Pharmacy-Hub Supplier Order Controller (Phase 2 — 공급자 측)
 *
 * WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1
 *
 *   GET  /supplier/orders                 내게 들어온 Pharmacy-Hub 주문 목록
 *   GET  /supplier/orders/:orderId        주문 상세 (내 상품 라인만)
 *   POST /supplier/orders/:orderId/accept 접수 (paid → preparing)
 *   POST /supplier/orders/:orderId/ship   발송 (preparing → shipped)
 *
 * ── 스코프 (3중, 항상 함께) ──────────────────────────────────────────────────
 *   ① `neture_orders.service_key = 'pharmacy-hub'`   서비스 경계
 *      (WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1 의 SSOT 헬퍼 사용 —
 *       Neture 조회는 'neture' 로 스코프되므로 서로의 주문이 절대 섞이지 않는다)
 *   ② `supplier_product_offers.supplier_id = 내 공급자 id`   소유 경계
 *      (`spo.id = neture_order_items.product_id` — Neture 와 **동일한 조인 축**)
 *   ③ 결제 완료 주문만 존재    bridge 자체가 paid 인 주문만 생성한다
 *
 * ── 상태 전이 ────────────────────────────────────────────────────────────────
 *   paid → preparing → shipped   (기존 Neture 공급자 계약과 동일 전이표)
 *   delivered 전이·부분 발송·분할 배송은 V1 범위 밖.
 *   취소된 주문(cancelled/refunded)은 전이 대상이 아니다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { netureOrderServiceScopeSql } from '../../modules/neture/constants/fulfillment-service-scope.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 100;

/** 공급자가 직접 수행할 수 있는 전이 — 그 외는 거부한다. */
const SUPPLIER_TRANSITIONS: Record<string, string> = {
  accept: 'preparing',
  ship: 'shipped',
};
const REQUIRED_FROM: Record<string, string> = {
  preparing: 'paid',
  shipped: 'preparing',
};

function fail(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ success: false, error: message, code, details });
}

/** createRequireActiveSupplier 가 주입하는 공급자 원장 id (`req.supplierId`) */
function getSupplierId(req: Request): string | null {
  const id = (req as any).supplierId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export class PharmacyHubSupplierOrderController {
  /** GET /supplier/orders */
  static async list(req: Request, res: Response): Promise<any> {
    const supplierId = getSupplierId(req);
    if (!supplierId) return fail(res, 403, 'SUPPLIER_NOT_RESOLVED', '공급자 정보를 확인할 수 없습니다.');

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_LIMIT);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const params: unknown[] = [supplierId, SERVICE_KEY];
    let statusClause = '';
    if (status) {
      params.push(status);
      statusClause = `AND o.status = $${params.length}`;
    }

    try {
      const [countRow] = await AppDataSource.query(
        `SELECT COUNT(DISTINCT o.id)::int AS total
           FROM neture_orders o
           JOIN neture.neture_order_items oi ON oi.order_id = o.id
           JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
          WHERE spo.supplier_id = $1
            AND ${netureOrderServiceScopeSql('o', '$2')}
            ${statusClause}`,
        params,
      );
      const total = countRow?.total ?? 0;

      const items = await AppDataSource.query(
        `SELECT DISTINCT o.id::text AS "orderId", o.order_number AS "orderNumber",
                o.status, o.total_amount AS "totalAmount", o.shipping_fee AS "shippingFee",
                o.final_amount AS "finalAmount", o.orderer_name AS "ordererName",
                o.created_at AS "createdAt",
                (SELECT COUNT(*)::int FROM neture.neture_order_items oi2
                  JOIN supplier_product_offers spo2 ON spo2.id = oi2.product_id::uuid
                 WHERE oi2.order_id = o.id AND spo2.supplier_id = $1) AS "myItemCount"
           FROM neture_orders o
           JOIN neture.neture_order_items oi ON oi.order_id = o.id
           JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
          WHERE spo.supplier_id = $1
            AND ${netureOrderServiceScopeSql('o', '$2')}
            ${statusClause}
          ORDER BY o.created_at DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        params,
      );

      return res.json({
        success: true,
        data: { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
      });
    } catch (error) {
      logger.error('[PharmacyHubSupplierOrder] list error', {
        supplierId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'ORDER_LIST_ERROR', '주문 목록 조회에 실패했습니다.');
    }
  }

  /** GET /supplier/orders/:orderId — 내 상품 라인만 보여준다(타 공급자 라인 비노출) */
  static async detail(req: Request, res: Response): Promise<any> {
    const supplierId = getSupplierId(req);
    if (!supplierId) return fail(res, 403, 'SUPPLIER_NOT_RESOLVED', '공급자 정보를 확인할 수 없습니다.');

    const orderId = String(req.params.orderId ?? '');
    if (!UUID_RE.test(orderId)) return fail(res, 400, 'INVALID_ORDER_ID', '주문 식별자가 올바르지 않습니다.');

    try {
      const [order] = await AppDataSource.query(
        `SELECT DISTINCT o.id::text AS "orderId", o.order_number AS "orderNumber", o.status,
                o.total_amount AS "totalAmount", o.shipping_fee AS "shippingFee",
                o.final_amount AS "finalAmount", o.orderer_name AS "ordererName",
                o.orderer_phone AS "ordererPhone", o.shipping, o.paid_at AS "paidAt",
                o.created_at AS "createdAt"
           FROM neture_orders o
           JOIN neture.neture_order_items oi ON oi.order_id = o.id
           JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
          WHERE o.id = $1::uuid AND spo.supplier_id = $2
            AND ${netureOrderServiceScopeSql('o', '$3')}`,
        [orderId, supplierId, SERVICE_KEY],
      );
      // 타 공급자 주문·타 서비스 주문과 부존재를 구분하지 않는다
      if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', '주문을 찾을 수 없습니다.');

      const items = await AppDataSource.query(
        `SELECT oi.product_id::text AS "offerId", oi.product_name AS "productName",
                oi.quantity, oi.unit_price AS "unitPrice", oi.total_price AS "totalPrice"
           FROM neture.neture_order_items oi
           JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
          WHERE oi.order_id = $1::uuid AND spo.supplier_id = $2`,
        [orderId, supplierId],
      );

      return res.json({ success: true, data: { ...order, items } });
    } catch (error) {
      logger.error('[PharmacyHubSupplierOrder] detail error', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'ORDER_DETAIL_ERROR', '주문 조회에 실패했습니다.');
    }
  }

  /** POST /supplier/orders/:orderId/accept — paid → preparing */
  static accept(req: Request, res: Response): Promise<any> {
    return PharmacyHubSupplierOrderController.transition(req, res, 'accept');
  }

  /** POST /supplier/orders/:orderId/ship — preparing → shipped */
  static ship(req: Request, res: Response): Promise<any> {
    return PharmacyHubSupplierOrderController.transition(req, res, 'ship');
  }

  /**
   * 상태 전이 공통 — 소유·서비스 경계를 **UPDATE 의 WHERE 절에서** 함께 건다.
   * 조회 후 수정하는 2단계 방식은 경합에서 다른 상태를 덮어쓸 수 있어 쓰지 않는다.
   */
  private static async transition(req: Request, res: Response, action: string): Promise<any> {
    const supplierId = getSupplierId(req);
    if (!supplierId) return fail(res, 403, 'SUPPLIER_NOT_RESOLVED', '공급자 정보를 확인할 수 없습니다.');

    const orderId = String(req.params.orderId ?? '');
    if (!UUID_RE.test(orderId)) return fail(res, 400, 'INVALID_ORDER_ID', '주문 식별자가 올바르지 않습니다.');

    const nextStatus = SUPPLIER_TRANSITIONS[action];
    const fromStatus = REQUIRED_FROM[nextStatus];

    try {
      const result = await AppDataSource.query(
        `UPDATE neture_orders o
            SET status = $4, updated_at = NOW()
          WHERE o.id = $1::uuid
            AND o.status = $5
            AND ${netureOrderServiceScopeSql('o', '$3')}
            AND EXISTS (
              SELECT 1 FROM neture.neture_order_items oi
                JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
               WHERE oi.order_id = o.id AND spo.supplier_id = $2
            )
          RETURNING o.id::text AS id, o.status`,
        [orderId, supplierId, SERVICE_KEY, nextStatus, fromStatus],
      );
      // ⚠️ node-postgres UPDATE...RETURNING 은 [rows, rowCount] 형태로 올 수 있다.
      const rows = Array.isArray(result?.[0]) ? result[0] : result;

      if (!rows || rows.length === 0) {
        // 부존재·타 공급자·잘못된 현재 상태를 구분하지 않고, 현재 상태만 힌트로 준다.
        const [current] = await AppDataSource.query(
          `SELECT o.status FROM neture_orders o
             JOIN neture.neture_order_items oi ON oi.order_id = o.id
             JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
            WHERE o.id = $1::uuid AND spo.supplier_id = $2
              AND ${netureOrderServiceScopeSql('o', '$3')}
            LIMIT 1`,
          [orderId, supplierId, SERVICE_KEY],
        );
        if (!current) return fail(res, 404, 'ORDER_NOT_FOUND', '주문을 찾을 수 없습니다.');
        return fail(res, 409, 'INVALID_STATUS_TRANSITION', '현재 상태에서 처리할 수 없습니다.', {
          currentStatus: current.status,
          requiredStatus: fromStatus,
        });
      }

      logger.info('[PharmacyHubSupplierOrder] status transitioned', {
        orderId,
        supplierId,
        action,
        status: nextStatus,
      });
      return res.json({ success: true, data: { orderId, status: nextStatus } });
    } catch (error) {
      logger.error('[PharmacyHubSupplierOrder] transition error', {
        orderId,
        action,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'ORDER_TRANSITION_ERROR', '주문 상태 변경에 실패했습니다.');
    }
  }
}
