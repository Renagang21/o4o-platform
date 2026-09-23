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
import { createRequireActiveSupplier, createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { NetureService } from '../neture.service.js';
import { ProductCandidateService } from '../services/product-candidate.service.js';
import logger from '../../../utils/logger.js';
import { OfferErrorCode } from '../constants/offer-error-code.js';

/* ──────────────────────────────────────────────────────────────────────────
 * WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3
 * 검증 통과 bulk row → ProductCandidate(안전 후보) 저장. ProductMaster/Offer 직접 생성 금지,
 * CSV Import applyBatch 재사용 금지. 서버에서 frontend와 독립적으로 재검증한다.
 * ────────────────────────────────────────────────────────────────────────── */

/** productType(프론트 key + 단축 alias) → 분류. unclassified/unknown 은 null(운영자 검토). */
const BULK_TYPE_MAP: Record<string, { regulatoryType: string | null; drugCategory: string | null; rx: boolean }> = {
  non_drug: { regulatoryType: 'GENERAL', drugCategory: null, rx: false },
  quasi_drug: { regulatoryType: 'QUASI_DRUG', drugCategory: 'quasi_drug', rx: false },
  otc_drug: { regulatoryType: 'DRUG', drugCategory: 'otc', rx: false },
  otc: { regulatoryType: 'DRUG', drugCategory: 'otc', rx: false },
  rx_drug: { regulatoryType: 'DRUG', drugCategory: 'rx', rx: true },
  rx: { regulatoryType: 'DRUG', drugCategory: 'rx', rx: true },
  unclassified: { regulatoryType: null, drugCategory: null, rx: false },
  unknown: { regulatoryType: null, drugCategory: null, rx: false },
};

/** O4O 범위 외(처방 lot/유효기간/일련번호/재고 등) — 모든 유형에서 금지 (한·영) */
const BULK_FORBIDDEN_KEYS = new Set(
  [
    'lot', 'lot_no', 'lot_number', 'serial', 'serial_number', 'expiry', 'expiry_date',
    'expiration', 'expiration_date', 'stock', 'inventory', 'inbound_date', 'warehouse',
    'warehouse_location', 'traceability', 'traceability_status',
    '유효기간', '일련번호', '재고', '입고일', '로트', '재고수량', '창고',
  ].map((k) => k.toLowerCase()),
);

/** 혼합 파일 메타 컬럼 값 ↔ 선택 유형 호환 (서버 재검증) */
const BULK_EXPECTED_DRUG_CATEGORY: Record<string, string[]> = {
  non_drug: ['', 'non_drug', 'general', '일반', '비의약품'],
  quasi_drug: ['quasi_drug', 'quasi', '의약외품'],
  otc_drug: ['otc', '일반의약품', '비처방', '비처방의약품'],
  rx_drug: ['rx', 'etc', '전문', '처방', '처방의약품'],
  unclassified: ['', 'unclassified', '미분류'],
};

const BULK_MAX_ROWS = 200;

/** fields(정규화 한글명) 또는 raw 에서 첫 비어있지 않은 값 */
function pickField(fields: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) { const v = (fields?.[k] ?? '').trim(); if (v) return v; }
  return '';
}

