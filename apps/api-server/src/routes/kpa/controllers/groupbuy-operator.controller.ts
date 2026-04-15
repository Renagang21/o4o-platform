/**
 * KPA Groupbuy Operator Controller
 *
 * WO-KPA-GROUPBUY-OPERATOR-UI-V1: 공동구매 운영자용 API
 * WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1: 안정화
 * WO-KPA-GROUPBUY-SUPPLIER-STATS-DRYRUN-V1: 공급자 통계 연계 드라이런
 * WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: requireKpaScope('kpa:operator') 표준화
 * WO-EVENT-OFFER-MINIMAL-COMPLETION-V1: stub → OrganizationProductListing 실 구현
 * WO-EVENT-OFFER-OPERATOR-UX-REFINE-V1: 운영자 UX 개선 (available-offers, 중복방지, 조직 자동주입)
 *
 * 책임 경계:
 * - 상품 노출 관리 (추가/제거/토글/순서)
 * - 집계 통계 조회
 * - 공급자 통계 연계 상태 확인
 * - 주문/결제/배송은 공급자 시스템에서 처리 (본 API 범위 외)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationProductListing } from '../../../modules/store-core/entities/organization-product-listing.entity.js';
import { supplierStatsService } from '../services/supplier-stats.service.js';
import { KPA_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../../../common/middleware/membership-guard.middleware.js';

type AuthMiddleware = RequestHandler;

// Types
interface GroupbuyProduct {
  id: string;
  offerId: string;
  title: string;
  supplierName: string;
  conditionSummary: string;
  orderCount: number;
  participantCount: number;
  isVisible: boolean;
  order: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'ended';
}

interface AvailableOffer {
  id: string;
  title: string;
  supplierName: string;
  price: number | null;
}

interface GroupbuyStats {
  totalOrders: number;
  totalParticipants: number;
  dailyOrders: { date: string; count: number }[];
  productOrders: { productId: string; productName: string; orderCount: number }[];
  cachedAt?: string;
  cacheValidUntil?: string;
}

// Error codes
const ERROR_CODES = {
  STATS_UNAVAILABLE: { code: 'STATS_UNAVAILABLE', message: '통계 집계 중입니다. 잠시 후 다시 시도해 주세요.' },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' },
  NOT_FOUND: { code: 'NOT_FOUND', message: '상품을 찾을 수 없습니다.' },
  INVALID_PARAMS: { code: 'INVALID_PARAMS', message: '필수 파라미터가 없습니다.' },
  OFFER_NOT_FOUND: { code: 'OFFER_NOT_FOUND', message: '공급자 상품을 찾을 수 없습니다.' },
  ALREADY_REGISTERED: { code: 'ALREADY_REGISTERED', message: '이미 등록된 이벤트 상품입니다.' },
  ORG_NOT_FOUND: { code: 'ORG_NOT_FOUND', message: '운영자 조직 정보를 찾을 수 없습니다.' },
} as const;

function createErrorResponse(
  res: Response,
  status: number,
  errorCode: keyof typeof ERROR_CODES
): void {
  res.status(status).json({
    success: false,
    error: ERROR_CODES[errorCode],
  });
}

/** kpa_members에서 운영자 organization_id 조회 */
async function resolveOperatorOrgId(
  dataSource: DataSource,
  userId: string
): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT organization_id FROM kpa_members WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0]?.organization_id ?? null;
}

const requireKpaScope = createMembershipScopeGuard(KPA_SCOPE_CONFIG);

