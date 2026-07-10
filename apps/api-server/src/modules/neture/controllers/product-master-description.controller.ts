/**
 * ProductMasterDescription Controller — 관리자 직접 등록: 매장용(STORE) 상세설명서 저작 (admin)
 *
 * IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1 §5 (관리자 직접 등록만 — 진입점 4)
 *
 * 배경: SPD 검토·큐레이션 워크플로우는 WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1 로
 *   컨트롤러/라우트가 제거됨(서비스 메서드·테이블은 유지). 본 컨트롤러는 그 검토 워크플로우를
 *   되살리는 것이 아니라, 등록 모듈의 일부로 **단건 STORE 설명서 upsert** 경로만 재수립한다.
 *
 * mount: /api/v1/admin/o4o-product-db/masters
 *   GET  /:id/store-descriptions   — 해당 master 의 STORE 설명서 목록(soft-deleted 제외)
 *   POST /:id/store-descriptions   — STORE 설명서 저장(=canonical upsert). createCandidate → setCanonical.
 *
 * 원칙: ProductMaster 본문/식별자/이미지 **무변경**. shared_product_descriptions 전용 write.
 *   content 는 서비스가 sanitize(jsdom+DOMPurify)한다. canonical 은 (master_id, 'STORE') 당 1개.
 * 권한: O4O 상품관리 콘솔과 동일 ADMIN 롤셋(메모/생성 컨트롤러와 동일).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { SharedProductDescriptionService } from '../services/shared-product-description.service.js';
import { ProductMaster } from '../entities/ProductMaster.entity.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
  'platform:admin',
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'glycopharm:admin',
  'glycopharm:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa-society:admin',
  'kpa-society:operator',
];

const MAX_CONTENT_LEN = 200_000;
const ALLOWED_LANG = new Set(['ko', 'zh', 'en', 'ja']);

function actorId(req: Request): string | null {
  return (req as { user?: { id?: string } }).user?.id ?? null;
}

export function createProductMasterDescriptionController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SharedProductDescriptionService(dataSource);
  const masterRepo = dataSource.getRepository(ProductMaster);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  // 해당 master 의 STORE 설명서 목록 (읽기)
  router.get('/:id/store-descriptions', async (req: Request, res: Response) => {
    try {
      const all = await service.listByMaster(req.params.id);
      const items = all
        .filter((d) => d.descriptionType === 'STORE' && !d.deletedAt)
        .map((d) => ({
          id: d.id,
          language: d.language,
          status: d.status,
          summary: d.summary,
          content: d.content,
          updatedAt: d.updatedAt,
        }));
      res.json({ success: true, data: { items } });
    } catch (err) {
      logger.error('[product-master-description] list failed:', err);
      res.status(500).json({ success: false, error: 'STORE 설명서 조회에 실패했습니다', code: 'STORE_DESC_LIST_FAILED' });
    }
  });

  // STORE 설명서 저장 (=canonical upsert). createCandidate → setCanonical.
  router.post('/:id/store-descriptions', async (req: Request, res: Response) => {
    try {
      const actor = actorId(req);
      if (!actor) {
        res.status(401).json({ success: false, error: '인증이 필요합니다', code: 'AUTH_REQUIRED' });
        return;
      }
      const masterId = req.params.id;
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      const summaryRaw = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
      const language = typeof req.body?.language === 'string' ? req.body.language.trim().toLowerCase() : 'ko';

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
      const master = await masterRepo.findOne({ where: { id: masterId } });
      if (!master) {
        res.status(404).json({ success: false, error: '기본상품을 찾을 수 없습니다', code: 'MASTER_NOT_FOUND' });
        return;
      }

      // 등록 모듈 코어: createCandidate(STORE, manual) → setCanonical
      const candidate = await service.createCandidate({
        masterId,
        content,
        summary: summaryRaw || null,
        sourceType: 'manual',
        language,
        descriptionType: 'STORE',
        createdBy: actor,
      });
      const canonical = await service.setCanonical(candidate.id, actor);

      res.status(201).json({
        success: true,
        data: {
          id: canonical.id,
          masterId: canonical.masterId,
          descriptionType: canonical.descriptionType,
          status: canonical.status,
          language: canonical.language,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // sanitize 후 빈 본문 등 서비스 검증 실패는 400 로 매핑
      if (/empty after sanitization/i.test(msg)) {
        res.status(400).json({ success: false, error: '유효한 설명 본문이 없습니다(정화 후 비어 있음)', code: 'CONTENT_EMPTY_AFTER_SANITIZE' });
        return;
      }
      logger.error('[product-master-description] save failed:', err);
      res.status(500).json({ success: false, error: 'STORE 설명서 저장에 실패했습니다', code: 'STORE_DESC_SAVE_FAILED' });
    }
  });

  return router;
}
