/**
 * SupplierProductCandidateController — WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1
 *
 * 공급자 단건 제품 후보 intake.
 *   POST /supplier/product-candidates
 *     requireAuth → requireActiveSupplier(supplierId 확정) → 서버 검증 → ProductCandidate(pending)
 *
 * write: product_candidates 1건만.
 *   ProductMaster · ProductIdentifier · SupplierProductOffer · offer_service_approvals ·
 *   organization_product_listings · Promotion Core 는 이 파일이 알지 못한다 —
 *   소스 계약 테스트(`supplier-product-candidate-intake-contract.spec.ts`)가 참조 0 을 고정한다.
 *
 * Candidate → Master 승격은 후속 ③ Supplier Promotion Adapter. 기존 단건 등록 UI 전환은 ⑥.
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { ProductCandidateService } from '../services/product-candidate.service.js';
import {
  validateSupplierSingleCandidateBody,
  buildSupplierSingleCandidateInput,
} from '../services/supplier-single-candidate.mapper.js';
import logger from '../../../utils/logger.js';

/** 테스트 주입용 — 운영 경로는 dataSource 로부터 기본값을 만든다 */
export interface SupplierProductCandidateControllerDeps {
  candidateService?: Pick<ProductCandidateService, 'createCandidate'>;
  requireActiveSupplier?: RequestHandler;
}

export function createSupplierProductCandidateController(
  dataSource: DataSource,
  deps: SupplierProductCandidateControllerDeps = {},
): Router {
  const router = Router();
  const candidateService = deps.candidateService ?? new ProductCandidateService(dataSource);
  const requireActiveSupplier = deps.requireActiveSupplier ?? (createRequireActiveSupplier(dataSource) as RequestHandler);

  // POST /supplier/product-candidates
  router.post('/product-candidates', requireAuth, requireActiveSupplier, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // supplierId 는 middleware 가 확정한 값만 쓴다. body 의 supplierId 는 검증 단계에서 FORBIDDEN_FIELD.
      const supplierId = (req as SupplierRequest).supplierId;
      const submittedBy = req.user?.id ?? null;

      const validation = validateSupplierSingleCandidateBody(req.body);
      if (validation.ok === false) {
        return res.status(400).json({ success: false, error: validation.code, message: validation.message });
      }

      const input = buildSupplierSingleCandidateInput(validation.value, { supplierId, submittedBy });
      const candidate = await candidateService.createCandidate(input);

      return res.status(201).json({
        success: true,
        data: {
          candidateId: candidate.id,
          candidateStatus: candidate.candidateStatus,
          identifierType: candidate.identifierType,
          identifierValue: candidate.identifierValue,
          normalizedIdentifierValue: candidate.normalizedIdentifierValue,
        },
      });
    } catch (error) {
      logger.error('[Neture API] Error creating supplier product candidate:', error);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create supplier product candidate' });
    }
  });

  return router;
}
