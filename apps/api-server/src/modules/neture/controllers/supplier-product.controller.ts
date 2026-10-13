/**
 * SupplierProductController — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Routes: supplier/products/*
 *
 * WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §I (2026-09-23):
 *   supplier/csv-import/* 와 supplier/products/template 은퇴.
 *   공급자 → ProductMaster 직접 생성의 마지막 HTTP 경로였다.
 *   대량 등록은 /supplier/products/bulk-candidates (ProductCandidate 경유 · 운영자 승인) 만 남는다.
 */
import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import {
  createRequireActiveSupplier,
  createRequireLinkedSupplier,
} from '../middleware/neture-identity.middleware.js';
import type {
  SupplierRequest,
  AuthenticatedRequest,
} from '../middleware/neture-identity.middleware.js';
import { NetureService } from '../neture.service.js';
import logger from '../../../utils/logger.js';

/* ──────────────────────────────────────────────────────────────────────────
 * WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3
 * 검증 통과 bulk row → ProductCandidate(안전 후보) 저장. ProductMaster/Offer 직접 생성 금지,
 * CSV Import applyBatch 재사용 금지. 서버에서 frontend와 독립적으로 재검증한다.
 * ────────────────────────────────────────────────────────────────────────── */

import { createSupplierProductReadHandlers } from './supplier-products/read-handlers.js';
import { createSupplierOfferHandlers } from './supplier-products/offer-handlers.js';
import { createSupplierDistributionHandlers } from './supplier-products/distribution-handlers.js';
import { SupplierBulkCandidateService } from '../services/supplier-bulk-candidate.service.js';
export function createSupplierProductController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const bulkCandidateService = new SupplierBulkCandidateService(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  const readHandlers = createSupplierProductReadHandlers(netureService);
  const offerHandlers = createSupplierOfferHandlers(netureService);
  const distributionHandlers = createSupplierDistributionHandlers(netureService);

  // (은퇴) POST /supplier/products — barcode/name → resolveOrCreateMaster 경유 레거시 Offer 생성
  //   WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1 §2.4
  //   저장소 census(web-neture 단일 소비자 → from-master / product-candidates 로 전환 완료) + Cloud Run 30일 access log
  //   (외부 호출 0) 확인 후 라우트를 제거했다. 공급자가 ProductMaster 를 만드는 HTTP 경로는 더 이상 없다.
  //   신규/미매칭 제품 = POST /product-candidates · 기존 Master = POST /products/from-master · 대량 = POST /products/bulk-candidates.

  // POST /supplier/products/from-master (WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1)
  //   Product Library 에서 고른 기존 ProductMaster 에 Offer 를 직접 연결한다.
  //   공급자가 masterId 로 Offer 를 만드는 유일한 경로 (레거시 POST /products 는 은퇴).
  //   supplierId 는 requireActiveSupplier 확정값만 쓴다(body 의 supplierId 는 서비스가 400 으로 거부).
  router.post(
    '/products/from-master',
    requireAuth,
    requireActiveSupplier as RequestHandler,
    offerHandlers.fromMaster,
  );

  // GET /supplier/products (WO-NETURE-SUPPLIER-EXCEL-LIST-V1: pagination/search/filter 지원)
  router.get('/products', requireAuth, requireLinkedSupplier as RequestHandler, readHandlers.list);

  // GET /supplier/products/approval-counts (WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1)
  // 주의: /products/:id 보다 먼저 등록
  router.get(
    '/products/approval-counts',
    requireAuth,
    requireLinkedSupplier as RequestHandler,
    readHandlers.approvalCounts,
  );

  // POST /supplier/products/submit-approval
  // WO-NETURE-SUPPLIER-APPROVAL-REQUEST-USE-SAVED-DISTRIBUTION-POLICY-V1:
  // serviceKeys를 request body에서 받지 않고, offer에 저장된 정책 사용
  router.post(
    '/products/submit-approval',
    requireAuth,
    requireActiveSupplier as RequestHandler,
    offerHandlers.submitApproval,
  );

  // DELETE /supplier/products/bulk (WO-O4O-NETURE-SUPPLIER-PRODUCTS-UX-REFORM-V1)
  // 주의: /products/:id 보다 먼저 등록해야 'bulk'가 :id로 매칭되지 않음
  router.delete(
    '/products/bulk',
    requireAuth,
    requireActiveSupplier as RequestHandler,
    offerHandlers.bulkDelete,
  );

  // PATCH /supplier/products/batch (WO-NETURE-SUPPLIER-EXCEL-LIST-V1)
  // 주의: /products/:id 보다 먼저 등록해야 'batch'가 :id로 매칭되지 않음
  router.patch(
    '/products/batch',
    requireAuth,
    requireActiveSupplier as RequestHandler,
    offerHandlers.batchUpdate,
  );

  // PATCH /supplier/products/:id/business-content (WO-NETURE-B2B-CONTENT-MANAGEMENT-V1)
  router.patch(
    '/products/:id/business-content',
    requireAuth,
    requireActiveSupplier as RequestHandler,
    offerHandlers.updateBusinessContent,
  );

  // PATCH /supplier/products/:id
  router.patch(
    '/products/:id',
    requireAuth,
    requireActiveSupplier as RequestHandler,
    offerHandlers.updateOffer,
  );

  // PATCH /supplier/products/:id/distribution — 공급 방식(전체 공개 + 서비스 대상) 정식 변경
  // WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1
  router.patch(
    '/products/:id/distribution',
    requireAuth,
    requireActiveSupplier as RequestHandler,
    distributionHandlers.updateDistribution,
  );

  // GET /supplier/products/:id/service-prices — 서비스별 공급가 조회
  // WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1
  router.get(
    '/products/:id/service-prices',
    requireAuth,
    requireActiveSupplier as RequestHandler,
    distributionHandlers.getPrices,
  );

  // PUT /supplier/products/:id/service-prices — 서비스별 공급가 일괄 설정(replace)
  router.put(
    '/products/:id/service-prices',
    requireAuth,
    requireActiveSupplier as RequestHandler,
    distributionHandlers.setPrices,
  );

  // POST /supplier/products/bulk-candidates
  // WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3:
  //   PARSE-V2 검증 통과 row 를 ProductCandidate(안전 후보, status=pending)로 저장한다.
  //   ProductMaster/SupplierOffer 직접 생성 금지, CSV Import applyBatch 재사용 금지.
  //   서버에서 productType/금지컬럼/혼합/필수값을 frontend 와 독립적으로 재검증한다.
  router.post(
    '/products/bulk-candidates',
    requireAuth,
    requireActiveSupplier as RequestHandler,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const submittedBy = req.user?.id ?? null;
        const result = await bulkCandidateService.submit(supplierId, submittedBy, req.body ?? {});
        return res.status(result.success ? 201 : 400).json(result);
      } catch (error) {
        logger.error('[Neture API] Error creating bulk candidates:', error);
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to submit bulk candidates',
        });
      }
    },
  );

  return router;
}
