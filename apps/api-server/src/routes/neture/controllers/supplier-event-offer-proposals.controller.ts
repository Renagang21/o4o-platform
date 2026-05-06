/**
 * Neture Supplier Event Offer Proposals Controller
 *
 * WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
 *
 * 공급자가 단일 SPO를 여러 서비스(KPA / K-Cos)로 동시 제안.
 *
 * 책임:
 * - 입력 검증 (offerId, serviceKeys 배열)
 * - supplier 계정 연결 확인 (neture_suppliers.user_id)
 * - EventOfferService.createMultiServiceProposal 호출
 * - 서비스별 결과 매핑 (frontend가 서비스별 toast/status 표시)
 *
 * Routes (mounted at /api/v1/neture/supplier):
 * - POST /event-offer-proposals — multi-service proposal
 * - GET  /event-offer-proposals — 내 제안 OPL 목록 (KPA + K-Cos 통합)
 *
 * 호환성: 기존 POST /api/v1/kpa/supplier/event-offers (단일 KPA 제안)는 유지.
 *        GET  /api/v1/kpa/supplier/event-offers (KPA 단일)도 유지.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { EventOfferService } from '../../kpa/services/event-offer.service.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';

type AuthMiddleware = RequestHandler;

async function resolveSupplierIdByUser(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT id FROM neture_suppliers WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return rows[0]?.id ?? null;
}

export function createSupplierEventOfferProposalsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  router.use(requireAuth);

  /**
   * POST /event-offer-proposals
   * body: { offerId: string, serviceKeys: string[] }
   *
   * 서비스별 결과를 분리해서 반환 — 부분 실패 허용.
   */
  router.post(
    '/event-offer-proposals',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
        });
        return;
      }

      const body = (req.body ?? {}) as {
        offerId?: string;
        serviceKeys?: unknown;
        // WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
        eventPrice?: unknown;
        startAt?: unknown;
        endAt?: unknown;
        totalQuantity?: unknown;
        perOrderLimit?: unknown;
        perStoreLimit?: unknown;
      };
      const { offerId, serviceKeys } = body;

      if (!offerId || typeof offerId !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'offerId가 필요합니다.' },
        });
        return;
      }

      if (!Array.isArray(serviceKeys) || serviceKeys.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'serviceKeys 배열이 필요합니다.' },
        });
        return;
      }

      const cleanKeys = serviceKeys
        .filter((k): k is string => typeof k === 'string' && k.length > 0);
      if (cleanKeys.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'serviceKeys 배열이 비어 있습니다.' },
        });
        return;
      }

      // WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
      // 이벤트 조건 검증 — 정책: eventPrice/startAt/endAt 필수, 기간 미입력 금지.
      const eventPriceNum =
        typeof body.eventPrice === 'number'
          ? body.eventPrice
          : typeof body.eventPrice === 'string' && body.eventPrice.trim() !== ''
            ? Number(body.eventPrice)
            : NaN;
      if (!Number.isFinite(eventPriceNum) || eventPriceNum <= 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'eventPrice 는 0 보다 큰 숫자여야 합니다.' },
        });
        return;
      }

      const startAt =
        typeof body.startAt === 'string' && body.startAt.trim() !== ''
          ? new Date(body.startAt)
          : null;
      const endAt =
        typeof body.endAt === 'string' && body.endAt.trim() !== ''
          ? new Date(body.endAt)
          : null;
      if (!startAt || Number.isNaN(startAt.getTime())) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: '시작 일시(startAt)가 필요합니다.' },
        });
        return;
      }
      if (!endAt || Number.isNaN(endAt.getTime())) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: '종료 일시(endAt)가 필요합니다.' },
        });
        return;
      }
      if (startAt.getTime() >= endAt.getTime()) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: '시작 일시는 종료 일시보다 이전이어야 합니다.' },
        });
        return;
      }

      const parseOptionalInt = (v: unknown, name: string): number | null | { error: string } => {
        if (v == null || v === '') return null;
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
          return { error: `${name} 는 0 이상의 정수여야 합니다.` };
        }
        return n;
      };

      const totalQuantity = parseOptionalInt(body.totalQuantity, 'totalQuantity');
      if (totalQuantity && typeof totalQuantity === 'object' && 'error' in totalQuantity) {
        res.status(400).json({ success: false, error: { code: 'INVALID_PARAMS', message: totalQuantity.error } });
        return;
      }
      const perOrderLimit = parseOptionalInt(body.perOrderLimit, 'perOrderLimit');
      if (perOrderLimit && typeof perOrderLimit === 'object' && 'error' in perOrderLimit) {
        res.status(400).json({ success: false, error: { code: 'INVALID_PARAMS', message: perOrderLimit.error } });
        return;
      }
      const perStoreLimit = parseOptionalInt(body.perStoreLimit, 'perStoreLimit');
      if (perStoreLimit && typeof perStoreLimit === 'object' && 'error' in perStoreLimit) {
        res.status(400).json({ success: false, error: { code: 'INVALID_PARAMS', message: perStoreLimit.error } });
        return;
      }

      // 공급자 계정 연결 확인 (UI fast-fail)
      const supplierId = await resolveSupplierIdByUser(dataSource, userId);
      if (!supplierId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'SUPPLIER_NOT_FOUND',
            message: '공급자 계정이 연결되어 있지 않습니다.',
          },
        });
        return;
      }

      const service = new EventOfferService(dataSource);
      const result = await service.createMultiServiceProposal({
        offerId,
        targetServiceKeys: cleanKeys,
        ownerUserId: userId,
        eventConditions: {
          eventPrice: eventPriceNum,
          startAt,
          endAt,
          totalQuantity: totalQuantity as number | null,
          perOrderLimit: perOrderLimit as number | null,
          perStoreLimit: perStoreLimit as number | null,
        },
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    }),
  );

  /**
   * GET /event-offer-proposals
   * 내가 제안한 OPL 목록 — KPA + K-Cos 통합. service_key 필드로 구분.
   */
  router.get(
    '/event-offer-proposals',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
        });
        return;
      }

      const supplierId = await resolveSupplierIdByUser(dataSource, userId);
      if (!supplierId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'SUPPLIER_NOT_FOUND',
            message: '공급자 계정이 연결되어 있지 않습니다.',
          },
        });
        return;
      }

      const targetKeys = [
        SERVICE_KEYS.KPA_GROUPBUY,
        SERVICE_KEYS.K_COSMETICS_EVENT_OFFER,
      ];

      const rows = await dataSource.query(
        `SELECT
           opl.id,
           opl.offer_id        AS "offerId",
           opl.service_key     AS "serviceKey",
           opl.is_active       AS "isActive",
           opl.status,
           opl.created_at      AS "proposedAt",
           opl.decided_at      AS "decidedAt",
           opl.rejected_reason AS "rejectedReason",
           opl.event_price::numeric AS "eventPrice",
           opl.start_at        AS "startAt",
           opl.end_at          AS "endAt",
           opl.total_quantity  AS "totalQuantity",
           opl.per_order_limit AS "perOrderLimit",
           opl.per_store_limit AS "perStoreLimit",
           COALESCE(pm.name, '(상품명 없음)')  AS title,
           COALESCE(org.name, '(공급사 없음)') AS "supplierName",
           spo.price_general::numeric          AS price
         FROM organization_product_listings opl
         JOIN supplier_product_offers spo ON spo.id = opl.offer_id
         JOIN neture_suppliers ns          ON ns.id  = spo.supplier_id
         LEFT JOIN organizations org       ON org.id = ns.organization_id
         LEFT JOIN product_masters pm      ON pm.id  = spo.master_id
         WHERE opl.service_key = ANY($2::text[])
           AND spo.supplier_id = $1
         ORDER BY opl.created_at DESC`,
        [supplierId, targetKeys],
      );

      const proposals = rows.map((r: any) => ({
        id: r.id,
        offerId: r.offerId,
        serviceKey: r.serviceKey,
        title: r.title,
        supplierName: r.supplierName,
        price: r.price !== null ? Number(r.price) : null,
        // WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
        eventPrice: r.eventPrice !== null ? Number(r.eventPrice) : null,
        startAt: r.startAt ? new Date(r.startAt).toISOString() : null,
        endAt: r.endAt ? new Date(r.endAt).toISOString() : null,
        totalQuantity: r.totalQuantity !== null ? Number(r.totalQuantity) : null,
        perOrderLimit: r.perOrderLimit !== null ? Number(r.perOrderLimit) : null,
        perStoreLimit: r.perStoreLimit !== null ? Number(r.perStoreLimit) : null,
        isActive: r.isActive,
        status: r.status,
        proposedAt: r.proposedAt instanceof Date
          ? r.proposedAt.toISOString()
          : String(r.proposedAt || ''),
        decidedAt: r.decidedAt
          ? (r.decidedAt instanceof Date ? r.decidedAt.toISOString() : String(r.decidedAt))
          : null,
        rejectedReason: r.rejectedReason,
      }));

      res.json({ success: true, data: proposals });
    }),
  );

  return router;
}
