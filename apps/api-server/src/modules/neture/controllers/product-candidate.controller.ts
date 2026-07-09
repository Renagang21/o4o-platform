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

/**
 * WO-O4O-ADMIN-PRODUCT-CANDIDATE-STATUS-SIMPLIFY-V2
 * 화면용 그룹 상태 → 원시 candidate status 배열 매핑.
 * 운영자는 "O4O 기본 상품 DB 반영 여부"만 알면 되므로 matched/linked/approved_new_master 를
 * registered(등록 완료) 하나로 묶는다. merged/archived 는 파이프라인 종료 상태이므로 rejected(제외)에 포함.
 * DB 원시 status 값·의미는 변경하지 않는다 (기존 status 파라미터도 그대로 유지).
 */
const GROUPED_STATUS_MAP: Record<string, ProductCandidateStatus[]> = {
  pending: ['pending'],
  review_required: ['reviewing'],
  registered: ['matched', 'linked', 'approved_new_master'],
  rejected: ['rejected', 'merged', 'archived'],
};

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

      const { status, groupedStatus, matchStatus, sourceType, sourceLabel, search, q, serviceKey, organizationId, page, limit } = req.query;
      // 화면용 groupedStatus 는 원시 status 배열로 변환 (기존 status 단건 필터도 계속 지원)
      const candidateStatuses = groupedStatus
        ? GROUPED_STATUS_MAP[String(groupedStatus)]
        : undefined;
      const result = await service.findCandidates({
        candidateStatus: status as ProductCandidateStatus | undefined,
        candidateStatuses,
        matchStatus: matchStatus as ProductCandidateMatchStatus | undefined,
        sourceType: sourceType as ProductCandidateSourceType | undefined,
        sourceLabel: (sourceLabel as string | undefined) || undefined,
        search: ((search ?? q) as string | undefined) || undefined,
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

  // GET /:id/conflict-info — 충돌 근거 (read-only): 동일 식별자 후보 + 일치 ProductMaster + rawPayload 요약
  // WO-O4O-ADMIN-PRODUCT-CANDIDATE-CONFLICT-ACTIONS-V1
  router.get('/:id/conflict-info', (async (req: Request, res: Response) => {
    try {
      const info = await service.getConflictInfo(req.params.id);
      return res.json({ success: true, data: info });
    } catch (error) {
      return handleMutationError(res, error, 'conflict-info');
    }
  }) as RequestHandler);

  // POST /bulk-action — 선택 후보 일괄 상태 처리 (archive/ignore/manual_review). hard delete 없음.
  // WO-O4O-ADMIN-PRODUCT-CANDIDATE-CONFLICT-ACTIONS-V1
  router.post('/bulk-action', (async (req: Request, res: Response) => {
    try {
      const { ids, action } = req.body ?? {};
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'IDS_REQUIRED' });
      }
      if (ids.length > 100) {
        return res.status(400).json({ success: false, error: 'TOO_MANY_IDS' });
      }
      if (!['archive', 'ignore', 'manual_review'].includes(action)) {
        return res.status(400).json({ success: false, error: 'INVALID_ACTION' });
      }
      const result = await service.bulkAction(ids, action, userId(req));
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleMutationError(res, error, 'bulk-action');
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

  // POST /:id/promote-master — 후보를 신규 ProductMaster 로 승격 (drug 소스만, 1건씩)
  // WO-O4O-ADMIN-PRODUCT-CANDIDATE-UNMATCHED-ACTIONS-V1. approveAsNewProductMaster(TX+dedup) 재사용.
  router.post('/:id/promote-master', (async (req: Request, res: Response) => {
    try {
      const result = await service.promoteMasterFromCandidate(req.params.id);
      return res.json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.startsWith('NOT_PROMOTABLE_')) {
        return res.status(400).json({ success: false, error: msg });
      }
      return handleMutationError(res, error, 'promote-master');
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
  if (
    message.includes('NOT_LINKABLE') || message.includes('NOT_MATCHED') ||
    message.includes('NOT_REFINABLE') || message.includes('CONFLICT') ||
    message.includes('RX_LISTING_BLOCKED') // WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1
  ) {
    return res.status(409).json({ success: false, error: message });
  }
  if (message.startsWith('NOT_IMPLEMENTED')) {
    return res.status(501).json({ success: false, error: message });
  }
  logger.error(`[ProductCandidate] ${op} error:`, error);
  return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
}
