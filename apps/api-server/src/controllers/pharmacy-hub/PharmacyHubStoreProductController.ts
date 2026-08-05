/**
 * Pharmacy-Hub Store Owner Product Browse Controller
 *
 * WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 §6-D
 *
 *   GET /api/v1/pharmacy-hub/store-owner/products            제공 상품 목록
 *   GET /api/v1/pharmacy-hub/store-owner/products/:offerId    상세
 *
 * 자격 (WO §4.3) — 라우터에서 강제:
 *   requireAuth + requirePharmacyHubScope('pharmacy-hub:store_owner')
 *   → service_memberships(pharmacy-hub).status='active' + 역할 보유.
 *   미가입 / pending / rejected / suspended 는 guard 에서 차단된다.
 *
 * ── 노출 게이트 (WO §4.5 / §D) ────────────────────────────────────────────────
 * 기준은 매장 카탈로그 SSOT(pharmacy-products.controller.ts buildServiceApprovalGateSql)와
 * 같은 형태이며, **per-service 축만 교체**한다:
 *
 *   기존 서비스 : (distribution_type='PUBLIC' OR offer_service_approvals.approved for svc)
 *   Pharmacy-Hub: 'pharmacy-hub' = ANY(spo.service_keys)      ← 공급자 직접 opt-in
 *
 * 나머지 공통 안전 조건은 그대로 유지한다 (제거하지 않는다):
 *   spo.is_active = true            공급자/승인 흐름이 관리하는 활성 플래그
 *   spo.deleted_at IS NULL          soft delete 제외
 *   neture_suppliers.status='ACTIVE' 공급자 자격
 *   product_masters 유효(status ACTIVE)
 *   distribution_type <> 'PRIVATE'  PRIVATE 은 allowed_seller_ids 매장범위 모델이며
 *                                   Pharmacy-Hub 에는 아직 그 축이 없다 → 방어적으로 제외
 *
 * `approval_status` 는 조회 조건에 넣지 않는다. 이 값은 offer_service_approvals(승인 대상
 * 3키) 파생 필드이고, 매장 카탈로그 SSOT 도 이를 게이트로 쓰지 않는다. Pharmacy-Hub 는
 * 상품별 운영자 승인이 없으므로(WO §4.5) 여기서 요구하면 제공이 영구히 불가능해진다.
 *
 * 의약품 경계 (WO §4.6):
 *   ① 규제 상품이 pharmacy-hub 에 연결되려면 service_audience_policies 가 pharmacy-hub 를
 *      약국 대상 서비스로 표시해야 한다 (setServiceDelivery 게이트).
 *   ② 조회는 Pharmacy-Hub active 약국 경영자 scope 안에서만 가능하다 (공개/비회원 경로 없음).
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { PHARMACY_HUB_OFFER_EXPOSURE_GATE_SQL } from './offer-exposure.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
const MAX_LIMIT = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 노출 게이트 SSOT — 목록·카운트·상세, 그리고 취급 등록(handled-products apply)이 같은 조건을 쓴다.
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1 에서 offer-exposure.ts 로 추출했다 ($1 = 'pharmacy-hub').
 */
const EXPOSURE_GATE_SQL = PHARMACY_HUB_OFFER_EXPOSURE_GATE_SQL;

/** 응답 투영 SSOT — 공급자 내부 정보(원가·재고·정산·연락처)는 담지 않는다. */
const SELECT_FIELDS = `
    spo.id                              AS "offerId",
    spo.master_id                       AS "masterId",
    pm.name                             AS "name",
    pm.barcode                          AS "barcode",
    pm.brand_name                       AS "brandName",
    pm.manufacturer_name                AS "manufacturerName",
    pm.regulatory_type                  AS "regulatoryType",
    pm.regulatory_name                  AS "regulatoryName",
    pm.mfds_permit_number               AS "mfdsPermitNumber",
    pm.specification                    AS "specification",
    COALESCE(pc.is_regulated, false)    AS "isRegulated",
    pc.name                             AS "categoryName",
    ns.id                               AS "supplierId",
    COALESCE(org.name, '공급자')         AS "supplierName",
    spo.price_general                   AS "priceGeneral",
    osp.unit_price                      AS "pharmacyHubUnitPrice",
    COALESCE(osp.unit_price, spo.price_general) AS "effectiveUnitPrice",
    spo.is_active                       AS "isActive",
    (SELECT pi.image_url FROM product_images pi
      WHERE pi.master_id = pm.id AND pi.deleted_at IS NULL
      ORDER BY pi.is_primary DESC, (pi.type = 'thumbnail') DESC, pi.sort_order ASC, pi.created_at ASC
      LIMIT 1)                          AS "imageUrl",
    spo.updated_at                      AS "updatedAt"`;

