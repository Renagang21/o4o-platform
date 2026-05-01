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
 *   GET  /kpa/supplier/event-offers        — 내 제안 OPL 목록 (status, rejectedReason 포함 — WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1)
 *   GET  /kpa/supplier/event-offers/stats  — 공급자 Event Offer 성과 집계 (WO-EVENT-OFFER-SUPPLIER-DASHBOARD-STATS-INTEGRATION-V1)
 *   POST /kpa/supplier/event-offers        — SPO → OPL(is_active=false) 제안 생성
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
// WO-O4O-EVENT-OFFER-CREATE-SERVICE-CAPSULE-V1
import { EventOfferService, EventOfferCreateError } from '../services/event-offer.service.js';
import { resolveOrganizationForEventOffer } from '../helpers/event-offer-organization.helper.js';

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

// WO-O4O-EVENT-OFFER-CREATE-SERVICE-CAPSULE-V1: resolveKpaOrgId() →
// helpers/event-offer-organization.helper.ts의 resolveOrganizationForEventOffer()로 이동.

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
            COALESCE(pm.name, '(상품명 없음)') AS title,
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
              WHERE service_key = $2
            )
          ORDER BY pm.name ASC
          LIMIT 50
        `, [supplierId, SERVICE_KEYS.KPA_GROUPBUY]);

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
            AND co.metadata->>'serviceKey'       = $2
            AND co.status = 'paid'
          WHERE opl.service_key = $2
            AND ns.user_id = $1
        `, [userId, SERVICE_KEYS.KPA_GROUPBUY]);

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

        // WO-O4O-EVENT-OFFER-CORE-REFORM-V1: DB status 필드를 직접 노출
        // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1: rejected_reason, decided_at 노출
        const rows = await dataSource.query(`
          SELECT
            opl.id,
            opl.offer_id        AS "offerId",
            opl.is_active       AS "isActive",
            opl.status,
            opl.created_at      AS "proposedAt",
            opl.decided_at      AS "decidedAt",
            opl.rejected_reason AS "rejectedReason",
            COALESCE(pm.name, '(상품명 없음)')  AS title,
            COALESCE(org.name, '(공급사 없음)') AS "supplierName",
            spo.price_general::numeric          AS price
          FROM organization_product_listings opl
          JOIN supplier_product_offers spo ON spo.id = opl.offer_id
          JOIN neture_suppliers ns          ON ns.id  = spo.supplier_id
          LEFT JOIN organizations org       ON org.id = ns.organization_id
          LEFT JOIN product_masters pm      ON pm.id  = spo.master_id
          WHERE opl.service_key = $2
            AND spo.supplier_id = $1
          ORDER BY opl.created_at DESC
        `, [supplierId, SERVICE_KEYS.KPA_GROUPBUY]);

        const proposals = rows.map((r: any) => ({
          id: r.id,
          offerId: r.offerId,
          title: r.title,
          supplierName: r.supplierName,
          price: r.price,
          isActive: r.isActive,
          status: r.status,   // DB 값 직접 노출 (pending | approved | rejected | canceled)
          proposedAt: r.proposedAt instanceof Date
            ? r.proposedAt.toISOString()
            : String(r.proposedAt || ''),
          decidedAt: r.decidedAt
            ? (r.decidedAt instanceof Date ? r.decidedAt.toISOString() : String(r.decidedAt))
            : null,
          rejectedReason: r.rejectedReason,
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
   *
   * WO-O4O-EVENT-OFFER-CREATE-SERVICE-CAPSULE-V1:
   *   생성 로직은 EventOfferService.createListing()에 캡슐화됨.
   *   controller는 입력 파싱 / organization 결정(helper) / 응답 변환만 담당.
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

        // 공급자 계정 연결 확인 (UI fast-fail)
        const supplierId = await resolveSupplierIdByUser(dataSource, userId);
        if (!supplierId) {
          err(res, 403, 'SUPPLIER_NOT_FOUND');
          return;
        }

        // 조직 결정 (서비스별 정책은 helper에 위치)
        const organizationId = await resolveOrganizationForEventOffer({
          dataSource,
          userId,
          roleType: 'supplier',
          serviceKey: SERVICE_KEYS.KPA_GROUPBUY,
        });
        if (!organizationId) {
          err(res, 503, 'ORG_UNAVAILABLE');
          return;
        }

        // 생성 — 검증/소유권/중복/INSERT 모두 service에서 처리
        const service = new EventOfferService(dataSource);
        const result = await service.createListing({
          offerId,
          serviceKey: SERVICE_KEYS.KPA_GROUPBUY,
          organizationId,
          roleType: 'supplier',
          ownerUserId: userId,
        });

        res.status(201).json({
          success: true,
          data: {
            id: result.id,
            offerId: result.offerId,
            title: result.title,
            supplierName: result.supplierName,
            status: result.status,
            isActive: result.isActive,
            proposedAt: result.createdAt,
          },
        });
      } catch (error: any) {
        if (error instanceof EventOfferCreateError) {
          // service 에러 코드를 controller 응답 코드로 매핑 (기존 에러코드 호환)
          const map: Record<string, keyof typeof ERROR_CODES> = {
            OFFER_NOT_FOUND: 'OFFER_NOT_FOUND',
            OFFER_NOT_OWNED: 'OFFER_NOT_OWNED',
            ALREADY_LISTED: 'ALREADY_PROPOSED',
            INTERNAL_ERROR: 'INTERNAL_ERROR',
          };
          const mapped = map[error.code] ?? 'INTERNAL_ERROR';
          err(res, error.statusCode, mapped);
          return;
        }
        console.error('[supplier/event-offers POST] error:', error);
        err(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  return router;
}
