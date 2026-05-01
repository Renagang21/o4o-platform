/**
 * KPA Event Offer Operator Controller
 *
 * WO-KPA-GROUPBUY-OPERATOR-UI-V1: 이벤트 운영자용 API
 * WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1: 안정화
 * WO-KPA-GROUPBUY-SUPPLIER-STATS-DRYRUN-V1: 공급자 통계 연계 드라이런
 * WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: requireKpaScope('kpa:operator') 표준화
 * WO-EVENT-OFFER-MINIMAL-COMPLETION-V1: stub → OrganizationProductListing 실 구현
 * WO-EVENT-OFFER-OPERATOR-UX-REFINE-V1: 운영자 UX 개선 (available-offers, 중복방지, 조직 자동주입)
 * WO-O4O-EVENT-OFFER-BACKEND-NAMING-ALIGNMENT-V1: createGroupbuyOperatorController → createEventOfferOperatorController
 *
 * 책임 경계:
 * - 상품 노출 관리 (추가/제거/토글/순서)
 * - 집계 통계 조회
 * - 공급자 통계 연계 상태 확인
 * - 주문/결제/배송은 공급자 시스템에서 처리 (본 API 범위 외)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { supplierStatsService } from '../services/supplier-stats.service.js';
// WO-O4O-EVENT-OFFER-CREATE-SERVICE-CAPSULE-V1: createListing/EventOfferCreateError 사용
import {
  resolveEventStatus,
  EventOfferService,
  EventOfferCreateError,
} from '../services/event-offer.service.js';
import { resolveOrganizationForEventOffer } from '../helpers/event-offer-organization.helper.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { KPA_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../../../common/middleware/membership-guard.middleware.js';

type AuthMiddleware = RequestHandler;

// Types
interface EventOfferProduct {
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
  status: 'pending' | 'approved' | 'active' | 'ended' | 'canceled';
  startAt: string | null;
  endAt: string | null;
  totalQuantity: number | null;
}

interface AvailableOffer {
  id: string;
  title: string;
  supplierName: string;
  price: number | null;
}

interface EventOfferStats {
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
  // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1: Approval Queue 에러
  INVALID_STATE: { code: 'INVALID_STATE', message: '대기중(pending) 상태에서만 승인/반려할 수 있습니다.' },
  INVALID_REASON: { code: 'INVALID_REASON', message: '반려 사유를 입력해 주세요.' },
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

/** kpa_members에서 운영자 organization_id 조회 — 본인 우선, 없으면 operator 역할 기준 */
async function resolveOperatorOrgId(
  dataSource: DataSource,
  userId: string
): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT organization_id FROM kpa_members WHERE user_id = $1 AND organization_id IS NOT NULL LIMIT 1`,
    [userId]
  );
  if (rows[0]?.organization_id) return rows[0].organization_id;
  // fallback: kpa operator 역할 기준
  const fallback = await dataSource.query(
    `SELECT organization_id FROM kpa_members WHERE role = 'operator' AND organization_id IS NOT NULL LIMIT 1`
  );
  return fallback[0]?.organization_id ?? null;
}

const requireKpaScope = createMembershipScopeGuard(KPA_SCOPE_CONFIG);

export function createEventOfferOperatorController(
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
            COALESCE(pm.name, '(상품명 없음)') AS title,
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
              WHERE service_key = $1
            )
          ORDER BY pm.name ASC
          LIMIT 100
        `, [SERVICE_KEYS.KPA_GROUPBUY]);

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
            opl.offer_id        AS "offerId",
            opl.is_active       AS "isVisible",
            opl.status          AS "dbStatus",
            opl.start_at        AS "startAt",
            opl.end_at          AS "endAt",
            opl.total_quantity  AS "totalQuantity",
            opl.created_at      AS "startDate",
            COALESCE(pm.name, '(상품명 없음)')  AS title,
            COALESCE(org.name, '(공급사 없음)') AS "supplierName",
            CONCAT('단가: ', COALESCE(spo.price_general::text, '미정'), '원') AS "conditionSummary",
            COALESCE(oc.order_count, 0)::int        AS "orderCount",
            COALESCE(oc.participant_count, 0)::int  AS "participantCount"
          FROM organization_product_listings opl
          LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
          LEFT JOIN neture_suppliers ns          ON ns.id  = spo.supplier_id
          LEFT JOIN organizations org            ON org.id = ns.organization_id
          LEFT JOIN product_masters pm           ON pm.id  = opl.master_id
          LEFT JOIN (
            SELECT
              metadata->>'productListingId' AS listing_id,
              COUNT(*)::int                  AS order_count,
              COUNT(DISTINCT "buyerId")::int AS participant_count
            FROM checkout_orders
            WHERE metadata->>'serviceKey' = $1
            GROUP BY metadata->>'productListingId'
          ) oc ON oc.listing_id = opl.id::text
          WHERE opl.service_key = $1
          ORDER BY opl.created_at ASC
        `, [SERVICE_KEYS.KPA_GROUPBUY]);

        const products: EventOfferProduct[] = rows.map((r: any, idx: number) => {
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
            status: resolveEventStatus({ status: r.dbStatus, start_at: r.startAt, end_at: r.endAt }),
            startAt: r.startAt ? new Date(r.startAt).toISOString() : null,
            endAt: r.endAt ? new Date(r.endAt).toISOString() : null,
            totalQuantity: r.totalQuantity !== null ? Number(r.totalQuantity) : null,
          };
        });

        res.json({ success: true, data: products });
      } catch (error: any) {
        console.error('Failed to get event offer products:', error);
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

        // WO-O4O-EVENT-OFFER-CORE-REFORM-V1: is_active + status 동시 업데이트
        const newStatus = isVisible ? 'approved' : 'canceled';
        const result = await dataSource.query(
          `UPDATE organization_product_listings
           SET is_active = $1, status = $2, updated_at = NOW()
           WHERE id = $3 AND service_key = $4
           RETURNING id, is_active`,
          [isVisible, newStatus, id, SERVICE_KEYS.KPA_GROUPBUY]
        );

        if (!result.length) {
          createErrorResponse(res, 404, 'NOT_FOUND');
          return;
        }

        res.json({ success: true, data: { id, isVisible: result[0].is_active } });
      } catch (error: any) {
        console.error('Failed to update event offer visibility:', error);
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
  // WO-O4O-EVENT-OFFER-CREATE-SERVICE-CAPSULE-V1:
  // 생성 로직은 EventOfferService.createListing()에 캡슐화됨.
  // controller는 입력 파싱 / 조직 결정(helper) / 응답 변환만 담당.
  router.post(
    '/products',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { offerId } = req.body;
        const userId = (req as any).user?.id;
        let { organizationId } = req.body;

        if (!offerId) {
          createErrorResponse(res, 400, 'INVALID_PARAMS');
          return;
        }

        // 조직 결정 (body 우선, 없으면 helper)
        if (!organizationId) {
          organizationId = await resolveOrganizationForEventOffer({
            dataSource,
            userId,
            roleType: 'operator',
            serviceKey: SERVICE_KEYS.KPA_GROUPBUY,
          });
          if (!organizationId) {
            createErrorResponse(res, 400, 'ORG_NOT_FOUND');
            return;
          }
        }

        const service = new EventOfferService(dataSource);
        const result = await service.createListing({
          offerId,
          serviceKey: SERVICE_KEYS.KPA_GROUPBUY,
          organizationId,
          roleType: 'operator',
          // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1: operator 즉시 승인 → decided_by 기록
          operatorUserId: userId,
        });

        res.json({
          success: true,
          data: {
            id: result.id,
            offerId: result.offerId,
            title: result.title,
            supplierName: result.supplierName,
            conditionSummary: `단가: ${result.price ?? '미정'}원`,
            orderCount: 0,
            participantCount: 0,
            isVisible: result.isActive,
            order: 0,
            startDate: result.createdAt,
            endDate: result.createdAt,
            status: result.status,
            startAt: null,
            endAt: null,
            totalQuantity: null,
          } as EventOfferProduct,
        });
      } catch (error: any) {
        if (error instanceof EventOfferCreateError) {
          // service 에러 코드를 controller 응답 코드로 매핑 (기존 코드 호환)
          const map: Record<string, keyof typeof ERROR_CODES> = {
            OFFER_NOT_FOUND: 'OFFER_NOT_FOUND',
            ALREADY_LISTED: 'ALREADY_REGISTERED',
            OFFER_NOT_OWNED: 'INTERNAL_ERROR', // operator 분기에서는 발생 불가
            INTERNAL_ERROR: 'INTERNAL_ERROR',
            // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1
            NOT_FOUND: 'NOT_FOUND',
            INVALID_STATE: 'INVALID_STATE',
            INVALID_REASON: 'INVALID_REASON',
          };
          createErrorResponse(res, error.statusCode, map[error.code] ?? 'INTERNAL_ERROR');
          return;
        }
        console.error('Failed to add event offer product:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  // ─── WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1 ──────────────────────────────
  // Approval Queue: pending 목록 조회 + 승인/반려 endpoint.

  /**
   * GET /groupbuy-admin/pending-listings
   * supplier가 제안한 pending OPL 목록 (승인 대기열).
   */
  router.get(
    '/pending-listings',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));

        const service = new EventOfferService(dataSource);
        const result = await service.listPendingListings(SERVICE_KEYS.KPA_GROUPBUY, page, limit);

        res.json({
          success: true,
          data: result.data,
          pagination: { page, limit, total: result.total },
        });
      } catch (error: any) {
        console.error('Failed to list pending listings:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * POST /groupbuy-admin/products/:id/approve
   * pending OPL 승인 → status='approved', is_active=true.
   */
  router.post(
    '/products/:id/approve',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        const service = new EventOfferService(dataSource);
        const result = await service.approveListing(id, userId);

        res.json({ success: true, data: result });
      } catch (error: any) {
        if (error instanceof EventOfferCreateError) {
          const map: Record<string, keyof typeof ERROR_CODES> = {
            NOT_FOUND: 'NOT_FOUND',
            INVALID_STATE: 'INVALID_STATE',
            INTERNAL_ERROR: 'INTERNAL_ERROR',
          };
          createErrorResponse(res, error.statusCode, map[error.code] ?? 'INTERNAL_ERROR');
          return;
        }
        console.error('Failed to approve event offer:', error);
        createErrorResponse(res, 500, 'INTERNAL_ERROR');
      }
    }
  );

  /**
   * POST /groupbuy-admin/products/:id/reject
   * pending OPL 반려 → status='rejected', is_active=false, rejected_reason.
   * body: { reason: string }
   */
  router.post(
    '/products/:id/reject',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const userId = (req as any).user?.id;
        const { reason } = req.body || {};

        const service = new EventOfferService(dataSource);
        const result = await service.rejectListing(id, userId, reason ?? '');

        res.json({ success: true, data: result });
      } catch (error: any) {
        if (error instanceof EventOfferCreateError) {
          const map: Record<string, keyof typeof ERROR_CODES> = {
            NOT_FOUND: 'NOT_FOUND',
            INVALID_STATE: 'INVALID_STATE',
            INVALID_REASON: 'INVALID_REASON',
            INTERNAL_ERROR: 'INTERNAL_ERROR',
          };
          createErrorResponse(res, error.statusCode, map[error.code] ?? 'INTERNAL_ERROR');
          return;
        }
        console.error('Failed to reject event offer:', error);
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

        // WO-O4O-EVENT-OFFER-CORE-REFORM-V1: 소프트 삭제 → is_active=false + status='canceled'
        const result = await dataSource.query(
          `UPDATE organization_product_listings
           SET is_active = false, status = 'canceled', updated_at = NOW()
           WHERE id = $1 AND service_key = $2
           RETURNING id`,
          [id, SERVICE_KEYS.KPA_GROUPBUY]
        );

        if (!result.length) {
          createErrorResponse(res, 404, 'NOT_FOUND');
          return;
        }

        res.json({ success: true, data: { id, removed: true } });
      } catch (error: any) {
        console.error('Failed to remove event offer product:', error);
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

        const stats: EventOfferStats = {
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
        console.error('Failed to get event offer stats:', error);
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
