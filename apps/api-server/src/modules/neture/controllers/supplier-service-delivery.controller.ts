/**
 * Neture Supplier — Service Delivery Controller (공급자 직접 opt-in 축)
 *
 * WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1
 *
 * ## 무엇을 옮겨온 것인가
 *
 * 이 파일은 신규 기능이 아니라 **이전(MOVE)** 이다. 아래 두 컨트롤러가 여기로 합쳐졌다.
 *   - `controllers/pharmacy-hub/PharmacyHubSupplierProductController` (제공 설정)
 *   - `controllers/pharmacy-hub/PharmacyHubSupplierOrderController`   (주문 접수·발송)
 *
 * 옮긴 이유는 자격 축이 틀렸기 때문이다. 기존 경로는
 * `requirePharmacyHubScope('pharmacy-hub:supplier')` 를 요구했다 — 즉 공급자가
 * **Pharmacy-Hub 회원이어야** 자기 상품을 Pharmacy-Hub 에 공급할 수 있었다.
 * 공급자는 Neture 에서만 활동하는 주체이므로 이는 서비스 모델 위반이다
 * (`docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md` §4).
 *
 * 이제 자격은 **Neture 공급자 원장 하나**다:
 *   requireAuth + createRequireActiveSupplier + 본인 소유 Offer
 *
 * SQL·상태 전이·에러 코드는 옮기면서 바꾸지 않았다. 달라진 것은 `serviceKey` 가
 * 하드코딩 상수에서 **경로 파라미터(allowlist 검증)** 가 된 것뿐이다.
 *
 * ## 경로
 *
 *   GET   /neture/supplier/services/:serviceKey/products
 *   PATCH /neture/supplier/services/:serviceKey/products/:offerId/delivery
 *   GET   /neture/supplier/services/:serviceKey/orders
 *   GET   /neture/supplier/services/:serviceKey/orders/:orderId
 *   POST  /neture/supplier/services/:serviceKey/orders/:orderId/accept
 *   POST  /neture/supplier/services/:serviceKey/orders/:orderId/ship
 *
 * `:serviceKey` 는 `SUPPLIER_OPTIN_SERVICE_KEYS` 로 검증한다. 승인 축 서비스
 * (glycopharm · kpa-society · k-cosmetics)는 여기로 들어올 수 없다 — 그 서비스들은
 * `offer_service_approvals` 운영자 승인 흐름이 계약이며, 이 경로가 그 게이트를 우회하면
 * 안 된다.
 *
 * ## 이 컨트롤러가 하지 않는 것
 *
 * 신규 상품 등록 · ProductMaster 생성·수정 · OPL 생성 · 장바구니·결제.
 * 상품 등록·수정은 `/neture/supplier/products` 가 담당한다.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier } from '../middleware/neture-identity.middleware.js';
import { NetureService } from '../neture.service.js';
import { netureOrderServiceScopeSql } from '../constants/fulfillment-service-scope.js';
import {
  isSupplierOptinServiceKey,
  SUPPLIER_OPTIN_SERVICE_LABEL,
} from '../constants/supplier-optin-services.js';
import logger from '../../../utils/logger.js';

const MAX_LIMIT = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** createRequireActiveSupplier 가 주입한 공급자 원장 id (`req.supplierId`) */
function getSupplierId(req: Request): string | null {
  const id = (req as unknown as { supplierId?: string }).supplierId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** 검증을 통과한 serviceKey — 미들웨어가 주입한다. */
function getServiceKey(req: Request): string {
  return (req as unknown as { optinServiceKey?: string }).optinServiceKey ?? '';
}

function deliveryErrorMessage(code?: string): string {
  switch (code) {
    case 'OFFER_NOT_FOUND':
      return '상품을 찾을 수 없습니다.';
    case 'NOT_OWNED':
      return '본인 상품만 변경할 수 있습니다.';
    case 'REGULATED_PRODUCT_NON_PHARMACY_SERVICE':
      return '규제 상품은 약국 전용 서비스에만 연결할 수 있습니다.';
    case 'SERVICE_KEY_REQUIRES_APPROVAL_FLOW':
      return '이 서비스는 승인 흐름을 통해서만 연결할 수 있습니다.';
    default:
      return '제공 설정을 변경할 수 없습니다.';
  }
}

/**
 * `:serviceKey` allowlist 게이트.
 *
 * 승인 축 서비스나 미등록 키는 404 로 막는다(403 이 아니라 404 — 이 경로에 그런
 * 리소스가 없다는 뜻이며, 어떤 키가 존재하는지 탐색 단서를 주지 않는다).
 */
function requireOptinServiceKey(req: Request, res: Response, next: NextFunction): void {
  const key = String(req.params.serviceKey ?? '');
  if (!isSupplierOptinServiceKey(key)) {
    res.status(404).json({
      success: false,
      error: '지원하지 않는 서비스입니다.',
      code: 'SERVICE_NOT_SUPPORTED',
    });
    return;
  }
  (req as unknown as { optinServiceKey?: string }).optinServiceKey = key;
  next();
}

export function createSupplierServiceDeliveryController(dataSource: DataSource): Router {
  // mergeParams — 부모 mount 경로의 :serviceKey 를 받기 위한 것이 아니라, 이 라우터가
  // 자체적으로 :serviceKey 를 선언하므로 필요 없다. 명시적으로 두어 의도를 남긴다.
  const router = Router({ mergeParams: true });
  const requireActiveSupplier = createRequireActiveSupplier(dataSource) as RequestHandler;

  /** 모든 경로 공통 가드 — Pharmacy-Hub membership 은 요구하지 않는다. */
  const guards: RequestHandler[] = [requireAuth, requireOptinServiceKey, requireActiveSupplier];

  // ─────────────────────────────────────────────────────────────────────────
  // 제공 설정 (구 PharmacyHubSupplierProductController)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /:serviceKey/products
   *
   * 내 Offer 목록. 상품 등록 화면이 아니라 **제공 판단 화면**을 위한 투영이므로
   * 공급자 내부 원가/재고 상세가 아닌 제공 판단에 필요한 필드만 담는다.
   *
   * query: page, limit, q(상품명·바코드), delivered=true|false
   */
  router.get('/:serviceKey/products', ...guards, async (req: Request, res: Response) => {
    const supplierId = getSupplierId(req);
    if (!supplierId) {
      return res.status(401).json({ success: false, error: '공급자 계정을 확인할 수 없습니다.', code: 'NO_SUPPLIER' });
    }
    const serviceKey = getServiceKey(req);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_LIMIT);
    const q = String(req.query.q ?? '').trim();
    const deliveredRaw = String(req.query.delivered ?? '').trim();

    // ⚠️ 파라미터는 **쿼리에 실제로 등장하는 것만** 넘긴다. count 쿼리에 쓰이지 않는
    //    placeholder 를 함께 넘기면 "bind message supplies N parameters, but prepared
    //    statement requires M" 로 실패한다. 그래서 where 용 배열과 select 용 배열을 분리한다.
    const whereParams: unknown[] = [supplierId];
    const conditions = ['spo.supplier_id = $1', 'spo.deleted_at IS NULL'];

    if (q) {
      whereParams.push(`%${q}%`);
      conditions.push(`(pm.name ILIKE $${whereParams.length} OR pm.barcode ILIKE $${whereParams.length})`);
    }
    if (deliveredRaw === 'true' || deliveredRaw === 'false') {
      whereParams.push(serviceKey);
      const idx = whereParams.length;
      conditions.push(deliveredRaw === 'true'
        ? `$${idx} = ANY(spo.service_keys)`
        : `NOT ($${idx} = ANY(spo.service_keys))`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    // 목록 쿼리는 SELECT/JOIN 에서도 serviceKey 가 필요하므로 마지막 파라미터로 덧붙인다.
    const listParams: unknown[] = [...whereParams, serviceKey];
    const svc = `$${listParams.length}`;

    try {
      const [countRow] = await dataSource.query(
        `SELECT COUNT(*)::int AS total
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
          ${where}`,
        whereParams,
      );
      const total = countRow?.total ?? 0;

      const rows = await dataSource.query(
        `SELECT
            spo.id                                        AS "offerId",
            spo.master_id                                 AS "masterId",
            pm.name                                       AS "name",
            pm.barcode                                    AS "barcode",
            pm.manufacturer_name                          AS "manufacturerName",
            pm.regulatory_type                            AS "regulatoryType",
            COALESCE(pc.is_regulated, false)              AS "isRegulated",
            spo.price_general                             AS "priceGeneral",
            spo.is_active                                 AS "isActive",
            spo.approval_status                           AS "approvalStatus",
            spo.distribution_type                         AS "distributionType",
            spo.service_keys                              AS "serviceKeys",
            (${svc} = ANY(spo.service_keys))              AS "delivered",
            osp.unit_price                                AS "serviceUnitPrice",
            (SELECT pi.image_url FROM product_images pi
              WHERE pi.master_id = pm.id AND pi.deleted_at IS NULL
              ORDER BY pi.is_primary DESC, (pi.type = 'thumbnail') DESC, pi.sort_order ASC, pi.created_at ASC
              LIMIT 1)                                    AS "imageUrl",
            spo.updated_at                                AS "updatedAt"
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
           LEFT JOIN product_categories pc ON pc.id = pm.category_id
           LEFT JOIN offer_service_prices osp ON osp.offer_id = spo.id AND osp.service_key = ${svc}
          ${where}
          ORDER BY (${svc} = ANY(spo.service_keys)) DESC, spo.updated_at DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        listParams,
      );

      return res.json({
        success: true,
        data: {
          serviceKey,
          serviceLabel: SUPPLIER_OPTIN_SERVICE_LABEL[serviceKey] ?? serviceKey,
          items: rows.map((r: Record<string, any>) => ({
            ...r,
            // 적용 단가 = 서비스별 단가 우선, 없으면 기본 공급가 (기존 우선순위 규칙과 동일)
            effectiveUnitPrice: r.serviceUnitPrice ?? r.priceGeneral,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (error) {
      logger.error('[SupplierServiceDelivery] list error', {
        serviceKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '상품 목록 조회에 실패했습니다.' });
    }
  });

  /**
   * PATCH /:serviceKey/products/:offerId/delivery
   * body: { enabled: boolean, unitPrice?: number|null }
   *
   * 제공 시작 = service_keys 에 serviceKey 멱등 추가 (다른 키 불변)
   * 제공 중지 = service_keys 에서 serviceKey 만 제거 (다른 키 불변)
   */
  router.patch('/:serviceKey/products/:offerId/delivery', ...guards, async (req: Request, res: Response) => {
    const supplierId = getSupplierId(req);
    if (!supplierId) {
      return res.status(401).json({ success: false, error: '공급자 계정을 확인할 수 없습니다.', code: 'NO_SUPPLIER' });
    }
    const serviceKey = getServiceKey(req);

    const offerId = String(req.params.offerId ?? '');
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (typeof body.enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled(boolean) 가 필요합니다.',
        code: 'ENABLED_REQUIRED',
      });
    }

    let unitPrice: number | null | undefined;
    if (body.unitPrice !== undefined) {
      if (body.unitPrice === null) {
        unitPrice = null;
      } else {
        const n = Number(body.unitPrice);
        if (!Number.isFinite(n) || n < 0) {
          return res.status(400).json({ success: false, error: '공급가가 올바르지 않습니다.', code: 'INVALID_UNIT_PRICE' });
        }
        unitPrice = n;
      }
    }

    try {
      const netureService = new NetureService();
      // serviceKey 는 allowlist 를 통과한 값만 쓴다 — 클라이언트가 임의 키를 넣을 수 없다.
      const result = await netureService.setServiceDelivery(offerId, supplierId, serviceKey, {
        enabled: body.enabled,
        unitPrice,
      });

      if (!result.success) {
        const status =
          result.error === 'OFFER_NOT_FOUND' ? 404
          : result.error === 'NOT_OWNED' ? 403
          : 400;
        return res.status(status).json({
          success: false,
          error: result.message ?? deliveryErrorMessage(result.error),
          code: result.error,
        });
      }

      return res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[SupplierServiceDelivery] setDelivery error', {
        serviceKey,
        offerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '제공 설정 변경에 실패했습니다.' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 주문 처리 (구 PharmacyHubSupplierOrderController)
  //
  // 스코프 3중, 항상 함께:
  //   ① neture_orders.service_key = :serviceKey    서비스 경계 (SSOT 헬퍼)
  //   ② supplier_product_offers.supplier_id = 나   소유 경계
  //   ③ 결제 완료 주문만 존재                       bridge 가 paid 주문만 생성한다
  // ─────────────────────────────────────────────────────────────────────────

  /** GET /:serviceKey/orders */
  router.get('/:serviceKey/orders', ...guards, async (req: Request, res: Response) => {
    const supplierId = getSupplierId(req);
    if (!supplierId) return fail(res, 403, 'SUPPLIER_NOT_RESOLVED', '공급자 정보를 확인할 수 없습니다.');
    const serviceKey = getServiceKey(req);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_LIMIT);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const params: unknown[] = [supplierId, serviceKey];
    let statusClause = '';
    if (status) {
      params.push(status);
      statusClause = `AND o.status = $${params.length}`;
    }

    try {
      const [countRow] = await dataSource.query(
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

      const items = await dataSource.query(
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
        data: { serviceKey, items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
      });
    } catch (error) {
      logger.error('[SupplierServiceDelivery] order list error', {
        serviceKey,
        supplierId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'ORDER_LIST_ERROR', '주문 목록 조회에 실패했습니다.');
    }
  });

  /** GET /:serviceKey/orders/:orderId — 내 상품 라인만 보여준다(타 공급자 라인 비노출) */
  router.get('/:serviceKey/orders/:orderId', ...guards, async (req: Request, res: Response) => {
    const supplierId = getSupplierId(req);
    if (!supplierId) return fail(res, 403, 'SUPPLIER_NOT_RESOLVED', '공급자 정보를 확인할 수 없습니다.');
    const serviceKey = getServiceKey(req);

    const orderId = String(req.params.orderId ?? '');
    if (!UUID_RE.test(orderId)) return fail(res, 400, 'INVALID_ORDER_ID', '주문 식별자가 올바르지 않습니다.');

    try {
      const [order] = await dataSource.query(
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
        [orderId, supplierId, serviceKey],
      );
      // 타 공급자 주문·타 서비스 주문과 부존재를 구분하지 않는다
      if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', '주문을 찾을 수 없습니다.');

      const items = await dataSource.query(
        `SELECT oi.product_id::text AS "offerId", oi.product_name AS "productName",
                oi.quantity, oi.unit_price AS "unitPrice", oi.total_price AS "totalPrice"
           FROM neture.neture_order_items oi
           JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
          WHERE oi.order_id = $1::uuid AND spo.supplier_id = $2`,
        [orderId, supplierId],
      );

      return res.json({ success: true, data: { ...order, serviceKey, items } });
    } catch (error) {
      logger.error('[SupplierServiceDelivery] order detail error', {
        serviceKey,
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'ORDER_DETAIL_ERROR', '주문 조회에 실패했습니다.');
    }
  });

  /**
   * 상태 전이 공통 — 소유·서비스 경계를 **UPDATE 의 WHERE 절에서** 함께 건다.
   * 조회 후 수정하는 2단계 방식은 경합에서 다른 상태를 덮어쓸 수 있어 쓰지 않는다.
   */
  async function transition(req: Request, res: Response, action: string): Promise<any> {
    const supplierId = getSupplierId(req);
    if (!supplierId) return fail(res, 403, 'SUPPLIER_NOT_RESOLVED', '공급자 정보를 확인할 수 없습니다.');
    const serviceKey = getServiceKey(req);

    const orderId = String(req.params.orderId ?? '');
    if (!UUID_RE.test(orderId)) return fail(res, 400, 'INVALID_ORDER_ID', '주문 식별자가 올바르지 않습니다.');

    const nextStatus = SUPPLIER_TRANSITIONS[action];
    const fromStatus = REQUIRED_FROM[nextStatus];

    try {
      const result = await dataSource.query(
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
        [orderId, supplierId, serviceKey, nextStatus, fromStatus],
      );
      // ⚠️ node-postgres UPDATE...RETURNING 은 [rows, rowCount] 형태로 올 수 있다.
      const rows = Array.isArray(result?.[0]) ? result[0] : result;

      if (!rows || rows.length === 0) {
        // 부존재·타 공급자·잘못된 현재 상태를 구분하지 않고, 현재 상태만 힌트로 준다.
        const [current] = await dataSource.query(
          `SELECT o.status FROM neture_orders o
             JOIN neture.neture_order_items oi ON oi.order_id = o.id
             JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
            WHERE o.id = $1::uuid AND spo.supplier_id = $2
              AND ${netureOrderServiceScopeSql('o', '$3')}
            LIMIT 1`,
          [orderId, supplierId, serviceKey],
        );
        if (!current) return fail(res, 404, 'ORDER_NOT_FOUND', '주문을 찾을 수 없습니다.');
        return fail(res, 409, 'INVALID_STATUS_TRANSITION', '현재 상태에서 처리할 수 없습니다.', {
          currentStatus: current.status,
          requiredStatus: fromStatus,
        });
      }

      logger.info('[SupplierServiceDelivery] order status transitioned', {
        serviceKey,
        orderId,
        supplierId,
        action,
        status: nextStatus,
      });
      return res.json({ success: true, data: { orderId, status: nextStatus } });
    } catch (error) {
      logger.error('[SupplierServiceDelivery] order transition error', {
        serviceKey,
        orderId,
        action,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, 500, 'ORDER_TRANSITION_ERROR', '주문 상태 변경에 실패했습니다.');
    }
  }

  /** POST /:serviceKey/orders/:orderId/accept — paid → preparing */
  router.post('/:serviceKey/orders/:orderId/accept', ...guards, (req: Request, res: Response) => transition(req, res, 'accept'));

  /** POST /:serviceKey/orders/:orderId/ship — preparing → shipped */
  router.post('/:serviceKey/orders/:orderId/ship', ...guards, (req: Request, res: Response) => transition(req, res, 'ship'));

  return router;
}