export function createGroupbuyOperatorController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();

  router.use(requireAuth);
  router.use(requireKpaScope('kpa:operator'));

  /**
   * GET /groupbuy-admin/available-offers
   * WO-EVENT-OFFER-OPERATOR-UX-REFINE-V1
   * 등록 가능한 공급자 상품 목록 + 운영자 조직 ID 반환
   * - APPROVED & is_active인 supplier_product_offers
   * - 이미 kpa-groupbuy에 등록된 offer는 제외
   */
  router.get(
    '/available-offers',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = (req as any).user?.id;
        const organizationId = await resolveOperatorOrgId(dataSource, userId);

        const offers: AvailableOffer[] = await dataSource.query(`
          SELECT
            spo.id,
            COALESCE(pm.marketing_name, '(상품명 없음)') AS title,
            COALESCE(org.name, '(공급사 없음)') AS "supplierName",
            spo.price_general::numeric AS price
          FROM supplier_product_offers spo
          LEFT JOIN product_masters pm ON pm.id = spo.master_id
          LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
          LEFT JOIN organizations org ON org.id = ns.organization_id
          WHERE spo.approval_status = 'APPROVED'
            AND spo.is_active = true
            AND spo.id NOT IN (
              SELECT offer_id
              FROM organization_product_listings
              WHERE service_key = 'kpa-groupbuy'
            )
          ORDER BY pm.marketing_name ASC
          LIMIT 100
        `);

        res.json({
          success: true,
          data: {
            organizationId: organizationId ?? null,
            offers,
          },
        });
      } catch (error: any) {
        console.error('Failed to get available offers:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * GET /groupbuy-admin/products
   * 이벤트 상품 목록 (운영자용) — offerId 포함
   */
  router.get(
    '/products',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const rows = await dataSource.query(`
          SELECT
            opl.id,
            opl.offer_id AS "offerId",
            opl.is_active AS "isVisible",
            opl.created_at AS "startDate",
            COALESCE(pm.marketing_name, '(상품명 없음)') AS title,
            COALESCE(org.name, '(공급사 없음)') AS "supplierName",
            CONCAT('단가: ', COALESCE(spo.price_general::text, '미정'), '원') AS "conditionSummary",
            COALESCE(oc.order_count, 0)::int AS "orderCount",
            COALESCE(oc.participant_count, 0)::int AS "participantCount"
          FROM organization_product_listings opl
          LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
          LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
          LEFT JOIN organizations org ON org.id = ns.organization_id
          LEFT JOIN product_masters pm ON pm.id = opl.master_id
          LEFT JOIN (
            SELECT
              metadata->>'productListingId' AS listing_id,
              COUNT(*)::int AS order_count,
              COUNT(DISTINCT "buyerId")::int AS participant_count
            FROM checkout_orders
            WHERE metadata->>'serviceKey' = 'kpa-groupbuy'
            GROUP BY metadata->>'productListingId'
          ) oc ON oc.listing_id = opl.id::text
          WHERE opl.service_key = 'kpa-groupbuy'
          ORDER BY opl.created_at ASC
        `);

        const products: GroupbuyProduct[] = rows.map((r: any, idx: number) => {
          const dateStr = r.startDate instanceof Date
            ? r.startDate.toISOString()
            : String(r.startDate || '');
          return {
            id: r.id,
            offerId: r.offerId,
            title: r.title,
            supplierName: r.supplierName,
            conditionSummary: r.conditionSummary,
            orderCount: r.orderCount,
            participantCount: r.participantCount,
            isVisible: r.isVisible,
            order: idx,
            startDate: dateStr,
            endDate: dateStr,
            status: 'active' as const,
          };
        });

        res.json({ success: true, data: products });
      } catch (error: any) {
        console.error('Failed to get groupbuy products:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * POST /groupbuy-admin/products/:id/visibility
   * 상품 노출/비노출 토글
   */
  router.post(
    '/products/:id/visibility',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const { isVisible } = req.body;

        const result = await dataSource.query(
          `UPDATE organization_product_listings
           SET is_active = $1, updated_at = NOW()
           WHERE id = $2 AND service_key = 'kpa-groupbuy'
           RETURNING id, is_active`,
          [isVisible, id]
        );

        if (!result.length) {
          createErrorResponse(res, 404, 'NOT_FOUND');
          return;
        }

        res.json({ success: true, data: { id, isVisible: result[0].is_active } });
      } catch (error: any) {
        console.error('Failed to update product visibility:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * POST /groupbuy-admin/products/:id/order
   * 순서 변경 — display_order 컬럼 없음, echo 반환
   */
  router.post(
    '/products/:id/order',
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { order } = req.body;
      res.json({ success: true, data: { id, order } });
    }
  );

  /**
   * POST /groupbuy-admin/products
   * 이벤트 상품 추가
   * WO-EVENT-OFFER-OPERATOR-UX-REFINE-V1:
   * - organizationId: body에 없으면 kpa_members에서 자동 조회
   * - 동일 offerId 중복 등록 방지
   */
  router.post(
    '/products',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { offerId } = req.body;
        let { organizationId } = req.body;

        if (!offerId) {
          createErrorResponse(res, 400, 'INVALID_PARAMS');
          return;
        }

        // organizationId 자동 주입
        if (!organizationId) {
          const userId = (req as any).user?.id;
          organizationId = await resolveOperatorOrgId(dataSource, userId);
          if (!organizationId) {
            createErrorResponse(res, 400, 'ORG_NOT_FOUND');
            return;
          }
        }

        // 중복 등록 방지
        const duplicateCheck = await dataSource.query(
          `SELECT id FROM organization_product_listings
           WHERE offer_id = $1 AND service_key = 'kpa-groupbuy'
           LIMIT 1`,
          [offerId]
        );
        if (duplicateCheck.length > 0) {
          createErrorResponse(res, 409, 'ALREADY_REGISTERED');
          return;
        }

        // offer 정보 조회
        const offerRows = await dataSource.query(
          `SELECT spo.master_id, spo.price_general,
                  pm.marketing_name,
                  org.name AS org_name
           FROM supplier_product_offers spo
           LEFT JOIN product_masters pm ON pm.id = spo.master_id
           LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
           LEFT JOIN organizations org ON org.id = ns.organization_id
           WHERE spo.id = $1`,
          [offerId]
        );

        if (!offerRows.length) {
          createErrorResponse(res, 404, 'OFFER_NOT_FOUND');
          return;
        }

        const offer = offerRows[0];
        const listingRepo = dataSource.getRepository(OrganizationProductListing);

        const listing = listingRepo.create({
          organization_id: organizationId,
          master_id: offer.master_id,
          offer_id: offerId,
          service_key: 'kpa-groupbuy',
          is_active: true,
          price: offer.price_general ? Number(offer.price_general) : null,
        } as Partial<OrganizationProductListing>);

        const saved = await listingRepo.save(listing);
        const createdAt = (saved.created_at instanceof Date
          ? saved.created_at
          : new Date(saved.created_at)
        ).toISOString();

        res.json({
          success: true,
          data: {
            id: saved.id,
            offerId,
            title: offer.marketing_name || '(상품명 없음)',
            supplierName: offer.org_name || '(공급사 없음)',
            conditionSummary: `단가: ${offer.price_general ?? '미정'}원`,
            orderCount: 0,
            participantCount: 0,
            isVisible: true,
            order: 0,
            startDate: createdAt,
            endDate: createdAt,
            status: 'active' as const,
          } as GroupbuyProduct,
        });
      } catch (error: any) {
        console.error('Failed to add groupbuy product:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * DELETE /groupbuy-admin/products/:id
   * 이벤트 상품 제외 (소프트 삭제 — is_active=false)
   */
  router.delete(
    '/products/:id',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;

        const result = await dataSource.query(
          `UPDATE organization_product_listings
           SET is_active = false, updated_at = NOW()
           WHERE id = $1 AND service_key = 'kpa-groupbuy'
           RETURNING id`,
          [id]
        );

        if (!result.length) {
          createErrorResponse(res, 404, 'NOT_FOUND');
          return;
        }

        res.json({ success: true, data: { id, removed: true } });
      } catch (error: any) {
        console.error('Failed to remove groupbuy product:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * GET /groupbuy-admin/stats
   * 이벤트 집계 통계
   */
  router.get(
    '/stats',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const supplierResult = await supplierStatsService.getStats();
        const now = new Date();
        const cacheValidUntil = new Date(now.getTime() + 30 * 60 * 1000);

        const stats: GroupbuyStats = {
          totalOrders: supplierResult.data?.totalOrders ?? 0,
          totalParticipants: supplierResult.data?.totalPharmacies ?? 0,
          dailyOrders: supplierResult.data?.daily?.map(d => ({
            date: d.date,
            count: d.orderCount,
          })) ?? [],
          productOrders: supplierResult.data?.byProduct?.map(p => ({
            productId: p.productId,
            productName: p.productName,
            orderCount: p.orderCount,
          })) ?? [],
          cachedAt: supplierResult.cachedAt || now.toISOString(),
          cacheValidUntil: cacheValidUntil.toISOString(),
        };

        res.json({
          success: true,
          data: stats,
          _meta: {
            supplierStatus: supplierResult.status,
            fromCache: supplierResult.fromCache,
            responseTime: supplierResult.responseTime,
          },
        });
      } catch (error: any) {
        console.error('Failed to get groupbuy stats:', error);
        createErrorResponse(res, 503, 'STATS_UNAVAILABLE');
      }
    }
  );

  /**
   * GET /groupbuy-admin/supplier-status
   * 공급자 연계 상태
   */
  router.get(
    '/supplier-status',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const connectionStatus = await supplierStatsService.checkConnection();
        res.json({
          success: true,
          data: {
            mode: supplierStatsService.getMode(),
            connection: connectionStatus,
            checkedAt: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        console.error('Failed to check supplier status:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  return router;
}