const FROM_SQL = `
    FROM supplier_product_offers spo
    JOIN neture_suppliers ns ON ns.id = spo.supplier_id
    JOIN product_masters pm  ON pm.id = spo.master_id
    LEFT JOIN organizations org ON org.id = ns.organization_id
    LEFT JOIN product_categories pc ON pc.id = pm.category_id
    LEFT JOIN offer_service_prices osp ON osp.offer_id = spo.id AND osp.service_key = $1`;

export class PharmacyHubStoreProductController {
  /**
   * GET /api/v1/pharmacy-hub/store-owner/products
   * query: page, limit, q(상품명·바코드·제조사), regulatoryType(상품 분류), supplierId
   */
  static async list(req: Request, res: Response): Promise<any> {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_LIMIT);
    const q = String(req.query.q ?? '').trim();
    const regulatoryType = String(req.query.regulatoryType ?? '').trim();
    const supplierId = String(req.query.supplierId ?? '').trim();

    const params: unknown[] = [SERVICE_KEY];
    const extra: string[] = [];

    if (q) {
      params.push(`%${q}%`);
      extra.push(`(pm.name ILIKE $${params.length} OR pm.barcode ILIKE $${params.length} OR pm.manufacturer_name ILIKE $${params.length})`);
    }
    if (regulatoryType) {
      params.push(regulatoryType);
      extra.push(`pm.regulatory_type = $${params.length}`);
    }
    if (supplierId) {
      if (!UUID_RE.test(supplierId)) {
        return res.status(400).json({ success: false, error: '공급자 식별자가 올바르지 않습니다.', code: 'INVALID_SUPPLIER_ID' });
      }
      params.push(supplierId);
      extra.push(`ns.id = $${params.length}::uuid`);
    }

    const where = `WHERE ${EXPOSURE_GATE_SQL}${extra.length ? `\n    AND ${extra.join('\n    AND ')}` : ''}`;

    try {
      const [countRow] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS total ${FROM_SQL} ${where}`,
        params,
      );
      const total = countRow?.total ?? 0;

      const items = await AppDataSource.query(
        `SELECT ${SELECT_FIELDS} ${FROM_SQL} ${where}
          ORDER BY spo.updated_at DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        params,
      );

      return res.json({
        success: true,
        data: {
          items,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubStoreProduct] list error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '상품 목록 조회에 실패했습니다.' });
    }
  }

  /**
   * GET /api/v1/pharmacy-hub/store-owner/products/:offerId
   *
   * 후속 WO(장바구니·주문)가 연결할 수 있도록 offerId / masterId / supplierId / 적용 단가를
   * 상세 응답에 포함한다. 이번 WO 에서는 담기·주문·취급등록 액션을 제공하지 않는다.
   */
  static async detail(req: Request, res: Response): Promise<any> {
    const offerId = String(req.params.offerId ?? '');
    if (!UUID_RE.test(offerId)) {
      return res.status(400).json({ success: false, error: '상품 식별자가 올바르지 않습니다.', code: 'INVALID_OFFER_ID' });
    }

    try {
      const [row] = await AppDataSource.query(
        `SELECT ${SELECT_FIELDS},
                spo.business_short_description  AS "businessShortDescription",
                spo.business_detail_description AS "businessDetailDescription"
         ${FROM_SQL}
          WHERE ${EXPOSURE_GATE_SQL}
            AND spo.id = $2::uuid`,
        [SERVICE_KEY, offerId],
      );

      if (!row) {
        // 게이트 탈락과 부존재를 구분하지 않는다 (제공 대상이 아닌 상품의 존재를 노출하지 않음)
        return res.status(404).json({ success: false, error: '상품을 찾을 수 없습니다.', code: 'PRODUCT_NOT_FOUND' });
      }

      const identifiers = await AppDataSource.query(
        `SELECT identifier_type AS "type", identifier_value AS "value", is_primary AS "isPrimary"
           FROM product_identifiers
          WHERE product_master_id = $1 AND deleted_at IS NULL
          ORDER BY is_primary DESC, identifier_type ASC
          LIMIT 20`,
        [row.masterId],
      );

      return res.json({ success: true, data: { ...row, identifiers } });
    } catch (error) {
      logger.error('[PharmacyHubStoreProduct] detail error', {
        offerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '상품 조회에 실패했습니다.' });
    }
  }
}
