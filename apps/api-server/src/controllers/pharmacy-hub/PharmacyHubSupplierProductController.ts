/**
 * Pharmacy-Hub Supplier Product Delivery Controller
 *
 * WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 §6-A
 *
 * 공급자가 **이미 보유한** SupplierProductOffer 를 Pharmacy-Hub 제공 대상으로 켜고/끈다.
 *
 *   GET   /api/v1/pharmacy-hub/supplier/products                    내 Offer + Pharmacy-Hub 제공 여부
 *   PATCH /api/v1/pharmacy-hub/supplier/products/:offerId/delivery  제공 시작 / 중지 (+서비스별 공급가)
 *
 * 이 컨트롤러가 하지 않는 것 (WO §9):
 *   신규 상품 등록 · ProductMaster 생성·수정 · 운영자 상품 승인 · OPL 생성 · 주문/장바구니.
 *   상품 등록·수정은 기존 Neture 공급자 원장(/api/v1/neture/supplier/products)이 담당한다.
 *
 * 자격 (WO §4.2) — 라우터에서 미들웨어로 강제한다:
 *   requireAuth
 *   + requirePharmacyHubScope('pharmacy-hub:supplier')  → membership active + 역할 보유
 *   + createRequireActiveSupplier                        → Neture 공급자 원장 존재 + ACTIVE
 *   + 본인 소유 Offer                                    → setServiceDelivery 의 NOT_OWNED 검증
 *
 * serviceKey 는 서버가 'pharmacy-hub' 로 강제한다 — 클라이언트가 타 서비스를 지정할 수 없다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { NetureService } from '../../modules/neture/neture.service.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
const MAX_LIMIT = 100;

/** 미들웨어(createRequireActiveSupplier)가 주입한 supplierId */
function getSupplierId(req: Request): string | null {
  const id = (req as unknown as { supplierId?: string }).supplierId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export class PharmacyHubSupplierProductController {
  /**
   * GET /api/v1/pharmacy-hub/supplier/products
   *
   * 내 Offer 목록. 상품 등록 화면이 아니라 **제공 설정 화면**을 위한 투영이므로
   * 공급자 내부 원가/재고 상세가 아닌 제공 판단에 필요한 필드만 담는다.
   *
   * query: page, limit, q(상품명·바코드), delivered=true|false
   */
  static async list(req: Request, res: Response): Promise<any> {
    const supplierId = getSupplierId(req);
    if (!supplierId) {
      return res.status(401).json({ success: false, error: '공급자 계정을 확인할 수 없습니다.', code: 'NO_SUPPLIER' });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_LIMIT);
    const q = String(req.query.q ?? '').trim();
    const deliveredRaw = String(req.query.delivered ?? '').trim();

    const params: unknown[] = [supplierId, SERVICE_KEY];
    const conditions = ['spo.supplier_id = $1', 'spo.deleted_at IS NULL'];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(pm.name ILIKE $${params.length} OR pm.barcode ILIKE $${params.length})`);
    }
    if (deliveredRaw === 'true') {
      conditions.push(`$2 = ANY(spo.service_keys)`);
    } else if (deliveredRaw === 'false') {
      conditions.push(`NOT ($2 = ANY(spo.service_keys))`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    try {
      const [countRow] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS total
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
          ${where}`,
        params,
      );
      const total = countRow?.total ?? 0;

      const rows = await AppDataSource.query(
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
            ($2 = ANY(spo.service_keys))                  AS "deliveredToPharmacyHub",
            osp.unit_price                                AS "pharmacyHubUnitPrice",
            (SELECT pi.image_url FROM product_images pi
              WHERE pi.master_id = pm.id AND pi.deleted_at IS NULL
              ORDER BY pi.is_primary DESC, (pi.type = 'thumbnail') DESC, pi.sort_order ASC, pi.created_at ASC
              LIMIT 1)                                    AS "imageUrl",
            spo.updated_at                                AS "updatedAt"
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
           LEFT JOIN product_categories pc ON pc.id = pm.category_id
           LEFT JOIN offer_service_prices osp ON osp.offer_id = spo.id AND osp.service_key = $2
          ${where}
          ORDER BY ($2 = ANY(spo.service_keys)) DESC, spo.updated_at DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        params,
      );

      return res.json({
        success: true,
        data: {
          items: rows.map((r: Record<string, any>) => ({
            ...r,
            // 적용 단가 = 서비스별 단가 우선, 없으면 기본 공급가 (기존 우선순위 규칙과 동일)
            effectiveUnitPrice: r.pharmacyHubUnitPrice ?? r.priceGeneral,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubSupplierProduct] list error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '상품 목록 조회에 실패했습니다.' });
    }
  }

  /**
   * PATCH /api/v1/pharmacy-hub/supplier/products/:offerId/delivery
   * body: { enabled: boolean, unitPrice?: number|null }
   *
   * 제공 시작 = service_keys 에 'pharmacy-hub' 멱등 추가 (다른 키 불변)
   * 제공 중지 = service_keys 에서 'pharmacy-hub' 만 제거 (다른 키 불변)
   */
  static async setDelivery(req: Request, res: Response): Promise<any> {
    const supplierId = getSupplierId(req);
    if (!supplierId) {
      return res.status(401).json({ success: false, error: '공급자 계정을 확인할 수 없습니다.', code: 'NO_SUPPLIER' });
    }

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
      // serviceKey 는 서버 강제 — 클라이언트 입력을 쓰지 않는다.
      const result = await netureService.setServiceDelivery(offerId, supplierId, SERVICE_KEY, {
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
          error: result.message ?? PharmacyHubSupplierProductController.errorMessage(result.error),
          code: result.error,
        });
      }

      return res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[PharmacyHubSupplierProduct] setDelivery error', {
        offerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '제공 설정 변경에 실패했습니다.' });
    }
  }

  private static errorMessage(code?: string): string {
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
}
