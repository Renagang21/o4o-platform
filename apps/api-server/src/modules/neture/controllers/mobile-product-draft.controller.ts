/**
 * MobileProductDraftController — Mobile Product Draft (Phase 4)
 *
 * WO-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §8
 *
 * 모바일 앱이 호출하는 최소 draft API (additive).
 * 마운트: /api/v1/mobile/product-drafts (requireAuth, 본인 draft 소유 경계).
 *
 * 권한: 인증 사용자. 소유 경계는 submittedBy = req.user.id 로 제한(본인 draft 만 조회/수정).
 *       organization/store 기반 정밀 권한과 운영자 전체 조회는 후속 WO (CHECK §9).
 */
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { MobileProductDraftService } from '../services/mobile-product-draft.service.js';
import type {
  MobileProductDraftStatus,
  MobileProductDraftSourceApp,
} from '../entities/MobileProductDraft.entity.js';
import logger from '../../../utils/logger.js';

function userId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

export function createMobileProductDraftController(dataSource: DataSource): Router {
  const router = Router();
  const service = new MobileProductDraftService(dataSource);

  router.use(requireAuth as RequestHandler);

  // POST / — draft 생성 (수집 항목 저장)
  router.post('/', (async (req: Request, res: Response) => {
    try {
      const b = req.body ?? {};
      const draft = await service.createDraft({
        serviceKey: b.serviceKey ?? null,
        organizationId: b.organizationId ?? null,
        storeId: b.storeId ?? null,
        submittedBy: userId(req),
        sourceApp: (b.sourceApp as MobileProductDraftSourceApp | undefined) ?? 'mobile_app',
        identifierType: b.identifierType ?? null,
        identifierValue: b.identifierValue ?? null,
        capturedName: b.capturedName ?? null,
        capturedBrand: b.capturedBrand ?? null,
        capturedManufacturer: b.capturedManufacturer ?? null,
        capturedCategory: b.capturedCategory ?? null,
        capturedSpec: b.capturedSpec ?? null,
        capturedUnit: b.capturedUnit ?? null,
        capturedPrice: b.capturedPrice ?? null,
        capturedCurrency: b.capturedCurrency ?? null,
        thumbnailImageUrl: b.thumbnailImageUrl ?? null,
        imageUrls: b.imageUrls ?? null,
        memo: b.memo ?? null,
        rawPayload: b.rawPayload ?? null,
      });
      return res.status(201).json({ success: true, data: draft });
    } catch (error) {
      logger.error('[MobileProductDraft] create error:', error);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }) as RequestHandler);

  // GET / — 본인 draft 목록
  router.get('/', (async (req: Request, res: Response) => {
    try {
      const { status, serviceKey, organizationId, storeId, page, limit } = req.query;
      const result = await service.listDrafts({
        submittedBy: userId(req) ?? undefined,
        draftStatus: status as MobileProductDraftStatus | undefined,
        serviceKey: serviceKey as string | undefined,
        organizationId: organizationId as string | undefined,
        storeId: storeId as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[MobileProductDraft] list error:', error);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }) as RequestHandler);

  // GET /:id — 본인 draft 상세
  router.get('/:id', (async (req: Request, res: Response) => {
    try {
      const draft = await service.getDraft(req.params.id, userId(req));
      if (!draft) return res.status(404).json({ success: false, error: 'DRAFT_NOT_FOUND' });
      return res.json({ success: true, data: draft });
    } catch (error) {
      logger.error('[MobileProductDraft] detail error:', error);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }) as RequestHandler);

  // PATCH /:id — draft 수정 (draft/submitted 상태만)
  router.patch('/:id', (async (req: Request, res: Response) => {
    try {
      const draft = await service.updateDraft(req.params.id, req.body ?? {}, userId(req));
      return res.json({ success: true, data: draft });
    } catch (error) {
      return handleMutationError(res, error, 'update');
    }
  }) as RequestHandler);

  // POST /:id/submit — 제출
  router.post('/:id/submit', (async (req: Request, res: Response) => {
    try {
      const draft = await service.submitDraft(req.params.id, userId(req));
      return res.json({ success: true, data: draft });
    } catch (error) {
      return handleMutationError(res, error, 'submit');
    }
  }) as RequestHandler);

  // POST /:id/convert-to-candidate — product_candidates 전환
  router.post('/:id/convert-to-candidate', (async (req: Request, res: Response) => {
    try {
      const draft = await service.convertDraftToCandidate(req.params.id, userId(req));
      return res.json({ success: true, data: draft });
    } catch (error) {
      return handleMutationError(res, error, 'convert-to-candidate');
    }
  }) as RequestHandler);

  // POST /:id/archive — 보관
  router.post('/:id/archive', (async (req: Request, res: Response) => {
    try {
      const draft = await service.archiveDraft(req.params.id, userId(req));
      return res.json({ success: true, data: draft });
    } catch (error) {
      return handleMutationError(res, error, 'archive');
    }
  }) as RequestHandler);

  return router;
}

function handleMutationError(res: Response, error: unknown, op: string): Response {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('NOT_FOUND')) {
    return res.status(404).json({ success: false, error: message });
  }
  if (message.includes('NOT_EDITABLE') || message.includes('NOT_SUBMITTABLE') || message.includes('NOT_CONVERTIBLE')) {
    return res.status(409).json({ success: false, error: message });
  }
  logger.error(`[MobileProductDraft] ${op} error:`, error);
  return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
}
