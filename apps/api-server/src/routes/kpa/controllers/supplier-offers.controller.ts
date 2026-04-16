/**
 * KPA Supplier Offers Controller
 *
 * WO-EVENT-OFFER-SUPPLIER-PROPOSAL-PATH-V1
 *
 * Neture 공급자(neture_suppliers.user_id 매핑)가
 * 자신의 APPROVED SPO를 KPA 이벤트로 제안하는 경로.
 *
 * 공급자 역할: "제안자" (노출 관리 X)
 * 운영자 역할: "노출 관리자" (is_active 토글)
 *
 * API:
 *   GET  /kpa/supplier/my-offers           — 제안 가능한 SPO 목록
 *   GET  /kpa/supplier/event-offers        — 내 제안 OPL 목록
 *   GET  /kpa/supplier/event-offers/stats  — 공급자 Event Offer 성과 집계 (WO-EVENT-OFFER-SUPPLIER-DASHBOARD-STATS-INTEGRATION-V1)
 *   POST /kpa/supplier/event-offers        — SPO → OPL(is_active=false) 제안 생성
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationProductListing } from '../../../modules/store-core/entities/organization-product-listing.entity.js';

type AuthMiddleware = RequestHandler;

// Error codes
const ERROR_CODES = {
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' },
  SUPPLIER_NOT_FOUND: { code: 'SUPPLIER_NOT_FOUND', message: '공급자 계정이 연결되어 있지 않습니다.' },
  OFFER_NOT_FOUND: { code: 'OFFER_NOT_FOUND', message: '공급자 상품을 찾을 수 없습니다.' },
  OFFER_NOT_OWNED: { code: 'OFFER_NOT_OWNED', message: '해당 상품에 대한 권한이 없습니다.' },
  ALREADY_PROPOSED: { code: 'ALREADY_PROPOSED', message: '이미 제안된 이벤트 상품입니다.' },
  ORG_UNAVAILABLE: { code: 'ORG_UNAVAILABLE', message: 'KPA 조직 정보를 확인할 수 없습니다. 관리자에게 문의하세요.' },
  INVALID_PARAMS: { code: 'INVALID_PARAMS', message: '필수 파라미터가 없습니다.' },
} as const;

function err(res: Response, status: number, code: keyof typeof ERROR_CODES): void {
  res.status(status).json({ success: false, error: ERROR_CODES[code] });
}

/** neture_suppliers.user_id → supplierId 조회 */
async function resolveSupplierIdByUser(dataSource: DataSource, userId: string): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT id FROM neture_suppliers WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0]?.id ?? null;
}

/**
 * KPA 운영자 조직 ID 조회
 * 공급자 제안 OPL의 organization_id로 사용 (KPA Society 관리 조직)
 */