export function createSupplierProductController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const productCandidateService = new ProductCandidateService(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  // (은퇴) POST /supplier/products — barcode/name → resolveOrCreateMaster 경유 레거시 Offer 생성
  //   WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1 §2.4
  //   저장소 census(web-neture 단일 소비자 → from-master / product-candidates 로 전환 완료) + Cloud Run 30일 access log
  //   (외부 호출 0) 확인 후 라우트를 제거했다. 공급자가 ProductMaster 를 만드는 HTTP 경로는 더 이상 없다.
  //   신규/미매칭 제품 = POST /product-candidates · 기존 Master = POST /products/from-master · 대량 = POST /products/bulk-candidates.

  // POST /supplier/products/from-master (WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1)
  //   Product Library 에서 고른 기존 ProductMaster 에 Offer 를 직접 연결한다.
  //   공급자가 masterId 로 Offer 를 만드는 유일한 경로 (레거시 POST /products 는 은퇴).
  //   supplierId 는 requireActiveSupplier 확정값만 쓴다(body 의 supplierId 는 서비스가 400 으로 거부).
  router.post('/products/from-master', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await netureService.createSupplierOfferFromExistingMaster(supplierId, req.body ?? {});
      if (!result.success) {
        const statusCode = result.error === OfferErrorCode.SUPPLIER_NOT_ACTIVE ? 403
          : result.error === OfferErrorCode.MASTER_NOT_FOUND ? 404
          : result.error === OfferErrorCode.MASTER_NOT_ACTIVE ? 409
          : result.error === OfferErrorCode.MASTER_REGULATORY_TYPE_UNSUPPORTED ? 409
          : result.error === 'OFFER_ALREADY_EXISTS' ? 409
          : result.error === 'OFFER_IN_RECYCLE_BIN' ? 409
          : 400;
        return res.status(statusCode).json(result);
      }
      res.status(201).json(result);
    } catch (error) {
      logger.error('[Neture API] Error creating supplier product from existing master:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create supplier product from existing master' });
    }
  });

  // GET /supplier/products (WO-NETURE-SUPPLIER-EXCEL-LIST-V1: pagination/search/filter 지원)
  router.get('/products', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { page, limit, keyword, distributionType, isActive, sort, order,
              hasImage, hasDescription, barcodeSource, completenessStatus, serviceApprovalStatus } = req.query;

      // 쿼리 파라미터가 있으면 paginated, 없으면 기존 호환
      if (page || limit || keyword || distributionType || isActive || sort || hasImage || hasDescription || barcodeSource || completenessStatus || serviceApprovalStatus) {
        const result = await netureService.getSupplierProductsPaginated(supplierId, {
          page: page as string | undefined ? Number(page) : undefined,
          limit: limit as string | undefined ? Number(limit) : undefined,
          keyword: keyword as string | undefined,
          distributionType: distributionType as string | undefined,
          isActive: isActive as string | undefined,
          sort: sort as string | undefined,
          order: order as string | undefined,
          hasImage: hasImage as string | undefined,
          hasDescription: hasDescription as string | undefined,
          barcodeSource: barcodeSource as string | undefined,
          completenessStatus: completenessStatus as string | undefined,
          serviceApprovalStatus: serviceApprovalStatus as string | undefined,
        });
        res.json({ success: true, ...result });
      } else {
        const products = await netureService.getSupplierProducts(supplierId);
        res.json({ success: true, data: products });
      }
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier products:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch supplier products' });
    }
  });

  // GET /supplier/products/approval-counts (WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1)
  // 주의: /products/:id 보다 먼저 등록
  router.get('/products/approval-counts', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      // WO-NETURE-SUPPLIER-PRODUCT-LIST-APPROVAL-TAB-LABEL-AND-COUNT-ALIGN-V1:
      // 탭 카운트에도 보조 필터/검색어를 적용하여 rows와 기준 일치
      const {
        keyword, distributionType, isActive,
        hasImage, hasDescription, barcodeSource, completenessStatus,
      } = req.query;
      const counts = await netureService.getSupplierProductApprovalCounts(supplierId, {
        keyword: keyword as string | undefined,
        distributionType: distributionType as string | undefined,
        isActive: isActive as string | undefined,
        hasImage: hasImage as string | undefined,
        hasDescription: hasDescription as string | undefined,
        barcodeSource: barcodeSource as string | undefined,
        completenessStatus: completenessStatus as string | undefined,
      });
      res.json({ success: true, data: counts });
    } catch (error) {
      logger.error('[Neture API] Error fetching approval counts:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // POST /supplier/products/submit-approval
  // WO-NETURE-SUPPLIER-APPROVAL-REQUEST-USE-SAVED-DISTRIBUTION-POLICY-V1:
  // serviceKeys를 request body에서 받지 않고, offer에 저장된 정책 사용
  router.post('/products/submit-approval', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { offerIds } = req.body;

      if (!Array.isArray(offerIds) || offerIds.length === 0) {
        return res.status(400).json({ success: false, error: 'INVALID_OFFER_IDS', message: 'offerIds array is required' });
      }
      if (offerIds.length > 100) {
        return res.status(400).json({ success: false, error: 'TOO_MANY_OFFERS', message: 'Max 100 offers per request' });
      }

      const result = await netureService.submitForApproval(supplierId, offerIds);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error submitting for approval:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to submit for approval' });
    }
  });

  // DELETE /supplier/products/bulk (WO-O4O-NETURE-SUPPLIER-PRODUCTS-UX-REFORM-V1)
  // 주의: /products/:id 보다 먼저 등록해야 'bulk'가 :id로 매칭되지 않음
  router.delete('/products/bulk', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { offerIds } = req.body;

      if (!Array.isArray(offerIds) || offerIds.length === 0) {
        return res.status(400).json({ success: false, error: OfferErrorCode.INVALID_OFFER_IDS, message: 'offerIds array is required' });
      }
      if (offerIds.length > 100) {
        return res.status(400).json({ success: false, error: OfferErrorCode.VALIDATION_ERROR, message: 'Max 100 offers per request' });
      }

      // WO-O4O-NETURE-SUPPLIER-DELETE-POLICY-AND-REVIEW-ROUNDTRIP-BATCH-V1:
      // soft delete 로 정합화 — 운영자 휴지통이 읽는 deleted_by 를 채우기 위해 요청자 id 를 넘긴다.
      const result = await netureService.bulkDeleteOffers(supplierId, offerIds, req.user?.id);
      const allSucceeded = !result.failed || result.failed.length === 0;
      res.json({ success: allSucceeded, data: result });
    } catch (error) {
      logger.error('[Neture API] Error bulk deleting offers:', error);
      res.status(500).json({ success: false, error: OfferErrorCode.INTERNAL_ERROR, message: 'Failed to bulk delete offers' });
    }
  });

  // PATCH /supplier/products/batch (WO-NETURE-SUPPLIER-EXCEL-LIST-V1)
  // 주의: /products/:id 보다 먼저 등록해야 'batch'가 :id로 매칭되지 않음
  router.patch('/products/batch', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ success: false, error: 'INVALID_UPDATES', message: 'updates array is required' });
      }
      if (updates.length > 100) {
        return res.status(400).json({ success: false, error: 'TOO_MANY_UPDATES', message: 'Max 100 updates per request' });
      }
      const result = await netureService.batchUpdateSupplierOffers(supplierId, updates);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error batch updating supplier products:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to batch update' });
    }
  });

  // PATCH /supplier/products/:id/business-content (WO-NETURE-B2B-CONTENT-MANAGEMENT-V1)
  router.patch('/products/:id/business-content', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { id } = req.params;
      const { businessShortDescription, businessDetailDescription } = req.body;
      const result = await netureService.updateBusinessContent(id, supplierId, {
        businessShortDescription, businessDetailDescription,
      });
      if (!result.success) {
        const statusCode = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json(result);
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error updating business content:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update business content' });
    }
  });

  // PATCH /supplier/products/:id
  router.patch('/products/:id', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { id } = req.params;
      const { isActive, isPublic, distributionType, allowedSellerIds,
              priceGeneral, priceGold, pricePlatinum,
              consumerReferencePrice, stockQuantity,
              consumerShortDescription, consumerDetailDescription, name,
              categoryId, brandId, specification, originCountry, tags,
              // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
              isFeatured } = req.body;
      const result = await netureService.updateSupplierOffer(id, supplierId, {
        isActive, isPublic, distributionType, allowedSellerIds,
        priceGeneral, priceGold, pricePlatinum,
        consumerReferencePrice, stockQuantity,
        consumerShortDescription, consumerDetailDescription, name,
        categoryId, brandId, specification, originCountry, tags,
        isFeatured,
      });
      if (!result.success) {
        const statusCode = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json(result);
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error updating supplier product:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update supplier product' });
    }
  });

  // PATCH /supplier/products/:id/distribution — 공급 방식(전체 공개 + 서비스 대상) 정식 변경
  // WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1
  router.patch('/products/:id/distribution', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      const { id } = req.params;
      const { isPublic, serviceKeys } = req.body || {};
      if (serviceKeys !== undefined && !Array.isArray(serviceKeys)) {
        return res.status(400).json({ success: false, error: 'INVALID_SERVICE_KEYS' });
      }
      const result = await netureService.updateDistribution(id, supplierId, userId, { isPublic, serviceKeys });
      if (!result.success) {
        const statusCode = result.error === 'OFFER_NOT_FOUND' ? 404 : result.error === 'NOT_OWNED' ? 403 : 400;
        return res.status(statusCode).json(result);
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error updating product distribution:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update distribution' });
    }
  });

  // GET /supplier/products/:id/service-prices — 서비스별 공급가 조회
  // WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1
  router.get('/products/:id/service-prices', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const result = await netureService.getServicePrices(req.params.id, supplierId);
      if (!result.success) {
        return res.status(result.error === 'NOT_OWNED' ? 403 : 400).json(result);
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error fetching service prices:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // PUT /supplier/products/:id/service-prices — 서비스별 공급가 일괄 설정(replace)
  router.put('/products/:id/service-prices', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const { prices } = req.body || {};
      if (!Array.isArray(prices)) {
        return res.status(400).json({ success: false, error: 'INVALID_PRICES' });
      }
      const result = await netureService.setServicePrices(req.params.id, supplierId, prices);
      if (!result.success) {
        return res.status(result.error === 'NOT_OWNED' ? 403 : 400).json(result);
      }
      res.json(result);
    } catch (error) {
      logger.error('[Neture API] Error setting service prices:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // POST /supplier/products/bulk-candidates
  // WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3:
  //   PARSE-V2 검증 통과 row 를 ProductCandidate(안전 후보, status=pending)로 저장한다.
  //   ProductMaster/SupplierOffer 직접 생성 금지, CSV Import applyBatch 재사용 금지.
  //   서버에서 productType/금지컬럼/혼합/필수값을 frontend 와 독립적으로 재검증한다.
  router.post('/products/bulk-candidates', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const submittedBy = req.user?.id ?? null;
      const { productType, rows } = (req.body ?? {}) as {
        productType?: string;
        rows?: Array<{ rowNumber?: number; fields?: Record<string, string>; raw?: Record<string, string> }>;
      };

      // ── 요청 레벨 검증 ──
      const typeKey = String(productType ?? '');
      const typeInfo = BULK_TYPE_MAP[typeKey];
      if (!typeInfo) {
        return res.status(400).json({ success: false, error: 'INVALID_PRODUCT_TYPE', message: '제품 유형이 올바르지 않습니다.' });
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, error: 'ROWS_REQUIRED', message: '등록할 행이 없습니다.' });
      }
      if (rows.length > BULK_MAX_ROWS) {
        return res.status(400).json({
          success: false, error: 'TOO_MANY_ROWS',
          message: `한 번에 등록할 수 있는 제품 수(${BULK_MAX_ROWS})를 초과했습니다. 파일을 나누어 다시 업로드해 주세요.`,
        });
      }
      // 파일 레벨 금지 컬럼(처방 lot/유효기간/일련번호/재고 등) — 한 row 라도 있으면 전체 차단
      for (const r of rows) {
        const keys = Object.keys(r?.raw ?? {});
        const bad = keys.find((k) => BULK_FORBIDDEN_KEYS.has(k.trim().toLowerCase()));
        if (bad) {
          return res.status(400).json({
            success: false, error: 'FORBIDDEN_COLUMN',
            message: `허용되지 않는 컬럼 "${bad}"이(가) 포함되어 있습니다. O4O는 유효기간·일련번호·lot·재고 정보를 수집하지 않습니다.`,
          });
        }
      }

      const expectedCat = BULK_EXPECTED_DRUG_CATEGORY[typeKey] ?? [];
      const seenSku = new Set<string>();
      const seenCode = new Set<string>();
      const results: Array<{ rowNumber: number; status: string; candidateId?: string; message?: string }> = [];
      let created = 0, duplicate = 0, failed = 0;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] ?? {};
        const rowNumber = r.rowNumber ?? i + 1;
        const fields = r.fields ?? {};
        const raw = r.raw ?? {};

        const productName = pickField(fields, '제품명');
        if (!productName) {
          results.push({ rowNumber, status: 'failed', message: '제품명이 비어 있습니다.' });
          failed++;
          continue;
        }

        // 공급가 숫자 검증
        const priceRaw = pickField(fields, '기본공급가');
        let candidatePrice: number | null = null;
        if (priceRaw) {
          const num = Number(priceRaw.replace(/[,\s원]/g, ''));
          if (Number.isNaN(num)) {
            results.push({ rowNumber, status: 'failed', message: `기본공급가 "${priceRaw}"이(가) 숫자가 아닙니다.` });
            failed++;
            continue;
          }
          candidatePrice = num;
        }

        // 혼합 파일 재검증 (메타 컬럼)
        const metaCat = (raw['drug_category'] ?? raw['약품분류'] ?? raw['의약품분류'] ?? '').trim().toLowerCase();
        if (metaCat && expectedCat.length > 0 && !expectedCat.includes(metaCat)) {
          results.push({ rowNumber, status: 'failed', message: `선택 유형과 다른 약품분류 "${metaCat}" 행입니다.` });
          failed++;
          continue;
        }

        // 요청 내 중복 (자동 병합 안 함 — 플래그만)
        const sku = pickField(fields, '공급자상품코드');
        const code = pickField(fields, '의약품표준코드', '바코드또는표준코드', '바코드');
        let isDup = false;
        if (sku) { if (seenSku.has(sku)) isDup = true; else seenSku.add(sku); }
        if (code) { if (seenCode.has(code)) isDup = true; else seenCode.add(code); }

        const candidate = await productCandidateService.createCandidate({
          serviceKey: 'neture',
          organizationId: null,
          sourceType: 'csv_import',
          sourceLabel: '공급자 대량 등록',
          submittedBy,
          candidateName: productName,
          candidateBrand: pickField(fields, '브랜드') || null,
          candidateManufacturer: pickField(fields, '제조사') || null,
          candidateSpec: pickField(fields, '규격', '포장단위') || null,
          candidateUnit: pickField(fields, '단위') || null,
          candidateImageUrl: pickField(fields, '이미지URL') || null,
          candidatePrice,
          rawPayload: {
            // 안전 후보 출처/분류 보존 (전용 컬럼 없음 → rawPayload)
            source: 'supplier_bulk_upload',
            productType: typeKey,
            regulatoryType: typeInfo.regulatoryType,
            drugCategory: typeInfo.drugCategory,
            // classifyProductType 가 읽는 키 (운영자 콘솔 분류 추론용)
            drug_category: typeInfo.drugCategory,
            product_type: typeKey,
            supplierId,
            rowNumber,
            duplicateInBatch: isDup,
            fields,
            original: raw,
          },
        });

        if (isDup) {
          results.push({ rowNumber, status: 'duplicate', candidateId: candidate.id, message: '요청 내 중복 가능 — 운영자 검토 필요' });
          duplicate++;
        } else {
          results.push({ rowNumber, status: 'created', candidateId: candidate.id });
          created++;
        }
      }

      return res.status(201).json({
        success: true,
        data: { total: rows.length, created, duplicate, failed, results },
      });
    } catch (error) {
      logger.error('[Neture API] Error creating bulk candidates:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to submit bulk candidates' });
    }
  });

  return router;
}
