/**
 * ProductCandidateController — Product Candidate Review Queue (Phase 3)
 *
 * WO-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §2, §8
 *
 * 운영자/관리자용 최소 후보 검토 API (additive). 사용자-facing UI 는 후속 WO.
 * 마운트: /api/v1/operator/product-candidates (operator/admin guard + service scope)
 */
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { injectServiceScope } from '../../../utils/serviceScope.js';
import type { ServiceScope } from '../../../utils/serviceScope.js';
import { resolveOperatorScope, logCrossServiceQuery, PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE } from '../../../utils/serviceScope.js';
import { ProductCandidateService } from '../services/product-candidate.service.js';
import type {
  ProductCandidateStatus,
  ProductCandidateMatchStatus,
  ProductCandidateSourceType,
} from '../entities/ProductCandidate.entity.js';
import type { ProductIdentifierType } from '../entities/ProductIdentifier.entity.js';
import logger from '../../../utils/logger.js';

const OPERATOR_ROLES = [
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'cosmetics:admin', 'cosmetics:operator',
  'kpa-society:admin', 'kpa-society:operator',
];

function userId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

export function createProductCandidateController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductCandidateService(dataSource);

  // operator/admin guard + service scope (operator product console 과 동일 모델)
  router.use(authenticate);
  router.use(requireRole(OPERATOR_ROLES));
  router.use(injectServiceScope);

  // GET / — 후보 목록 (scope 적용)
  router.get('/', (async (req: Request, res: Response) => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const resolved = resolveOperatorScope(scope, req.query);
      if (!resolved) {
        return res.status(400).json(PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE);
      }
      if (resolved.crossService) logCrossServiceQuery(req);

      const { status, matchStatus, sourceType, serviceKey, organizationId, page, limit } = req.query;
      const result = await service.findCandidates({
        candidateStatus: status as ProductCandidateStatus | undefined,
        matchStatus: matchStatus as ProductCandidateMatchStatus | undefined,
        sourceType: sourceType as ProductCandidateSourceType | undefined,
        serviceKey: serviceKey as string | undefined,
        organizationId: organizationId as string | undefined,
        scopeServiceKeys: resolved.serviceKeys,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      // WO-O4O-PRODUCT-TYPE-CLASSIFICATION-WIRING-F3-V1: 분류 부착 (표시용)
      const items = await service.withClassification(result.items);
      return res.json({ success: true, data: { items, total: result.total } });
    } catch (error) {
      logger.error('[ProductCandidate] list error:', error);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }) as RequestHandler);

  // GET /:id — 후보 상세
  router.get('/:id', (async (req: Request, res: Response) => {
    try {
      const candidate = await service.getCandidate(req.params.id);
      if (!candidate) return res.status(404).json({ success: false, error: 'CANDIDATE_NOT_FOUND' });
      // WO-O4O-PRODUCT-TYPE-CLASSIFICATION-WIRING-F3-V1: 분류 부착 (표시용)
      const [enriched] = await service.withClassification([candidate]);
      return res.json({ success: true, data: enriched });
    } catch (error) {
      logger.error('[ProductCandidate] detail error:', error);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }) as RequestHandler);

  // POST / — 후보 생성 (+ 식별자 있으면 즉시 매칭 시도)
  router.post('/', (async (req: Request, res: Response) => {
    try {
      const b = req.body ?? {};
      if (!b.sourceType) {
        return res.status(400).json({ success: false, error: 'SOURCE_TYPE_REQUIRED' });
      }
      const input = {
        serviceKey: b.serviceKey ?? null,
        organizationId: b.organizationId ?? null,
        sourceType: b.sourceType as ProductCandidateSourceType,
        sourceId: b.sourceId ?? null,
        sourceLabel: b.sourceLabel ?? null,
        submittedBy: userId(req),
        identifierType: (b.identifierType as ProductIdentifierType | undefined) ?? null,
        identifierValue: b.identifierValue ?? null,
        candidateName: b.candidateName ?? null,
        candidateBrand: b.candidateBrand ?? null,
        candidateManufacturer: b.candidateManufacturer ?? null,
        candidateCategory: b.candidateCategory ?? null,
        candidateSpec: b.candidateSpec ?? null,
        candidateUnit: b.candidateUnit ?? null,
        candidateImageUrl: b.candidateImageUrl ?? null,
        candidatePrice: b.candidatePrice ?? null,
        rawPayload: b.rawPayload ?? null,
      };
      const candidate =
        input.identifierType && input.identifierValue
          ? await service.createCandidateFromIdentifier(input)
          : await service.createCandidate(input);
      return res.status(201).json({ success: true, data: candidate });
    } catch (error) {
      logger.error('[ProductCandidate] create error:', error);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }) as RequestHandler);

  // POST /:id/match — Identifier Core 기반 매칭 재시도
  router.post('/:id/match', (async (req: Request, res: Response) => {
    try {
      const candidate = await service.matchCandidate(req.params.id);
      return res.json({ success: true, data: candidate });
    } catch (error) {
      return handleMutationError(res, error, 'match');
    }
  }) as RequestHandler);

  // POST /:id/manual-match — 운영자 수동 매칭 (기존 Master 연결)
  router.post('/:id/manual-match', (async (req: Request, res: Response) => {
    try {
      const { productMasterId } = req.body ?? {};
      if (!productMasterId) {
        return res.status(400).json({ success: false, error: 'PRODUCT_MASTER_ID_REQUIRED' });
      }
      const candidate = await service.manuallyMatchCandidate(req.params.id, productMasterId, userId(req));
      return res.json({ success: true, data: candidate });
    } catch (error) {
      return handleMutationError(res, error, 'manual-match');
    }
  }) as RequestHandler);

  // POST /:id/reject
  router.post('/:id/reject', (async (req: Request, res: Response) => {
    try {
      const { reason } = req.body ?? {};
      const candidate = await service.rejectCandidate(req.params.id, reason, userId(req));
      return res.json({ success: true, data: candidate });
    } catch (error) {
      return handleMutationError(res, error, 'reject');
    }
  }) as RequestHandler);

  // POST /:id/archive
  router.post('/:id/archive', (async (req: Request, res: Response) => {
    try {
      const candidate = await service.archiveCandidate(req.params.id, userId(req));
      return res.json({ success: true, data: candidate });
    } catch (error) {
      return handleMutationError(res, error, 'archive');
    }
  }) as RequestHandler);

  // POST /:id/refine-drug-category — 매칭된 ProductMaster 의 의약품 분류 refine
  // WO-O4O-OPERATOR-PRODUCT-DRUG-CATEGORY-REFINE-UX-F4-V1
  router.post('/:id/refine-drug-category', (async (req: Request, res: Response) => {
    try {
      const { drugCategory, note } = req.body ?? {};
      if (drugCategory === undefined) {
        return res.status(400).json({ success: false, error: 'DRUG_CATEGORY_REQUIRED' });
      }
      const result = await service.refineCandidateDrugCategory(req.params.id, {
        drugCategory: drugCategory ?? null,
        note: note ?? null,
        reviewedBy: userId(req),
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleMutationError(res, error, 'refine-drug-category');
    }
  }) as RequestHandler);

  // POST /:id/link-to-listing — 매칭된 후보를 약국/매장 활용 상품으로 연결
  // WO-O4O-PRODUCT-CANDIDATE-TO-STORE-PHARMACY-LISTING-V1
  router.post('/:id/link-to-listing', (async (req: Request, res: Response) => {
    try {
      const { organizationId, serviceKey, storeId, displayName, displayDescription, note } = req.body ?? {};
      if (!organizationId) return res.status(400).json({ success: false, error: 'ORGANIZATION_ID_REQUIRED' });
      if (!serviceKey) return res.status(400).json({ success: false, error: 'SERVICE_KEY_REQUIRED' });
      const result = await service.linkCandidateToOrganizationListing(req.params.id, {
        organizationId,
        serviceKey,
        storeId: storeId ?? null,
        displayName: displayName ?? null,
        displayDescription: displayDescription ?? null,
        note: note ?? null,
        reviewedBy: userId(req),
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleMutationError(res, error, 'link-to-listing');
    }
  }) as RequestHandler);

  return router;
}

function handleMutationError(res: Response, error: unknown, op: string): Response {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('NOT_FOUND')) {
    return res.status(404).json({ success: false, error: message });
  }
  if (message.endsWith('_REQUIRED')) {
    return res.status(400).json({ success: false, error: message });
  }
  if (message.startsWith('INVALID_')) {
    return res.status(400).json({ success: false, error: message });
  }
  if (message.includes('NOT_LINKABLE') || message.includes('NOT_MATCHED') || message.includes('NOT_REFINABLE') || message.includes('CONFLICT')) {
    return res.status(409).json({ success: false, error: message });
  }
  if (message.startsWith('NOT_IMPLEMENTED')) {
    return res.status(501).json({ success: false, error: message });
  }
  logger.error(`[ProductCandidate] ${op} error:`, error);
  return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
}
