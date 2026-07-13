/**
 * SupplierStoreDescriptionController — 공급자 매장용(STORE) 상품 설명서 저작/저장
 *
 * WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1
 * (alias: WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-V1 / WO-O4O-PRODUCT-CONTENT-STORE-SUPPLIER-DRAFT-V1)
 *
 * 정책:
 *   - description_type = STORE (SUPPLIER_STORE 신규 사용 금지)
 *   - source_type = supplier, created_by_supplier_id = 작성 공급자 SSOT
 *   - source_ref_id = 원천 offer id(추적/AUTO-CREDIT fallback)
 *   - 공급자는 canonical 을 직접 생성하지 않는다(운영자 검수 큐 경유)
 *   - 임시저장(draft, submitted_at=null) / 검수요청(needs_review, submitted_at=now) 분리
 *
 * mount: /api/v1/neture/supplier/store-descriptions
 *   GET  /?masterId=  — 공급자 본인의 STORE 설명서 작업행 목록(read gate)
 *   POST /            — 저장(임시저장/검수요청). ACTIVE 공급자만(write gate). body:
 *                       { offerId, content, summary?, language?, submit? }
 */

import { Router } from 'express';
import type { Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireActiveSupplier, createRequireLinkedSupplier } from '../middleware/neture-identity.middleware.js';
import type { SupplierRequest, AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { SharedProductDescriptionService } from '../services/shared-product-description.service.js';
import logger from '../../../utils/logger.js';

const MAX_CONTENT_LEN = 200_000;
const ALLOWED_LANG = new Set(['ko', 'zh', 'en', 'ja']);

export function createSupplierStoreDescriptionController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SharedProductDescriptionService(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);
  const requireLinkedSupplier = createRequireLinkedSupplier(dataSource);

  // GET /store-descriptions?masterId= — 공급자 본인 작업행 목록 (활성 여부 무관, 열람)
  router.get('/store-descriptions', requireAuth, requireLinkedSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const masterId = typeof req.query.masterId === 'string' && req.query.masterId.trim() ? req.query.masterId.trim() : undefined;
      const items = await service.listSupplierStoreDrafts(supplierId, masterId);
      res.json({ success: true, data: { items } });
    } catch (error) {
      logger.error('[supplier-store-description] list failed:', error);
      res.status(500).json({ success: false, error: '설명서 조회에 실패했습니다', code: 'STORE_DESC_LIST_FAILED' });
    }
  });

  // POST /store-descriptions — 저장(임시저장/검수요청). ACTIVE 공급자만.
  router.post('/store-descriptions', requireAuth, requireActiveSupplier as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplierId = (req as SupplierRequest).supplierId;
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: '인증이 필요합니다', code: 'AUTH_REQUIRED' });
        return;
      }

      const offerId = typeof req.body?.offerId === 'string' ? req.body.offerId.trim() : '';
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      const summaryRaw = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
      const language = typeof req.body?.language === 'string' ? req.body.language.trim().toLowerCase() : 'ko';
      const submit = req.body?.submit === true || req.body?.submit === 'true';

      if (!offerId) {
        res.status(400).json({ success: false, error: '상품(offer)을 선택하세요', code: 'OFFER_REQUIRED' });
        return;
      }
      if (!content) {
        res.status(400).json({ success: false, error: '설명서 본문을 입력하세요', code: 'CONTENT_EMPTY' });
        return;
      }
      if (content.length > MAX_CONTENT_LEN) {
        res.status(400).json({ success: false, error: '설명서 본문이 너무 깁니다', code: 'CONTENT_TOO_LONG' });
        return;
      }
      if (!ALLOWED_LANG.has(language)) {
        res.status(400).json({ success: false, error: '지원하지 않는 언어입니다', code: 'LANG_UNSUPPORTED' });
        return;
      }

      // 소유 검증: offer 가 이 공급자의 것이고, master 에 연결되어 있어야 한다.
      const offerRows: Array<{ master_id: string | null }> = await dataSource.query(
        `SELECT master_id FROM supplier_product_offers WHERE id = $1 AND supplier_id = $2 LIMIT 1`,
        [offerId, supplierId],
      );
      const masterId = offerRows[0]?.master_id ?? null;
      if (!offerRows[0]) {
        res.status(404).json({ success: false, error: '해당 상품을 찾을 수 없습니다', code: 'OFFER_NOT_FOUND' });
        return;
      }
      if (!masterId) {
        res.status(400).json({ success: false, error: '기본상품(ProductMaster)에 연결되지 않은 상품입니다', code: 'MASTER_NOT_LINKED' });
        return;
      }

      const saved = await service.upsertSupplierStoreDraft({
        masterId,
        supplierId,
        createdBy: userId,
        offerId,
        content,
        summary: summaryRaw || null,
        language,
        submit,
      });

      res.status(201).json({
        success: true,
        data: {
          id: saved.id,
          masterId: saved.masterId,
          descriptionType: saved.descriptionType,
          status: saved.status,
          language: saved.language,
          submittedAt: saved.submittedAt,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (/empty after sanitization/i.test(msg)) {
        res.status(400).json({ success: false, error: '유효한 설명 본문이 없습니다(정화 후 비어 있음)', code: 'CONTENT_EMPTY_AFTER_SANITIZE' });
        return;
      }
      logger.error('[supplier-store-description] save failed:', error);
      res.status(500).json({ success: false, error: '설명서 저장에 실패했습니다', code: 'STORE_DESC_SAVE_FAILED' });
    }
  });

  return router;
}