async function resolveKpaOrgId(dataSource: DataSource): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT organization_id FROM kpa_members WHERE role = 'operator' AND organization_id IS NOT NULL LIMIT 1`
  );
  return rows[0]?.organization_id ?? null;
}

export function createSupplierOffersController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  router.use(requireAuth);

  /**
   * GET /kpa/supplier/my-offers
   * 제안 가능한 내 SPO 목록
   * - APPROVED + is_active=true
   * - 이미 kpa-groupbuy OPL에 등록된 offer 제외
   */
  router.get(
    '/my-offers',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = (req as any).user?.id;
        const supplierId = await resolveSupplierIdByUser(dataSource, userId);

        if (!supplierId) {
          err(res, 403, 'SUPPLIER_NOT_FOUND');
          return;
        }

        const offers = await dataSource.query(`
          SELECT
            spo.id,
            spo.master_id AS "masterId",
            COALESCE(pm.marketing_name, '(상품명 없음)') AS title,
            COALESCE(org.name, '(공급사 없음)') AS "supplierName",
            spo.price_general::numeric AS price,
            spo.approval_status AS "approvalStatus"
          FROM supplier_product_offers spo
          JOIN neture_suppliers ns ON ns.id = spo.supplier_id
          LEFT JOIN organizations org ON org.id = ns.organization_id
          LEFT JOIN product_masters pm ON pm.id = spo.master_id
          WHERE spo.supplier_id = $1
            AND spo.approval_status = 'APPROVED'
            AND spo.is_active = true
            AND spo.id NOT IN (
              SELECT offer_id
              FROM organization_product_listings
              WHERE service_key = 'kpa-groupbuy'
            )
          ORDER BY pm.marketing_name ASC
          LIMIT 50
        `, [supplierId]);

        res.json({ success: true, data: { offers, supplierId } });
      } catch (error: any) {
        console.error('[supplier/my-offers] error:', error);
        err(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * GET /kpa/supplier/event-offers/stats
   * 공급자 기준 Event Offer 성과 집계
   * WO-EVENT-OFFER-SUPPLIER-DASHBOARD-STATS-INTEGRATION-V1
   *
   * 집계 기준:
   *   organization_product_listings (OPL, service_key='kpa-groupbuy')
   *   → supplier_product_offers → neture_suppliers (user_id 일치)
   *   → checkout_orders (metadata.productListingId, serviceKey='kpa-groupbuy', status='paid')
   */
  router.get(
    '/event-offers/stats',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = (req as any).user?.id;
        const supplierId = await resolveSupplierIdByUser(dataSource, userId);

        if (!supplierId) {
          err(res, 403, 'SUPPLIER_NOT_FOUND');
          return;
        }

        const [statsRow] = await dataSource.query(`
          SELECT
            COUNT(DISTINCT opl.id)::int                                              AS "totalOffers",
            COUNT(DISTINCT CASE WHEN opl.is_active = true  THEN opl.id END)::int    AS "activeOffers",
            COUNT(DISTINCT CASE WHEN opl.is_active = false THEN opl.id END)::int    AS "inactiveOffers",
            COUNT(co.id)::int                                                        AS "totalOrders",
            COALESCE(SUM(co."totalAmount"), 0)::numeric                             AS "totalRevenue"
          FROM organization_product_listings opl
          JOIN supplier_product_offers spo ON spo.id = opl.offer_id
          JOIN neture_suppliers ns          ON ns.id  = spo.supplier_id
          LEFT JOIN checkout_orders co
            ON  co.metadata->>'productListingId' = opl.id::text
            AND co.metadata->>'serviceKey'       = 'kpa-groupbuy'
            AND co.status = 'paid'
          WHERE opl.service_key = 'kpa-groupbuy'
            AND ns.user_id = $1
        `, [userId]);

        res.json({
          success: true,
          data: {
            totalOffers:    statsRow?.totalOffers    ?? 0,
            activeOffers:   statsRow?.activeOffers   ?? 0,
            inactiveOffers: statsRow?.inactiveOffers ?? 0,
            totalOrders:    statsRow?.totalOrders    ?? 0,
            totalRevenue:   Number(statsRow?.totalRevenue ?? 0),
          },
        });
      } catch (error: any) {
        console.error('[supplier/event-offers/stats] error:', error);
        err(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * GET /kpa/supplier/event-offers
   * 내가 제안한 OPL 목록 (is_active=true/false 모두)
   */
  router.get(
    '/event-offers',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = (req as any).user?.id;
        const supplierId = await resolveSupplierIdByUser(dataSource, userId);

        if (!supplierId) {
          err(res, 403, 'SUPPLIER_NOT_FOUND');
          return;
        }

        const rows = await dataSource.query(`
          SELECT
            opl.id,
            opl.offer_id AS "offerId",
            opl.is_active AS "isActive",
            opl.created_at AS "proposedAt",
            COALESCE(pm.marketing_name, '(상품명 없음)') AS title,
            COALESCE(org.name, '(공급사 없음)') AS "supplierName",
            spo.price_general::numeric AS price
          FROM organization_product_listings opl
          JOIN supplier_product_offers spo ON spo.id = opl.offer_id
          JOIN neture_suppliers ns ON ns.id = spo.supplier_id
          LEFT JOIN organizations org ON org.id = ns.organization_id
          LEFT JOIN product_masters pm ON pm.id = spo.master_id
          WHERE opl.service_key = 'kpa-groupbuy'
            AND spo.supplier_id = $1
          ORDER BY opl.created_at DESC
        `, [supplierId]);

        const proposals = rows.map((r: any) => ({
          id: r.id,
          offerId: r.offerId,
          title: r.title,
          supplierName: r.supplierName,
          price: r.price,
          isActive: r.isActive,
          status: r.isActive ? 'active' : 'pending',
          proposedAt: r.proposedAt instanceof Date
            ? r.proposedAt.toISOString()
            : String(r.proposedAt || ''),
        }));

        res.json({ success: true, data: proposals });
      } catch (error: any) {
        console.error('[supplier/event-offers GET] error:', error);
        err(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * POST /kpa/supplier/event-offers
   * SPO → KPA 이벤트 제안 (OPL is_active=false 생성)
   */
  router.post(
    '/event-offers',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = (req as any).user?.id;
        const { offerId } = req.body;

        if (!offerId) {
          err(res, 400, 'INVALID_PARAMS');
          return;
        }

        // 공급자 확인
        const supplierId = await resolveSupplierIdByUser(dataSource, userId);
        if (!supplierId) {
          err(res, 403, 'SUPPLIER_NOT_FOUND');
          return;
        }

        // offer 존재 및 소유권 확인
        const offerRows = await dataSource.query(
          `SELECT spo.id, spo.master_id, spo.price_general,
                  spo.approval_status, spo.is_active,
                  pm.marketing_name, org.name AS org_name
           FROM supplier_product_offers spo
           JOIN neture_suppliers ns ON ns.id = spo.supplier_id
           LEFT JOIN organizations org ON org.id = ns.organization_id
           LEFT JOIN product_masters pm ON pm.id = spo.master_id
           WHERE spo.id = $1`,
          [offerId]
        );

        if (!offerRows.length) {
          err(res, 404, 'OFFER_NOT_FOUND');
          return;
        }

        const offer = offerRows[0];

        // 소유권 검증 — 이 offer가 요청 공급자 소유인지 (join으로 확인)
        const ownerRows = await dataSource.query(
          `SELECT spo.id FROM supplier_product_offers spo
           JOIN neture_suppliers ns ON ns.id = spo.supplier_id
           WHERE spo.id = $1 AND ns.user_id = $2 LIMIT 1`,
          [offerId, userId]
        );
        if (!ownerRows.length) {
          err(res, 403, 'OFFER_NOT_OWNED');
          return;
        }

        // 중복 제안 방지
        const dupCheck = await dataSource.query(
          `SELECT id FROM organization_product_listings
           WHERE offer_id = $1 AND service_key = 'kpa-groupbuy' LIMIT 1`,
          [offerId]
        );
        if (dupCheck.length) {
          err(res, 409, 'ALREADY_PROPOSED');
          return;
        }

        // KPA 조직 ID 조회
        const orgId = await resolveKpaOrgId(dataSource);
        if (!orgId) {
          err(res, 503, 'ORG_UNAVAILABLE');
          return;
        }

        // OPL 생성 (is_active=false — 운영자가 활성화 필요)
        const listingRepo = dataSource.getRepository(OrganizationProductListing);
        const listing = listingRepo.create({
          organization_id: orgId,
          master_id: offer.master_id,
          offer_id: offerId,
          service_key: 'kpa-groupbuy',
          is_active: false,
          price: offer.price_general ? Number(offer.price_general) : null,
        } as Partial<OrganizationProductListing>);

        const saved = await listingRepo.save(listing);
        const proposedAt = (saved.created_at instanceof Date
          ? saved.created_at
          : new Date(saved.created_at)
        ).toISOString();

        res.status(201).json({
          success: true,
          data: {
            id: saved.id,
            offerId,
            title: offer.marketing_name || '(상품명 없음)',
            supplierName: offer.org_name || '(공급사 없음)',
            status: 'pending',
            isActive: false,
            proposedAt,
          },
        });
      } catch (error: any) {
        console.error('[supplier/event-offers POST] error:', error);
        err(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  return router;
}
